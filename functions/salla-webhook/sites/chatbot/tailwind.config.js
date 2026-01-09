/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './**/*.{ts,tsx,js,jsx,html}', '!./node_modules/**/*', '!./dist/**/*'],
  theme: {
    extend: {
      colors: {
        primary: '#6d56ff',
        secondary: '#1f1b2e',
        surface: '#0c0a13',
        accent: '#ff9ff3',
      },
      boxShadow: {
        glow: '0 0 40px rgba(109, 86, 255, 0.35)',
      },
      animation: {
        pulseSlow: 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
