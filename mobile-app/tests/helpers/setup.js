// Runs before every test file.
// The phone's safe-area measurements do not exist in a test, so use the library's own stand-in.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Extra checks such as expect(element).toBeOnTheScreen() and .toHaveProp(...)
expect.extend(require('@testing-library/react-native/matchers'));
