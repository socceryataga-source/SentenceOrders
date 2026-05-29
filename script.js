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

const TEACHER_PASSWORD = "hkthirako";

let questions = [];
let currentIndex = 0;
let draggedToken = null;

const teacherScreen = document.getElementById("teacher-screen");
const quizScreen = document.getElementById("quiz-screen");
const finishScreen = document.getElementById("finish-screen");
const lessonListScreen = document.getElementById("lesson-list-screen");

const lessonIdInput = document.getElementById("lesson-id");
const sentenceInput = document.getElementById("sentence-input");
const downloadLessonsBtn = document.getElementById("download-lessons-btn");
const showCodeBtn = document.getElementById("show-code-btn");
const previewBtn = document.getElementById("preview-btn");
const sampleBtn = document.getElementById("sample-btn");
const studentUrlBox = document.getElementById("student-url-box");
const studentUrlInput = document.getElementById("student-url");
const copyUrlBtn = document.getElementById("copy-url-btn");
const copyMessage = document.getElementById("copy-message");
const codeOutputBox = document.getElementById("code-output-box");
const snippetOutput = document.getElementById("snippet-output");
const copySnippetBtn = document.getElementById("copy-snippet-btn");

const teacherBtn = document.getElementById("teacher-btn");
const openTeacherBtn = document.getElementById("open-teacher-btn");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");
const questionTitle = document.getElementById("question-title");
const modeLabel = document.getElementById("mode-label");
const jpText = document.getElementById("jp-text");
const hintBox = document.getElementById("hint-box");
const answerArea = document.getElementById("answer-area");
const bankArea = document.getElementById("bank-area");
const feedback = document.getElementById("feedback");
const lessonMessage = document.getElementById("lesson-message");
const lessonList = document.getElementById("lesson-list");

const checkBtn = document.getElementById("check-btn");
const hintBtn = document.getElementById("hint-btn");
const resetBtn = document.getElementById("reset-btn");
const backBtn = document.getElementById("back-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");

