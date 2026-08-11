/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        acaps: {
          severity: '#C0392B',
          impact: '#E67E22',
          conditions: '#F1C40F',
          complexity: '#8E44AD',
          reliability: '#2980B9',
          access: '#27AE60',
          riskHigh: '#8B0000',
          riskMedium: '#CC5500',
          riskLow: '#DAA520',
          exposure: '#3498DB',
          intensity: '#E74C3C',
          vulnerability: '#F39C12',
          capacity: '#27AE60',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
