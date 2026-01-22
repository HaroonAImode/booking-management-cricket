import { createTheme, MantineColorsTuple } from '@mantine/core';

const yellow: MantineColorsTuple = [
  '#FFF9E6',
  '#FFF3CC',
  '#FFECB3',
  '#FFE599',
  '#FFDD80',
  '#F5B800',
  '#E0A800',
  '#CC9900',
  '#B38600',
  '#996B00',
];

const dark: MantineColorsTuple = [
  '#F5F5F5',
  '#E8E8E8',
  '#D1D1D1',
  '#9E9E9E',
  '#6B6B6B',
  '#4A4A4A',
  '#333333',
  '#262626',
  '#1A1A1A',
  '#0D0D0D',
];

export const theme = createTheme({
  primaryColor: 'yellow',
  colors: {
    yellow,
    dark,
  },
  defaultRadius: 'md',
});
