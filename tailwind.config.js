/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sonata: {
          roxoescuro: '#4208af',
          roxoclaro:  '#534794',
          ouro:       '#d2b211',
          ourofundo:  '#b8960e',
          cinza:      '#d9d7df',
          preto:      '#252525',
        }
      },
      fontFamily: {
        titulo: ['"Anta"', 'sans-serif'],
        texto:  ['"Raleway"', 'sans-serif'],
      }
    }
  },
  plugins: [],
};
