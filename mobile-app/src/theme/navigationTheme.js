import { DefaultTheme } from '@react-navigation/native';
import { colors } from './colors';

// Tells React Navigation to use FINDIT's colours (keeps the library's own font settings).
export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.neutralTint,
    notification: colors.error,
  },
};
