import type { Config } from 'tailwindcss';

/**
 * Design system Dande (app cliente).
 * Vert forêt (croissance/épargne), ocre (jalons), sable (fonds chauds),
 * plus l'accent iris (indigo) pour la cohérence avec le panel admin.
 * Mode sombre en bleu-nuit profond.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#E8F2EC',
          100: '#C4DECF',
          400: '#3E9A6E',
          600: '#1D6E4E',
          700: '#155139',
          900: '#0B3322',
        },
        clay: {
          50: '#FAEEDA',
          100: '#F6D9A8',
          400: '#E0A04A',
          600: '#B5630F',
          800: '#7A4108',
        },
        sand: {
          50: '#FAF7F0',
          100: '#F2ECDF',
          200: '#E5DBC7',
        },
        iris: {
          50: '#EEF0FF',
          100: '#DDE1FF',
          300: '#A9B2FF',
          400: '#8B93F8',
          500: '#6C6FEE',
          600: '#5B54D6',
          700: '#4840A8',
        },
        night: {
          950: '#0B0E1A',
          900: '#111527',
          800: '#1A1F36',
          700: '#252B45',
          600: '#333A57',
        },
        ink: {
          DEFAULT: '#1F2420',
          soft: '#5A6158',
          faint: '#8A9088',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
