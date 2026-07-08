// @jrm/tailwind-preset — a ready-to-use Tailwind preset for JRM Studio.
//
// It wraps the token-generated preset (`@jrm/tokens/tailwind`, whose every value is a
// `var(--…)` reference) and layers on the shared shell niceties (container, class + attribute
// dark mode, radius aliases, fade/pop animations, tailwindcss-animate). Consumers do:
//
//   // tailwind.config.js
//   module.exports = { presets: [require("@jrm/tailwind-preset")], content: [...] };

const tokensPreset = require('@jrm/tokens/tailwind');
const extend = (tokensPreset && tokensPreset.theme && tokensPreset.theme.extend) || {};

/** @type {import('tailwindcss').Config} */
const preset = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        // Matches the score-king content-max token.
        '2xl': '760px',
      },
    },
    extend: {
      ...extend,
      borderRadius: {
        ...(extend.borderRadius || {}),
        DEFAULT: 'var(--radius-md)',
        full: 'var(--radius-pill)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'pop-in': 'pop-in 0.18s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

module.exports = preset;
