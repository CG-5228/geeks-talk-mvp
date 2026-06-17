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
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        success: "hsl(var(--success))",
        "success-foreground": "hsl(var(--success-foreground))",
        warning: "hsl(var(--warning))",
        "warning-foreground": "hsl(var(--warning-foreground))",
        error: "hsl(var(--error))",
        "error-foreground": "hsl(var(--error-foreground))",
        info: "hsl(var(--info))",
        "info-foreground": "hsl(var(--info-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
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
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
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
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'live-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.85)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        'bg-pan': 'bg-pan 10s linear infinite alternate',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'live-dot': 'live-dot 1.8s ease-in-out infinite',
        'shimmer': 'shimmer 6s linear infinite',
        'glow-breathe': 'glow-breathe 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};