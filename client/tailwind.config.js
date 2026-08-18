/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rogym: {
          green: 'var(--rogym-green)',
          'green-hover': 'var(--rogym-green-hover)',
          'green-dark': 'var(--rogym-green-dark)',
          'green-deeper': 'var(--rogym-green-deeper)',
          teal: 'var(--rogym-teal)',
          error: 'var(--rogym-error)',
          'bg-base': 'var(--rogym-bg-base)',
          'bg-deep': 'var(--rogym-bg-deep)',
          'bg-deep-alt': 'var(--rogym-bg-deep-alt)',
          'bg-card': 'var(--rogym-bg-card)',
          'bg-card-hover': 'var(--rogym-bg-card-hover)',
          'bg-card-darker': 'var(--rogym-bg-card-darker)',
          'bg-elevated': 'var(--rogym-bg-elevated)',
          'bg-elevated-green': 'var(--rogym-bg-elevated-green)',
          'bg-light': 'var(--rogym-bg-light)',
          'text-primary': 'var(--rogym-text-primary)',
          'text-secondary': 'var(--rogym-text-secondary)',
          'text-muted': 'var(--rogym-text-muted)',
          'text-on-light': 'var(--rogym-text-on-light)',
        },
      },
      fontFamily: {
        vietnam: ['"Be Vietnam Pro"', 'sans-serif'],
        anton: ['Anton', 'sans-serif'],
        body: ['var(--rogym-font-body)'],
        display: ['var(--rogym-font-display)'],
      },

    },
  },
  plugins: [],
}
