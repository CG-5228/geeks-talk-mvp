"use client";

import React from "react";
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";
import { useTheme } from "next-themes";

type Props = {
  density?: number;
  zIndex?: number;
};

export default function ParticlesBackground({ density = 120, zIndex = 0 }: Props) {
  const init = React.useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const { theme } = useTheme();
  const color = React.useMemo(() => {
    if (typeof window === "undefined") return "#00d4ff";
    const css = getComputedStyle(document.documentElement);
    const value = css.getPropertyValue("--particle-color").trim();
    return value || "#00d4ff";
  }, [theme]);

  return (
    <Particles
      id="tsparticles"
      init={init}
      options={{
        fullScreen: { enable: true, zIndex },
        background: { color: "transparent" },
        detectRetina: true,
        fpsLimit: 60,
        interactivity: {
          detectsOn: "window",
          events: {
            onHover: {
              enable: true,
              mode: ["repulse", "grab"],
              parallax: { enable: true, force: 20, smooth: 15 },
            },
            onClick: { enable: true, mode: ["push", "bubble"] },
            resize: true,
          },
          modes: {
            repulse: { distance: 120, duration: 0.4 },
            grab: { distance: 160, links: { opacity: 0.9 } },
            bubble: { distance: 140, size: 6, duration: 0.3, opacity: 1 },
            push: { quantity: 4 },
          },
        },
        particles: {
          number: { value: density, density: { enable: true, area: 900 } },
          color: { value: color },
          links: { enable: true, distance: 140, opacity: 0.6, width: 1.4, color },
          move: { enable: true, speed: 0.8, outModes: { default: "out" } },
          opacity: { value: 0.7, random: true, animation: { enable: true, speed: 0.5, minimumValue: 0.35 } },
          size: { value: { min: 1, max: 3 } },
          shadow: { enable: false },
          shape: { type: "circle" },
        },
      }}
      className="fixed inset-0 pointer-events-none"
      style={{ pointerEvents: "none" }}
    />
  );
}
