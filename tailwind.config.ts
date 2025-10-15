module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        fg: "hsl(var(--fg))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        card: "hsl(var(--card-bg))",
        border: "hsl(var(--input-border))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        indigoe: {
          500: "#6366f1",
          600: "#5458ef",
        },
      },
      boxShadow: {
        glass: "0 10px 30px rgba(2,6,23,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        'grid-dots':
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)",
      },
      backgroundSize: {
        '200': '200% 200%',
        'dot': '24px 24px',
      },
      keyframes: {
        'bg-pan': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(59,130,246,0.0), 0 0 0 rgba(99,102,241,0.0)' },
          '50%': { boxShadow: '0 0 30px rgba(59,130,246,0.45), 0 0 60px rgba(99,102,241,0.35)' },
        },
      },
      animation: {
        'bg-pan': 'bg-pan 10s linear infinite alternate',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};