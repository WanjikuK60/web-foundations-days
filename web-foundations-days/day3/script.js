let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const searchTerm = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(searchTerm));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

function countByCategory() {
  return notes.reduce((counts, note) => {
    counts[note.category] = (counts[note.category] || 0) + 1;
    return counts;
  }, {});
}

function getSummary() {
  const counts = countByCategory();
  const noteWord = notes.length === 1 ? "note" : "notes";
  return `${notes.length} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase();
  return notes.some(
    (note) => note.text.trim().toLowerCase() === normalizedText,
  );
}

function addNote(text, category) {
  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Note was not added: text must be 1-200 characters.");
    return false;
  }
  if (isDuplicate(trimmedText)) {
    console.log("Note was not added: duplicate text.");
    return false;
  }
  if (!["personal", "work", "study"].includes(category)) {
    console.log("Note was not added: category must be personal, work, or study.");
    return false;
  }

  const nextId = Math.max(0, ...notes.map((note) => note.id)) + 1;
  notes.push({ id: nextId, text: trimmedText, category });
  return true;
}

console.log("searchNotes('DAY 3'):", searchNotes("DAY 3")); // Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]
console.log("searchNotes('astronomy'):", searchNotes("astronomy")); // Expected: []
console.log("longestNote():", longestNote()); // Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
const notesBeforeEmptyCheck = notes;
notes = [];
console.log("longestNote() with no notes:", longestNote()); // Expected: null
notes = notesBeforeEmptyCheck;
console.log("countByCategory():", countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }
notes = [];
console.log("countByCategory() with no notes:", countByCategory()); // Expected: {}
notes = notesBeforeEmptyCheck;
console.log("getSummary():", getSummary()); // Expected: "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 1, text: "One note", category: "personal" }];
console.log("getSummary() with one note:", getSummary()); // Expected: "1 note: 1 personal, 0 work, 0 study."
notes = notesBeforeEmptyCheck;
console.log("isDuplicate('  BUY MILK AND BREAD  '):", isDuplicate("  BUY MILK AND BREAD  ")); // Expected: true
console.log("isDuplicate('Plan a trip'):", isDuplicate("Plan a trip")); // Expected: false
console.log("addNote('Plan the weekend', 'personal'):", addNote("Plan the weekend", "personal")); // Expected: true
console.log("addNote('  BUY MILK AND BREAD ', 'work'):", addNote("  BUY MILK AND BREAD ", "work")); // Expected: false (duplicate)
console.log("addNote('', 'study'):", addNote("", "study")); // Expected: false (invalid length)
console.log("addNote('Meet the team', 'social'):", addNote("Meet the team", "social")); // Expected: false (invalid category)