# AI Test Generation Issues & Patterns

This document explains the common patterns of AI-generated test issues found in this codebase and how to recognize them.

---

## 1. Mock Hallucinations

**What It Is**: Mocks that exhibit unrealistic behavior that doesn't match the actual implementation.

### Example 1: Default Values That Don't Exist

**Location**: TaskForm component sets `dueDate` default to today

```javascript
// Frontend Component
const [dueDate, setDueDate] = useState(getTodayDate());  // ← Default set here
```

**Why It's a Problem**:
- Functional requirements don't specify a default due date
- This behavior is real application code but undocumented
- Tests don't verify it (so it could be accidentally removed)
- Users might be surprised that new tasks get today's date

**How to Spot It**:
- Look for component behavior that seems "helpful" but isn't in requirements
- Check if tests verify this behavior exists
- Ask: "Is this documented in requirements?"

---

### Example 2: Mock POST Doesn't Validate Dates

**Location**: Frontend mock for POST /api/todos

```javascript
// Mock - WRONG
rest.post('/api/todos', (req, res, ctx) => {
  return res(
    ctx.status(201),
    ctx.json({
      dueDate: dueDate || null,  // ← No validation
    })
  );
})

// Real API - CORRECT
app.post('/api/todos', (req, res) => {
  if (dueDate !== undefined && !isValidDateString(dueDate)) {
    return res.status(400).json({ error: 'Due date must be a valid date' });
  }
  // ...
})
```

**Why It's a Problem**:
- Mock accepts invalid dates that real API rejects
- Test can pass with mock but fail with real API
- Error handling code for invalid dates is untested

**How to Spot It**:
- Compare mock behavior to actual API code
- Check: "Does the mock validate the same things as the API?"
- Test: "Would this pass/fail with the real backend?"

---

### Example 3: Mock PATCH Doesn't Preserve Fields

**Location**: Frontend mock for PATCH /api/todos/:id

```javascript
// Mock - WRONG (simulates new behavior)
rest.patch('/api/todos/:id', (req, res, ctx) => {
  return res(
    ctx.status(200),
    ctx.json({
      title: title || 'Updated Task',  // ← Sets fake default if undefined
    })
  );
})

// Real API - CORRECT (preserves existing)
const nextTitle = req.body.title !== undefined 
  ? req.body.title 
  : existingTodo.title;  // ← Uses existing value
```

**Why It's a Problem**:
- Partial updates won't work correctly
- Test says "update only date" works, but it doesn't with real API
- User tries to update only dueDate, but title mysteriously changes to "Updated Task"

**How to Spot It**:
- Look for mock defaults like `|| 'Some Value'`
- Check if mock matches the real conditional logic
- Test partial updates: "What if I only send some fields?"

---

## 2. False Positive Tests

**What It Is**: Tests that always pass regardless of whether the code actually works.

### Example 1: Only Checking Text Visibility

**Location**: Frontend test for adding a task

```javascript
test('adds a new task', async () => {
  // ... setup, fill form, click button ...
  
  await waitFor(() => {
    expect(screen.getByText('New Test Task')).toBeInTheDocument();  // ← Only checks text
  });
  // ✗ PASS even if:
  // - Task ID is wrong (always 3)
  // - Task completion status is wrong
  // - Task data structure is corrupted
  // - Task not actually in state
});
```

**Why It's a Problem**:
- If the API returns corrupted data, test still passes
- If the response has wrong task object, test still passes
- If the task ID collision occurs, test still passes
- Only GUI appearance is tested, not data integrity

**Better Test**:
```javascript
test('adds a new task', async () => {
  // ... setup, fill form, click button ...
  
  await waitFor(() => {
    expect(screen.getByText('New Test Task')).toBeInTheDocument();
  });
  
  // ✅ Also verify the task properties
  const checkbox = screen.getByRole('checkbox', { name: /Mark New Test Task as complete/ });
  expect(checkbox).not.toBeChecked();  // New tasks should be incomplete
  
  // ✅ Verify form reset
  const input = screen.getByLabelText('Task title');
  expect(input.value).toBe('');  // Should be cleared after submit
});
```

