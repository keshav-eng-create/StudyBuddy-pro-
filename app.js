/**
 * StudyBuddy PRO - Main Application Engine
 * Handles Pomodoro Clock, 3D Flashcards, Quiz Master, Mascot Companion, and LocalStorage
 */

(function () {
  'use strict';

  // ==========================================
  // STORAGE KEYS & DEFAULT STATE
  // ==========================================
  const STORAGE_KEYS = {
    SETTINGS: 'sb_settings_v1',
    DECKS: 'sb_decks_v1',
    QUIZZES: 'sb_quizzes_v1',
    STATS: 'sb_stats_v1',
    BUDDY: 'sb_buddy_v1'
  };

  const DEFAULT_SETTINGS = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    soundEnabled: true,
    theme: 'dark'
  };

  const DEFAULT_STATS = {
    totalFocusSeconds: 0,
    completedPomodoros: 0,
    todayPomodoros: 0,
    cardsReviewed: 0,
    cardsMastered: 0,
    quizzesCompleted: 0,
    totalQuizScorePercent: 0,
    lastActiveDate: new Date().toDateString(),
    streakDays: 1
  };

  const DEFAULT_BUDDY = {
    avatar: 'fox',
    name: 'Kitsune',
    personality: 'enthusiastic'
  };

  // ==========================================
  // APP STATE
  // ==========================================
  const state = {
    settings: { ...DEFAULT_SETTINGS },
    decks: [],
    quizzes: [],
    stats: { ...DEFAULT_STATS },
    buddy: { ...DEFAULT_BUDDY },

    // Pomodoro Timer Runtime State
    timer: {
      mode: 'focus', // 'focus', 'shortBreak', 'longBreak'
      timeLeft: 25 * 60,
      totalDuration: 25 * 60,
      isRunning: false,
      intervalId: null,
      sessionCount: 1,
      currentTask: ''
    },

    // Active Flashcard Study Runtime State
    flashcardStudy: {
      deck: null,
      cards: [],
      currentIndex: 0,
      isFlipped: false,
      masteredCount: 0,
      learningCount: 0
    },

    // Active Quiz Runtime State
    activeQuiz: {
      quiz: null,
      questions: [],
      currentIndex: 0,
      score: 0,
      userAnswers: [], // { question, selectedIdx, correctIdx, wasCorrect }
      timerInterval: null,
      elapsedSeconds: 0,
      hasAnsweredCurrent: false
    },

    // Deck & Quiz Editor States
    editingDeckId: null,
    editorDeckCards: [],
    editingQuizId: null,
    editorQuizQuestions: []
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function initApp() {
    loadPersistentData();
    checkDailyStreak();
    setupEventListeners();
    setupKeyboardShortcuts();
    renderAllViews();
    updateTimerDisplay();
    updateTheme(state.settings.theme);
    updateBuddyVisuals();
    updateSoundUI();
  }

  function loadPersistentData() {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };

      const savedDecks = localStorage.getItem(STORAGE_KEYS.DECKS);
      state.decks = savedDecks ? JSON.parse(savedDecks) : [...window.DEFAULT_DECKS];

      const savedQuizzes = localStorage.getItem(STORAGE_KEYS.QUIZZES);
      state.quizzes = savedQuizzes ? JSON.parse(savedQuizzes) : [...window.DEFAULT_QUIZZES];

      const savedStats = localStorage.getItem(STORAGE_KEYS.STATS);
      if (savedStats) state.stats = { ...DEFAULT_STATS, ...JSON.parse(savedStats) };

      const savedBuddy = localStorage.getItem(STORAGE_KEYS.BUDDY);
      if (savedBuddy) state.buddy = { ...DEFAULT_BUDDY, ...JSON.parse(savedBuddy) };
    } catch (e) {
      console.error('Failed to load local storage data:', e);
      state.decks = [...window.DEFAULT_DECKS];
      state.quizzes = [...window.DEFAULT_QUIZZES];
    }

    // Set initial timer according to settings
    state.timer.timeLeft = state.settings.focusDuration * 60;
    state.timer.totalDuration = state.settings.focusDuration * 60;
  }

  function saveAllData() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(state.decks));
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(state.quizzes));
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(state.stats));
      localStorage.setItem(STORAGE_KEYS.BUDDY, JSON.stringify(state.buddy));
    } catch (e) {
      console.error('Failed to persist data:', e);
    }
  }

  function checkDailyStreak() {
    const today = new Date().toDateString();
    if (state.stats.lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (state.stats.lastActiveDate === yesterday.toDateString()) {
        state.stats.streakDays += 1;
      } else {
        // Reset streak if missed more than 1 day
        state.stats.streakDays = 1;
      }
      state.stats.todayPomodoros = 0;
      state.stats.lastActiveDate = today;
      saveAllData();
    }
  }

  // ==========================================
  // SOUND INTEGRATION HELPERS
  // ==========================================
  function playClick() {
    if (window.soundEngine && state.settings.soundEnabled) {
      window.soundEngine.playClick();
    }
  }

  function playBell() {
    if (window.soundEngine && state.settings.soundEnabled) {
      window.soundEngine.playTimerBell();
    }
  }

  function playFlip() {
    if (window.soundEngine && state.settings.soundEnabled) {
      window.soundEngine.playCardFlip();
    }
  }

  function playSuccess() {
    if (window.soundEngine && state.settings.soundEnabled) {
      window.soundEngine.playSuccess();
    }
  }

  function playError() {
    if (window.soundEngine && state.settings.soundEnabled) {
      window.soundEngine.playError();
    }
  }

  // ==========================================
  // POMODORO TIMER LOGIC
  // ==========================================
  function setTimerMode(mode) {
    if (state.timer.isRunning) {
      pauseTimer();
    }
    state.timer.mode = mode;

    let durationMinutes = state.settings.focusDuration;
    if (mode === 'shortBreak') durationMinutes = state.settings.shortBreakDuration;
    if (mode === 'longBreak') durationMinutes = state.settings.longBreakDuration;

    state.timer.totalDuration = durationMinutes * 60;
    state.timer.timeLeft = state.timer.totalDuration;

    // Update pill buttons active state
    document.querySelectorAll('.mode-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update theme accents on timer
    const ring = document.getElementById('timer-progress-ring');
    const modeLabel = document.getElementById('timer-mode-label');
    const buddyBadge = document.getElementById('buddy-state-badge');

    if (mode === 'focus') {
      modeLabel.textContent = 'DEEP FOCUS';
      modeLabel.style.color = 'var(--primary)';
      ring.style.stroke = 'var(--mode-focus-color)';
      ring.style.filter = 'drop-shadow(0 0 10px var(--mode-focus-glow))';
      buddyBadge.textContent = 'Focusing intensely 🎯';
    } else if (mode === 'shortBreak') {
      modeLabel.textContent = 'SHORT BREAK';
      modeLabel.style.color = 'var(--success)';
      ring.style.stroke = 'var(--mode-short-color)';
      ring.style.filter = 'drop-shadow(0 0 10px var(--mode-short-glow))';
      buddyBadge.textContent = 'Enjoying a quick coffee ☕';
    } else {
      modeLabel.textContent = 'LONG BREAK';
      modeLabel.style.color = 'var(--mode-long-color)';
      ring.style.stroke = 'var(--mode-long-color)';
      ring.style.filter = 'drop-shadow(0 0 10px var(--mode-long-glow))';
      buddyBadge.textContent = 'Recharging energy 🌿';
    }

    document.getElementById('timer-status-chip').textContent = 'Ready';
    updateTimerDisplay();
  }

  function toggleTimer() {
    playClick();
    if (state.timer.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function startTimer() {
    if (state.timer.isRunning) return;
    state.timer.isRunning = true;
    document.getElementById('play-btn-icon').textContent = '⏸';
    document.getElementById('play-btn-text').textContent = 'Pause';
    document.getElementById('timer-status-chip').textContent = 'Active';

    // Set buddy expression
    const eyes = document.getElementById('buddy-eyes');
    if (eyes) eyes.style.transform = 'scale(0.9, 0.9)';

    state.timer.intervalId = setInterval(() => {
      if (state.timer.timeLeft > 0) {
        state.timer.timeLeft--;
        if (state.timer.mode === 'focus') {
          state.stats.totalFocusSeconds++;
        }
        updateTimerDisplay();
      } else {
        handleTimerComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    state.timer.isRunning = false;
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    document.getElementById('play-btn-icon').textContent = '▶';
    document.getElementById('play-btn-text').textContent = state.timer.mode === 'focus' ? 'Resume Focus' : 'Resume Break';
    document.getElementById('timer-status-chip').textContent = 'Paused';

    const eyes = document.getElementById('buddy-eyes');
    if (eyes) eyes.style.transform = 'none';
  }

  function resetTimer() {
    playClick();
    pauseTimer();
    state.timer.timeLeft = state.timer.totalDuration;
    document.getElementById('timer-status-chip').textContent = 'Reset';
    updateTimerDisplay();
  }

  function skipTimer() {
    playClick();
    pauseTimer();
    advanceToNextMode();
  }

  function adjustTimerMinutes(delta) {
    playClick();
    const newSeconds = state.timer.timeLeft + delta * 60;
    if (newSeconds >= 60 && newSeconds <= 120 * 60) {
      state.timer.timeLeft = newSeconds;
      if (state.timer.timeLeft > state.timer.totalDuration) {
        state.timer.totalDuration = state.timer.timeLeft;
      }
      updateTimerDisplay();
    }
  }

  function handleTimerComplete() {
    pauseTimer();
    playBell();
    triggerConfetti();

    if (state.timer.mode === 'focus') {
      state.stats.completedPomodoros++;
      state.stats.todayPomodoros++;
      saveAllData();
      renderStatsView();

      showToast('🎉 Focus session completed! Outstanding focus!', 'success');
      setRandomBuddyQuote();

      // Check if long break interval reached
      if (state.timer.sessionCount % state.settings.longBreakInterval === 0) {
        setTimerMode('longBreak');
      } else {
        setTimerMode('shortBreak');
      }

      if (state.settings.autoStartBreaks) {
        startTimer();
      }
    } else {
      // Completed break
      state.timer.sessionCount++;
      document.getElementById('session-count-chip').textContent = `Session ${((state.timer.sessionCount - 1) % state.settings.longBreakInterval) + 1} of ${state.settings.longBreakInterval}`;
      showToast('☕ Break is over! Let\'s get back into the zone.', 'info');
      setTimerMode('focus');

      if (state.settings.autoStartFocus) {
        startTimer();
      }
    }
  }

  function advanceToNextMode() {
    if (state.timer.mode === 'focus') {
      if (state.timer.sessionCount % state.settings.longBreakInterval === 0) {
        setTimerMode('longBreak');
      } else {
        setTimerMode('shortBreak');
      }
    } else {
      state.timer.sessionCount++;
      document.getElementById('session-count-chip').textContent = `Session ${((state.timer.sessionCount - 1) % state.settings.longBreakInterval) + 1} of ${state.settings.longBreakInterval}`;
      setTimerMode('focus');
    }
  }

  function updateTimerDisplay() {
    const mins = Math.floor(state.timer.timeLeft / 60);
    const secs = state.timer.timeLeft % 60;
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    document.getElementById('timer-digits').textContent = timeFormatted;
    document.title = `${timeFormatted} — StudyBuddy`;

    // SVG Circular Progress Ring calculations
    const circumference = 2 * Math.PI * 120; // 753.98
    const fraction = state.timer.totalDuration > 0 ? (state.timer.timeLeft / state.timer.totalDuration) : 0;
    const offset = circumference * (1 - fraction);
    const ring = document.getElementById('timer-progress-ring');
    ring.style.strokeDashoffset = offset;

    // Mini stats update
    document.getElementById('mini-today-pomos').textContent = state.stats.todayPomodoros;
    const totalMinutesStudied = Math.floor(state.stats.totalFocusSeconds / 60);
    document.getElementById('mini-today-mins').textContent = `${totalMinutesStudied}m`;
  }

  // ==========================================
  // 3D FLASHCARDS SYSTEM
  // ==========================================
  function renderDecks() {
    const grid = document.getElementById('decks-grid');
    grid.innerHTML = '';

    if (state.decks.length === 0) {
      grid.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📚</div>
          <h3>No Flashcard Decks Yet</h3>
          <p class="text-muted" style="margin: 0.5rem 0 1.25rem;">Create your first custom deck to start mastering concepts!</p>
          <button class="control-btn primary-btn" id="btn-empty-create-deck">Create New Deck</button>
        </div>
      `;
      const btn = document.getElementById('btn-empty-create-deck');
      if (btn) btn.addEventListener('click', openCreateDeckModal);
      return;
    }

    state.decks.forEach(deck => {
      const card = document.createElement('div');
      card.className = 'deck-item-card';

      const masteredCount = deck.cards.filter(c => c.mastered).length;
      const percent = deck.cards.length > 0 ? Math.round((masteredCount / deck.cards.length) * 100) : 0;

      card.innerHTML = `
        <div class="deck-card-top">
          <div class="deck-tags-row">
            <span class="category-tag">${escapeHtml(deck.category || 'General')}</span>
            <span class="card-count-tag">${deck.cards.length} cards</span>
          </div>
          <h3 class="deck-item-title">${escapeHtml(deck.title)}</h3>
          <p class="deck-item-desc">${escapeHtml(deck.description || 'Test your active recall with these cards.')}</p>
        </div>
        <div class="deck-card-bottom">
          <div class="deck-mastery-wrap">
            <span>Mastery: ${masteredCount}/${deck.cards.length}</span>
            <strong>${percent}%</strong>
          </div>
          <div class="linear-progress-bar">
            <div class="linear-progress-fill" style="width: ${percent}%;"></div>
          </div>
          <div class="deck-card-actions">
            <button class="control-btn primary-btn btn-study-deck" data-deck-id="${deck.id}" style="flex: 1;">
              Study Now
            </button>
            <button class="control-btn secondary-btn btn-edit-deck" data-deck-id="${deck.id}" title="Edit Deck">
              ✏️
            </button>
            <button class="control-btn secondary-btn btn-auto-quiz-single" data-deck-id="${deck.id}" title="Quiz from this Deck">
              📝
            </button>
            <button class="control-btn secondary-btn btn-delete-deck" data-deck-id="${deck.id}" title="Delete Deck">
              🗑️
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    // Attach event listeners for deck buttons
    grid.querySelectorAll('.btn-study-deck').forEach(btn => {
      btn.addEventListener('click', () => startStudySession(btn.dataset.deckId));
    });

    grid.querySelectorAll('.btn-edit-deck').forEach(btn => {
      btn.addEventListener('click', () => openEditDeckModal(btn.dataset.deckId));
    });

    grid.querySelectorAll('.btn-auto-quiz-single').forEach(btn => {
      btn.addEventListener('click', () => generateQuizFromDeck(btn.dataset.deckId));
    });

    grid.querySelectorAll('.btn-delete-deck').forEach(btn => {
      btn.addEventListener('click', () => deleteDeck(btn.dataset.deckId));
    });
  }

  function startStudySession(deckId, onlyLearning = false) {
    playClick();
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck || deck.cards.length === 0) {
      showToast('This deck has no cards to study! Add cards first.', 'warning');
      return;
    }

    let cards = [...deck.cards];
    if (onlyLearning) {
      cards = cards.filter(c => !c.mastered);
      if (cards.length === 0) cards = [...deck.cards];
    }

    state.flashcardStudy = {
      deck: deck,
      cards: cards,
      currentIndex: 0,
      isFlipped: false,
      masteredCount: 0,
      learningCount: 0
    };

    document.getElementById('decks-browser-view').classList.add('hidden');
    document.getElementById('deck-finished-view').classList.add('hidden');
    document.getElementById('deck-study-view').classList.remove('hidden');

    document.getElementById('study-deck-title').textContent = deck.title;
    document.getElementById('study-deck-category').textContent = deck.category || 'General';

    renderCurrentFlashcard();
  }

  function renderCurrentFlashcard() {
    const study = state.flashcardStudy;
    const card = study.cards[study.currentIndex];
    const flipper = document.getElementById('card-flipper');

    study.isFlipped = false;
    flipper.classList.remove('flipped');

    document.getElementById('card-front-text').textContent = card.front;
    document.getElementById('card-back-text').textContent = card.back;

    // Hint element
    const hintBadge = document.getElementById('card-hint-toggle');
    const hintText = document.getElementById('card-hint-text');
    if (card.hint && card.hint.trim() !== '') {
      hintBadge.classList.remove('hidden');
      hintText.textContent = card.hint;
      hintText.classList.add('hidden');
    } else {
      hintBadge.classList.add('hidden');
      hintText.classList.add('hidden');
    }

    // Status badge on back
    const statusBadge = document.getElementById('card-status-badge');
    statusBadge.textContent = card.mastered ? 'Mastered ✨' : 'Needs Review';
    statusBadge.style.color = card.mastered ? 'var(--success)' : 'var(--warning)';

    // Counter & progress bar
    const currentNum = study.currentIndex + 1;
    const total = study.cards.length;
    document.getElementById('study-card-counter').textContent = `Card ${currentNum} / ${total}`;
    const percent = Math.round((currentNum / total) * 100);
    document.getElementById('study-progress-fill').style.width = `${percent}%`;

    // Mini stats update
    state.stats.cardsReviewed++;
    document.getElementById('mini-cards-reviewed').textContent = state.stats.cardsReviewed;
  }

  function flipFlashcard() {
    playFlip();
    const flipper = document.getElementById('card-flipper');
    state.flashcardStudy.isFlipped = !state.flashcardStudy.isFlipped;
    flipper.classList.toggle('flipped', state.flashcardStudy.isFlipped);
  }

  function nextFlashcard() {
    playClick();
    const study = state.flashcardStudy;
    if (study.currentIndex < study.cards.length - 1) {
      study.currentIndex++;
      renderCurrentFlashcard();
    } else {
      finishFlashcardSession();
    }
  }

  function prevFlashcard() {
    playClick();
    const study = state.flashcardStudy;
    if (study.currentIndex > 0) {
      study.currentIndex--;
      renderCurrentFlashcard();
    }
  }

  function markCurrentCard(mastered) {
    const study = state.flashcardStudy;
    const card = study.cards[study.currentIndex];

    card.mastered = mastered;
    if (mastered) {
      playSuccess();
      study.masteredCount++;
      state.stats.cardsMastered++;
    } else {
      playClick();
      study.learningCount++;
    }

    // Persist card status back to deck
    const mainDeck = state.decks.find(d => d.id === study.deck.id);
    if (mainDeck) {
      const target = mainDeck.cards.find(c => c.id === card.id);
      if (target) target.mastered = mastered;
    }
    saveAllData();

    // Proceed to next card automatically for snappy study flow
    setTimeout(() => {
      nextFlashcard();
    }, 200);
  }

  function shuffleFlashcards() {
    playClick();
    const study = state.flashcardStudy;
    for (let i = study.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [study.cards[i], study.cards[j]] = [study.cards[j], study.cards[i]];
    }
    study.currentIndex = 0;
    renderCurrentFlashcard();
    showToast('🔀 Cards shuffled successfully!', 'info');
  }

  function finishFlashcardSession() {
    triggerConfetti();
    playSuccess();

    const study = state.flashcardStudy;
    document.getElementById('deck-study-view').classList.add('hidden');
    document.getElementById('deck-finished-view').classList.remove('hidden');

    document.getElementById('finished-total-cards').textContent = study.cards.length;
    document.getElementById('finished-mastered-cards').textContent = study.masteredCount;
    document.getElementById('finished-learning-cards').textContent = study.cards.length - study.masteredCount;

    saveAllData();
    renderStatsView();
  }

  function exitFlashcardStudy() {
    playClick();
    document.getElementById('deck-study-view').classList.add('hidden');
    document.getElementById('deck-finished-view').classList.add('hidden');
    document.getElementById('decks-browser-view').classList.remove('hidden');
    renderDecks();
  }

  // Flashcard Deck Modal & Management
  function openCreateDeckModal() {
    playClick();
    state.editingDeckId = null;
    state.editorDeckCards = [
      { id: 'nc1', front: '', back: '', hint: '' }
    ];

    document.getElementById('deck-modal-title').textContent = '🗂️ Create New Flashcard Deck';
    document.getElementById('deck-input-title').value = '';
    document.getElementById('deck-input-category').value = '';
    document.getElementById('deck-input-desc').value = '';

    renderDeckEditorCards();
    document.getElementById('modal-deck-editor').classList.remove('hidden');
  }

  function openEditDeckModal(deckId) {
    playClick();
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck) return;

    state.editingDeckId = deckId;
    state.editorDeckCards = deck.cards.map(c => ({ ...c }));

    document.getElementById('deck-modal-title').textContent = '✏️ Edit Flashcard Deck';
    document.getElementById('deck-input-title').value = deck.title;
    document.getElementById('deck-input-category').value = deck.category || '';
    document.getElementById('deck-input-desc').value = deck.description || '';

    renderDeckEditorCards();
    document.getElementById('modal-deck-editor').classList.remove('hidden');
  }

  function renderDeckEditorCards() {
    const list = document.getElementById('cards-editor-scroll-list');
    list.innerHTML = '';
    document.getElementById('deck-cards-count-badge').textContent = state.editorDeckCards.length;

    state.editorDeckCards.forEach((card, idx) => {
      const row = document.createElement('div');
      row.className = 'card-edit-row';
      row.innerHTML = `
        <button type="button" class="row-delete-btn" data-idx="${idx}" title="Remove Card">✕</button>
        <div class="form-row-2">
          <div class="setting-group">
            <label>Front / Question ${idx + 1} *</label>
            <input type="text" class="custom-input card-front-input" data-idx="${idx}" value="${escapeHtml(card.front)}" placeholder="Front prompt" required>
          </div>
          <div class="setting-group">
            <label>Back / Answer ${idx + 1} *</label>
            <input type="text" class="custom-input card-back-input" data-idx="${idx}" value="${escapeHtml(card.back)}" placeholder="Back answer" required>
          </div>
        </div>
        <div class="setting-group">
          <label>Hint (Optional)</label>
          <input type="text" class="custom-input card-hint-input" data-idx="${idx}" value="${escapeHtml(card.hint || '')}" placeholder="Helpful memory clue">
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('.row-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        state.editorDeckCards.splice(idx, 1);
        renderDeckEditorCards();
      });
    });

    list.querySelectorAll('.card-front-input').forEach(input => {
      input.addEventListener('input', (e) => {
        state.editorDeckCards[e.target.dataset.idx].front = e.target.value;
      });
    });

    list.querySelectorAll('.card-back-input').forEach(input => {
      input.addEventListener('input', (e) => {
        state.editorDeckCards[e.target.dataset.idx].back = e.target.value;
      });
    });

    list.querySelectorAll('.card-hint-input').forEach(input => {
      input.addEventListener('input', (e) => {
        state.editorDeckCards[e.target.dataset.idx].hint = e.target.value;
      });
    });
  }

  function addCardRowToDeckEditor() {
    playClick();
    state.editorDeckCards.push({
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      front: '',
      back: '',
      hint: '',
      mastered: false
    });
    renderDeckEditorCards();
    const list = document.getElementById('cards-editor-scroll-list');
    list.scrollTop = list.scrollHeight;
  }

  function saveDeckFromModal() {
    const title = document.getElementById('deck-input-title').value.trim();
    const category = document.getElementById('deck-input-category').value.trim();
    const desc = document.getElementById('deck-input-desc').value.trim();

    if (!title || !category) {
      showToast('Please provide both Title and Category for the deck.', 'warning');
      return;
    }

    // Filter valid cards
    const validCards = state.editorDeckCards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      showToast('Please add at least 1 valid card with both front and back text.', 'warning');
      return;
    }

    if (state.editingDeckId) {
      // Update existing
      const deck = state.decks.find(d => d.id === state.editingDeckId);
      if (deck) {
        deck.title = title;
        deck.category = category;
        deck.description = desc;
        deck.cards = validCards;
      }
      showToast('Deck updated successfully!', 'success');
    } else {
      // Create new
      const newDeck = {
        id: 'deck_' + Date.now(),
        title: title,
        category: category,
        description: desc,
        cards: validCards
      };
      state.decks.unshift(newDeck);
      showToast('New deck created!', 'success');
    }

    saveAllData();
    renderDecks();
    closeAllModals();
  }

  function deleteDeck(deckId) {
    if (!confirm('Are you sure you want to delete this deck? This action cannot be undone.')) return;
    playClick();
    state.decks = state.decks.filter(d => d.id !== deckId);
    saveAllData();
    renderDecks();
    showToast('Deck deleted.', 'info');
  }

  // ==========================================
  // QUIZ MASTER SYSTEM
  // ==========================================
  function renderQuizzes() {
    const grid = document.getElementById('quiz-cards-grid');
    grid.innerHTML = '';

    if (state.quizzes.length === 0) {
      grid.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📝</div>
          <h3>No Quizzes Created Yet</h3>
          <p class="text-muted" style="margin: 0.5rem 0 1.25rem;">Create a custom quiz or automatically generate one from your flashcards!</p>
          <button class="control-btn primary-btn" id="btn-empty-create-quiz">Create Quiz</button>
        </div>
      `;
      const btn = document.getElementById('btn-empty-create-quiz');
      if (btn) btn.addEventListener('click', openCreateQuizModal);
      return;
    }

    state.quizzes.forEach(quiz => {
      const card = document.createElement('div');
      card.className = 'quiz-item-card';

      const bestScore = quiz.bestScore !== undefined ? `${quiz.bestScore}%` : 'Not taken';

      card.innerHTML = `
        <div class="deck-card-top">
          <div class="deck-tags-row">
            <span class="category-tag">${escapeHtml(quiz.category || 'General')}</span>
            <span class="card-count-tag">${quiz.questions.length} questions</span>
          </div>
          <h3 class="deck-item-title">${escapeHtml(quiz.title)}</h3>
          <p class="deck-item-desc">${escapeHtml(quiz.description || 'Test your speed and precision.')}</p>
        </div>
        <div class="deck-card-bottom">
          <div class="deck-mastery-wrap">
            <span>Best Score</span>
            <strong>${bestScore}</strong>
          </div>
          <div class="deck-card-actions">
            <button class="control-btn primary-btn btn-take-quiz" data-quiz-id="${quiz.id}" style="flex: 1;">
              Take Quiz
            </button>
            <button class="control-btn secondary-btn btn-edit-quiz" data-quiz-id="${quiz.id}" title="Edit Quiz">
              ✏️
            </button>
            <button class="control-btn secondary-btn btn-delete-quiz" data-quiz-id="${quiz.id}" title="Delete Quiz">
              🗑️
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    grid.querySelectorAll('.btn-take-quiz').forEach(btn => {
      btn.addEventListener('click', () => startQuizSession(btn.dataset.quizId));
    });

    grid.querySelectorAll('.btn-edit-quiz').forEach(btn => {
      btn.addEventListener('click', () => openEditQuizModal(btn.dataset.quizId));
    });

    grid.querySelectorAll('.btn-delete-quiz').forEach(btn => {
      btn.addEventListener('click', () => deleteQuiz(btn.dataset.quizId));
    });
  }

  function startQuizSession(quizId) {
    playClick();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz || quiz.questions.length === 0) {
      showToast('This quiz has no questions! Add questions first.', 'warning');
      return;
    }

    state.activeQuiz = {
      quiz: quiz,
      questions: quiz.questions,
      currentIndex: 0,
      score: 0,
      userAnswers: [],
      timerInterval: null,
      elapsedSeconds: 0,
      hasAnsweredCurrent: false
    };

    document.getElementById('quiz-list-view').classList.add('hidden');
    document.getElementById('quiz-results-view').classList.add('hidden');
    document.getElementById('quiz-play-view').classList.remove('hidden');

    document.getElementById('active-quiz-title').textContent = quiz.title;

    // Start timer ticker
    startQuizTimer();
    renderCurrentQuizQuestion();
  }

  function startQuizTimer() {
    clearInterval(state.activeQuiz.timerInterval);
    state.activeQuiz.elapsedSeconds = 0;
    const timerElem = document.getElementById('quiz-elapsed-time');

    state.activeQuiz.timerInterval = setInterval(() => {
      state.activeQuiz.elapsedSeconds++;
      const m = Math.floor(state.activeQuiz.elapsedSeconds / 60);
      const s = state.activeQuiz.elapsedSeconds % 60;
      timerElem.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
  }

  function renderCurrentQuizQuestion() {
    const qState = state.activeQuiz;
    const q = qState.questions[qState.currentIndex];
    qState.hasAnsweredCurrent = false;

    // Counter & progress bar
    const curIdx = qState.currentIndex + 1;
    const total = qState.questions.length;
    document.getElementById('quiz-question-counter').textContent = `Question ${curIdx} of ${total}`;
    document.getElementById('question-badge').textContent = `Q${curIdx}`;
    document.getElementById('quiz-progress-fill').style.width = `${Math.round((curIdx / total) * 100)}%`;

    document.getElementById('quiz-question-text').textContent = q.question;

    // Ticker score
    document.getElementById('quiz-live-score').textContent = qState.score;
    document.getElementById('quiz-total-answered').textContent = qState.currentIndex;

    // Hide feedback box & next button
    document.getElementById('quiz-explanation-box').classList.add('hidden');
    document.getElementById('btn-quiz-next').classList.add('hidden');

    // Populate options
    const optionsContainer = document.getElementById('quiz-options-list');
    optionsContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    q.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `
        <span class="opt-letter">${letters[idx] || (idx + 1)}</span>
        <span class="opt-text">${escapeHtml(optText)}</span>
      `;
      btn.addEventListener('click', () => handleOptionSelection(idx));
      optionsContainer.appendChild(btn);
    });
  }

  function handleOptionSelection(selectedIdx) {
    const qState = state.activeQuiz;
    if (qState.hasAnsweredCurrent) return;
    qState.hasAnsweredCurrent = true;

    const q = qState.questions[qState.currentIndex];
    const isCorrect = selectedIdx === q.correctIndex;

    const optionButtons = document.querySelectorAll('.quiz-opt-btn');
    optionButtons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correctIndex) {
        btn.classList.add('correct');
      }
      if (idx === selectedIdx && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    if (isCorrect) {
      playSuccess();
      qState.score++;
    } else {
      playError();
    }

    // Save record for review
    qState.userAnswers.push({
      question: q.question,
      options: q.options,
      selectedIdx: selectedIdx,
      correctIdx: q.correctIndex,
      wasCorrect: isCorrect,
      explanation: q.explanation
    });

    // Update live score display
    document.getElementById('quiz-live-score').textContent = qState.score;
    document.getElementById('quiz-total-answered').textContent = qState.currentIndex + 1;

    // Reveal explanation box
    const expBox = document.getElementById('quiz-explanation-box');
    const expHeader = document.getElementById('explanation-header');
    const expIcon = document.getElementById('explanation-icon');
    const expTitle = document.getElementById('explanation-title');
    const expText = document.getElementById('explanation-text');

    expBox.classList.remove('hidden');
    if (isCorrect) {
      expHeader.className = 'explanation-header correct-header';
      expIcon.textContent = '✓';
      expTitle.textContent = 'Correct! Brilliant work!';
    } else {
      expHeader.className = 'explanation-header wrong-header';
      expIcon.textContent = '✕';
      expTitle.textContent = `Not quite! Correct answer: ${q.options[q.correctIndex]}`;
    }

    expText.textContent = q.explanation || 'Great effort! Keep practicing to reinforce memory retention.';

    // Show Next button
    const nextBtn = document.getElementById('btn-quiz-next');
    nextBtn.classList.remove('hidden');
    if (qState.currentIndex === qState.questions.length - 1) {
      nextBtn.innerHTML = 'See Results <span>🏆</span>';
    } else {
      nextBtn.innerHTML = 'Next Question <span>→</span>';
    }
  }

  function nextQuizQuestion() {
    playClick();
    const qState = state.activeQuiz;
    if (qState.currentIndex < qState.questions.length - 1) {
      qState.currentIndex++;
      renderCurrentQuizQuestion();
    } else {
      finishQuizSession();
    }
  }

  function finishQuizSession() {
    const qState = state.activeQuiz;
    clearInterval(qState.timerInterval);

    const total = qState.questions.length;
    const percent = Math.round((qState.score / total) * 100);

    // Save best score to quiz
    if (qState.quiz.bestScore === undefined || percent > qState.quiz.bestScore) {
      qState.quiz.bestScore = percent;
    }

    // Stats updating
    state.stats.quizzesCompleted++;
    state.stats.totalQuizScorePercent += percent;
    saveAllData();
    renderStatsView();

    // Show Results view
    document.getElementById('quiz-play-view').classList.add('hidden');
    document.getElementById('quiz-results-view').classList.remove('hidden');

    document.getElementById('results-percentage').textContent = `${percent}%`;
    document.getElementById('results-fraction').textContent = `${qState.score} of ${total} correct`;

    const mins = Math.floor(qState.elapsedSeconds / 60);
    const secs = qState.elapsedSeconds % 60;
    document.getElementById('results-time-taken').textContent = `${mins}m ${secs}s`;
    document.getElementById('results-accuracy').textContent = `${percent}%`;

    // Buddy evaluation
    const ratingElem = document.getElementById('results-buddy-rating');
    const badgeEmoji = document.getElementById('results-badge-emoji');
    const titleElem = document.getElementById('results-grade-title');
    const subtitleElem = document.getElementById('results-grade-subtitle');

    if (percent === 100) {
      ratingElem.textContent = '👑 Flawless Master!';
      badgeEmoji.textContent = '🌟';
      titleElem.textContent = 'Perfect Score!';
      subtitleElem.textContent = 'Unbelievable precision! You\'ve mastered this topic completely.';
      triggerConfetti();
      playSuccess();
    } else if (percent >= 75) {
      ratingElem.textContent = '🌟 Brilliant';
      badgeEmoji.textContent = '🎉';
      titleElem.textContent = 'Outstanding Work!';
      subtitleElem.textContent = 'You have a fantastic grasp of this subject matter!';
      triggerConfetti();
      playSuccess();
    } else if (percent >= 50) {
      ratingElem.textContent = '👍 Good Effort';
      badgeEmoji.textContent = '📚';
      titleElem.textContent = 'Good Job!';
      subtitleElem.textContent = 'Solid foundation. Review the missed questions below to solidify recall.';
    } else {
      ratingElem.textContent = '🌱 Keep Growing';
      badgeEmoji.textContent = '💡';
      titleElem.textContent = 'Keep Practicing!';
      subtitleElem.textContent = 'Mistakes are the seeds of learning. Review the answers below and try again!';
    }

    // Render detailed questions review
    const reviewList = document.getElementById('quiz-review-list');
    reviewList.innerHTML = '';

    qState.userAnswers.forEach((ans, idx) => {
      const item = document.createElement('div');
      item.className = `review-item ${ans.wasCorrect ? 'was-correct' : 'was-wrong'}`;
      item.innerHTML = `
        <div class="review-q-text">Q${idx + 1}: ${escapeHtml(ans.question)}</div>
        <div class="review-ans-row">
          <span>Your answer: <strong>${escapeHtml(ans.options[ans.selectedIdx])}</strong></span>
          ${!ans.wasCorrect ? `<br><span style="color: #34d399;">Correct answer: <strong>${escapeHtml(ans.options[ans.correctIdx])}</strong></span>` : ''}
        </div>
        ${ans.explanation ? `<div style="margin-top: 0.35rem; font-size: 0.78rem; color: var(--text-dim);">${escapeHtml(ans.explanation)}</div>` : ''}
      `;
      reviewList.appendChild(item);
    });
  }

  function quitQuiz() {
    if (!confirm('Are you sure you want to exit this quiz session? Progress will be lost.')) return;
    playClick();
    clearInterval(state.activeQuiz.timerInterval);
    document.getElementById('quiz-play-view').classList.add('hidden');
    document.getElementById('quiz-results-view').classList.add('hidden');
    document.getElementById('quiz-list-view').classList.remove('hidden');
    renderQuizzes();
  }

  // Quiz Editor & Creator Modal
  function openCreateQuizModal() {
    playClick();
    state.editingQuizId = null;
    state.editorQuizQuestions = [
      {
        id: 'nq1',
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ];

    document.getElementById('quiz-modal-title').textContent = '📝 Create Custom Quiz';
    document.getElementById('quiz-input-title').value = '';
    document.getElementById('quiz-input-category').value = '';
    document.getElementById('quiz-input-desc').value = '';

    renderQuizEditorQuestions();
    document.getElementById('modal-quiz-editor').classList.remove('hidden');
  }

  function openEditQuizModal(quizId) {
    playClick();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    state.editingQuizId = quizId;
    state.editorQuizQuestions = quiz.questions.map(q => ({
      ...q,
      options: [...q.options]
    }));

    document.getElementById('quiz-modal-title').textContent = '✏️ Edit Custom Quiz';
    document.getElementById('quiz-input-title').value = quiz.title;
    document.getElementById('quiz-input-category').value = quiz.category || '';
    document.getElementById('quiz-input-desc').value = quiz.description || '';

    renderQuizEditorQuestions();
    document.getElementById('modal-quiz-editor').classList.remove('hidden');
  }

  function renderQuizEditorQuestions() {
    const list = document.getElementById('questions-editor-scroll-list');
    list.innerHTML = '';
    document.getElementById('quiz-questions-count-badge').textContent = state.editorQuizQuestions.length;

    state.editorQuizQuestions.forEach((q, qIdx) => {
      const box = document.createElement('div');
      box.className = 'question-edit-box';

      box.innerHTML = `
        <button type="button" class="row-delete-btn" data-qidx="${qIdx}" title="Delete Question">✕</button>
        <div class="setting-group">
          <label>Question ${qIdx + 1} *</label>
          <input type="text" class="custom-input q-text-input" data-qidx="${qIdx}" value="${escapeHtml(q.question)}" placeholder="Enter question..." required>
        </div>
        <div class="setting-group">
          <label>Options (Select radio for correct answer) *</label>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${[0, 1, 2, 3].map(optIdx => `
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="radio" name="correct_opt_${qIdx}" value="${optIdx}" ${q.correctIndex === optIdx ? 'checked' : ''} class="q-correct-radio" data-qidx="${qIdx}">
                <input type="text" class="custom-input q-opt-input" data-qidx="${qIdx}" data-oidx="${optIdx}" value="${escapeHtml(q.options[optIdx] || '')}" placeholder="Option ${optIdx + 1}" style="flex: 1;">
              </div>
            `).join('')}
          </div>
        </div>
        <div class="setting-group">
          <label>Explanation / Learning Note (Optional)</label>
          <input type="text" class="custom-input q-exp-input" data-qidx="${qIdx}" value="${escapeHtml(q.explanation || '')}" placeholder="Why is this answer correct?">
        </div>
      `;

      list.appendChild(box);
    });

    list.querySelectorAll('.row-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.dataset.qidx, 10);
        state.editorQuizQuestions.splice(qIdx, 1);
        renderQuizEditorQuestions();
      });
    });

    list.querySelectorAll('.q-text-input').forEach(input => {
      input.addEventListener('input', (e) => {
        state.editorQuizQuestions[e.target.dataset.qidx].question = e.target.value;
      });
    });

    list.querySelectorAll('.q-opt-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const qIdx = e.target.dataset.qidx;
        const oIdx = e.target.dataset.oidx;
        state.editorQuizQuestions[qIdx].options[oIdx] = e.target.value;
      });
    });

    list.querySelectorAll('.q-correct-radio').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const qIdx = e.target.dataset.qidx;
        state.editorQuizQuestions[qIdx].correctIndex = parseInt(e.target.value, 10);
      });
    });

    list.querySelectorAll('.q-exp-input').forEach(input => {
      input.addEventListener('input', (e) => {
        state.editorQuizQuestions[e.target.dataset.qidx].explanation = e.target.value;
      });
    });
  }

  function addQuestionToQuizEditor() {
    playClick();
    state.editorQuizQuestions.push({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    });
    renderQuizEditorQuestions();
    const list = document.getElementById('questions-editor-scroll-list');
    list.scrollTop = list.scrollHeight;
  }

  function saveQuizFromModal() {
    const title = document.getElementById('quiz-input-title').value.trim();
    const category = document.getElementById('quiz-input-category').value.trim();
    const desc = document.getElementById('quiz-input-desc').value.trim();

    if (!title || !category) {
      showToast('Please provide both Title and Category for the quiz.', 'warning');
      return;
    }

    const validQuestions = state.editorQuizQuestions.filter(q => {
      const hasQ = q.question.trim() !== '';
      const validOpts = q.options.filter(o => o.trim() !== '');
      return hasQ && validOpts.length >= 2;
    });

    if (validQuestions.length === 0) {
      showToast('Please add at least 1 valid question with at least 2 options.', 'warning');
      return;
    }

    if (state.editingQuizId) {
      const quiz = state.quizzes.find(q => q.id === state.editingQuizId);
      if (quiz) {
        quiz.title = title;
        quiz.category = category;
        quiz.description = desc;
        quiz.questions = validQuestions;
      }
      showToast('Quiz updated!', 'success');
    } else {
      const newQuiz = {
        id: 'quiz_' + Date.now(),
        title: title,
        category: category,
        description: desc,
        questions: validQuestions
      };
      state.quizzes.unshift(newQuiz);
      showToast('New quiz created!', 'success');
    }

    saveAllData();
    renderQuizzes();
    closeAllModals();
  }

  function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    playClick();
    state.quizzes = state.quizzes.filter(q => q.id !== quizId);
    saveAllData();
    renderQuizzes();
    showToast('Quiz deleted.', 'info');
  }

  // AUTO GENERATE QUIZ FROM FLASHCARDS
  function openAutoQuizModal() {
    playClick();
    const select = document.getElementById('auto-quiz-deck-select');
    select.innerHTML = '';

    if (state.decks.length === 0) {
      showToast('No flashcard decks found. Create a deck first!', 'warning');
      return;
    }

    state.decks.forEach(deck => {
      const opt = document.createElement('option');
      opt.value = deck.id;
      opt.textContent = `${deck.title} (${deck.cards.length} cards)`;
      select.appendChild(opt);
    });

    document.getElementById('modal-auto-quiz').classList.remove('hidden');
  }

  function generateQuizFromDeck(deckId) {
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck || deck.cards.length < 2) {
      showToast('You need at least 2 flashcards in this deck to generate a quiz.', 'warning');
      return;
    }

    // Transform flashcards into quiz questions
    const questions = deck.cards.map((card, idx) => {
      const otherCards = deck.cards.filter((_, i) => i !== idx);
      // Pick up to 3 random distractors from other cards
      const shuffledOthers = otherCards.sort(() => 0.5 - Math.random());
      const distractors = shuffledOthers.slice(0, 3).map(c => c.back);

      const allOptions = [card.back, ...distractors].sort(() => 0.5 - Math.random());
      const correctIdx = allOptions.indexOf(card.back);

      return {
        id: 'auto_q_' + card.id,
        question: card.front,
        options: allOptions,
        correctIndex: correctIdx,
        explanation: card.hint ? `Hint reference: ${card.hint}` : `Recall answer: ${card.back}`
      };
    });

    const generatedQuiz = {
      id: 'quiz_auto_' + Date.now(),
      title: `${deck.title} — Flashcard Quiz`,
      category: deck.category || 'General',
      description: `Automatically compiled quiz from your "${deck.title}" flashcard deck.`,
      questions: questions
    };

    // Add to quizzes if not duplicate
    state.quizzes.unshift(generatedQuiz);
    saveAllData();
    renderQuizzes();
    closeAllModals();

    // Switch to quiz tab and start immediately!
    switchTab('quiz');
    startQuizSession(generatedQuiz.id);
    showToast('✨ Generated quiz from flashcards! Good luck!', 'success');
  }

  // ==========================================
  // BUDDY & STATS SYSTEM
  // ==========================================
  function updateBuddyVisuals() {
    const avatar = state.buddy.avatar;
    const name = state.buddy.name;
    const mascotSvg = document.getElementById('buddy-mascot');
    const nameDisplay = document.getElementById('buddy-name-display');

    if (nameDisplay) {
      nameDisplay.textContent = `${name} (${state.buddy.avatar.toUpperCase()})`;
    }

    // Switch mascot avatar color / face details
    if (mascotSvg) {
      if (avatar === 'owl') {
        mascotSvg.innerHTML = `
          <!-- Owl SVG -->
          <circle cx="80" cy="85" r="55" fill="#6366f1" />
          <circle cx="80" cy="95" r="40" fill="#e0e7ff" />
          <!-- Owl Big Eyes -->
          <circle cx="58" cy="75" r="18" fill="#ffffff" stroke="#4338ca" stroke-width="4" />
          <circle cx="102" cy="75" r="18" fill="#ffffff" stroke="#4338ca" stroke-width="4" />
          <circle cx="60" cy="75" r="8" fill="#1e1b4b" />
          <circle cx="100" cy="75" r="8" fill="#1e1b4b" />
          <!-- Beak -->
          <polygon points="74,88 86,88 80,102" fill="#f59e0b" />
          <!-- Feathers / Tuft -->
          <polygon points="45,35 60,50 35,55" fill="#4f46e5" />
          <polygon points="115,35 100,50 125,55" fill="#4f46e5" />
        `;
      } else if (avatar === 'robot') {
        mascotSvg.innerHTML = `
          <!-- Robot SVG -->
          <rect x="35" y="45" width="90" height="80" rx="18" fill="#06b6d4" />
          <!-- Antenna -->
          <line x1="80" y1="45" x2="80" y2="25" stroke="#0891b2" stroke-width="6" stroke-linecap="round" />
          <circle cx="80" cy="20" r="8" fill="#f43f5e" />
          <!-- Screen visor -->
          <rect x="45" y="60" width="70" height="35" rx="8" fill="#0f172a" />
          <circle cx="62" cy="77" r="6" fill="#38bdf8" />
          <circle cx="98" cy="77" r="6" fill="#38bdf8" />
          <path d="M 68 108 Q 80 116 92 108" stroke="#164e63" stroke-width="3" stroke-linecap="round" fill="none" />
        `;
      } else if (avatar === 'cat') {
        mascotSvg.innerHTML = `
          <!-- Cat SVG -->
          <polygon points="35,65 25,25 65,45" fill="#a855f7" />
          <polygon points="125,65 135,25 95,45" fill="#a855f7" />
          <circle cx="80" cy="85" r="55" fill="#c084fc" />
          <circle cx="60" cy="80" r="7" fill="#1e1b4b" />
          <circle cx="100" cy="80" r="7" fill="#1e1b4b" />
          <polygon points="76,92 84,92 80,98" fill="#fda4af" />
          <path d="M 74 100 Q 80 106 86 100" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <!-- Whiskers -->
          <line x1="30" y1="90" x2="52" y2="92" stroke="#ffffff" stroke-width="2" />
          <line x1="30" y1="100" x2="52" y2="98" stroke="#ffffff" stroke-width="2" />
          <line x1="130" y1="90" x2="108" y2="92" stroke="#ffffff" stroke-width="2" />
          <line x1="130" y1="100" x2="108" y2="98" stroke="#ffffff" stroke-width="2" />
        `;
      } else {
        // Fox (Default)
        mascotSvg.innerHTML = `
          <polygon points="40,60 20,15 65,35" fill="#f97316" class="ear-left" />
          <polygon points="45,55 30,25 60,40" fill="#fde047" />
          <polygon points="120,60 140,15 95,35" fill="#f97316" class="ear-right" />
          <polygon points="115,55 130,25 100,40" fill="#fde047" />
          <circle cx="80" cy="85" r="55" fill="#fb923c" />
          <path d="M 40 85 C 40 120 70 130 80 130 C 90 130 120 120 120 85 C 120 65 105 80 80 90 C 55 80 40 65 40 85 Z" fill="#ffffff" />
          <g id="buddy-eyes" class="buddy-eyes">
            <circle cx="60" cy="85" r="6" fill="#1e1b4b" />
            <circle cx="100" cy="85" r="6" fill="#1e1b4b" />
            <circle cx="62" cy="83" r="2" fill="#ffffff" />
            <circle cx="102" cy="83" r="2" fill="#ffffff" />
          </g>
          <ellipse cx="50" cy="98" rx="7" ry="4" fill="#fda4af" opacity="0.8" />
          <ellipse cx="110" cy="98" rx="7" ry="4" fill="#fda4af" opacity="0.8" />
          <polygon points="76,100 84,100 80,105" fill="#1e1b4b" />
          <path d="M 74 110 Q 80 116 86 110" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" fill="none" />
        `;
      }
    }

    // Avatar pick buttons in Stats view
    document.querySelectorAll('.avatar-pick-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.avatar === state.buddy.avatar);
    });

    const nameInput = document.getElementById('buddy-name-input');
    if (nameInput) nameInput.value = state.buddy.name;

    const personaSelect = document.getElementById('buddy-personality-select');
    if (personaSelect) personaSelect.value = state.buddy.personality;
  }

  function setRandomBuddyQuote() {
    const quotes = window.BUDDY_QUOTES || [
      '“Focus is the superpower that unlocks any skill.” ⚡',
      '“Small steps every day compound into mastery.” 🌟'
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('buddy-quote-text').textContent = quote;
  }

  function renderStatsView() {
    const stats = state.stats;

    // Total focus time
    const totalMinutes = Math.floor(stats.totalFocusSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    document.getElementById('stats-total-time').textContent = `${hours} hrs ${remainingMins} mins`;

    // Total Pomodoros
    document.getElementById('stats-total-pomos').textContent = stats.completedPomodoros;

    // Flashcard Mastery
    let totalCardsCount = 0;
    let totalCardsMastered = 0;
    state.decks.forEach(d => {
      totalCardsCount += d.cards.length;
      totalCardsMastered += d.cards.filter(c => c.mastered).length;
    });

    document.getElementById('stats-cards-mastered').textContent = `${totalCardsMastered} / ${totalCardsCount}`;
    const cardPercent = totalCardsCount > 0 ? Math.round((totalCardsMastered / totalCardsCount) * 100) : 0;
    document.getElementById('stats-mastery-percent').textContent = `${cardPercent}% overall mastery`;

    // Quiz average
    const avgScore = stats.quizzesCompleted > 0 ? Math.round(stats.totalQuizScorePercent / stats.quizzesCompleted) : 0;
    document.getElementById('stats-quiz-avg').textContent = `${avgScore}%`;
    document.getElementById('stats-quizzes-taken').textContent = `${stats.quizzesCompleted} quizzes taken`;

    // Daily Target
    const dailyTargetPomos = 4;
    document.getElementById('daily-goal-fraction').textContent = `${stats.todayPomodoros} / ${dailyTargetPomos} Pomodoros`;
    const dailyGoalPercent = Math.min(100, Math.round((stats.todayPomodoros / dailyTargetPomos) * 100));
    document.getElementById('daily-goal-fill').style.width = `${dailyGoalPercent}%`;

    // Streak
    document.getElementById('streak-days-count').textContent = stats.streakDays;
  }

  // ==========================================
  // CONFETTI CELEBRATION ENGINE
  // ==========================================
  function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#6366f1', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.4 - 50,
        r: Math.random() * 6 + 4,
        d: Math.random() * 40 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0
      });
    }

    let animationFrame;
    let frames = 0;

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frames++;

      pieces.forEach(p => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) * 0.8;
        p.tilt = Math.sin(p.tiltAngle - frames / 3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
        ctx.stroke();
      });

      if (frames < 140) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    }

    render();
  }

  // ==========================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================
  function switchTab(tabId) {
    playClick();
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isTarget = tab.dataset.tab === tabId;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${tabId}`);
    });

    if (tabId === 'flashcards') {
      renderDecks();
    } else if (tabId === 'quiz') {
      renderQuizzes();
    } else if (tabId === 'stats') {
      renderStatsView();
    }
  }

  // ==========================================
  // AMBIENT FOCUS AUDIO & SFX
  // ==========================================
  function setupAmbientControls() {
    const ambientBtn = document.getElementById('ambient-btn');
    const ambientMenu = document.getElementById('ambient-menu');
    const ambientVol = document.getElementById('ambient-vol');
    const ambientLabel = document.getElementById('ambient-label');

    ambientBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ambientMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      ambientMenu.classList.add('hidden');
    });

    ambientMenu.querySelectorAll('.ambient-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const soundType = opt.dataset.sound;
        ambientMenu.querySelectorAll('.ambient-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');

        if (window.soundEngine) {
          window.soundEngine.setAmbientSound(soundType, parseFloat(ambientVol.value));
        }

        const labels = {
          none: 'Silence',
          rain: 'Rain 🌧️',
          whitenoise: 'Pink Noise 💨',
          binaural: 'Alpha Waves 🧠'
        };
        ambientLabel.textContent = labels[soundType] || 'Silence';
        showToast(`Ambient audio: ${labels[soundType]}`, 'info');
      });
    });

    ambientVol.addEventListener('input', (e) => {
      if (window.soundEngine) {
        window.soundEngine.setAmbientVolume(parseFloat(e.target.value));
      }
    });

    // SFX toggle
    const sfxBtn = document.getElementById('sfx-toggle-btn');
    const sfxIcon = document.getElementById('sfx-icon');
    sfxBtn.addEventListener('click', () => {
      state.settings.soundEnabled = !state.settings.soundEnabled;
      updateSoundUI();
      saveAllData();
      showToast(state.settings.soundEnabled ? 'Sound Effects Enabled 🔊' : 'Sound Effects Muted 🔇', 'info');
    });
  }

  function updateSoundUI() {
    const sfxIcon = document.getElementById('sfx-icon');
    if (sfxIcon) {
      sfxIcon.textContent = state.settings.soundEnabled ? '🔊' : '🔇';
    }
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  function updateTheme(theme) {
    state.settings.theme = theme;
    document.body.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  function toggleTheme() {
    playClick();
    const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    updateTheme(nextTheme);
    saveAllData();
  }

  // ==========================================
  // BACKUP & RESTORE JSON
  // ==========================================
  function exportAllData() {
    playClick();
    const exportObject = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      decks: state.decks,
      quizzes: state.quizzes,
      stats: state.stats,
      buddy: state.buddy
    };

    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studybuddy_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
  }

  function importAllData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.decks) state.decks = data.decks;
        if (data.quizzes) state.quizzes = data.quizzes;
        if (data.settings) state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
        if (data.stats) state.stats = { ...DEFAULT_STATS, ...data.stats };
        if (data.buddy) state.buddy = { ...DEFAULT_BUDDY, ...data.buddy };

        saveAllData();
        renderAllViews();
        updateBuddyVisuals();
        updateTheme(state.settings.theme);
        showToast('Backup restored successfully!', 'success');
      } catch (err) {
        showToast('Invalid backup file. Import failed.', 'warning');
      }
    };
    reader.readAsText(file);
  }

  function exportDecksOnly() {
    playClick();
    const blob = new Blob([JSON.stringify(state.decks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studybuddy_decks_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Decks exported!', 'success');
  }

  function importDecksOnly(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedDecks = JSON.parse(e.target.result);
        if (Array.isArray(importedDecks)) {
          state.decks = [...importedDecks, ...state.decks];
          saveAllData();
          renderDecks();
          showToast(`Imported ${importedDecks.length} deck(s)!`, 'success');
        } else {
          showToast('Invalid decks format.', 'warning');
        }
      } catch (err) {
        showToast('Failed to parse decks JSON.', 'warning');
      }
    };
    reader.readAsText(file);
  }

  function resetAllData() {
    if (!confirm('CAUTION: This will reset all your custom decks, quizzes, and stats back to default. Continue?')) {
      return;
    }
    localStorage.clear();
    state.settings = { ...DEFAULT_SETTINGS };
    state.stats = { ...DEFAULT_STATS };
    state.buddy = { ...DEFAULT_BUDDY };
    state.decks = [...window.DEFAULT_DECKS];
    state.quizzes = [...window.DEFAULT_QUIZZES];
    saveAllData();
    renderAllViews();
    updateBuddyVisuals();
    updateTheme(state.settings.theme);
    showToast('All data has been reset to defaults.', 'info');
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.add('hidden'));
  }

  function renderAllViews() {
    renderDecks();
    renderQuizzes();
    renderStatsView();

    // Settings inputs
    document.getElementById('setting-focus-duration').value = state.settings.focusDuration;
    document.getElementById('setting-short-duration').value = state.settings.shortBreakDuration;
    document.getElementById('setting-long-duration').value = state.settings.longBreakDuration;
    document.getElementById('setting-long-interval').value = state.settings.longBreakInterval;
    document.getElementById('setting-auto-start-break').checked = state.settings.autoStartBreaks;
    document.getElementById('setting-auto-start-focus').checked = state.settings.autoStartFocus;

    // Update pill labels
    document.getElementById('pill-focus-min').textContent = state.settings.focusDuration;
    document.getElementById('pill-short-min').textContent = state.settings.shortBreakDuration;
    document.getElementById('pill-long-min').textContent = state.settings.longBreakDuration;
  }

  // ==========================================
  // EVENT LISTENERS SETUP
  // ==========================================
  function setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Theme Toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    // Settings Modal
    document.getElementById('settings-open-btn').addEventListener('click', () => {
      playClick();
      document.getElementById('modal-settings').classList.remove('hidden');
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        const modalId = btn.dataset.close;
        document.getElementById(modalId).classList.add('hidden');
      });
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      playClick();
      state.settings.focusDuration = parseInt(document.getElementById('setting-focus-duration').value, 10) || 25;
      state.settings.shortBreakDuration = parseInt(document.getElementById('setting-short-duration').value, 10) || 5;
      state.settings.longBreakDuration = parseInt(document.getElementById('setting-long-duration').value, 10) || 15;
      state.settings.longBreakInterval = parseInt(document.getElementById('setting-long-interval').value, 10) || 4;
      state.settings.autoStartBreaks = document.getElementById('setting-auto-start-break').checked;
      state.settings.autoStartFocus = document.getElementById('setting-auto-start-focus').checked;

      // Update pills
      document.getElementById('pill-focus-min').textContent = state.settings.focusDuration;
      document.getElementById('pill-short-min').textContent = state.settings.shortBreakDuration;
      document.getElementById('pill-long-min').textContent = state.settings.longBreakDuration;

      // Reset timer with new duration if not running
      if (!state.timer.isRunning) {
        setTimerMode(state.timer.mode);
      }

      saveAllData();
      closeAllModals();
      showToast('Settings saved!', 'success');
    });

    // Pomodoro Mode Switchers
    document.querySelectorAll('.mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        setTimerMode(btn.dataset.mode);
      });
    });

    // Pomodoro Controls
    document.getElementById('timer-play-btn').addEventListener('click', toggleTimer);
    document.getElementById('timer-reset-btn').addEventListener('click', resetTimer);
    document.getElementById('timer-skip-btn').addEventListener('click', skipTimer);
    document.getElementById('timer-plus5-btn').addEventListener('click', () => adjustTimerMinutes(5));
    document.getElementById('timer-minus5-btn').addEventListener('click', () => adjustTimerMinutes(-5));

    // Current task
    const taskInput = document.getElementById('current-task-input');
    const taskCheck = document.getElementById('task-completed-check');
    taskCheck.addEventListener('change', () => {
      if (taskCheck.checked) {
        playSuccess();
        triggerConfetti();
        showToast('🎯 Focus task completed! Great momentum!', 'success');
        taskInput.style.textDecoration = 'line-through';
        taskInput.style.opacity = '0.6';
      } else {
        taskInput.style.textDecoration = 'none';
        taskInput.style.opacity = '1';
      }
    });

    // Buddy Cheer / Poke
    document.getElementById('buddy-poke-btn').addEventListener('click', () => {
      playClick();
      setRandomBuddyQuote();
      const wrap = document.getElementById('buddy-avatar-wrapper');
      wrap.style.animation = 'buddyWiggle 0.6s ease';
      setTimeout(() => {
        wrap.style.animation = 'buddyIdle 4s ease-in-out infinite alternate';
      }, 600);
    });

    document.getElementById('refresh-quote-btn').addEventListener('click', () => {
      playClick();
      setRandomBuddyQuote();
    });

    // Flashcard Study Controls
    document.getElementById('card-flipper').addEventListener('click', flipFlashcard);
    document.getElementById('btn-card-flip').addEventListener('click', flipFlashcard);
    document.getElementById('btn-card-next').addEventListener('click', nextFlashcard);
    document.getElementById('btn-card-prev').addEventListener('click', prevFlashcard);
    document.getElementById('btn-mark-mastered').addEventListener('click', () => markCurrentCard(true));
    document.getElementById('btn-mark-learning').addEventListener('click', () => markCurrentCard(false));
    document.getElementById('btn-shuffle-deck').addEventListener('click', shuffleFlashcards);
    document.getElementById('btn-exit-study').addEventListener('click', exitFlashcardStudy);

    document.getElementById('card-hint-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      playClick();
      const hintText = document.getElementById('card-hint-text');
      hintText.classList.toggle('hidden');
    });

    // Flashcards Decks Toolbar
    document.getElementById('btn-create-deck').addEventListener('click', openCreateDeckModal);
    document.getElementById('btn-add-card-to-deck').addEventListener('click', addCardRowToDeckEditor);
    document.getElementById('btn-save-deck').addEventListener('click', saveDeckFromModal);

    document.getElementById('btn-export-decks').addEventListener('click', exportDecksOnly);
    const importDeckTrigger = document.getElementById('btn-import-decks-trigger');
    const importDeckInput = document.getElementById('import-deck-file-input');
    importDeckTrigger.addEventListener('click', () => importDeckInput.click());
    importDeckInput.addEventListener('change', (e) => {
      if (e.target.files[0]) importDecksOnly(e.target.files[0]);
    });

    // Deck Finished Screen Actions
    document.getElementById('btn-restart-deck').addEventListener('click', () => {
      if (state.flashcardStudy.deck) startStudySession(state.flashcardStudy.deck.id);
    });
    document.getElementById('btn-review-learning-only').addEventListener('click', () => {
      if (state.flashcardStudy.deck) startStudySession(state.flashcardStudy.deck.id, true);
    });
    document.getElementById('btn-generate-quiz-from-deck').addEventListener('click', () => {
      if (state.flashcardStudy.deck) generateQuizFromDeck(state.flashcardStudy.deck.id);
    });
    document.getElementById('btn-back-to-decks-list').addEventListener('click', exitFlashcardStudy);

    // Quiz Controls
    document.getElementById('btn-create-quiz').addEventListener('click', openCreateQuizModal);
    document.getElementById('btn-add-question-to-quiz').addEventListener('click', addQuestionToQuizEditor);
    document.getElementById('btn-save-quiz').addEventListener('click', saveQuizFromModal);
    document.getElementById('btn-quiz-from-flashcards').addEventListener('click', openAutoQuizModal);
    document.getElementById('btn-confirm-auto-quiz').addEventListener('click', () => {
      const select = document.getElementById('auto-quiz-deck-select');
      if (select.value) generateQuizFromDeck(select.value);
    });

    document.getElementById('btn-quit-quiz').addEventListener('click', quitQuiz);
    document.getElementById('btn-quiz-next').addEventListener('click', nextQuizQuestion);

    document.getElementById('btn-retake-quiz').addEventListener('click', () => {
      if (state.activeQuiz.quiz) startQuizSession(state.activeQuiz.quiz.id);
    });
    document.getElementById('btn-back-to-quizzes').addEventListener('click', () => {
      playClick();
      document.getElementById('quiz-results-view').classList.add('hidden');
      document.getElementById('quiz-list-view').classList.remove('hidden');
      renderQuizzes();
    });

    // Buddy Customizer in Stats View
    document.querySelectorAll('.avatar-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        state.buddy.avatar = btn.dataset.avatar;
        updateBuddyVisuals();
        saveAllData();
      });
    });

    document.getElementById('btn-save-buddy-name').addEventListener('click', () => {
      playClick();
      const val = document.getElementById('buddy-name-input').value.trim();
      if (val) {
        state.buddy.name = val;
        updateBuddyVisuals();
        saveAllData();
        showToast('Buddy name updated!', 'success');
      }
    });

    document.getElementById('buddy-personality-select').addEventListener('change', (e) => {
      state.buddy.personality = e.target.value;
      saveAllData();
      showToast('Companion personality updated!', 'info');
    });

    // Full Backup & Restore
    document.getElementById('btn-export-all-data').addEventListener('click', exportAllData);
    const importAllTrigger = document.getElementById('btn-import-all-data-trigger');
    const importAllInput = document.getElementById('import-all-file-input');
    importAllTrigger.addEventListener('click', () => importAllInput.click());
    importAllInput.addEventListener('change', (e) => {
      if (e.target.files[0]) importAllData(e.target.files[0]);
    });

    document.getElementById('btn-reset-all-data').addEventListener('click', resetAllData);

    // Ambient Controls
    setupAmbientControls();
  }

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      // Check if Flashcard Study is active
      const studyView = document.getElementById('deck-study-view');
      if (!studyView.classList.contains('hidden')) {
        if (e.code === 'Space') {
          e.preventDefault();
          flipFlashcard();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          nextFlashcard();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          prevFlashcard();
        } else if (e.key === '1') {
          e.preventDefault();
          markCurrentCard(false);
        } else if (e.key === '2') {
          e.preventDefault();
          markCurrentCard(true);
        }
        return;
      }

      // Check if Quiz is active
      const quizPlayView = document.getElementById('quiz-play-view');
      if (!quizPlayView.classList.contains('hidden')) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          handleOptionSelection(parseInt(e.key, 10) - 1);
        } else if (e.code === 'Enter') {
          const nextBtn = document.getElementById('btn-quiz-next');
          if (!nextBtn.classList.contains('hidden')) {
            e.preventDefault();
            nextQuizQuestion();
          }
        }
        return;
      }

      // Space to start/pause timer when on pomodoro tab
      const pomoView = document.getElementById('view-pomodoro');
      if (pomoView.classList.contains('active')) {
        if (e.code === 'Space') {
          e.preventDefault();
          toggleTimer();
        }
      }
    });
  }

  // Boot the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
