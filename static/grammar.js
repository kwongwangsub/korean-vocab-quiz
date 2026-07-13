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
const grammarReferenceBox = document.getElementById("grammar-reference");

const resultBox = document.getElementById("result-box");
const finishBtn = document.getElementById("finish-btn");
const retryWrongBtn = document.getElementById("retry-wrong-btn");

let questions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongQuestions = [];
let answering = false;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderGrammarReference(entries) {
  if (entries.length === 0) {
    grammarReferenceBox.innerHTML = "";
    return;
  }

  grammarReferenceBox.innerHTML = entries
    .map((entry) => {
      const groups = entry.rule_groups || [];
      const maxRows = Math.max(0, ...groups.map((g) => g.examples.length));

      const headerCells = groups
        .map((g) => `<th colspan="3">${escapeHtml(g.label)}</th>`)
        .join("");

      let bodyRows = "";
      for (let i = 0; i < maxRows; i++) {
        const cells = groups
          .map((g) => {
            const ex = g.examples[i];
            if (!ex) return "<td></td><td></td><td></td>";
            return `<td>${escapeHtml(ex.base)}</td><td class="arrow">→</td><td>${escapeHtml(ex.conjugated)}</td>`;
          })
          .join("");
        bodyRows += `<tr>${cells}</tr>`;
      }

      const table = groups.length
        ? `<table class="grammar-rule-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
        : "";

      return `
        <div class="grammar-ref-card">
          <h3>${escapeHtml(entry.title)}</h3>
          <div class="meaning">${escapeHtml(entry.meaning)}</div>
          ${table}
        </div>
      `;
    })
    .join("");
}

async function loadGrammarReference(book, lesson) {
  const res = await fetch(`/api/books/${book}/lessons/${lesson}/grammar-content`);
  const entries = res.ok ? await res.json() : [];
  renderGrammarReference(entries);
}

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

    await loadGrammarReference(book, lesson);
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
