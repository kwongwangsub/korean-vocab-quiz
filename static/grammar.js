const setupScreen = document.getElementById("setup-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const bookSelect = document.getElementById("book-select");
const lessonSelect = document.getElementById("lesson-select");
const startBtn = document.getElementById("start-btn");
const setupMessage = document.getElementById("setup-message");

const quizProgress = document.getElementById("quiz-progress");
const quizPrompt = document.getElementById("quiz-prompt");
const answerInput = document.getElementById("grammar-answer-input");
const submitBtn = document.getElementById("submit-answer-btn");
const gradeMark = document.getElementById("grade-mark");
const correctAnswerBox = document.getElementById("grammar-correct-answer");

const resultBox = document.getElementById("result-box");
const finishBtn = document.getElementById("finish-btn");
const retryWrongBtn = document.getElementById("retry-wrong-btn");

let questions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongQuestions = [];
let answering = false;

async function startQuiz() {
  const book = bookSelect.value;
  const lesson = lessonSelect.value;

  setupMessage.innerHTML = "";
  startBtn.disabled = true;
  startBtn.textContent = "불러오는 중...";

  try {
    const res = await fetch(`/api/grammar-quiz?book=${book}&lesson=${lesson}`);
    const data = await res.json();

    if (!res.ok) {
      setupMessage.innerHTML = `<div class="msg error">${data.error}</div>`;
      return;
    }

    beginRound(data);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "테스트 시작";
  }
}

function beginRound(roundQuestions) {
  questions = roundQuestions;
  currentIndex = 0;
  correctCount = 0;
  wrongQuestions = [];

  setupScreen.style.display = "none";
  resultScreen.style.display = "none";
  quizScreen.style.display = "block";

  showQuestion();
}

function showQuestion() {
  answering = true;
  const q = questions[currentIndex];
  quizProgress.textContent = `${currentIndex + 1} / ${questions.length}`;
  quizPrompt.textContent = q.question;
  answerInput.value = "";
  answerInput.disabled = false;
  submitBtn.disabled = false;
  gradeMark.textContent = "";
  gradeMark.className = "grade-mark";
  correctAnswerBox.textContent = "";
  answerInput.focus();
}

function submitAnswer() {
  if (!answering) return;
  answering = false;

  const q = questions[currentIndex];
  const given = answerInput.value.trim();
  const isCorrect = given === q.answer;

  answerInput.disabled = true;
  submitBtn.disabled = true;

  if (isCorrect) {
    correctCount++;
    gradeMark.textContent = "O";
    gradeMark.classList.add("correct");
  } else {
    wrongQuestions.push(q);
    gradeMark.textContent = "X";
    gradeMark.classList.add("wrong");
    correctAnswerBox.textContent = `정답: ${q.answer}`;
  }

  setTimeout(() => {
    currentIndex++;
    if (currentIndex < questions.length) {
      showQuestion();
    } else {
      finishQuiz();
    }
  }, 2000);
}

function finishQuiz() {
  quizScreen.style.display = "none";
  resultScreen.style.display = "block";
  resultBox.textContent = `맞은 문제 수: ${correctCount} / 총 문제 수: ${questions.length}`;
  retryWrongBtn.disabled = wrongQuestions.length === 0;
}

startBtn.addEventListener("click", startQuiz);
submitBtn.addEventListener("click", submitAnswer);
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitAnswer();
});

finishBtn.addEventListener("click", () => {
  window.location.href = "/student";
});

retryWrongBtn.addEventListener("click", () => {
  if (wrongQuestions.length === 0) return;
  beginRound(wrongQuestions);
});
