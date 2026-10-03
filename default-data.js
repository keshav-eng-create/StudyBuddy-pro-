// Pre-configured sample decks and quizzes for Study Buddy
const DEFAULT_DECKS = [
  {
    id: "deck-study-tips",
    title: "🧠 Smart Learning Techniques",
    category: "Productivity",
    description: "Evidence-based memory, recall, and study strategies.",
    cards: [
      {
        id: "c1",
        front: "What is Active Recall?",
        back: "Testing yourself on information instead of passively reading or highlighting notes. It strengthens neural pathways and memory retention.",
        hint: "Think: retrieval vs passive review"
      },
      {
        id: "c2",
        front: "What is Spaced Repetition?",
        back: "Reviewing material at systematically increasing intervals over time to exploit the psychological spacing effect and beat the forgetting curve.",
        hint: "Spreading reviews over days and weeks"
      },
      {
        id: "c3",
        front: "What is the Feynman Technique?",
        back: "A 4-step model: 1) Pick a concept, 2) Explain it simply as if to a 10-year-old, 3) Identify gaps in understanding, 4) Refine and simplify.",
        hint: "Named after Nobel prize physicist Richard Feynman"
      },
      {
        id: "c4",
        front: "What is the Pomodoro Technique?",
        back: "A time management method using 25-minute focused work intervals separated by 5-minute short breaks to maintain peak mental sharpness.",
        hint: "Invented by Francesco Cirillo (named after a tomato timer)"
      },
      {
        id: "c5",
        front: "What is Interleaving in studying?",
        back: "Mixing different topics or types of problems within one study session rather than blocking one topic for hours. Boosts problem-solving adaptability.",
        hint: "Opposite of 'blocked' practice"
      }
    ]
  },
  {
    id: "deck-web-dev",
    title: "💻 Web Dev & JavaScript",
    category: "Programming",
    description: "Core concepts of frontend web development and JS runtime.",
    cards: [
      {
        id: "w1",
        front: "What is a Closure in JavaScript?",
        back: "A function bundled with references to its surrounding lexical environment, allowing the inner function to access an outer function's scope even after the outer function has returned.",
        hint: "Lexical scope retention"
      },
      {
        id: "w2",
        front: "What is the Event Loop?",
        back: "The mechanism in JS that constantly monitors the Call Stack and the Task Queue (Callback Queue). When the stack is empty, it pushes queued tasks to the stack for execution.",
        hint: "Coordinates asynchronous execution in single-threaded JS"
      },
      {
        id: "w3",
        front: "Difference between `localStorage` and `sessionStorage`?",
        back: "`localStorage` persists indefinitely until cleared explicitly, whereas `sessionStorage` data is cleared automatically when the browser tab/session ends.",
        hint: "Persistence across tab closing"
      },
      {
        id: "w4",
        front: "What does CSS `box-sizing: border-box` do?",
        back: "It includes padding and border within the element's total specified width and height, preventing unexpected layout overflows.",
        hint: "Affects width calculation"
      },
      {
        id: "w5",
        front: "What are Promises in JavaScript?",
        back: "Objects representing the eventual completion (or failure) of an asynchronous operation and its resulting value (Pending, Fulfilled, or Rejected).",
        hint: "Resolves with .then() or async/await"
      }
    ]
  }
];

