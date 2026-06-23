import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {}
  },
  plugins: [require('@tailwindcss/forms')]
} satisfies Config
