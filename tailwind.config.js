/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Manual de marca "Sobre o Chile"
        brand: {
          DEFAULT: '#176DB0', // azul médio (primário)
          dark: '#293797', // azul escuro
          light: '#5B86C4', // azul claro
          pale: '#e7eefb', // tom bem claro p/ fundos/hover
        },
        accent: {
          DEFAULT: '#F80000', // vermelho vivo
          dark: '#B30000', // vermelho escuro
        },
        popover: {
          DEFAULT: 'var(--chart-tooltip-background)',
          foreground: 'var(--chart-tooltip-foreground)',
        },
        background: 'var(--chart-background)',
        foreground: 'var(--chart-foreground)',
        border: 'var(--chart-grid)',
        muted: {
          DEFAULT: 'var(--chart-muted)',
          foreground: 'var(--chart-foreground-muted)',
        },
        card: {
          DEFAULT: 'var(--chart-background)',
          foreground: 'var(--chart-foreground)',
        },
        chart: {
          label: 'var(--chart-label)',
          'tooltip-muted': 'var(--chart-tooltip-muted)',
        },
      },
    },
  },
  plugins: [],
}
