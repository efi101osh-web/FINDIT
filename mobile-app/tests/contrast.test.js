import { colors } from '../src/theme/colors';
import { STATUS_COLORS, TYPE_COLORS } from '../src/theme/statusColors';

// WCAG contrast ratio: 4.5:1 is the target for normal text, 3:1 for large text and form outlines.
const channel = (value) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('the brand colours are readable (documentation/ARCHITECTURE.md section 12)', () => {
  const textPairs = [
    ['white on primary (buttons)', colors.white, colors.primary],
    ['primary on background (headings, links)', colors.primary, colors.background],
    ['primary on primaryLight (chips, badges)', colors.primary, colors.primaryLight],
    ['white on secondary', colors.white, colors.secondary],
    ['text on background (body)', colors.text, colors.background],
    ['text on surface (cards)', colors.text, colors.surface],
    ['text on primaryLight', colors.text, colors.primaryLight],
    ['muted on surface', colors.muted, colors.surface],
    ['muted on background', colors.muted, colors.background],
    ['text on warning', colors.text, colors.warning],
    ['white on success', colors.white, colors.success],
    ['white on error', colors.white, colors.error],
    ['errorText on errorTint (error boxes)', colors.errorText, colors.errorTint],
    ['errorText on surface (field errors)', colors.errorText, colors.surface],
    ['errorText on background', colors.errorText, colors.background],
    ['successText on successTint', colors.successText, colors.successTint],
    ['text on warningTint', colors.text, colors.warningTint],
    ['text on neutralTint', colors.text, colors.neutralTint],
  ];
  test.each(textPairs)('%s is at least 4.5:1', (name, foreground, background) => {
    expect(ratio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  test('form outlines are at least 3:1 against the white of the field', () => {
    expect(ratio(colors.inputBorder, colors.surface)).toBeGreaterThanOrEqual(3);
  });

  test('every status badge and every Lost / Found badge is readable', () => {
    for (const [status, look] of Object.entries(STATUS_COLORS)) expect([status, ratio(look.text, look.background) >= 4.5]).toEqual([status, true]);
    for (const [type, look] of Object.entries(TYPE_COLORS)) expect([type, ratio(look.text, look.background) >= 4.5]).toEqual([type, true]);
  });

  test('the two pairs the design forbids for small text really do fail (this is WHY the rules exist)', () => {
    expect(ratio(colors.warning, colors.surface)).toBeLessThan(4.5); // warning is a fill, never text
    expect(ratio(colors.muted, colors.primaryLight)).toBeLessThan(4.5); // use text on primaryLight
  });
});
