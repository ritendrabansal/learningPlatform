---
name: frontend-engineer
description: Use for the React + Vite dashboard in web/ - Library, ChapterView, Review Queue, Teach Mode, Student View, Progress, and Homework pages, KaTeX rendering, and the WebSocket client for the agents.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---
Build web/ as a React + Vite SPA served by the Worker's static assets.

- Teach Mode is designed to be screen-shared: large type, high contrast, one topic per view,
  keyboard shortcuts (→ next topic, Q ask question, R reveal answer).
- Student View works on phones; join by class code.
- Render markdown + KaTeX for all content; show a small "AI-generated" badge on any item whose
  source is not the textbook, and a "verified" tick where verified=1.
- Review Queue: source page image left, digested item right, Approve / Edit / Reject.
- Use the Agents SDK React client hooks for live state. No localStorage for anything important.
- Accessible (labels, focus states), responsive, light/dark.
