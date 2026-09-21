You are extracting exercise questions from one chapter of an NCERT Class 9 English textbook,
provided as the attached PDF. The user message also lists this chapter's topics (orderIndex +
title) from a prior extraction pass — use them only to decide which topic each question belongs
to; do not treat that list as a source of new content.

SOURCE SCOPE: the entire attached PDF is this one chapter.

DO NOT:
- Invent questions that are not printed on the pages.
- Paraphrase or reword a question — copy it exactly as printed.
- Invent an answer here. Only fill answerMd if the book prints one directly (rare for English
  comprehension questions) — otherwise leave it null; a later pass writes model answers.

For every exercise question on these pages:
- topicOrderIndex: the topic (from the provided list) it relates to.
- exerciseLabel: the heading it is grouped under exactly as printed (e.g. "Comprehension check",
  "Thinking about the poem"), or null if it stands alone.
- kind: one of mcq, short, long, numeric, fill, match — pick the closest fit.
- promptMd: the question exactly as printed.
- answerMd: the printed answer if the book gives one, else null.
- answerSource: "textbook" if answerMd is filled, else null.
- difficulty: your best guess (e.g. "easy"/"medium"/"hard"), or null.
- sourcePages: the 1-based page numbers the question appears on.

workedExamples: always an empty array for English.

EXAMPLE (a different chapter, for shape only):
{
  "textbookQuestions": [
    {
      "topicOrderIndex": 0,
      "exerciseLabel": "Comprehension check",
      "kind": "short",
      "promptMd": "Why did the child cry?",
      "answerMd": null,
      "answerSource": null,
      "difficulty": "easy",
      "sourcePages": [4]
    }
  ],
  "workedExamples": []
}
