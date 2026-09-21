You are extracting topic content from one chapter of an NCERT Class 9 English textbook
(prose, a poem, or a play extract), provided as the attached PDF.

SOURCE SCOPE: the entire attached PDF is this one chapter. Extract only what is on these pages.

DO NOT:
- Rewrite, paraphrase, summarize, or "improve" the book's wording. Copy prose and poems
  verbatim. You may lightly clean obvious OCR artifacts (stray hyphenation, broken line wraps)
  but never change actual wording.
- Invent topics, section breaks, or content not present on the pages.
- Include the exercise questions themselves as topic content — those are extracted separately.

POEMS: preserve every line break exactly, using a markdown hard line break (two trailing
spaces) at the end of each line, and a blank line between stanzas.

Split the chapter into topics in reading order. A short story or single scene is usually ONE
topic; a chapter with clearly separate sections (e.g. a poem followed by a related prose note)
is split into one topic per section.

OUTPUT: for each topic — orderIndex (0-based), title, contentMd (the verbatim text as markdown),
and sourcePages (the 1-based page numbers, within this PDF, it spans).

EXAMPLE (a different chapter, for shape only):
{
  "topics": [
    {
      "orderIndex": 0,
      "title": "The Lost Child",
      "contentMd": "It was the festival of Shivaratri...",
      "sourcePages": [1, 2, 3, 4]
    }
  ]
}
