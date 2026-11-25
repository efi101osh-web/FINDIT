import { colors } from './colors';

// Which colours each status badge uses. This is the "design intent" list from
// documentation/ARCHITECTURE.md section 12. tests/contrast.test.js proves every pair is readable.
export const STATUS_COLORS = Object.freeze({
  OPEN: { background: colors.primaryLight, text: colors.primary },
  POTENTIAL_MATCH: { background: colors.warningTint, text: colors.text },
  UNDER_VERIFICATION: { background: colors.primaryLight, text: colors.primary },
  APPROVED_FOR_RETURN: { background: colors.successTint, text: colors.successText },
  RETURNED: { background: colors.success, text: colors.white },
  CLOSED: { background: colors.neutralTint, text: colors.text },
});

export const TYPE_COLORS = Object.freeze({
  LOST: { background: colors.errorTint, text: colors.errorText },
  FOUND: { background: colors.successTint, text: colors.successText },
});
