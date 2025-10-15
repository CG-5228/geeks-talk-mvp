"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeSwitch() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex rounded-full border border-[hsl(var(--input-border))]/60 bg-[hsl(var(--nav-bg))]/60 backdrop-blur px-1 py-1 text-sm">
        <div className="px-3 py-1 w-8 h-8" />
        <div className="px-3 py-1 w-8 h-8" />
      </div>
    );
  }

  // Use resolvedTheme to get actual active theme (handles system preference)
  const active = resolvedTheme === "nix-dark" ? "nix-dark" : "black";

  return (
    <div role="group" aria-label="Theme switch" className="inline-flex rounded-full border border-[hsl(var(--input-border))]/60 bg-[hsl(var(--nav-bg))]/60 backdrop-blur px-1 py-1 text-sm">
      <button
        type="button"
        aria-pressed={active === "black"}
        aria-label="Blue theme"
        title="Blue theme"
        onClick={() => setTheme("black")}
        className={`px-3 py-1 rounded-full transition font-medium ${active === "black" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--fg))] hover:bg-white/5"}`}
      >
        B
      </button>
      <button
        type="button"
        aria-pressed={active === "nix-dark"}
        aria-label="Green theme"
        title="Green theme"
        onClick={() => setTheme("nix-dark")}
        className={`px-3 py-1 rounded-full transition font-medium ${active === "nix-dark" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "text-[hsl(var(--fg))] hover:bg-white/5"}`}
      >
        G
      </button>
    </div>
  );
}
