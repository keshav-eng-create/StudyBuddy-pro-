*This is a submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01)*

# StudyBuddy PRO — A Zero-Distraction Study Companion Built for My Friend

## What I Built

I built **StudyBuddy PRO** for my best friend and study partner, Alex, who has been preparing for technical certification exams while juggling a demanding job. 

Alex struggled with two persistent problems that were destroying their study momentum:
1. **Tool fragmentation & context switching**: They bounced between three different apps every evening — a timer app, a flashcard app, and note-taking docs. Every context switch broke focus and introduced temptation to check social media or messages.
2. **Subscription walls, tracking, and noise**: Every commercial study app Alex tried bombarded them with upgrade popups, required cloud logins, had intrusive ads, or locked spaced-repetition and quiz generation behind costly monthly subscriptions.

Alex needed a **simple, beautiful, offline-first "all-in-one sanctuary"**:
- A **customizable Pomodoro timer** that adapts to their energy levels (Focus, Short Break, Long Break, with quick `+5m`/`-5m` adjustments).
- **Interactive 3D Flashcards** for active recall with memory hints and keyboard-first navigation (`Space` to flip, `1` for review, `2` for mastered).
- An **instant Quiz Master** that can automatically transform any flashcard deck into a timed multiple-choice practice test in a single click.
- **Synthesized ambient focus audio** (Rain, Pink Noise, and 14Hz Alpha waves) powered 100% offline via the Web Audio API — eliminating the need for Spotify, YouTube, or background streaming tabs.
- An animated **Study Buddy Mascot** (Fox, Owl, Robot, or Cat) that offers encouraging micro-interactions and tracks daily study streaks.

Everything runs entirely in the browser with local storage persistence. No accounts, no paywalls, no tracking — just pure, joyful focus.

---

## Demo

- **Live Local Demo**: The project runs locally with zero installation overhead — simply open `index.html` in any modern browser.
- **Repository**: [https://github.com/keshav-eng-create/StudyBuddy-pro-](https://github.com/keshav-eng-create/StudyBuddy-pro-)

### Key Highlights in Action:
- ⏱️ **Circular Pomodoro**: Dynamic SVG stroke animation with glowing mode accents (Indigo for focus, Emerald for short breaks, Cyan for long breaks).
- 🗂️ **3D Card Flip**: Realistic CSS 3D perspective transforms with instant flipping and smooth physics.
- 📝 **Auto-Quiz Generation**: Turn any deck into a multi-question quiz with instant explanations and celebration confetti.
- 🎧 **Offline Ambient Sound**: Pure programmatic audio synthesis (no external audio files needed).

---

## Code

{% github https://github.com/keshav-eng-create/StudyBuddy-pro- %}

The codebase is available on GitHub: [**keshav-eng-create/StudyBuddy-pro-**](https://github.com/keshav-eng-create/StudyBuddy-pro-)

It is engineered with lightweight, dependency-free vanilla web technologies for maximum portability and speed:

```
├── index.html         # Semantic structure, modal dialogs, SVG mascot components
├── style.css          # Glassmorphic dark/light design system & 3D CSS transforms
├── app.js             # State machine, Pomodoro ticker, flashcard & quiz engines
├── audio.js           # Web Audio API sound synthesizer (chimes, clicks, ambient noise)
├── default-data.js    # Preloaded learning science decks & web development quizzes
└── README.md          # Complete project overview & user guide
```

### Core Architecture Highlights:
- **Web Audio API Synth Engine**: In `audio.js`, rain and pink noise are generated on-the-fly using looped noise buffers and biquad filters, and Alpha waves are synthesized using phase-offset sine oscillators.
- **1-Click Flashcard-to-Quiz Compiler**: In `app.js`, the app analyzes deck cards, draws randomized distractors from companion cards, and synthesizes multiple-choice questions with automatic validation.
- **Full Data Sovereignty**: All decks, custom quizzes, progress history, and companion settings are saved to `localStorage` with full JSON Export and Import capabilities.

---

## How I Built It

I designed and built StudyBuddy PRO pair-programming with an agentic AI assistant using modern open-source web fundamentals:

1. **Architecture & Design**: Designed a high-aesthetic glassmorphic UI using Vanilla CSS tokens, modern typography (`Outfit` and `Plus Jakarta Sans`), and accessible ARIA attributes.
2. **Web Audio Engineering**: Instead of bundling heavy `.mp3` or `.wav` files that can fail offline or require external CDN hosting, we used the browser's native `AudioContext` to synthesize timer bells, button clicks, card flip whooshes, and focus soundscapes programmatically.
3. **Active Recall & Quiz Pipeline**: Built an algorithmic converter that turns user-created flashcard cards into 4-choice quizzes with distractors and explanations, helping my friend practice spaced testing without manual test preparation.
4. **Browser Subagent Verification**: Automated end-to-end testing verified timer increments, keyboard accessibility, 3D flip card responsiveness, and local storage retention.

---

## Why Does Open Innovation Matter?

Open innovation is what made building this tool for Alex possible in a single weekend:

- **Accessibility over Gatekeeping**: Commercial ed-tech often locks proven cognitive learning techniques (spaced repetition, flashcard quizzes) behind expensive subscriptions. Open-source tooling democratizes study aids for students and self-learners globally.
- **Privacy & Offline Resilience**: Closed cloud apps require personal logins and log telemetry on every interaction. With open, client-side web standards, my friend's study data, notes, and schedules remain entirely private on their local device, functioning even without an active internet connection.
- **Hackability & Customization**: Because the application is modular and open, Alex can import custom JSON decks, adjust timer algorithms, or adapt the codebase for their classmates and friends.

---

## My Agent Session

<!-- Optional: Embed your DevRelay transcript or agent session link -->
*Built collaboratively with AI pair programming.*
{% agent_session f9918ce5-f466-4510-869b-dff47cfa2839 %}

---

## Prize Categories

- **Hacktoberfest Weekend Challenge: Build for a Friend**

---

<!-- Team Submissions: Built by @your_username for Alex -->
*Thanks for organizing Hacktoberfest 2026!*
