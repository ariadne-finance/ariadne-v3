/** @type {import('tailwindcss').Config} */
const tailwindForms = require('@tailwindcss/forms');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'dark',
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,mjs}"
  ],
  plugins: [ tailwindForms ],
  theme: {
    extend: {
      colors: {
        silver: '#40434A',
        accent: '#FF7A00',
        error: '#E40000',
        primary: {
          50: '#f2f8fd',
          100: '#e3effb',
          200: '#c2dff5',
          300: '#8cc5ed',
          400: '#4ea6e2',
          500: '#278bd0',
          600: '#1970b3',
          700: '#15588f',
          800: '#154c77',
          900: '#174063',
          950: '#0f2942'
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
