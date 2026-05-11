# Testing Guidelines

This document defines testing principles and requirements for the TODO application.

## 1. Core Principles

1. All new features must include appropriate automated tests.
2. Tests must be maintainable, readable, and aligned with best practices.
3. All tests must be isolated and independent.
4. Each test must set up its own data and must not rely on state created by other tests.
5. Setup and teardown hooks are required where appropriate so tests succeed across repeated runs.

## 2. Unit Tests

1. Use Jest to test individual functions and React components in isolation.
2. Unit test files must use the naming convention `*.test.js` or `*.test.ts`.
3. Backend unit tests must be placed in `packages/backend/__tests__/`.
4. Frontend unit tests must be placed in `packages/frontend/src/__tests__/`.
5. Unit test file names should match the subject under test.

Examples:

- `app.test.js` for `app.js`
- `todoService.test.ts` for `todoService.ts`

## 3. Integration Tests

1. Use Jest + Supertest to test backend API endpoints with real HTTP requests.
2. Integration tests must be placed in `packages/backend/__tests__/integration/`.
3. Integration test files must use the naming convention `*.test.js` or `*.test.ts`.
4. Name integration test files by behavior or endpoint under test.

Example:

- `todos-api.test.js` for TODO API endpoints

## 4. End-to-End (E2E) Tests

1. Use Playwright as the required E2E framework.
2. E2E tests must be placed in `tests/e2e/`.
3. E2E test files must use the naming convention `*.spec.js` or `*.spec.ts`.
4. Name E2E files based on user journeys.
5. Playwright tests must run on one browser only.
6. Playwright tests must use the Page Object Model (POM) pattern for maintainability.
7. Limit E2E coverage to 5-8 critical user journeys, focusing on happy paths and key edge cases.

Example:

- `todo-workflow.spec.js` for the end-to-end TODO flow

## 5. Port Configuration for Testability and CI/CD

1. Always use environment variables with sensible defaults for port configuration.
2. Backend default port:

```js
const PORT = process.env.PORT || 3030;
```

3. Frontend default behavior:
   - React default port is `3000`
   - Port can be overridden with the `PORT` environment variable
4. Dynamic ports are required to support CI/CD workflows and parallel execution.

## 6. Reliability Requirements

1. Tests must be deterministic and avoid flaky timing assumptions.
2. Use explicit waits/assertions in E2E tests rather than arbitrary delays.
3. Clean up created data after tests when needed to preserve repeatability.
4. Ensure local and CI test runs are consistent.

## 7. Quality Gate Expectation

1. Feature work is not complete until relevant unit/integration/E2E coverage is added at the right level.
2. Pull requests should include or update tests that validate new behavior and protect against regressions.
