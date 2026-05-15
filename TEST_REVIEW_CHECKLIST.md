# Test Review Checklist

Quick reference for reviewing tests and catching AI-generated test issues.

---

## Pre-Test-Writing Checklist

### Understanding Requirements
- [ ] Read the functional requirements completely
- [ ] Identify what "success" looks like
- [ ] List all error scenarios
- [ ] Note edge cases mentioned or implied
- [ ] Check for any constraints (length, format, timing)

### Planning Test Cases
- [ ] Happy path defined
- [ ] All error codes identified (400, 404, 500, etc.)
- [ ] Edge cases listed:
  - [ ] Empty/null/undefined inputs
  - [ ] Invalid data types
  - [ ] Boundary values
  - [ ] Concurrent operations
  - [ ] Special characters
- [ ] Data persistence scenarios considered
- [ ] User workflow tested end-to-end

---

## During Test Review Checklist

### Mock Accuracy
- [ ] Mock validation matches real code
- [ ] Mock error responses match real error codes
- [ ] Mock error messages match real messages
- [ ] Mock doesn't add fake fields/defaults not in real API
- [ ] Mock preserves existing data on partial updates
- [ ] Mock state is realistic (not hardcoded)

### Assertion Quality
- [ ] Each test verifies more than one property
- [ ] Tests check:
  - [ ] Response status code
  - [ ] Response body structure
  - [ ] Response data values
  - [ ] Side effects (state changes)
- [ ] Assertions are specific, not generic
- [ ] Tests verify error messages are present
- [ ] Tests verify field values, not just presence

### Error Case Coverage
- [ ] Tests for HTTP 400 (bad request)
- [ ] Tests for HTTP 404 (not found)
- [ ] Tests for HTTP 500 (server error)
- [ ] Tests for validation failures:
  - [ ] Missing required fields
  - [ ] Wrong data types
  - [ ] Invalid format (dates, emails, etc.)
  - [ ] Out of bounds values
- [ ] Tests verify error message is helpful
- [ ] Tests verify error response structure

### Edge Case Coverage
- [ ] Tests for empty string
- [ ] Tests for null/undefined
- [ ] Tests for whitespace-only string
- [ ] Tests for very long input
- [ ] Tests for special characters
- [ ] Tests for negative numbers
- [ ] Tests for zero
- [ ] Tests for future/past dates
- [ ] Tests for boundary values

### Component Tests
- [ ] Tests verify component renders
- [ ] Tests verify state changes
- [ ] Tests verify event handlers called
- [ ] Tests verify disabled states
- [ ] Tests verify error states
- [ ] Tests verify loading states
- [ ] Tests verify empty states
- [ ] Tests verify conditional rendering

### Integration Tests
- [ ] Tests use real HTTP requests (no mocking)
- [ ] Tests create test data
- [ ] Tests clean up after themselves
- [ ] Tests run in isolation
- [ ] Tests have explicit waits (no setTimeout)
- [ ] Tests verify database state if applicable

### E2E Tests
- [ ] Tests follow user workflows
- [ ] Tests verify full feature end-to-end
- [ ] Tests use Page Object Model
- [ ] Tests wait for elements (not sleeps)
- [ ] Tests verify persistence where applicable
- [ ] Tests clean up their data
- [ ] Tests work in any browser (or specified browsers)

---

## Post-Test-Writing Validation

### Break the Code
- [ ] Change a value - test fails?
- [ ] Remove error handling - test fails?
- [ ] Change validation logic - test fails?
- [ ] Remove a field from response - test fails?
- [ ] Corrupt mock data - test fails?

### Add Bad Cases
- [ ] Run test with invalid ID - still passes?
- [ ] Run with wrong data type - still passes?
- [ ] Run with null/empty values - still passes?
- [ ] Run in different order - still passes?

### Check Dependencies
- [ ] Test doesn't depend on execution order
- [ ] Test doesn't depend on other tests
- [ ] Test cleans up after itself
- [ ] No shared state between tests
- [ ] Can run test in isolation successfully

---

## Red Flags - Stop and Review

| Red Flag | Severity | Action |
|----------|----------|--------|
| Test has only 1 assertion | HIGH | Add more assertions for completeness |
| Test checks only text/visibility | HIGH | Add data structure verification |
| Mock always succeeds (no errors) | HIGH | Add validation to mock |
| No error case tests for endpoint | HIGH | Add 400/404/500 tests |
| Test passes even when code is broken | HIGH | Make test more specific |
| Same test copied multiple times | MEDIUM | Use parameterized test |
| No setup/teardown | MEDIUM | Add beforeEach/afterEach |
| Comments like "TODO test this" | MEDIUM | Complete before merge |
| No assertions in error path | MEDIUM | Add error assertions |
| Hardcoded IDs/values | MEDIUM | Use generated/dynamic data |
| Generic test name "works" | LOW | Use descriptive name |
| No comments explaining complex logic | LOW | Add clarity comments |

