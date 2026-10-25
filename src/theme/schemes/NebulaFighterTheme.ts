import { alpha, createTheme, darken } from '@mui/material';
import '@mui/lab/themeAugmentation';

// Vanish brand cyan — slightly darkened from #42FFFC for less visual contrast
const brand = '#2DD4D1';

const themeColors = {
  primary: brand,
  secondary: '#8A8A9A',

  success: '#3DD68C',
  warning: '#F5A524',
  error:   '#F04E6A',
  info:    '#38BDF8',

  black:  '#08080A',
  white:  '#E6E6EE',

  // surface stack (darkest → elevated)
  bg:       '#0A0A0D',   // page background
  surface1: '#0E0E12',   // sidebar / header
  surface2: '#141418',   // cards
  surface3: '#1A1A1F',   // elevated cards / dialogs / table heads
  border:   '#22222A',   // subtle borders

  trueWhite: '#FFFFFF'
};

const colors = {
  gradients: {
    blue1:   `linear-gradient(135deg, ${themeColors.surface2} 0%, ${themeColors.bg} 100%)`,
    blue2:   `linear-gradient(135deg, ${themeColors.surface3} 0%, ${themeColors.bg} 100%)`,
    blue3:   `linear-gradient(127.55deg, ${themeColors.surface1} 3.73%, ${themeColors.surface2} 92.26%)`,
    blue4:   `linear-gradient(-20deg, ${themeColors.surface1} 0%, ${themeColors.surface2} 100%)`,
    blue5:   `linear-gradient(135deg, ${themeColors.surface2} 10%, ${themeColors.bg} 100%)`,
    orange1: `linear-gradient(135deg, ${themeColors.surface3} 0%, ${themeColors.bg} 100%)`,
    orange2: `linear-gradient(135deg, ${themeColors.surface2} 0%, ${themeColors.bg} 100%)`,
    orange3: `linear-gradient(120deg, ${themeColors.surface2} 0%, ${themeColors.bg} 100%)`,
    purple1: `linear-gradient(135deg, ${themeColors.surface2} 0%, ${themeColors.bg} 100%)`,
    purple3: `linear-gradient(135deg, ${themeColors.surface1} 0%, ${themeColors.bg} 100%)`,
    pink1:   `linear-gradient(135deg, ${themeColors.surface2} 0%, ${themeColors.bg} 100%)`,
    pink2:   `linear-gradient(135deg, ${themeColors.surface1} 0%, ${themeColors.bg} 100%)`,
    green1:  `linear-gradient(135deg, ${themeColors.surface2} 0%, ${themeColors.bg} 100%)`,
    green2:  `linear-gradient(to bottom, ${themeColors.surface1}, ${themeColors.bg})`,
    black1:  `linear-gradient(100.66deg, ${themeColors.surface3} 6.56%, ${themeColors.bg} 93.57%)`,
    black2:  `linear-gradient(60deg, ${themeColors.surface1} 0%, ${themeColors.surface2} 100%)`
  },
  shadows: {
    success: `0px 2px 8px ${alpha(themeColors.success, 0.20)}`,
    error:   `0px 2px 8px ${alpha(themeColors.error, 0.20)}`,
    info:    `0px 2px 8px ${alpha(themeColors.info, 0.20)}`,
    primary: `0px 2px 8px ${alpha(brand, 0.18)}`,
    warning: `0px 2px 8px ${alpha(themeColors.warning, 0.20)}`
  },
  layout: {
    sidebar: {
      background:             themeColors.surface1,
      textColor:              alpha('#FFFFFF', 0.58),
      dividerBg:              themeColors.border,
      menuItemColor:          alpha('#FFFFFF', 0.55),
      menuItemColorActive:    '#FFFFFF',
      menuItemBg:             'transparent',
      menuItemBgActive:       alpha(brand, 0.10),
      menuItemIconColor:      alpha('#FFFFFF', 0.32),
      menuItemIconColorActive: brand,
      menuItemHeadingColor:   alpha('#FFFFFF', 0.30)
    }
  },
  alpha: {
    white: {
      5:   alpha(themeColors.white, 0.02),
      10:  alpha(themeColors.white, 0.10),
      30:  alpha(themeColors.white, 0.30),
      50:  alpha(themeColors.white, 0.50),
      70:  alpha(themeColors.white, 0.70),
      100: themeColors.white
    },
    trueWhite: {
      5:   alpha(themeColors.trueWhite, 0.02),
      10:  alpha(themeColors.trueWhite, 0.10),
      30:  alpha(themeColors.trueWhite, 0.30),
      50:  alpha(themeColors.trueWhite, 0.50),
      70:  alpha(themeColors.trueWhite, 0.70),
      100: themeColors.trueWhite
    },
    black: {
      5:   alpha(themeColors.black, 0.02),
      10:  alpha(themeColors.black, 0.10),
      30:  alpha(themeColors.black, 0.30),
      50:  alpha(themeColors.black, 0.50),
      70:  alpha(themeColors.black, 0.70),
      100: themeColors.black
    }
  },
  secondary: {
    lighter: alpha(themeColors.secondary, 0.22),
    light:   alpha(themeColors.secondary, 0.14),
    main:    themeColors.secondary,
    dark:    darken(themeColors.secondary, 0.25)
  },
  primary: {
    lighter: alpha(brand, 0.18),
    light:   alpha(brand, 0.12),
    main:    brand,
    dark:    darken(brand, 0.25)
  },
  success: {
    lighter: alpha(themeColors.success, 0.16),
    light:   alpha(themeColors.success, 0.10),
    main:    themeColors.success,
    dark:    darken(themeColors.success, 0.2)
  },
  warning: {
    lighter: alpha(themeColors.warning, 0.16),
    light:   alpha(themeColors.warning, 0.10),
    main:    themeColors.warning,
    dark:    darken(themeColors.warning, 0.2)
  },
  error: {
    lighter: alpha(themeColors.error, 0.16),
    light:   alpha(themeColors.error, 0.10),
    main:    themeColors.error,
    dark:    darken(themeColors.error, 0.2)
  },
  info: {
    lighter: alpha(themeColors.info, 0.16),
    light:   alpha(themeColors.info, 0.10),
    main:    themeColors.info,
    dark:    darken(themeColors.info, 0.2)
  }
};

