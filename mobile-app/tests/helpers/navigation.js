// A stand-in for the `navigation` object every screen receives.
export const makeNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => () => {}),
});

/** Calls the function a screen registered for an event such as 'focus'. */
export const fire = (navigation, event) => {
  for (const [name, handler] of navigation.addListener.mock.calls) if (name === event) handler();
};
