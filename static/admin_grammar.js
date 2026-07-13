const bookSelect = document.getElementById("book-select");
const lessonSelect = document.getElementById("lesson-select");
const grammarNoSelect = document.getElementById("grammar-no-select");

const titleInput = document.getElementById("grammar-title");
const meaningInput = document.getElementById("grammar-meaning");
const ruleGroupsBox = document.getElementById("rule-groups");
const addGroupBtn = document.getElementById("add-group-btn");
const saveGrammarBtn = document.getElementById("save-grammar-btn");
const grammarMessage = document.getElementById("grammar-message");
const grammarList = document.getElementById("grammar-list");

const questionInput = document.getElementById("question-input");
const answerInput = document.getElementById("answer-input");
const addQuestionBtn = document.getElementById("add-question-btn");
const questionMessage = document.getElementById("question-message");
const questionTbody = document.getElementById("question-tbody");

let ruleGroups = [];

function emptyExample() {
  return { base: "", conjugated: "" };
}

function emptyGroup() {
  return { label: "", examples: [emptyExample()] };
}

function resetRuleGroups() {
  ruleGroups = [emptyGroup()];
  renderRuleGroups();
}

function renderRuleGroups() {
  ruleGroupsBox.innerHTML = "";

  ruleGroups.forEach((group, gi) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "rule-group";

    const header = document.createElement("div");
    header.className = "rule-group-header";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "규칙 그룹명 (예: 받침 O)";
    labelInput.value = group.label;
    labelInput.oninput = () => (ruleGroups[gi].label = labelInput.value);
    header.appendChild(labelInput);

    const removeGroupBtn = document.createElement("button");
    removeGroupBtn.textContent = "그룹 삭제";
    removeGroupBtn.className = "danger";
    removeGroupBtn.onclick = () => {
      ruleGroups.splice(gi, 1);
      if (ruleGroups.length === 0) ruleGroups.push(emptyGroup());
      renderRuleGroups();
    };
    header.appendChild(removeGroupBtn);

    groupDiv.appendChild(header);

    group.examples.forEach((ex, ei) => {
      const row = document.createElement("div");
      row.className = "example-row";

      const baseInput = document.createElement("input");
      baseInput.type = "text";
      baseInput.placeholder = "원형 (예: 읽다)";
      baseInput.value = ex.base;
      baseInput.oninput = () => (ruleGroups[gi].examples[ei].base = baseInput.value);
      row.appendChild(baseInput);

      const arrow = document.createElement("span");
      arrow.textContent = "→";
      row.appendChild(arrow);

      const conjInput = document.createElement("input");
      conjInput.type = "text";
      conjInput.placeholder = "활용형 (예: 읽으시다)";
      conjInput.value = ex.conjugated;
      conjInput.oninput = () => (ruleGroups[gi].examples[ei].conjugated = conjInput.value);
      row.appendChild(conjInput);

      const removeExBtn = document.createElement("button");
      removeExBtn.textContent = "삭제";
      removeExBtn.className = "danger";
      removeExBtn.onclick = () => {
        group.examples.splice(ei, 1);
        if (group.examples.length === 0) group.examples.push(emptyExample());
        renderRuleGroups();
      };
      row.appendChild(removeExBtn);

      groupDiv.appendChild(row);
    });

    const addExBtn = document.createElement("button");
    addExBtn.textContent = "+ 예시 추가";
    addExBtn.className = "secondary";
    addExBtn.onclick = () => {
      group.examples.push(emptyExample());
      renderRuleGroups();
    };
    groupDiv.appendChild(addExBtn);

    ruleGroupsBox.appendChild(groupDiv);
  });
}

