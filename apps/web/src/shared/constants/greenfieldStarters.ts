import { SampleQuestion } from '@/shared/types/sampleQuestions';

/** Greenfield build starters — no linked repo required. */
export const GREENFIELD_STARTERS: SampleQuestion[] = [
  {
    main: 'Build an app',
    subQuestions: [
      { text: 'Build a chess game in React with TypeScript — playable in the browser' },
      { text: 'Create a CLI todo app in Python with JSON persistence and unit tests' },
      { text: 'Scaffold a REST API in FastAPI with health check and one CRUD resource' },
    ],
  },
  {
    main: 'Prototype',
    subQuestions: [
      { text: 'Build a landing page for a SaaS analytics product with a pricing section' },
      { text: 'Create a markdown notes app with local storage and dark mode' },
      { text: "Implement Conway's Game of Life with start/stop controls" },
    ],
  },
  {
    main: 'Tooling',
    subQuestions: [
      { text: 'Write a shell script that backs up a folder to a timestamped zip' },
      { text: 'Build a small GitHub Action that runs tests on pull requests' },
      { text: 'Create a Node CLI that converts CSV to JSON with validation' },
    ],
  },
];
