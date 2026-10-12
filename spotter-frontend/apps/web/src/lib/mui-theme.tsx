import { createTheme } from '@mui/material/styles';

// Matches the teal dispatch palette and shared typography so MUI and custom surfaces match.
export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#087C75', contrastText: '#FFFFFF' },
    secondary: { main: '#059669', contrastText: '#FFFFFF' },
    error: { main: '#DC2626' },
    warning: { main: '#EA580C' },
    success: { main: '#059669' },
    background: { default: '#F5F7F4', paper: '#FFFFFF' },
    text: { primary: '#172D35', secondary: '#52666C' },
    divider: '#DCE6E1',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    fontSize: 14,
    h1: { fontFamily: 'Manrope, sans-serif' },
    h2: { fontFamily: 'Manrope, sans-serif' },
    h3: { fontFamily: 'Manrope, sans-serif' },
    button: { textTransform: 'none', fontWeight: 650 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 44, borderRadius: 10 } },
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: 40,
          textTransform: 'none',
          fontWeight: 600,
          border: 0,
          borderRadius: '999px !important',
          paddingInline: 14,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { minHeight: 44, backgroundColor: '#FFFFFF', borderRadius: 10 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 650 } } },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 14 } },
    },
    MuiSlider: { styleOverrides: { root: { height: 6 }, thumb: { width: 20, height: 20 } } },
  },
});
