export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#172033',
        mint: '#2b8c7e',
        ember: '#d66a2d',
        aurora: '#5a72c8',
      },
    },
  },
  plugins: [],
};
