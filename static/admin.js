const LANG_ORDER = ["zh-CN", "ja", "th", "bn", "vi", "en"];

const lessonSelect = document.getElementById("lesson-select");
const lessonCount = document.getElementById("lesson-count");
const koInput = document.getElementById("ko-input");
const addBtn = document.getElementById("add-btn");
const messageBox = document.getElementById("message");
const tbody = document.getElementById("word-tbody");

function showMessage(text, type) {
  messageBox.innerHTML = `<div class="msg ${type}">${text}</div>`;
}

function clearMessage() {
  messageBox.innerHTML = "";
}

async function loadWords() {
  const lesson = lessonSelect.value;
  const res = await fetch(`/api/lessons/${lesson}/words`);
  const words = await res.json();

  lessonCount.textContent = `(${words.length}개 등록됨)`;
  tbody.innerHTML = "";

  for (const w of words) {
    const tr = document.createElement("tr");
    const cells = [w.ko, ...LANG_ORDER.map((code) => w.translations[code] || "")];
    tr.innerHTML = cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("");

    const delTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.textContent = "삭제";
    delBtn.className = "danger";
    delBtn.onclick = () => deleteWord(w.id);
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);

    tbody.appendChild(tr);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function addWord() {
  const ko = koInput.value.trim();
  if (!ko) return;

  addBtn.disabled = true;
  addBtn.textContent = "번역 중...";
  clearMessage();

  try {
    const lesson = lessonSelect.value;
    const res = await fetch(`/api/lessons/${lesson}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ko }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || "오류가 발생했습니다.", "error");
    } else {
      koInput.value = "";
      showMessage(`"${ko}" 단어가 추가되고 6개 언어로 번역되었습니다.`, "success");
      await loadWords();
    }
  } catch (e) {
    showMessage("서버와 통신 중 오류가 발생했습니다.", "error");
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = "추가 (자동 번역)";
  }
}

async function deleteWord(id) {
  const lesson = lessonSelect.value;
  await fetch(`/api/lessons/${lesson}/words/${id}`, { method: "DELETE" });
  await loadWords();
}

lessonSelect.addEventListener("change", loadWords);
addBtn.addEventListener("click", addWord);
koInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addWord();
});

loadWords();
