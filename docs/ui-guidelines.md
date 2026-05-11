# UI Guidelines

This document defines the core UI requirements for the TODO application.

## 1. Design System Requirement

1. The frontend must use Material UI (`@mui/material`) as the primary component library.
2. Core UI controls must be implemented using Material components instead of custom HTML controls when an equivalent component exists.
3. The app must use a shared theme via `ThemeProvider` so colors, spacing, typography, and component styles are consistent.

## 2. Required Material Components

Use the following Material components for core workflows:

- Page shell: `Container`, `Box`, `Paper`
- Task input form: `TextField`, `Button`, `IconButton`
- Due date entry: `TextField` with date input type or MUI date picker components
- Task list: `List`, `ListItem`, `ListItemText`, `Divider`
- Task status: `Checkbox` or `Switch`
- Edit/delete actions: `IconButton` with clear labels
- Feedback and errors: `Alert`, `Snackbar`
- Optional loading state: `CircularProgress`

## 3. Color Palette

The UI must use this palette through the Material theme:

- Primary: `#1565C0` (Blue 800)
- Secondary: `#2E7D32` (Green 800)
- Accent/Warning: `#ED6C02` (Orange 700)
- Error: `#D32F2F` (Red 700)
- Background default: `#F7F9FC`
- Surface (`Paper`/cards): `#FFFFFF`
- Primary text: `#1F2937`
- Secondary text: `#4B5563`
- Border/Divider: `#D1D5DB`

Additional color rules:

1. Do not hardcode ad-hoc colors in components unless approved by design review.
2. Use theme tokens (`theme.palette.*`) for all component colors.
3. Completed tasks should use reduced emphasis while preserving readability (for example, medium-gray text with optional strike-through).

## 4. Button Styles

1. Primary actions (for example, "Add Task", "Save") must use `Button` with `variant="contained"` and the theme primary color.
2. Secondary actions (for example, "Cancel", "Edit") must use `Button` with `variant="outlined"`.
3. Destructive actions (for example, "Delete") must use the error color and require clear visual emphasis.
4. Buttons must maintain a minimum height of 40px and use consistent horizontal padding.
5. Icon-only buttons must include accessible labels.
6. Disabled buttons must remain legible and clearly indicate non-interactive state.

## 5. Layout and Spacing

1. Use Material spacing scale (`theme.spacing`) consistently.
2. Maintain at least 16px spacing between major sections on mobile and 24px on desktop.
3. Keep content width readable with a centered container.
4. Ensure responsive behavior for common breakpoints (mobile, tablet, desktop).

## 6. Typography

1. Use the Material typography system from the shared theme.
2. Ensure heading hierarchy is semantic and visually consistent.
3. Body text must remain readable at small viewport sizes (minimum 14px equivalent).

## 7. Accessibility Requirements

1. The UI must meet WCAG 2.1 AA contrast requirements:
   - Normal text contrast ratio of at least 4.5:1
   - Large text contrast ratio of at least 3:1
2. Every interactive element must be keyboard accessible.
3. Focus states must be visible for all interactive components.
4. All form controls must have associated labels.
5. Icon-only controls must include `aria-label` text describing the action.
6. Validation and error messages must be announced and clearly linked to the relevant input.
7. Do not rely on color alone to convey task status or errors.
8. Touch targets must be at least 44x44 CSS pixels where practical.

## 8. Interaction Feedback

1. User actions (add, edit, complete, delete) must show immediate visual confirmation.
2. Errors must be shown with clear, human-readable messages.
3. Loading or in-progress states must be communicated for async operations.

## 9. Consistency and Maintainability

1. Reusable UI patterns (task item row, form sections, action groups) should be componentized.
2. Styling should be centralized through theme overrides and shared style utilities.
3. New UI additions must follow these guidelines unless an explicit exception is documented.
