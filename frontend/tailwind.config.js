/** @type {import('tailwindcss').Config} */
import tailwindForms from '@tailwindcss/forms';
import defaultTheme from 'tailwindcss/defaultTheme';

module.exports = {
  mode: 'dark',
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,mjs}'
  ],
  plugins: [ tailwindForms ],
  theme: {
    extend: {
      colors: {
        'amber': '#ffb000',
        'amber-dark': '#cd8d04',
        'primary': {
          50: '#c2fdd4',
          100: '#79fba2',
          200: '#6ee38c',
          300: '#4fa467',
          400: '#3c7a4e',
          500: '#3b724b',
          600: '#1f2d23'
          // 700: '#15588f',
          // 800: '#154c77',
          // 900: '#174063',
          // 950: '#0f2942'
        }
      },
      animation: {
        'ping-once': 'ping 1s linear reverse'
      }
    },
    screens: {
      'xs': '440px',
      ...defaultTheme.screens
    }
  }
};
