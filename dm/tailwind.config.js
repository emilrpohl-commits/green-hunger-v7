/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../shared/**/*.{js,jsx}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      screens: {
        md: '768px',
      },
    },
  },
  plugins: [],
}
