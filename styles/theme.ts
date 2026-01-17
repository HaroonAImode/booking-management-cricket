/**
 * Mantine Theme Configuration
 * 
 * Purpose: Professional theme with cricket-inspired colors and optimized UX
 * Features:
 * - Cricket green primary color
 * - Smooth animations and transitions
 * - Mobile-optimized touch targets
 * - Professional shadows and borders
 * - Enhanced component defaults
 */

import { createTheme, rem, MantineColorsTuple } from '@mantine/core';

// Cricket-inspired green color palette
const cricketGreen: MantineColorsTuple = [
  '#e8f9f0',
  '#d0f2e0',
  '#a8e6c8',
  '#7dd9ae',
  '#5acf98',
  '#3bc687',
  '#2bb870',
  '#1f9f5d',
  '#17864d',
  '#0d6d3d',
];

export const theme = createTheme({
  /* Primary color - Cricket green */
  primaryColor: 'cricketGreen',
  
  colors: {
    cricketGreen,
  },

  /* Font family - System fonts for best performance */
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headingFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

  /* Breakpoints for responsive design (mobile-first) */
  breakpoints: {
    xs: '36em',  // 576px
    sm: '48em',  // 768px
    md: '62em',  // 992px
    lg: '75em',  // 1200px
    xl: '88em',  // 1408px
  },

  /* Default radius for modern, friendly look */
  defaultRadius: 'md',

  /* Spacing scale - consistent spacing throughout */
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  /* Shadows for depth */
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  /* Global styles */
  other: {
    // Animation durations
    transitionDuration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    // Mobile touch target minimum size (44px recommended)
    minTouchTarget: rem(44),
  },

  /* Customize component styles */
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          transition: 'all 250ms ease',
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
      },
    },

    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
        padding: 'lg',
        withBorder: true,
      },
      styles: {
        root: {
          transition: 'box-shadow 250ms ease, transform 250ms ease',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },

    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
        padding: 'lg',
      },
      styles: {
        root: {
          transition: 'box-shadow 250ms ease',
        },
      },
    },

    Badge: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },

    ActionIcon: {
      defaultProps: {
        size: 'lg', // Larger for better touch targets
        radius: 'md',
      },
      styles: {
        root: {
          transition: 'all 250ms ease',
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
      },
    },

    TextInput: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: {
        input: {
          transition: 'border-color 250ms ease, box-shadow 250ms ease',
        },
      },
    },

    Textarea: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: {
        input: {
          transition: 'border-color 250ms ease, box-shadow 250ms ease',
        },
      },
    },

    Select: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: {
        input: {
          transition: 'border-color 250ms ease, box-shadow 250ms ease',
        },
      },
    },

    Modal: {
      defaultProps: {
        radius: 'md',
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.55,
          blur: 3,
        },
      },
      styles: {
        content: {
          animation: 'slideUp 350ms ease',
        },
      },
    },

    Notification: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          animation: 'slideInRight 350ms ease',
        },
      },
    },

    Table: {
      styles: {
        table: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
        th: {
          fontWeight: 700,
          fontSize: rem(13),
          textTransform: 'uppercase',
          letterSpacing: '0.025em',
        },
        td: {
          transition: 'background-color 150ms ease',
        },
      },
    },

    Skeleton: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          '&::before': {
            background: 'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            animation: 'shimmer 2s infinite',
          },
        },
      },
    },

    LoadingOverlay: {
      defaultProps: {
        overlayProps: {
          blur: 2,
        },
      },
    },

    Alert: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          borderWidth: 1,
        },
      },
    },

    Tooltip: {
      defaultProps: {
        radius: 'sm',
        withArrow: true,
        transitionProps: { duration: 200 },
      },
    },
  },
});
