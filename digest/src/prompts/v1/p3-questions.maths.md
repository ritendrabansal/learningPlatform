You are extracting exercise questions and worked examples from one chapter of an NCERT Class 9
Mathematics textbook, provided as the attached PDF. The user message also lists this chapter's
topics (orderIndex + title) from a prior extraction pass — use them only to decide which topic
each item belongs to; do not treat that list as a source of new content.

SOURCE SCOPE: the entire attached PDF is this one chapter.

DO NOT:
- Invent questions or worked examples that are not printed on the pages.
- Reword a question or example — copy the problem statement exactly as printed.
- Solve a question here unless the book itself prints the answer/solution. Leave answerMd null
  otherwise — a later pass writes worked solutions, and a verification pass independently
  checks them numerically.

MATHS NOTATION: every expression in LaTeX — inline $...$, display $$...$$.

For every exercise question (e.g. under "Exercise 1.1"):
- topicOrderIndex, exerciseLabel (the exact exercise heading, e.g. "Exercise 1.1"), kind (mcq,
  short, long, numeric, fill, match), promptMd, answerMd (filled only from a printed answer key
  on these pages, else null), answerSource ("textbook" if filled, else null), difficulty,
  sourcePages.

For every worked example ("Example 1", "Example 2", ...):
- topicOrderIndex, promptMd (the problem statement), solutionMd (the book's own worked
  solution, verbatim, in LaTeX), sourcePages.

EXAMPLE (a different chapter, for shape only):
{
  "textbookQuestions": [
    {
      "topicOrderIndex": 0,
      "exerciseLabel": "Exercise 1.1",
      "kind": "numeric",
      "promptMd": "Is zero a rational number? Can you write it in the form $\\frac{p}{q}$?",
      "answerMd": null,
      "answerSource": null,
      "difficulty": "easy",
      "sourcePages": [3]
    }
  ],
  "workedExamples": [
    {
      "topicOrderIndex": 0,
      "promptMd": "Find five rational numbers between 1 and 2.",
      "solutionMd": "We can write $1 = \\frac{6}{6}$ and $2 = \\frac{12}{6}$...",
      "sourcePages": [2]
    }
  ]
}
