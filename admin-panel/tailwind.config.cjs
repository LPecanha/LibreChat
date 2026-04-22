/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['class'],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['Roboto Mono', 'monospace'],
    },
    extend: {
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      colors: {
        gray: {
          20: '#ececf1',
          50: '#f7f7f8',
          100: '#ececec',
          200: '#e3e3e3',
          300: '#cdcdcd',
          400: '#999696',
          500: '#595959',
          600: '#424242',
          700: '#2f2f2f',
          800: '#212121',
          850: '#171717',
          900: '#0d0d0d',
        },
        green: {
          500: '#10a37f',
          600: '#126e6b',
          700: '#0a4f53',
        },
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'surface-primary': 'var(--surface-primary)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-tertiary': 'var(--surface-tertiary)',
        'surface-hover': 'var(--surface-hover)',
        'surface-active': 'var(--surface-active)',
        'border-light': 'var(--border-light)',
        'border-medium': 'var(--border-medium)',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('tailwindcss-radix')],
};
