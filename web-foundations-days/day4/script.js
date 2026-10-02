const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearButton = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

const draftKey = "day4-note-draft";
const themeKey = "day4-note-theme";

function updateCounts() {
  const text = noteText.value;
  const characterTotal = text.length;
  const words = text.trim() === "" ? [] : text.trim().split(/\s+/);

  charCount.textContent = `${characterTotal} / 200 characters`;
  wordCount.textContent = `${words.length} ${words.length === 1 ? "word" : "words"}`;

  charCount.classList.toggle("warning", characterTotal > 180);
  charCount.classList.toggle("over", characterTotal > 200);
}

function clearNote() {
  noteText.value = "";
  localStorage.removeItem(draftKey);
  updateCounts();
}

function updateThemeLabel() {
  themeToggle.textContent = document.body.classList.contains("dark")
    ? "Light mode"
    : "Dark mode";
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(draftKey, noteText.value);
});

clearButton.addEventListener("click", clearNote);

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(themeKey, isDark ? "dark" : "light");
  updateThemeLabel();
});

noteText.value = localStorage.getItem(draftKey) || "";
if (localStorage.getItem(themeKey) === "dark") {
  document.body.classList.add("dark");
}
updateThemeLabel();
updateCounts();