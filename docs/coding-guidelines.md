# Coding Guidelines

This document summarizes the project's coding style and quality principles. It is intended to keep the codebase consistent, readable, and maintainable as the TODO app evolves.

## 1. Style and Formatting

Code should be written with clarity first. Favor straightforward naming, small focused functions, and predictable structure over clever one-liners.

General formatting expectations:

- Use consistent indentation and spacing throughout each file.
- Keep lines at a readable length.
- Use meaningful names for variables, functions, and components.
- Prefer early returns and simple control flow to reduce nesting.
- Remove dead code and commented-out blocks before merging.

When touching existing files, follow the style already established in that file unless a broader refactor is intentionally planned.

## 2. File and Module Organization

Organize code by feature responsibility and keep related concerns together.

- Keep modules focused on a single responsibility.
- Avoid very large files; split code when responsibilities diverge.
- Place tests near their expected package test directories and keep names aligned with the implementation.
- Prefer reusable utility modules for shared logic instead of duplicating behavior across components or routes.

## 3. Import Organization

Imports should be clean, deterministic, and easy to scan.

Recommended import order:

1. Third-party libraries
2. Internal absolute/shared modules (if configured)
3. Relative local modules
4. Style or asset imports

Additional import rules:

- Group imports by category with a blank line between groups.
- Avoid unused imports.
- Prefer named imports when they improve readability.
- Keep import side effects explicit and minimal.

## 4. Linting and Static Quality Checks

Linting is required to keep style and quality standards consistent.

- Run lint checks before creating or updating pull requests.
- Resolve lint warnings where practical; do not ignore errors.
- Avoid disabling lint rules unless there is a documented justification.
- If a rule is disabled, scope it as narrowly as possible.

Linting should be treated as a guardrail, not as an afterthought.

## 5. DRY and Reuse Principles

Apply DRY (Don't Repeat Yourself) to reduce maintenance cost and defect risk.

- Extract repeated logic into shared helpers, hooks, or services.
- Reuse UI patterns through composable components.
- Centralize constants, validation rules, and configuration values.
- Avoid copy-paste implementations across frontend and backend.

DRY should be balanced with readability; premature abstraction is discouraged.

## 6. Readability and Maintainability

Write code for the next developer (or future you).

- Prefer explicit, descriptive code over implicit behavior.
- Keep function signatures small and focused.
- Use comments sparingly and only when intent is not obvious from code.
- Keep error handling user-focused and developer-informative.

A good rule: if a section of code is hard to explain, simplify it.

## 7. Error Handling and Validation

Error handling should be consistent and actionable.

- Validate external input at boundaries (API requests, form input, query params).
- Fail fast with clear messages when required data is missing or invalid.
- Do not swallow errors silently.
- Return or surface errors in a structured, predictable way.

## 8. Testing Expectations

Code quality includes testability.

- New behavior should include tests at the appropriate level (unit, integration, or E2E).
- Prefer tests that verify behavior over implementation details.
- Keep tests deterministic and isolated.
- Refactors should preserve or improve test coverage for affected behavior.

## 9. Performance and Simplicity

Build the simplest solution that meets requirements, then optimize with evidence.

- Avoid unnecessary renders, repeated computation, and avoidable network calls.
- Use efficient data operations for sorting and filtering tasks.
- Measure performance bottlenecks before introducing complexity.

## 10. Pull Request Quality

Every pull request should be easy to review and safe to merge.

- Keep changes scoped to a clear objective.
- Include tests and documentation updates when behavior changes.
- Use clear commit messages that explain intent.
- Address review feedback with maintainability in mind, not just minimal fixes.

Following these guidelines helps keep the project approachable, reliable, and scalable as features are added.
