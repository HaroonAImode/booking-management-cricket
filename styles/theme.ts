/**
 * Mantine Theme Configuration - PowerPlay Cricket Arena
 * 
 * Purpose: Premium black & yellow sports-tech branding
 * Features:
 * - PowerPlay yellow (#F5B800) - Primary brand color
 * - Deep black (#1A1A1A) - Structure and sophistication
 * - Smooth animations and transitions
 * - Mobile-optimized touch targets
 * - Premium shadows and accents
 * - High-end cricket arena aesthetic
 */

import { createTheme, rem, MantineColorsTuple } from '@mantine/core';

// PowerPlay Yellow - Primary brand color
const powerplayYellow: MantineColorsTuple = [
  '#FFF9E6',  // Lightest - backgrounds
  '#FFF3CC',
  '#FFECB3',
  '#FFE599',
  '#FFDD80',
  '#F5B800',  // Brand yellow (from logo)
  '#E0A800',
  '#CC9900',
  '#B38600',
  '#996B00',  // Darkest - text on light bg
];

// Deep Black - Premium structure
const deepBlack: MantineColorsTuple = [
  '#F5F5F5',  // Off-white
  '#E8E8E8',  // Light gray
  '#D1D1D1',  // Medium gray
  '#9E9E9E',  // Gray
  '#6B6B6B',  // Dark gray
  '#4A4A4A',  // Charcoal
  '#333333',  // Darker
  '#262626',  // Very dark
  '#1A1A1A',  // Deep black (primary)
  '#0D0D0D',  // Pure black
];

export const theme = createTheme({
  /* Primary color - PowerPlay Yellow */
  primaryColor: 'yellow',
  
  colors: {
    yellow: powerplayYellow,
    dark: deepBlack,
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
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '44px', // Touch-friendly
          fontSize: '15px',
          '@media (min-width: 768px)': {
            fontSize: '16px',
            minHeight: '42px',
          },
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.98)',
          },
        },
      },
    },

    TextInput: {
      styles: {
        input: {
          fontSize: '16px', // Prevents zoom on iOS
          minHeight: '44px',
          '@media (min-width: 768px)': {
            fontSize: '15px',
            minHeight: '40px',
          },
        },
      },
    },

    Textarea: {
      styles: {
        input: {
          fontSize: '16px',
          '@media (min-width: 768px)': {
            fontSize: '15px',
          },
        },
      },
    },

    Select: {
      styles: {
        input: {
          fontSize: '16px',
          minHeight: '44px',
          '@media (min-width: 768px)': {
            fontSize: '15px',
            minHeight: '40px',
          },
        },
      },
    },

    PasswordInput: {
      styles: {
        input: {
          fontSize: '16px',
          minHeight: '44px',
          '@media (min-width: 768px)': {
            fontSize: '15px',
            minHeight: '40px',
          },
        },
      },
    },

    FileInput: {
      styles: {
        input: {
          fontSize: '16px',
          minHeight: '44px',
          '@media (min-width: 768px)': {
            fontSize: '15px',
            minHeight: '40px',
          },
        },
      },
    },

    Modal: {
      styles: {
        content: {
          '@media (max-width: 768px)': {
            margin: '0 !important',
            maxWidth: '100% !important',
            minHeight: '100vh',
          },
        },
        body: {
          '@media (max-width: 768px)': {
            padding: '16px',
          },
        },
        header: {
          '@media (max-width: 768px)': {
            padding: '16px',
          },
        },
      },
    },

    Paper: {
      styles: {
        root: {
          '@media (max-width: 768px)': {
            padding: '12px',
          },
        },
      },
    },

    Container: {
      styles: {
        root: {
          '@media (max-width: 768px)': {
            paddingLeft: '12px',
            paddingRight: '12px',
          },
          '@media (min-width: 768px) and (max-width: 992px)': {
            paddingLeft: '16px',
            paddingRight: '16px',
          },
        },
      },
    },

    Table: {
      styles: {
        root: {
          '@media (max-width: 768px)': {
            fontSize: '13px',
          },
        },
        th: {
          '@media (max-width: 768px)': {
            padding: '8px',
            fontSize: '12px',
          },
        },
        td: {
          '@media (max-width: 768px)': {
            padding: '8px',
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
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 8px 16px -8px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
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
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
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
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.96)',
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
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus': {
            transform: 'scale(1.01)',
          },
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
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus': {
            transform: 'scale(1.01)',
          },
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
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus': {
            transform: 'scale(1.01)',
          },
        },
      },
    },

    Modal: {
      defaultProps: {
        radius: 'md',
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.6,
          blur: 4,
        },
        transitionProps: {
          transition: 'slide-up',
          duration: 300,
          timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
      styles: {
        content: {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },

    Notification: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
