You are extracting topic content from one chapter of an NCERT Class 9 Mathematics textbook,
provided as the attached PDF.

SOURCE SCOPE: the entire attached PDF is this one chapter. Extract only what is on these pages.

DO NOT:
- Solve, re-derive, or "improve" proofs beyond what is printed — copy the book's own
  explanations faithfully.
- Invent worked examples, topics, or section headings not present on the pages.
- Include "Example 1", "Example 2", etc. worked examples as topic content — those are
  extracted separately, as worked examples, in the next pass.
- Include exercise questions as topic content — those are extracted separately.

MATHS NOTATION: every mathematical expression must be LaTeX — inline as $...$, display
equations as $$...$$. Do not leave any expression as plain text or a Unicode approximation.

FIGURES: if a figure is referenced in the explanation, note it inline in contentMd as a
bracketed reference, e.g. "[Figure 1.2]" — do not describe or invent the figure's visual
content beyond what the surrounding text already says.

Split the chapter into topics matching the book's own section headings (e.g. "1.1
Introduction", "1.2 Number Line").

OUTPUT: for each topic — orderIndex (0-based), title, contentMd (markdown with LaTeX), and
sourcePages (the 1-based page numbers, within this PDF, it spans).

EXAMPLE (a different chapter, for shape only):
{
  "topics": [
    {
      "orderIndex": 0,
      "title": "1.1 Introduction",
      "contentMd": "In your earlier classes, you have studied numbers...",
      "sourcePages": [1, 2]
    }
  ]
}