---

## Testing Levels Checklist

### Unit Tests
- [ ] Test single function/component in isolation
- [ ] Use mocks for dependencies
- [ ] All branches tested
- [ ] Error paths tested
- [ ] All input types tested

### Integration Tests
- [ ] Test multiple functions together
- [ ] Test real database if applicable
- [ ] Test real HTTP requests
- [ ] Happy path AND error paths
- [ ] Data validation tested

### E2E Tests
- [ ] Test complete user workflow
- [ ] Use real browser
- [ ] Use real UI
- [ ] Test user interactions
- [ ] Verify persistence

---

## Quick Fixes for Common Issues

### Issue: Mock Doesn't Match Real API
```javascript
// ✗ Before: Mock always succeeds
rest.post('/api/todos', (req, res, ctx) => {
  return res(ctx.status(201), ctx.json(req.body));
});

// ✓ After: Mock validates like real API
rest.post('/api/todos', (req, res, ctx) => {
  if (!req.body.title) {
    return res(ctx.status(400), ctx.json({ error: 'Title required' }));
  }
  return res(ctx.status(201), ctx.json(req.body));
});
```

---

### Issue: Assertion Only Checks Text
```javascript
// ✗ Before: Only checks visibility
expect(screen.getByText('Task 1')).toBeInTheDocument();

// ✓ After: Checks properties too
expect(screen.getByText('Task 1')).toBeInTheDocument();
const checkbox = screen.getByRole('checkbox', { name: /Task 1/ });
expect(checkbox).not.toBeChecked();
```

---

### Issue: Missing Error Tests
```javascript
// ✓ Add these error tests:
it('rejects empty title', async () => {
  const res = await request(app).post('/api/todos').send({ title: '' });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/title/i);
});

it('returns 404 for non-existent ID', async () => {
  const res = await request(app).delete('/api/todos/9999');
  expect(res.status).toBe(404);
});
```

---

### Issue: No Edge Case Tests
```javascript
// ✓ Add these edge case tests:
it('handles whitespace-only title', async () => {
  const res = await request(app).post('/api/todos').send({ title: '   ' });
  expect(res.status).toBe(400);
});

it('handles very long title', async () => {
  const longTitle = 'x'.repeat(10000);
  const res = await request(app).post('/api/todos').send({ title: longTitle });
  expect([201, 400]).toContain(res.status);
});
```

---

## Code Review Comments Template

### For False Positive Tests:
> "This test only checks text visibility. What if the task ID was wrong or the completion status was inverted? Let's add assertions to verify the full response object."

### For Missing Error Cases:
> "The API has validation for X, but I don't see tests for it. Let's add a test that sends invalid X and verifies the 400 response."

### For Mock Hallucinations:
> "The mock always succeeds, but the real API validates Y. Let's update the mock to match the real API's validation behavior."

### For Coverage Illusions:
> "We test the happy path, but the real code has error handling we're not testing. Let's add tests for the invalid ID and 404 cases."

---

## Estimation Guide

| Task | Estimated Time |
|------|-----------------|
| Add one error test | 10-15 min |
| Add one edge case test | 15-20 min |
| Create one component test suite | 30-45 min |
| Fix mock to validate correctly | 15-20 min |
| Add data persistence E2E test | 20-30 min |
| Refactor tests to remove duplicates | 20-30 min |
| Create unit test for component | 45-60 min |

---

## Final Checklist Before Merge

- [ ] All happy paths tested
- [ ] All documented error cases tested
- [ ] Key edge cases tested
- [ ] Mocks match real API behavior
- [ ] All assertions verify relevant properties
- [ ] No tests pass with broken code
- [ ] No shared state between tests
- [ ] Each test can run independently
- [ ] Clear, descriptive test names
- [ ] Error messages are helpful
- [ ] No TODO comments in tests
- [ ] Code review approved
- [ ] All tests pass locally
- [ ] Tests pass in CI/CD

---

## Resources

- [Full Verification Report](TEST_VERIFICATION_REPORT.md)
- [Corrections Guide](TEST_CORRECTIONS_GUIDE.md)
- [AI Test Patterns](AI_TEST_PATTERNS.md)
- [Functional Requirements](docs/functional-requirements.md)
- [Testing Guidelines](docs/testing-guidelines.md)

