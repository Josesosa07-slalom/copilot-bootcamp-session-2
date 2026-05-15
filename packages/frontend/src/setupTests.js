// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// MUI's FormControl/TextField triggers an internal setState in a post-mount
// effect that React 18 + jsdom flag with an act() warning even when tests are
// correctly written. Filter only that specific noisy warning.
const originalError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('not wrapped in act(') &&
      /FormControl|TextField|InputBase/.test(msg)
    ) {
      return;
    }
    originalError(...args);
  });
});
afterAll(() => {
  console.error.mockRestore?.();
});