addGroupBtn.addEventListener("click", () => {
  ruleGroups.push(emptyGroup());
  renderRuleGroups();
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadGrammarContent() {
  const book = bookSelect.value;
  const lesson = lessonSelect.value;
  const grammarNo = grammarNoSelect.value;
  const res = await fetch(`/api/books/${book}/lessons/${lesson}/grammar/${grammarNo}/content`);
  const entries = await res.json();

  grammarList.innerHTML = "";
  for (const entry of entries) {
    const card = document.createElement("div");
    card.className = "grammar-card";

    const groupsHtml = entry.rule_groups
      .map((g) => {
        const examplesText = g.examples.map((e) => `${e.base} → ${e.conjugated}`).join(", ");
        return `<div class="rule-group-view"><span class="label">${escapeHtml(g.label)}</span>: <span class="examples">${escapeHtml(examplesText)}</span></div>`;
      })
      .join("");

    card.innerHTML = `
      <h3>${escapeHtml(entry.title)}</h3>
      <div class="meaning">${escapeHtml(entry.meaning)}</div>
      ${groupsHtml}
    `;

    const delBtn = document.createElement("button");
    delBtn.textContent = "삭제";
    delBtn.className = "danger";
    delBtn.onclick = () => deleteGrammarContent(entry.id);
    card.appendChild(delBtn);

    grammarList.appendChild(card);
  }
}

async function saveGrammarContent() {
  const title = titleInput.value.trim();
  const meaning = meaningInput.value.trim();

  if (!title || !meaning) {
    grammarMessage.innerHTML = `<div class="msg error">문법과 의미를 입력하세요.</div>`;
    return;
  }

  const cleanedGroups = ruleGroups
    .map((g) => ({
      label: g.label.trim(),
      examples: g.examples
        .map((e) => ({ base: e.base.trim(), conjugated: e.conjugated.trim() }))
        .filter((e) => e.base || e.conjugated),
    }))
    .filter((g) => g.label || g.examples.length > 0);

  const book = bookSelect.value;
  const lesson = lessonSelect.value;
  const grammarNo = grammarNoSelect.value;

  saveGrammarBtn.disabled = true;
  try {
    const res = await fetch(`/api/books/${book}/lessons/${lesson}/grammar/${grammarNo}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, meaning, rule_groups: cleanedGroups }),
    });
    const data = await res.json();

    if (!res.ok) {
      grammarMessage.innerHTML = `<div class="msg error">${data.error}</div>`;
    } else {
      grammarMessage.innerHTML = `<div class="msg success">문법 내용이 저장되었습니다.</div>`;
      titleInput.value = "";
      meaningInput.value = "";
      resetRuleGroups();
      await loadGrammarContent();
    }
  } finally {
    saveGrammarBtn.disabled = false;
  }
}

async function deleteGrammarContent(id) {
  const book = bookSelect.value;
  const lesson = lessonSelect.value;
  const grammarNo = grammarNoSelect.value;
  await fetch(`/api/books/${book}/lessons/${lesson}/grammar/${grammarNo}/content/${id}`, {
    method: "DELETE",
  });
  await loadGrammarContent();
}

async function loadQuestions() {
  const book = bookSelect.value;
  const lesson = lessonSelect.value;
  const grammarNo = grammarNoSelect.value;
  const res = await fetch(`/api/books/${book}/lessons/${lesson}/grammar/${grammarNo}/questions`);
  const questions = await res.json();

  questionTbody.innerHTML = "";
  for (const q of questions) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(q.question)}</td><td>${escapeHtml(q.answer)}</td>`;

    const delTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "삭제";
    delBtn.className = "danger";
    delBtn.onclick = () => deleteQuestion(q.id);
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);

    questionTbody.appendChild(tr);
  }
}

async function addQuestion() {
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();
  if (!question || !answer) return;

  const book = bookSelect.value;
  const lesson = lessonSelect.value;
  const grammarNo = grammarNoSelect.value;

  addQuestionBtn.disabled = true;
  try {
    const res = await fetch(`/api/books/${book}/lessons/${lesson}/grammar/${grammarNo}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer }),
    });
    const data = await res.json();

    if (!res.ok) {
      questionMessage.innerHTML = `<div class="msg error">${data.error}</div>`;
    } else {
      questionMessage.innerHTML = "";
      questionInput.value = "";
      answerInput.value = "";
      await loadQuestions();
    }
  } finally {
    addQuestionBtn.disabled = false;
  }
}

async function deleteQuestion(id) {
  const book = bookSelect.value;
  const lesson = lessonSelect.value;
  const grammarNo = grammarNoSelect.value;
  await fetch(`/api/books/${book}/lessons/${lesson}/grammar/${grammarNo}/questions/${id}`, {
    method: "DELETE",
  });
  await loadQuestions();
}

function loadAll() {
  loadGrammarContent();
  loadQuestions();
}

bookSelect.addEventListener("change", loadAll);
lessonSelect.addEventListener("change", loadAll);
grammarNoSelect.addEventListener("change", loadAll);
saveGrammarBtn.addEventListener("click", saveGrammarContent);
addQuestionBtn.addEventListener("click", addQuestion);
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") answerInput.focus();
});
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addQuestion();
});

resetRuleGroups();
loadAll();