**How to Spot It**:
- Look for tests that only check one property (usually text/visibility)
- Ask: "What would break if X property was wrong?"
- Try: "Could this pass with completely wrong data?"

---

### Example 2: Mocks That Always Succeed

**Location**: Backend integration test - POST always has id: 3

```javascript
// Problem: Mock ignores state
rest.post('/api/todos', (req, res, ctx) => {
  return res(
    ctx.status(201),
    ctx.json({
      id: 3,  // ← Always 3, even if this breaks uniqueness
      // ...
    })
  );
})

// Test that passes but shouldn't
test('creates and lists todos', async () => {
  const createResponse = await createTodo();
  // Response ALWAYS has id: 3, never fails
  expect(createResponse.status).toBe(201);  // ✓ Always true
});
```

---

## 3. Phantom Assertions

**What It Is**: Assertions that check properties that don't exist or are wrong.

### Example: Verifying Wrong Property Value

**Location**: Sorting test

```javascript
it('returns deterministic ordering', async () => {
  // ... create tasks with different completion statuses ...
  
  const orderedTitles = listResponse.body.map((todo) => todo.title);
  expect(orderedTitles).toEqual(['Due date earlier', 'Due date later', 'No due date A']);
  
  // ✓ Correct! But the test doesn't verify completion status...
  // What if response actually was:
  // [
  //   { title: 'Due date earlier', completed: true },    ← WRONG but not caught
  //   { title: 'Due date later', completed: false },
  //   { title: 'No due date A', completed: false }
  // ]
});
```

**Better Test**:
```javascript
it('returns deterministic ordering', async () => {
  // ... create tasks ...
  
  expect(listResponse.body).toEqual([
    expect.objectContaining({
      title: 'Due date earlier',
      completed: false,      // ✅ Now verified
      dueDate: '2026-05-10',
    }),
    // ... etc
  ]);
});
```

**How to Spot It**:
- Look for assertions that check only partial data
- Ask: "What other properties should I verify?"
- Think: "Could the wrong data still pass this test?"

---

## 4. Coverage Illusions

**What It Is**: Tests that claim coverage but miss critical paths, error cases, or edge cases.

### Example 1: Only Happy Path Tested

**Location**: Backend DELETE tests

```javascript
it('deletes an existing todo', async () => {
  const createResponse = await createTodo({ title: 'Delete me' });
  const todoId = createResponse.body.id;

  const deleteResponse = await request(app).delete(`/api/todos/${todoId}`);

  expect(deleteResponse.status).toBe(200);
});

// ✗ Missing tests:
// - DELETE with invalid ID format
// - DELETE non-existent todo (404)
// - DELETE with negative ID
// - Concurrent deletes
```

**Real Code Has Error Handling**:
```javascript
app.delete('/api/todos/:id', (req, res) => {
  const todoId = parseTodoId(req.params.id);
  
  if (!todoId) {  // ← This is untested
    return res.status(400).json({ error: 'Valid todo ID is required' });
  }
  
  const existingTodo = selectTodoByIdStmt.get(todoId);
  if (!existingTodo) {  // ← This is untested
    return res.status(404).json({ error: 'Todo not found' });
  }
  // ...
});
```

**Result**: 70% of the DELETE endpoint code is untested

**How to Spot It**:
- Check: "Does the test cover all error paths?"
- Look at: "What if statements exist in the code?"
- Test: "What happens with invalid/edge case input?"

---

### Example 2: Edge Cases Not Tested

**Location**: TaskForm - all tests pass but edge cases exist

**Missing Tests**:
```javascript
// Not tested: Title with only whitespace
await user.type(input, '   ');
// Frontend: Should NOT allow submit
// Tested: NO

// Not tested: Very long title
await user.type(input, 'x'.repeat(1000));
// Backend: Might exceed database field length
// Tested: NO

// Not tested: Special characters
await user.type(input, '<script>alert("xss")</script>');
// Frontend/Backend: Should sanitize
// Tested: NO

// Not tested: Past due dates
await user.type(dateInput, '2025-01-01');
// Business logic: Should allow?
// Tested: NO

// Not tested: Empty due date
await user.clear(dateInput);
// Should use default or null?
// Tested: NO
```