export const NebulaFighterTheme = createTheme({
  colors: {
    gradients:  colors.gradients,
    shadows:    colors.shadows,
    alpha:      colors.alpha,
    secondary:  colors.secondary,
    primary:    colors.primary,
    success:    colors.success,
    warning:    colors.warning,
    error:      colors.error,
    info:       colors.info
  },

  general: {
    reactFrameworkColor: brand,
    borderRadiusSm: '4px',
    borderRadius:   '6px',
    borderRadiusLg: '8px',
    borderRadiusXl: '12px'
  },

  sidebar: {
    background:              colors.layout.sidebar.background,
    textColor:               colors.layout.sidebar.textColor,
    dividerBg:               colors.layout.sidebar.dividerBg,
    menuItemColor:           colors.layout.sidebar.menuItemColor,
    menuItemColorActive:     colors.layout.sidebar.menuItemColorActive,
    menuItemBg:              colors.layout.sidebar.menuItemBg,
    menuItemBgActive:        colors.layout.sidebar.menuItemBgActive,
    menuItemIconColor:       colors.layout.sidebar.menuItemIconColor,
    menuItemIconColorActive: colors.layout.sidebar.menuItemIconColorActive,
    menuItemHeadingColor:    colors.layout.sidebar.menuItemHeadingColor,
    boxShadow:               `1px 0 0 ${themeColors.border}`,
    width:                   '232px'
  },

  header: {
    height:     '52px',
    background: themeColors.surface1,
    boxShadow:  `0 1px 0 ${themeColors.border}`,
    textColor:  alpha('#FFFFFF', 0.70)
  },

  spacing: 7,

  palette: {
    common: { black: themeColors.black, white: themeColors.trueWhite },
    mode:   'dark',
    primary: {
      light: colors.primary.light,
      main:  colors.primary.main,
      dark:  colors.primary.dark
    },
    secondary: {
      light: colors.secondary.light,
      main:  colors.secondary.main,
      dark:  colors.secondary.dark
    },
    error: {
      light:        colors.error.light,
      main:         colors.error.main,
      dark:         colors.error.dark,
      contrastText: themeColors.trueWhite
    },
    success: {
      light:        colors.success.light,
      main:         colors.success.main,
      dark:         colors.success.dark,
      contrastText: themeColors.black
    },
    info: {
      light:        colors.info.light,
      main:         colors.info.main,
      dark:         colors.info.dark,
      contrastText: themeColors.black
    },
    warning: {
      light:        colors.warning.light,
      main:         colors.warning.main,
      dark:         colors.warning.dark,
      contrastText: themeColors.black
    },
    text: {
      primary:   alpha('#FFFFFF', 0.88),
      secondary: alpha('#FFFFFF', 0.55),
      disabled:  alpha('#FFFFFF', 0.32)
    },
    background: {
      paper:   themeColors.surface2,
      default: themeColors.bg
    },
    divider: themeColors.border,
    action: {
      active:             alpha('#FFFFFF', 0.80),
      hover:              alpha('#FFFFFF', 0.04),
      hoverOpacity:       0.04,
      selected:           alpha('#FFFFFF', 0.07),
      selectedOpacity:    0.07,
      disabled:           alpha('#FFFFFF', 0.28),
      disabledBackground: alpha('#FFFFFF', 0.04),
      disabledOpacity:    0.38,
      focus:              alpha('#FFFFFF', 0.07),
      focusOpacity:       0.05,
      activatedOpacity:   0.10
    }
  },

  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1840 }
  },

  components: {
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#000', 0.70),
          backdropFilter:  'blur(4px)',
          '&.MuiBackdrop-invisible': { backgroundColor: 'transparent' }
        }
      }
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: themeColors.surface3,
          border:          `1px solid ${themeColors.border}`,
          backgroundImage: 'none',
          boxShadow:       `0 24px 64px ${alpha('#000', 0.65)}`
        }
      }
    },

    MuiCssBaseline: {
      styleOverrides: {
        'html, body': { width: '100%', height: '100%' },
        body: {
          display:       'flex',
          flexDirection: 'column',
          minHeight:     '100%',
          width:         '100%',
          flex:          1
        },
        '#root': {
          width:         '100%',
          height:        '100%',
          display:       'flex',
          flex:          1,
          flexDirection: 'column'
        },
        html: {
          display:                'flex',
          flexDirection:          'column',
          minHeight:              '100%',
          width:                  '100%',
          MozOsxFontSmoothing:    'grayscale',
          WebkitFontSmoothing:    'antialiased'
        },
        '#nprogress':           { pointerEvents: 'none' },
        '#nprogress .bar':      { background: brand, height: '2px' },
        '#nprogress .spinner-icon': {
          borderTopColor:  brand,
          borderLeftColor: brand
        },
        '#nprogress .peg': {
          boxShadow: `0 0 10px ${brand}, 0 0 5px ${alpha(brand, 0.6)}`
        },
        ':root': {
          '--swiper-theme-color': brand,
          colorScheme: 'dark'
        },
        code: {
          background:  alpha('#FFFFFF', 0.06),
          color:       alpha('#FFFFFF', 0.88),
          borderRadius: 4,
          padding:     '2px 6px',
          fontSize:    '0.8125em',
          fontFamily:  '"JetBrains Mono", "Fira Code", monospace'
        },
        // slim custom scrollbar
        '::-webkit-scrollbar':       { width: '5px', height: '5px' },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background:    alpha('#FFFFFF', 0.10),
          borderRadius:  '3px'
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: alpha('#FFFFFF', 0.18)
        }
      }
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          padding:         0,
          border:          `1px solid ${themeColors.border}`
        },
        elevation0:  { boxShadow: 'none' },
        elevation:   { boxShadow: `0 1px 3px ${alpha('#000', 0.45)}` },
        elevation2:  { boxShadow: `0 2px 8px ${alpha('#000', 0.40)}` },
        elevation24: { boxShadow: `0 20px 60px ${alpha('#000', 0.70)}` },
        outlined:    { boxShadow: 'none' }
      }
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: themeColors.surface2,
          border:          `1px solid ${themeColors.border}`,
          backgroundImage: 'none',
          boxShadow:       'none',
          borderRadius:    '8px'
        }
      }
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '14px 18px',
          '&:last-child': { paddingBottom: '14px' }
        }
      }
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: themeColors.border,
          '&::before, &::after': { borderTopColor: themeColors.border }
        },
        wrapper: {
          color:          alpha('#FFFFFF', 0.35),
          fontSize:       '11px',
          fontWeight:     700,
          textTransform:  'uppercase',
          letterSpacing:  '0.07em'
        }
      }
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: themeColors.surface2,
          border:          `1px solid ${themeColors.border}`,
          borderRadius:    '8px'
        }
      }
    },

    MuiTable: {
      styleOverrides: {
        root: { borderCollapse: 'separate', borderSpacing: 0 }
      }
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: themeColors.surface3,
            color:           alpha('#FFFFFF', 0.40),
            fontSize:        '11px',
            fontWeight:      700,
            textTransform:   'uppercase',
            letterSpacing:   '0.07em',
            borderBottom:    `1px solid ${themeColors.border}`,
            padding:         '8px 14px',
            whiteSpace:      'nowrap'
          }
        }
      }
    },

    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: 'background-color 0.12s',
            '&:hover': { backgroundColor: alpha('#FFFFFF', 0.022) },
            '&:last-child .MuiTableCell-body': { borderBottom: 'none' }
          },
          '& .MuiTableCell-body': {
            borderBottom: `1px solid ${alpha(themeColors.border, 0.7)}`,
            padding:      '9px 14px',
            fontSize:     '12.5px',
            color:        alpha('#FFFFFF', 0.78)
          }
        }
      }
    },

    MuiTablePagination: {
      styleOverrides: {
        root: {
          borderTop:       `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.surface2
        },
        displayedRows: { fontSize: '12px', color: alpha('#FFFFFF', 0.45) },
        select:        { fontSize: '12px' }
      }
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontSize:      '11px',
          fontWeight:    600,
          letterSpacing: '0.03em',
          height:        '20px',
          borderRadius:  '4px'
        },
        colorSuccess: {
          backgroundColor: alpha(themeColors.success, 0.12),
          color:           themeColors.success,
          border:          `1px solid ${alpha(themeColors.success, 0.22)}`
        },
        colorError: {
          backgroundColor: alpha(themeColors.error, 0.12),
          color:           themeColors.error,
          border:          `1px solid ${alpha(themeColors.error, 0.22)}`
        },
        colorWarning: {
          backgroundColor: alpha(themeColors.warning, 0.12),
          color:           themeColors.warning,
          border:          `1px solid ${alpha(themeColors.warning, 0.22)}`
        },
        colorInfo: {
          backgroundColor: alpha(themeColors.info, 0.12),
          color:           themeColors.info,
          border:          `1px solid ${alpha(themeColors.info, 0.22)}`
        },
        colorPrimary: {
          backgroundColor: alpha(brand, 0.10),
          color:           brand,
          border:          `1px solid ${alpha(brand, 0.22)}`
        }
      }
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: themeColors.surface1,
          fontSize:        '13px',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: themeColors.border
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha('#FFFFFF', 0.20)
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: brand,
            borderWidth: '1px'
          }
        },
        input: { padding: '9px 13px' }
      }
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '13px', color: alpha('#FFFFFF', 0.45) }
      }
    },

    MuiSelect: {
      styleOverrides: {
        icon: { color: alpha('#FFFFFF', 0.40), top: 'calc(50% - 11px)' }
      }
    },

    MuiButton: {
      defaultProps: { disableRipple: true, disableElevation: true },
      styleOverrides: {
        root: {
          fontWeight:    600,
          fontSize:      '13px',
          textTransform: 'none',
          borderRadius:  '6px',
          letterSpacing: '0.01em',
          transition:    'all 0.15s ease',
          // Minimum touch target for mobile
          '@media (max-width: 600px)': {
            minHeight: '40px',
          }
        },
        sizeSmall:  { padding: '3px 9px', fontSize: '11.5px' },
        sizeMedium: { padding: '6px 12px' },
        sizeLarge:  { padding: '9px 18px', fontSize: '13.5px' },
        // primary contained: cyan bg with dark text (cyan is light enough)
        containedPrimary: {
          backgroundColor: brand,
          color:           '#07100F',
          fontWeight:      700,
          '&:hover': {
            backgroundColor: alpha(brand, 0.85),
            boxShadow:       `0 4px 14px ${alpha(brand, 0.30)}`
          }
        },
        containedSecondary: {
          backgroundColor: themeColors.surface3,
          color:           alpha('#FFFFFF', 0.82),
          border:          `1px solid ${themeColors.border}`,
          '&:hover': { backgroundColor: alpha('#FFFFFF', 0.05) }
        },
        outlinedPrimary: {
          borderColor: alpha(brand, 0.45),
          color:       brand,
          '&:hover': {
            borderColor:     brand,
            backgroundColor: alpha(brand, 0.07)
          }
        },
        outlinedSecondary: {
          borderColor: themeColors.border,
          color:       alpha('#FFFFFF', 0.65),
          '&:hover': {
            borderColor:     alpha('#FFFFFF', 0.22),
            backgroundColor: alpha('#FFFFFF', 0.04),
            color:           alpha('#FFFFFF', 0.85)
          }
        },
        textPrimary: {
          color: brand,
          '&:hover': { backgroundColor: alpha(brand, 0.07) }
        }
      }
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          transition:   'all 0.15s ease',
          '&:hover':    { backgroundColor: alpha('#FFFFFF', 0.05) }
        }
      }
    },

    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight:    '38px',
          borderBottom: `1px solid ${themeColors.border}`
        },
        indicator: {
          height:          '2px',
          backgroundColor: brand,
          borderRadius:    '2px 2px 0 0'
        }
      }
    },

    MuiTab: {
      styleOverrides: {
        root: {
          minHeight:     '38px',
          padding:       '6px 14px',
          fontSize:      '13px',
          fontWeight:    600,
          textTransform: 'none',
          color:         alpha('#FFFFFF', 0.45),
          transition:    'color 0.15s',
          '&.Mui-selected': { color: alpha('#FFFFFF', 0.88) },
          '&:hover':        { color: alpha('#FFFFFF', 0.70) }
        }
      }
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: themeColors.surface1,
          backgroundImage: 'none',
          borderBottom:    `1px solid ${themeColors.border}`,
          boxShadow:       'none'
        }
      }
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: themeColors.surface3,
          border:          `1px solid ${themeColors.border}`,
          boxShadow:       `0 8px 32px ${alpha('#000', 0.55)}`,
          padding:         '4px'
        },
        list: { padding: '4px' }
      }
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize:     '13px',
          borderRadius: '4px',
          padding:      '7px 12px',
          color:        alpha('#FFFFFF', 0.68),
          transition:   'all 0.12s',
          '&:hover, &.Mui-selected': {
            color:           alpha('#FFFFFF', 0.88),
            backgroundColor: alpha('#FFFFFF', 0.05)
          },
          '&.Mui-selected:hover': {
            backgroundColor: alpha('#FFFFFF', 0.07)
          }
        }
      }
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: themeColors.surface3,
          border:          `1px solid ${themeColors.border}`,
          color:           alpha('#FFFFFF', 0.82),
          fontSize:        '12px',
          padding:         '5px 10px',
          borderRadius:    '5px',
          boxShadow:       `0 4px 16px ${alpha('#000', 0.50)}`
        },
        arrow: { color: themeColors.surface3 }
      }
    },

    MuiAlert: {
      styleOverrides: {
        root:            { borderRadius: '6px', fontSize: '13px', border: '1px solid' },
        standardSuccess: {
          backgroundColor: alpha(themeColors.success, 0.09),
          borderColor:     alpha(themeColors.success, 0.20),
          color:           themeColors.success
        },
        standardError: {
          backgroundColor: alpha(themeColors.error, 0.09),
          borderColor:     alpha(themeColors.error, 0.20),
          color:           themeColors.error
        },
        standardWarning: {
          backgroundColor: alpha(themeColors.warning, 0.09),
          borderColor:     alpha(themeColors.warning, 0.20),
          color:           themeColors.warning
        },
        standardInfo: {
          backgroundColor: alpha(themeColors.info, 0.09),
          borderColor:     alpha(themeColors.info, 0.20),
          color:           themeColors.info
        }
      }
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height:          '3px',
          borderRadius:    '2px',
          backgroundColor: alpha('#FFFFFF', 0.07)
        },
        bar: { borderRadius: '2px' }
      }
    }
  },

  shape: { borderRadius: 6 },

  typography: {
    fontFamily:
      '"Consolas", "Monaco", "Courier New", monospace',
    h1: { fontWeight: 700, fontSize: '1.625rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '1.25rem',  letterSpacing: '-0.01em' },
    h3: { fontWeight: 600, fontSize: '1rem',     lineHeight: 1.4, letterSpacing: '-0.01em', color: alpha('#FFFFFF', 0.88) },
    h4: { fontWeight: 600, fontSize: '0.875rem' },
    h5: { fontWeight: 600, fontSize: '0.8125rem' },
    h6: { fontWeight: 600, fontSize: '0.75rem' },
    body1:    { fontSize: '0.8125rem', lineHeight: 1.55 },
    body2:    { fontSize: '0.75rem',   lineHeight: 1.55 },
    button:   { fontWeight: 600, letterSpacing: '0.01em' },
    caption: {
      fontSize:      '0.625rem',
      textTransform: 'uppercase',
      fontWeight:    600,
      letterSpacing: '0.07em',
      color:         alpha('#FFFFFF', 0.38)
    },
    subtitle1: { fontSize: '0.8125rem', color: alpha('#FFFFFF', 0.60) },
    subtitle2: { fontWeight: 500, fontSize: '0.75rem', color: alpha('#FFFFFF', 0.48) },
    overline:  { fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }
  },

  shadows: Array(25).fill('none') as any
});
