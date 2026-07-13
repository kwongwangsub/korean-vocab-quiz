const setupScreen = document.getElementById("setup-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const bookSelect = document.getElementById("book-select");
const lessonSelect = document.getElementById("lesson-select");
const langSelect = document.getElementById("lang-select");
const startBtn = document.getElementById("start-btn");
const setupMessage = document.getElementById("setup-message");

const quizProgress = document.getElementById("quiz-progress");
const quizPrompt = document.getElementById("quiz-prompt");
const quizChoices = document.getElementById("quiz-choices");

const resultBox = document.getElementById("result-box");
const retryBtn = document.getElementById("retry-btn");

let questions = [];
let currentIndex = 0;
let correctCount = 0;
let answering = false;

async function startQuiz() {
  const book = bookSelect.value;
  const lesson = lessonSelect.value;
  const lang = langSelect.value;

  setupMessage.innerHTML = "";
  startBtn.disabled = true;
  startBtn.textContent = "불러오는 중...";

  try {
    const res = await fetch(`/api/quiz?book=${book}&lesson=${lesson}&lang=${lang}`);
    const data = await res.json();

    if (!res.ok) {
      setupMessage.innerHTML = `<div class="msg error">${data.error}</div>`;
      return;
    }

    questions = data;
    currentIndex = 0;
    correctCount = 0;

    setupScreen.style.display = "none";
    resultScreen.style.display = "none";
    quizScreen.style.display = "block";

    showQuestion();
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "테스트 시작";
  }
}

function showQuestion() {
  answering = true;
  const q = questions[currentIndex];
  quizProgress.textContent = `${currentIndex + 1} / ${questions.length}`;
  quizPrompt.textContent = q.prompt;
  quizChoices.innerHTML = "";

  for (const choice of q.choices) {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.onclick = () => selectAnswer(btn, choice, q.answer);
    quizChoices.appendChild(btn);
  }
}

function selectAnswer(btn, choice, answer) {
  if (!answering) return;
  answering = false;

  const allButtons = quizChoices.querySelectorAll(".choice-btn");
  allButtons.forEach((b) => (b.disabled = true));

  if (choice === answer) {
    btn.classList.add("correct");
    correctCount++;
  } else {
    btn.classList.add("wrong");
    allButtons.forEach((b) => {
      if (b.textContent === answer) b.classList.add("correct");
    });
  }

  setTimeout(() => {
    currentIndex++;
    if (currentIndex < questions.length) {
      showQuestion();
    } else {
      finishQuiz();
    }
  }, 800);
}

function finishQuiz() {
  quizScreen.style.display = "none";
  resultScreen.style.display = "block";
  resultBox.textContent = `정답: ${correctCount} / ${questions.length}`;
}

startBtn.addEventListener("click", startQuiz);
retryBtn.addEventListener("click", () => {
  resultScreen.style.display = "none";
  setupScreen.style.display = "block";
});