---

### Example 3: Data Integrity Not Tested

**Location**: E2E tests don't verify persistence

```javascript
test('shows empty state when there are no tasks', async ({ page }) => {
  // ✓ Deletes all tasks
  // ✓ Verifies empty state
  // ✓ Test passes

  // ✗ Missing: No test verifies data persists across reload
});

// Missing critical test:
test('persists tasks across page reload', async ({ page }) => {
  // 1. Create task
  // 2. Reload page
  // 3. Verify task still there
  // NOT TESTED - data could be lost and test wouldn't catch it
});
```

**How to Spot It**:
- Check: "What data integrity properties matter?"
- Test: "Do they survive the expected operations?"
- Think: "What would break silently without this test?"

---

## 5. Common AI Testing Anti-Patterns

### Anti-Pattern 1: "Test Skeleton" - Incomplete Setup

```javascript
// ✗ Bad: Missing assertions
test('updates task', async () => {
  const response = await updateTodo(1, { title: 'New' });
  expect(response.status).toBe(200);
  // That's it! No other checks
});

// ✓ Good: Comprehensive verification
test('updates task', async () => {
  const response = await updateTodo(1, { title: 'New' });
  expect(response.status).toBe(200);
  expect(response.body.title).toBe('New');
  expect(response.body.id).toBe(1);
  expect(response.body.updatedAt).toBeAfter(response.body.createdAt);
});
```

---

### Anti-Pattern 2: "Generic Mocks" - Mocks That Don't Validate

```javascript
// ✗ Bad: Mock accepts anything
rest.post('/api/todos', (req, res, ctx) => {
  return res(ctx.status(201), ctx.json(req.body));  // Always succeeds
});

// ✓ Good: Mock validates like real API
rest.post('/api/todos', (req, res, ctx) => {
  if (!req.body.title || typeof req.body.title !== 'string') {
    return res(ctx.status(400), ctx.json({ error: 'Invalid title' }));
  }
  if (req.body.dueDate && !isValidDate(req.body.dueDate)) {
    return res(ctx.status(400), ctx.json({ error: 'Invalid date' }));
  }
  return res(ctx.status(201), ctx.json(mockTask));
});
```

---

### Anti-Pattern 3: "Assumption Testing" - Assumes Rather Than Verifies

```javascript
// ✗ Bad: Assumes button works
test('can add task', async () => {
  const user = userEvent.setup();
  await user.click(screen.getByText('Add Task'));
  // Assumes it worked - no verification
});

// ✓ Good: Verifies the result
test('can add task', async () => {
  const user = userEvent.setup();
  const input = screen.getByLabelText('Task title');
  await user.type(input, 'Test task');
  
  await user.click(screen.getByText('Add Task'));
  
  // Verify it actually worked
  await waitFor(() => {
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });
});
```

---

### Anti-Pattern 4: "Copy-Paste Tests" - Identical Tests for Different Cases

```javascript
// ✗ Bad: Duplicate tests with minor differences
test('handles error 500', async () => {
  server.use(rest.get('/api/todos', (req, res, ctx) => res(ctx.status(500))));
  await renderApp();
  await waitFor(() => expect(screen.getByText(/Failed/)).toBeInTheDocument());
});

test('handles error 502', async () => {
  server.use(rest.get('/api/todos', (req, res, ctx) => res(ctx.status(502))));
  await renderApp();
  await waitFor(() => expect(screen.getByText(/Failed/)).toBeInTheDocument());  // Wrong assertion!
});

// ✓ Good: Parameterized test
test.each([
  [500, /Failed/],
  [502, /Backend service is unavailable/],  // Different message!
  [503, /Backend service is unavailable/],
])('handles error %i with message %s', async (status, message) => {
  server.use(rest.get('/api/todos', (req, res, ctx) => res(ctx.status(status))));
  await renderApp();
  await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
});
```

---

## 6. How to Write Better Tests - Checklist