function showScreen(screen) {
  [teacherScreen, quizScreen, finishScreen, lessonListScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function requestTeacherAccess() {
  const input = prompt("Teacher Modeのパスワードを入力してください。");
  if (input === TEACHER_PASSWORD) {
    showScreen(teacherScreen);
  } else if (input !== null) {
    alert("パスワードが違います。");
  }
}

function normalizeText(text) {
  return String(text || "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function cleanLessonId(value) {
  return normalizeText(value).replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function parseLine(line) {
  const raw = line.trim().replace(/^\s*\d+[\).、．]\s*/, "");
  if (!raw) return null;
  const parts = raw.split("||");
  const enRaw = normalizeText(parts[0] || "");
  const jpRaw = normalizeText(parts.slice(1).join("||") || "");
  if (!enRaw) return null;
  const isChunkMode = enRaw.includes("/");
  const tokens = isChunkMode ? enRaw.split("/").map(t => normalizeText(t)).filter(Boolean) : tokenizeWords(enRaw);
  if (tokens.length < 2) return null;
  return { en: enRaw.replace(/\s*\/\s*/g, " / "), jp: jpRaw || "日本語訳は指定されていません。", mode: isChunkMode ? "chunk" : "word" };
}

function parseText(text) {
  return text.split(/\n+/).map(line => line.trim()).filter(Boolean).map(parseLine).filter(Boolean).slice(0, 10);
}

function questionsToInputText(list) {
  return list.map(q => `${q.en} || ${q.jp}`).join("\n");
}

function questionToTokens(q) {
  if (q.mode === "chunk" || String(q.en).includes("/")) return String(q.en).split("/").map(t => normalizeText(t)).filter(Boolean);
  return tokenizeWords(q.en);
}

function tokenizeWords(sentence) {
  const matches = String(sentence).match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)?|[.,!?;:()"]/g) || [];
  return mergePunctuation(matches);
}

function mergePunctuation(parts) {
  const result = [];
  const closingPunct = new Set([".", ",", "!", "?", ";", ":", ")"]);
  const openingPunct = new Set(["("]);
  for (const part of parts) {
    if (closingPunct.has(part) && result.length > 0) result[result.length - 1] += part;
    else if (openingPunct.has(part)) result.push(part);
    else if (part === '"' && result.length > 0) result[result.length - 1] += part;
    else result.push(part);
  }
  return result;
}

function buildLessonObject() {
  const lessonId = cleanLessonId(lessonIdInput.value);
  if (!lessonId) { alert("lesson IDを入力してください。英数字・ハイフン・アンダーバーが使えます。"); return null; }
  lessonIdInput.value = lessonId;
  const parsed = parseText(sentenceInput.value);
  if (parsed.length === 0) { alert("英文を1問以上入力してください。"); return null; }
  return { lessonId, lessonData: parsed.map(q => ({ en: q.en, jp: q.jp, mode: q.mode })) };
}

function buildLessonsJsText() {
  const built = buildLessonObject();
  if (!built) return null;
  const obj = {};
  obj[built.lessonId] = built.lessonData;
  return { lessonId: built.lessonId, text: "window.LESSONS = " + JSON.stringify(obj, null, 2) + ";\n" };
}

function buildSnippetText() {
  const built = buildLessonObject();
  if (!built) return null;
  return { lessonId: built.lessonId, text: `"${built.lessonId}": ${JSON.stringify(built.lessonData, null, 2)}` };
}

function downloadLessonsJs() {
  const result = buildLessonsJsText();
  if (!result) return;
  const blob = new Blob([result.text], { type: "text/javascript;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lessons.js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  showStudentUrl(result.lessonId);
  showSnippet();
}

function showSnippet() {
  const result = buildSnippetText();
  if (!result) return;
  snippetOutput.value = result.text;
  codeOutputBox.classList.remove("hidden");
  showStudentUrl(result.lessonId);
}

function getBaseUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function getStudentUrl(lessonId) {
  const url = new URL(getBaseUrl());
  url.searchParams.set("lesson", lessonId);
  return url.toString();
}

function showStudentUrl(lessonId) {
  studentUrlInput.value = getStudentUrl(lessonId);
  studentUrlBox.classList.remove("hidden");
  copyMessage.textContent = "";
}

async function copyText(text, successEl, message) {
  try {
    await navigator.clipboard.writeText(text);
    if (successEl) successEl.textContent = message || "コピーしました。";
  } catch (e) {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    if (successEl) successEl.textContent = message || "コピーしました。";
  }
}

function previewQuiz() {
  const parsed = parseText(sentenceInput.value);
  if (parsed.length === 0) { alert("英文を1問以上入力してください。"); return; }
  startQuiz(parsed);
}

function startQuiz(list) {
  const normalized = (list || []).map(q => ({ en: normalizeText(q.en), jp: normalizeText(q.jp || "日本語訳は指定されていません。"), mode: q.mode === "chunk" || String(q.en).includes("/") ? "chunk" : "word" })).filter(q => q.en && questionToTokens(q).length >= 2).slice(0, 10);
  if (normalized.length === 0) { showLessonList("このlessonには有効な問題がありません。Teacher Modeでlessons.jsを作り直してください。"); return; }
  questions = normalized.map(q => ({ ...q, tokens: questionToTokens(q) }));
  currentIndex = 0;
  showScreen(quizScreen);
  loadQuestion(currentIndex);
}

function shuffle(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  if (copied.join(" ") === array.join(" ") && copied.length > 1) [copied[0], copied[1]] = [copied[1], copied[0]];
  return copied;
}

function createToken(text) {
  const el = document.createElement("button");
  el.className = "token"; el.textContent = text; el.draggable = true; el.type = "button"; el.setAttribute("aria-label", text);
  el.addEventListener("click", () => { const parent = el.parentElement; if (parent === bankArea) answerArea.appendChild(el); else bankArea.appendChild(el); clearFeedback(); });
  el.addEventListener("dragstart", () => { draggedToken = el; el.classList.add("dragging"); });
  el.addEventListener("dragend", () => { el.classList.remove("dragging"); draggedToken = null; });
  return el;
}

function enableDrop(area) {
  area.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(area, e.clientX, e.clientY);
    if (!draggedToken) return;
    if (afterElement == null) area.appendChild(draggedToken);
    else area.insertBefore(draggedToken, afterElement);
  });
}

function getDragAfterElement(container, x, y) {
  const draggableElements = [...container.querySelectorAll(".token:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offsetY = y - box.top - box.height / 2;
    const offsetX = x - box.left - box.width / 2;
    const distance = Math.abs(offsetY) + Math.abs(offsetX) * .25;
    if (offsetY < 0 && distance < closest.distance) return { distance, element: child };
    return closest;
  }, { distance: Number.POSITIVE_INFINITY }).element;
}

function loadQuestion(index) {
  const q = questions[index];
  answerArea.innerHTML = ""; bankArea.innerHTML = ""; hintBox.classList.add("hidden"); hintBox.textContent = ""; clearFeedback();
  questionTitle.textContent = `Question ${index + 1}`; jpText.textContent = q.jp;
  progressText.textContent = `Question ${index + 1} / ${questions.length}`;
  progressBar.style.width = `${((index + 1) / questions.length) * 100}%`;
  modeLabel.textContent = q.mode === "chunk" ? "Chunk Mode" : "Word Mode";
  shuffle(q.tokens).forEach(token => bankArea.appendChild(createToken(token)));
  backBtn.disabled = index === 0;
  nextBtn.textContent = index === questions.length - 1 ? "Finish" : "Next";
}

function getCurrentAnswerTokens() { return [...answerArea.querySelectorAll(".token")].map(el => el.textContent); }

function correctAnswerText(q) {
  return q.mode === "chunk" ? q.tokens.join(" / ") : q.tokens.join(" ");
}

function checkAnswer() {
  const q = questions[currentIndex], answer = getCurrentAnswerTokens();
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
    feedback.innerHTML = `Not yet. 日本語訳と語順をもう一度確認しましょう。<div class="correct-answer"><strong>正答：</strong> ${escapeHTML(correctAnswerText(q))}</div>`;
    feedback.className = "feedback ng";
  }
}

function showHint() {
  const q = questions[currentIndex];
  if (q.mode === "chunk") hintBox.innerHTML = `最初のチャンク：<strong>${escapeHTML(q.tokens[0])}</strong>`;
  else hintBox.innerHTML = `最初の語順：<strong>${escapeHTML(q.tokens.slice(0, Math.min(3, q.tokens.length)).join(" "))}</strong> ...`;
  hintBox.classList.remove("hidden");
}

function resetQuestion(){ loadQuestion(currentIndex); }
function clearFeedback(){ feedback.textContent = ""; feedback.className = "feedback"; }
function nextQuestion(){ if (currentIndex >= questions.length - 1) { showScreen(finishScreen); return; } currentIndex++; loadQuestion(currentIndex); }
function backQuestion(){ if (currentIndex <= 0) return; currentIndex--; loadQuestion(currentIndex); }
function escapeHTML(str){ return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])); }

