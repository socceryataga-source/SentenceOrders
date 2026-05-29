const sampleText = `I believed that people's destinies depended on when and where they were born. || 人々の運命は、いつどこで生まれたかによって決まるのだと私は信じていました。
I was shocked by the tragic sight. || 私はその悲惨な光景に衝撃を受けました。
I carried on with my daily life. || 私は日常生活を続けました。
You must become a doctor to help suffering children. || あなたは苦しんでいる子どもたちを助けるために医者にならなければなりません。
My desire to become a doctor and help people in need grew stronger. || 医者になって困っている人々を助けたいという私の思いはさらに強くなりました。
I decided to believe in myself and studied hard to improve my grades. || 私は自分を信じることに決め、成績を上げるために一生懸命勉強しました。
I obtained my medical license and began working at a hospital. || 私は医師免許を取得し、病院で働き始めました。
I decided to work at an emergency center to become a better doctor. || よりよい医者になるために、私は救急センターで働くことに決めました。
My boss challenged me to take action. || 上司は私に行動を起こすよう促しました。
Things will work out if you start doing something. || 何かを始めれば、物事はうまくいくでしょう。`;

let questions = [];
let currentIndex = 0;
let draggedToken = null;
let originalPayload = "";

const teacherScreen = document.getElementById("teacher-screen");
const quizScreen = document.getElementById("quiz-screen");
const finishScreen = document.getElementById("finish-screen");

const sentenceInput = document.getElementById("sentence-input");
const createUrlBtn = document.getElementById("create-url-btn");
const previewBtn = document.getElementById("preview-btn");
const sampleBtn = document.getElementById("sample-btn");
const urlOutput = document.getElementById("url-output");
const studentUrlInput = document.getElementById("student-url");
const copyUrlBtn = document.getElementById("copy-url-btn");
const copyMessage = document.getElementById("copy-message");

const teacherBtn = document.getElementById("teacher-btn");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");
const questionTitle = document.getElementById("question-title");
const modeLabel = document.getElementById("mode-label");
const jpText = document.getElementById("jp-text");
const hintBox = document.getElementById("hint-box");
const answerArea = document.getElementById("answer-area");
const bankArea = document.getElementById("bank-area");
const feedback = document.getElementById("feedback");

const checkBtn = document.getElementById("check-btn");
const hintBtn = document.getElementById("hint-btn");
const resetBtn = document.getElementById("reset-btn");
const backBtn = document.getElementById("back-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");

function showScreen(screen) {
  [teacherScreen, quizScreen, finishScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function normalizeText(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLine(line) {
  const raw = line.trim().replace(/^\s*\d+[\).、．]\s*/, "");
  if (!raw) return null;

  const parts = raw.split("||");
  const enRaw = normalizeText(parts[0] || "");
  const jpRaw = normalizeText(parts.slice(1).join("||") || "");

  if (!enRaw) return null;

  const isChunkMode = enRaw.includes("/");
  const tokens = isChunkMode
    ? enRaw.split("/").map(t => normalizeText(t)).filter(Boolean)
    : tokenizeWords(enRaw);

  if (tokens.length < 2) return null;

  return {
    en: enRaw.replace(/\s*\/\s*/g, " / "),
    jp: jpRaw || "日本語訳は指定されていません。",
    tokens,
    mode: isChunkMode ? "chunk" : "word"
  };
}

function parseText(text) {
  return text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseLine)
    .filter(Boolean)
    .slice(0, 10);
}

function tokenizeWords(sentence) {
  const matches = sentence.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)?|[.,!?;:()"]/g) || [];
  return mergePunctuation(matches);
}

function mergePunctuation(parts) {
  const result = [];
  const closingPunct = new Set([".", ",", "!", "?", ";", ":", ")"]);
  const openingPunct = new Set(["("]);

  for (const part of parts) {
    if (closingPunct.has(part) && result.length > 0) {
      result[result.length - 1] += part;
    } else if (openingPunct.has(part)) {
      result.push(part);
    } else if (part === '"' && result.length > 0) {
      result[result.length - 1] += part;
    } else {
      result.push(part);
    }
  }
  return result;
}

function encodePayload(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodePayload(data) {
  return decodeURIComponent(escape(atob(data)));
}

function makeStudentUrl() {
  const parsed = parseText(sentenceInput.value);
  if (parsed.length === 0) {
    alert("英文を1問以上入力してください。");
    return "";
  }

  const encoded = encodePayload(sentenceInput.value.trim());
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("mode", "student");
  url.searchParams.set("data", encoded);
  return url.toString();
}

function showStudentUrl() {
  const url = makeStudentUrl();
  if (!url) return;
  studentUrlInput.value = url;
  urlOutput.classList.remove("hidden");
  copyMessage.textContent = "";
}

async function copyStudentUrl() {
  if (!studentUrlInput.value) return;
  try {
    await navigator.clipboard.writeText(studentUrlInput.value);
    copyMessage.textContent = "コピーしました。";
  } catch (e) {
    studentUrlInput.select();
    document.execCommand("copy");
    copyMessage.textContent = "コピーしました。";
  }
}

function startQuizFromText(text) {
  const parsed = parseText(text);
  if (parsed.length === 0) {
    alert("問題データを読み込めませんでした。Teacher Modeで作成し直してください。");
    showScreen(teacherScreen);
    return;
  }
  originalPayload = text;
  questions = parsed;
  currentIndex = 0;
  showScreen(quizScreen);
  loadQuestion(currentIndex);
}

function previewQuiz() {
  const parsed = parseText(sentenceInput.value);
  if (parsed.length === 0) {
    alert("英文を1問以上入力してください。");
    return;
  }
  startQuizFromText(sentenceInput.value);
}

function shuffle(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  if (copied.join(" ") === array.join(" ") && copied.length > 1) {
    [copied[0], copied[1]] = [copied[1], copied[0]];
  }
  return copied;
}

function createToken(text) {
  const el = document.createElement("button");
  el.className = "token";
  el.textContent = text;
  el.draggable = true;
  el.type = "button";
  el.setAttribute("aria-label", text);

  el.addEventListener("click", () => {
    const parent = el.parentElement;
    if (parent === bankArea) {
      answerArea.appendChild(el);
    } else {
      bankArea.appendChild(el);
    }
    clearFeedback();
  });

  el.addEventListener("dragstart", () => {
    draggedToken = el;
    el.classList.add("dragging");
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    draggedToken = null;
  });

  return el;
}

function enableDrop(area) {
  area.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(area, e.clientX, e.clientY);
    if (!draggedToken) return;
    if (afterElement == null) {
      area.appendChild(draggedToken);
    } else {
      area.insertBefore(draggedToken, afterElement);
    }
  });
}