### Before Writing Tests:
- [ ] Read the requirements carefully - what must work?
- [ ] Identify happy paths AND error cases
- [ ] List edge cases: empty, null, invalid, extreme values
- [ ] Consider concurrent operations
- [ ] Think about user workflows

### While Writing Tests:
- [ ] Test behavior, not implementation
- [ ] Verify all properties that matter, not just one
- [ ] Check both success AND error responses
- [ ] Test with invalid/edge case data
- [ ] Verify error messages are helpful
- [ ] Ensure tests are deterministic (no flakiness)

### After Writing Tests:
- [ ] Try to make them fail with wrong code
- [ ] Break a line of code - does test catch it?
- [ ] Remove error handling - do tests fail?
- [ ] Change a default value - do tests catch it?
- [ ] Add a duplicate ID - does test catch it?

---

## 7. Red Flags in Generated Tests

| Red Flag | Indicates | Fix |
|----------|-----------|-----|
| Only 1-2 assertions | Incomplete coverage | Add more assertions |
| No error case tests | Illusion of coverage | Add 400/404/500 tests |
| Mock always succeeds | Unrealistic behavior | Add validation to mock |
| No edge case tests | Missing critical paths | Test invalid/extreme input |
| Tests check text only | Data integrity not verified | Verify actual objects |
| Same test for different status codes | Copy-paste errors | Use parameterized tests |
| No setup/teardown | State pollution | Add beforeEach/afterEach |
| Comments like "TODO: add more tests" | Incomplete | Finish before merging |
| Generic test names like "works" | Not descriptive | Describe what's tested |
| No assertions in catch blocks | Silent failures | Assert error handling |

---

## 8. Quick Reference: Test Pattern Examples

### ✓ GOOD: Comprehensive API Error Test
```javascript
it('rejects invalid create payloads', async () => {
  // Missing required field
  expect((await request(app).post('/api/todos').send({})).status).toBe(400);
  
  // Invalid type
  expect((await request(app).post('/api/todos').send({ title: 123 })).status).toBe(400);
  
  // Invalid date
  expect((await request(app).post('/api/todos')
    .send({ title: 'Test', dueDate: 'not-a-date' })).status).toBe(400);
  
  // Verify error message is present
  const response = await request(app).post('/api/todos').send({});
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toBe('Task title is required');
});
```

### ✓ GOOD: Component Interaction Test
```javascript
test('allows editing tasks', async () => {
  const user = userEvent.setup();
  const mockOnEdit = jest.fn();
  
  render(
    <TaskList 
      tasks={[{ id: 1, title: 'Old', completed: false, dueDate: null }]}
      onEdit={mockOnEdit}
      // ... other props
    />
  );

  const editButton = screen.getByRole('button', { name: /Edit Old/ });
  await user.click(editButton);

  const dialog = screen.getByRole('dialog');
  const titleField = dialog.getByDisplayValue('Old');
  await user.clear(titleField);
  await user.type(titleField, 'New');

  const saveButton = dialog.getByRole('button', { name: 'Save' });
  await user.click(saveButton);

  expect(mockOnEdit).toHaveBeenCalledWith(1, { title: 'New', dueDate: null });
});
```

### ✓ GOOD: E2E User Journey
```javascript
test('complete task workflow', async ({ page }) => {
  // 1. Create a task
  // 2. Verify it appears
  // 3. Mark it complete
  // 4. Verify status changed
  // 5. Edit it
  // 6. Verify changes saved
  // 7. Delete it
  // 8. Verify it's gone
  // 9. Reload page
  // 10. Verify persistence
});
```

---

## Conclusion

AI-generated tests often optimize for:
- **Getting tests to pass** ← Wrong priority
- **Covering code lines** ← Wrong metric
- **Happy paths** ← Incomplete coverage
- **Generic mocks** ← Unrealistic behavior

Better tests should:
- **Verify behavior** ← Correct priority
- **Cover requirements** ← Right metric
- **Include error paths** ← Complete coverage
- **Use accurate mocks** ← Realistic testing

The best defense: **Always compare mocks to real code, verify all properties, and test error cases.**

