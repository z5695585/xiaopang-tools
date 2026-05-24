/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          page: '#FAF7F2',
          card: '#FFFFFF',
          secondary: '#F0EBE3',
          border: '#E8E0D5',
          primary: '#C9A96E',
          'primary-hover': '#B8935A',
          text: '#5C4A3A',
          'text-secondary': '#8B7355',
          muted: '#B8A088',
        },
      },
      borderRadius: {
        'warm-card': '16px',
        'warm-icon': '14px',
        'warm-btn': '8px',
      },
      boxShadow: {
        'warm': '0 2px 12px rgba(139, 115, 85, 0.06)',
        'warm-hover': '0 4px 20px rgba(139, 115, 85, 0.12)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
