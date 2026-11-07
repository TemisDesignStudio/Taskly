# Taskly

Taskly is a thoughtful Kanban workspace for creative teams. It brings project tasks, team assignments, and progress into one calm, easy-to-use interface.

## Features

- Organize work across five customizable board stages with drag-and-drop task cards.
- Create, edit, duplicate, and remove tasks with descriptions, priorities, due dates, assignees, and labels.
- Search and sort tasks, and track time with per-task timers.
- Review project progress and task distribution in the analytics dashboard.
- Customize the project name and board stage names.
- Start with a board pre-filled with sample tasks.

Task and project changes stay in React state for the current browser session. Time-tracking data is saved in browser local storage. Taskly is a front-end demo and does not include user accounts or a backend.

## Getting started

Requirements: Node.js and npm.

```bash
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

Run these commands from the `frontend` directory:

```bash
npm run typecheck
npm run lint
npm test
```

To run the end-to-end tests, install the Playwright Chromium browser once and then run the test suite:

```bash
npx playwright install chromium
npm run test:e2e
```

## Built with

Next.js, React, TypeScript, Tailwind CSS, and dnd-kit.
