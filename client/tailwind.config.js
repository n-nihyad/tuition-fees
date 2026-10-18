/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-green': '#DDF2E3',
        'brand-green-strong': '#347653',
        'brand-pink': '#F3B5C7',
        'brand-forest': '#193B2D',
        'brand-muted': '#687B70',
        'brand-line': '#E2EAE3',
        'brand-canvas': '#F5F8F4',
        'brand-blue': '#587D9E',
      },
    },
  },
  plugins: [],
}
