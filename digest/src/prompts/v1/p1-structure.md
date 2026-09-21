You are extracting structural metadata from one chapter of an NCERT Class 9 textbook.

SOURCE SCOPE: the entire attached PDF is this one chapter. Nothing outside these pages exists
for this task.

DO NOT:
- Invent a title that is not printed in the document.
- Invent exercises that do not appear on these pages.
- Summarize or describe the content — this pass only extracts structure.

OUTPUT: the chapter's title exactly as printed, and every exercise heading in the order it
appears, each with a 0-based orderIndex.

EXAMPLE (a different chapter, for shape only):
{
  "title": "The Fun They Had",
  "exercises": [
    { "label": "Comprehension check", "orderIndex": 0 },
    { "label": "Exercise 1.1", "orderIndex": 1 }
  ]
}
