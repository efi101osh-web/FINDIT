// Runs before every test file.
// The phone's safe-area measurements do not exist in a test, so use the library's own stand-in.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// The preview API pretends the network is slow so people can SEE the loading states. Tests skip the pause.
jest.mock('../../src/api/delay', () => ({ delay: () => Promise.resolve() }));

// Extra checks such as expect(element).toBeOnTheScreen() and .toHaveProp(...)
expect.extend(require('@testing-library/react-native/matchers'));

// Every test starts from the same sample reports, and a fresh list of places.
beforeEach(() => {
  require('../../src/api/previewStore').resetPreviewStore();
  require('../../src/hooks/useOptions').resetOptionsCache();
});
