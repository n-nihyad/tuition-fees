/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-green': '#ADEBB3',
        'brand-green-strong': '#75c584',
        'brand-pink': '#FFB2CC',
      },
    },
  },
  plugins: [],
}