const DEFAULT_QUIZZES = [
  {
    id: "quiz-learning",
    title: "Mastering Study Habits & Focus",
    category: "Learning Science",
    description: "Test your understanding of high-yield study techniques and cognitive focus.",
    questions: [
      {
        id: "q1",
        question: "Which of these study techniques has the highest proven impact on long-term retention?",
        options: [
          "Re-reading textbooks 3 times",
          "Highlighting key phrases in bright neon colors",
          "Active recall through flashcards and practice testing",
          "Listening to lecture recordings while sleeping"
        ],
        correctIndex: 2,
        explanation: "Cognitive psychology demonstrates that retrieving information actively produces far greater neural consolidation than passive reading."
      },
      {
        id: "q2",
        question: "In the standard Pomodoro Technique, how long is a standard focus sprint?",
        options: [
          "15 minutes",
          "25 minutes",
          "45 minutes",
          "60 minutes"
        ],
        correctIndex: 1,
        explanation: "The standard Pomodoro interval created by Francesco Cirillo is 25 minutes of undivided focus followed by a 5-minute break."
      },
      {
        id: "q3",
        question: "What is the primary benefit of 'Spaced Repetition'?",
        options: [
          "It minimizes the time spent studying by cramming all in one night",
          "It counters the Ebbinghaus forgetting curve by reviewing right before forgetting",
          "It forces you to study without taking any breaks",
          "It eliminates the need to understand core concepts"
        ],
        correctIndex: 1,
        explanation: "By reviewing material at spaced intervals, you reactivate memory traces just as they are fading, drastically flattening the forgetting curve."
      },
      {
        id: "q4",
        question: "What is the key insight of the Feynman Technique?",
        options: [
          "Using complex academic jargon to sound authoritative",
          "If you cannot explain a topic simply in plain language, you don't fully understand it yet",
          "Only studying topics with a physical blackboard",
          "Memorizing entire chapters word-for-word"
        ],
        correctIndex: 1,
        explanation: "Feynman argued that simplifying a concept forces you to dismantle the illusion of explanatory depth and identify exact knowledge gaps."
      }
    ]
  },
  {
    id: "quiz-js-fundamentals",
    title: "JavaScript Essentials Challenge",
    category: "Coding",
    description: "Check your knowledge of modern JavaScript concepts and fundamentals.",
    questions: [
      {
        id: "jq1",
        question: "What will `typeof null` return in JavaScript?",
        options: [
          "'null'",
          "'undefined'",
          "'object'",
          "'boolean'"
        ],
        correctIndex: 2,
        explanation: "In JavaScript, `typeof null === 'object'` due to a historical legacy bug in the original 1995 JS implementation."
      },
      {
        id: "jq2",
        question: "Which statement about `const` in JavaScript is TRUE?",
        options: [
          "Objects declared with `const` cannot have their internal properties mutated",
          "The variable identifier cannot be reassigned, but object properties can still be modified",
          "Variables declared with `const` are hoisted and initialized to undefined",
          "`const` has function scope just like `var`"
        ],
        correctIndex: 1,
        explanation: "`const` prevents reassignment of the variable binding, but object contents/properties remain mutable unless frozen with `Object.freeze()`."
      },
      {
        id: "jq3",
        question: "Where are Microtasks (like resolved Promise callbacks) processed in the Event Loop?",
        options: [
          "Immediately after the current call stack clears, before the next Macrotask (setTimeout/setInterval)",
          "At random intervals determined by the OS thread scheduler",
          "Only once per minute",
          "After all queued `setTimeout` callbacks run"
        ],
        correctIndex: 0,
        explanation: "The microtask queue has higher priority and empties completely before the event loop advances to the next macrotask."
      }
    ]
  }
];

const BUDDY_QUOTES = [
  "“You're capable of learning anything step by step!” 🌟",
  "“Deep focus is a superpower in a distracted world.” ⚡",
  "“Small daily improvements over time lead to stunning results.” 🚀",
  "“Take a deep breath. Focus on just this one session.” 🧘",
  "“Mistakes during quizzes are where real learning happens!” 💡",
  "“Consistency beats intensity every single time.” 🎯",
  "“Hydrate, sit up tall, and let's crush this session!” 💧",
  "“Brains are like muscles: the harder you think, the stronger they grow.” 🦾"
];

window.DEFAULT_DECKS = DEFAULT_DECKS;
window.DEFAULT_QUIZZES = DEFAULT_QUIZZES;
window.BUDDY_QUOTES = BUDDY_QUOTES;