function showLessonList(message = "") {
  const allLessons = window.LESSONS || {}, keys = Object.keys(allLessons);
  lessonList.innerHTML = "";
  lessonMessage.textContent = message || "URLに lesson ID が指定されていません。使うlessonを選んでください。";
  if (keys.length === 0) lessonMessage.textContent = message || "lessons.jsにlessonデータがありません。Teacher Modeでlessons.jsを作成してください。";
  else keys.forEach(key => {
    const a = document.createElement("a"); a.className = "lesson-link"; a.href = getStudentUrl(key); a.textContent = `${key}（${(allLessons[key] || []).length}問）`; lessonList.appendChild(a);
  });
  showScreen(lessonListScreen);
}

function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  const lessonId = params.get("lesson");
  const teacher = params.get("teacher");
  if (teacher === "1") { showScreen(teacherScreen); return; }
  if (lessonId) {
    const lessonData = window.LESSONS && window.LESSONS[lessonId];
    if (lessonData) startQuiz(lessonData);
    else showLessonList(`lesson ID「${lessonId}」が lessons.js に見つかりません。GitHubに最新のlessons.jsがアップロードされているか確認してください。`);
  } else showLessonList();
}

downloadLessonsBtn.addEventListener("click", downloadLessonsJs);
showCodeBtn.addEventListener("click", showSnippet);
previewBtn.addEventListener("click", previewQuiz);
sampleBtn.addEventListener("click", () => { lessonIdInput.value = "myanmar01"; sentenceInput.value = sampleText; studentUrlBox.classList.add("hidden"); codeOutputBox.classList.add("hidden"); });
copyUrlBtn.addEventListener("click", () => copyText(studentUrlInput.value, copyMessage, "生徒用URLをコピーしました。"));
copySnippetBtn.addEventListener("click", () => copyText(snippetOutput.value, null, ""));
teacherBtn.addEventListener("click", requestTeacherAccess);
openTeacherBtn.addEventListener("click", requestTeacherAccess);
checkBtn.addEventListener("click", checkAnswer);
hintBtn.addEventListener("click", showHint);
resetBtn.addEventListener("click", resetQuestion);
nextBtn.addEventListener("click", nextQuestion);
backBtn.addEventListener("click", backQuestion);
restartBtn.addEventListener("click", () => { if (questions.length > 0) { currentIndex = 0; showScreen(quizScreen); loadQuestion(currentIndex); } else showLessonList(); });
enableDrop(answerArea); enableDrop(bankArea); loadInitialState();