function getDragAfterElement(container, x, y) {
  const draggableElements = [...container.querySelectorAll(".token:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offsetY = y - box.top - box.height / 2;
    const offsetX = x - box.left - box.width / 2;
    const distance = Math.abs(offsetY) + Math.abs(offsetX) * 0.25;

    if (offsetY < 0 && distance < closest.distance) {
      return { distance, element: child };
    }
    return closest;
  }, { distance: Number.POSITIVE_INFINITY }).element;
}

function loadQuestion(index) {
  const q = questions[index];
  answerArea.innerHTML = "";
  bankArea.innerHTML = "";
  hintBox.classList.add("hidden");
  hintBox.textContent = "";
  clearFeedback();

  questionTitle.textContent = `Question ${index + 1}`;
  jpText.textContent = q.jp;
  progressText.textContent = `Question ${index + 1} / ${questions.length}`;
  progressBar.style.width = `${((index + 1) / questions.length) * 100}%`;
  modeLabel.textContent = q.mode === "chunk" ? "Chunk Mode" : "Word Mode";

  shuffle(q.tokens).forEach(token => {
    bankArea.appendChild(createToken(token));
  });

  backBtn.disabled = index === 0;
  nextBtn.textContent = index === questions.length - 1 ? "Finish" : "Next";
}

function getCurrentAnswerTokens() {
  return [...answerArea.querySelectorAll(".token")].map(el => el.textContent);
}

function checkAnswer() {
  const q = questions[currentIndex];
  const answer = getCurrentAnswerTokens();

  if (answer.length !== q.tokens.length) {
    feedback.textContent = "まだすべてのカードが並んでいません。";
    feedback.className = "feedback ng";
    return;
  }

  const isCorrect = answer.join("|||") === q.tokens.join("|||");
  if (isCorrect) {
    feedback.textContent = "Correct!";
    feedback.className = "feedback ok";
  } else {
    feedback.textContent = "Not yet. 日本語訳と語順をもう一度確認しましょう。";
    feedback.className = "feedback ng";
  }
}

function showHint() {
  const q = questions[currentIndex];
  if (q.mode === "chunk") {
    hintBox.innerHTML = `最初のチャンク：<strong>${escapeHTML(q.tokens[0])}</strong>`;
  } else {
    const firstPart = q.tokens.slice(0, Math.min(3, q.tokens.length)).join(" ");
    hintBox.innerHTML = `最初の語順：<strong>${escapeHTML(firstPart)}</strong> ...`;
  }
  hintBox.classList.remove("hidden");
}

function resetQuestion() {
  loadQuestion(currentIndex);
}

function clearFeedback() {
  feedback.textContent = "";
  feedback.className = "feedback";
}

function nextQuestion() {
  if (currentIndex >= questions.length - 1) {
    showScreen(finishScreen);
    return;
  }
  currentIndex++;
  loadQuestion(currentIndex);
}

function backQuestion() {
  if (currentIndex <= 0) return;
  currentIndex--;
  loadQuestion(currentIndex);
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function loadFromUrlIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const data = params.get("data");

  if (mode === "student" && data) {
    try {
      const decoded = decodePayload(data);
      startQuizFromText(decoded);
    } catch (e) {
      alert("URLの問題データを読み込めませんでした。Teacher ModeでURLを作り直してください。");
      showScreen(teacherScreen);
    }
  } else {
    showScreen(teacherScreen);
  }
}

createUrlBtn.addEventListener("click", showStudentUrl);
copyUrlBtn.addEventListener("click", copyStudentUrl);
previewBtn.addEventListener("click", previewQuiz);
sampleBtn.addEventListener("click", () => {
  sentenceInput.value = sampleText;
  urlOutput.classList.add("hidden");
});
teacherBtn.addEventListener("click", () => showScreen(teacherScreen));

checkBtn.addEventListener("click", checkAnswer);
hintBtn.addEventListener("click", showHint);
resetBtn.addEventListener("click", resetQuestion);
nextBtn.addEventListener("click", nextQuestion);
backBtn.addEventListener("click", backQuestion);
restartBtn.addEventListener("click", () => startQuizFromText(originalPayload || sentenceInput.value));

enableDrop(answerArea);
enableDrop(bankArea);
loadFromUrlIfNeeded();
