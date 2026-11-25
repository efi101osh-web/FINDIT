// FINDIT's colours. These are the design tokens from documentation/ARCHITECTURE.md section 12,
// shared with the admin dashboard so both look like one product.
//
// Accessibility notes (measured, and locked by tests/contrast.test.js):
//   * `warning` is a FILL only. Never use it as text colour on white (2.55:1).
//   * On `primaryLight` backgrounds use `text`, not `muted` (4.42:1 is too low for small text).

export const colors = Object.freeze({
  primary: '#51258A',
  secondary: '#7652A8',
  primaryLight: '#F1EBF8',
  background: '#FAF9FC',
  surface: '#FFFFFF',
  text: '#24212A',
  muted: '#706B78',
  success: '#258653',
  warning: '#D89527',
  error: '#C74747',

  // added for accessibility (documentation/ARCHITECTURE.md section 12)
  inputBorder: '#8F899A',
  successTint: '#E4F3EB',
  successText: '#1F6F45',
  errorTint: '#FBEAEA',
  errorText: '#B03B3B',
  warningTint: '#FBF0DA',
  neutralTint: '#ECEAF0',

  white: '#FFFFFF',
});
