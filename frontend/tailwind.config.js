export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        cyan: '#06b6d4',
        dark: '#0a0e27',
        'dark-2': '#1a1f3a',
        'dark-3': '#1e293b'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
