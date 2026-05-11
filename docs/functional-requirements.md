# Functional Requirements

This document defines the core functional requirements for the TODO application.

## 1. Task Creation

1. The user can create a new task by entering a required task title.
2. The system must reject empty task titles.
3. The user can optionally add a due date when creating a task.
4. A newly created task is marked as "incomplete" by default.

## 2. Task Display

1. The system displays all tasks in a list view.
2. Each task item displays:
   - Title
   - Completion status
   - Due date (if provided)
3. Tasks without a due date must still render correctly with no due date shown.

## 3. Task Editing

1. The user can edit an existing task title.
2. The user can add, change, or remove a task due date after creation.
3. The system must save edits immediately after the user confirms the update.

## 4. Task Completion

1. The user can mark a task as complete.
2. The user can mark a completed task as incomplete.
3. Completion state changes must be reflected in the task list immediately.

## 5. Task Deletion

1. The user can delete a task from the list.
2. Once deleted, the task must no longer appear in the task list.

## 6. Task Ordering and Sorting

1. Tasks are sorted in a deterministic order.
2. Default sort order must be:
   - Incomplete tasks before completed tasks
   - Tasks with earlier due dates before later due dates
   - Tasks without due dates after tasks with due dates
   - For ties, older created tasks before newer created tasks
3. The same input data must always produce the same task order.

## 7. Data Persistence

1. Task data (title, due date, completion status, and order metadata) must persist across page refreshes.
2. Persisted tasks must be restored when the app is reopened.

## 8. Validation and Error Handling

1. The system must validate task title input on create and edit actions.
2. If an operation fails (create, edit, delete, or status update), the user must receive an error message.
3. Failed operations must not silently modify task data.

## 9. Minimum Task Data Model

Each task record must include at least:

- Unique identifier
- Title
- Completion status
- Optional due date
- Created timestamp
- Updated timestamp
