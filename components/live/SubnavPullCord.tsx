"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap/all';
import { Draggable } from 'gsap/all';

gsap.registerPlugin(Draggable);

export default function SubnavPullCord({
  onToggle,
  getState,
}: {
  onToggle?: (next: 'open' | 'closed') => void;
  getState?: () => 'open' | 'closed';
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const lineRef = useRef<SVGLineElement | null>(null);
  const knobRef = useRef<SVGCircleElement | null>(null);
  const bulbRef = useRef<SVGGElement | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(() => document.documentElement.dataset.subnavOpen === '1');
  const prefersReduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  // Geometry constants
  const ANCHOR = { x: 48, y: 20 };
  const KNOB_HOME = { x: 48, y: 48 };
  const MAX_RADIUS = 70; // px from anchor
  const THRESHOLD = 56; // radial toggle threshold
  const SAG_FACTOR = 0.18;
  const MAX_SAG = 40;
  const SWAY_MAX_DEG = 6;
  const debounceRef = useRef<number>(0);
  const lastAngleRef = useRef<number>(Math.PI / 2); // default downward

  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent).detail as { open: boolean };
      if (typeof detail?.open === 'boolean') setIsOpen(detail.open);
    };
    window.addEventListener('gt:subnav:set', onState as EventListener);
    return () => window.removeEventListener('gt:subnav:set', onState as EventListener);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const line = lineRef.current;
    const knob = knobRef.current as unknown as Element | null;
    const bulb = bulbRef.current;
    if (!svg || !path || !line || !knob) return;

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const updateRope = (kx: number, ky: number) => {
      // Quadratic bezier with analytic sag
      const ax = ANCHOR.x, ay = ANCHOR.y;
      const dx = kx - ax, dy = ky - ay;
      const dist = Math.hypot(dx, dy);
      const nx = -dy / (dist || 1), ny = dx / (dist || 1);
      const mx = (ax + kx) / 2, my = (ay + ky) / 2;
      const sag = clamp(dist * SAG_FACTOR, 0, MAX_SAG);
      const cx = mx + nx * sag, cy = my + ny * sag;
      const d = `M ${ax},${ay} Q ${cx},${cy} ${kx},${ky}`;
      gsap.set(path, { attr: { d } });
      // Also update dummy straight line end
      gsap.set(line, { attr: { x1: ax, y1: ay, x2: kx, y2: ky } });
      // Bulb sway towards angle
      const angle = Math.atan2(ky - ay, kx - ax);
      lastAngleRef.current = angle;
      if (bulb) {
        const deg = clamp((angle * 180) / Math.PI, -SWAY_MAX_DEG, SWAY_MAX_DEG);
        gsap.to(bulb, { rotation: deg, duration: 0.12, transformOrigin: '50% 50%' });
      }
    };

    const flashBulb = () => {
      if (!bulb || prefersReduced) return;
      const ring = bulb.querySelector('circle.bulb-ring') as SVGCircleElement | null;
      if (!ring) return;
      gsap.fromTo(
        ring,
        { opacity: 0, scale: 0.95, transformOrigin: '50% 50%' },
        { opacity: 0.55, scale: 1.06, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' }
      );
      gsap.to(bulb, { scale: 1.02, duration: 0.12, yoyo: true, repeat: 1, transformOrigin: '50% 50%' });
    };

    const readState = () => {
      if (getState) return getState();
      const flag = document.documentElement.dataset.subnavOpen === '1';
      return flag ? 'open' : 'closed';
    };

    const emitState = (next: 'open' | 'closed') => {
      window.dispatchEvent(new CustomEvent('gt:subnav:set', { detail: { open: next === 'open' } }));
      onToggle?.(next);
    };

    // Initialize geometry to rest
    updateRope(KNOB_HOME.x, KNOB_HOME.y);

    const onDrag = function (this: any) {
      let kx = KNOB_HOME.x + this.x;
      let ky = KNOB_HOME.y + this.y;
      // Clamp to circle around ANCHOR
      const dx = kx - ANCHOR.x;
      const dy = ky - ANCHOR.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        const t = MAX_RADIUS / dist;
        kx = ANCHOR.x + dx * t;
        ky = ANCHOR.y + dy * t;
        // reflect clamped back to draggable transform
        const nx = kx - KNOB_HOME.x;
        const ny = ky - KNOB_HOME.y;
        this.applyBounds({ minX: nx, maxX: nx, minY: ny, maxY: ny });
      }
      updateRope(kx, ky);
    };

    const onRelease = function (this: any) {
      const kx = KNOB_HOME.x + this.x;
      const ky = KNOB_HOME.y + this.y;
      const d = Math.hypot(kx - ANCHOR.x, ky - ANCHOR.y);
      const now = Date.now();
      const allowToggle = now - debounceRef.current > 350;
      if (d >= THRESHOLD && allowToggle) {
        const next = readState() === 'open' ? 'closed' : 'open';
        emitState(next);
        flashBulb();
        debounceRef.current = now;
      }
      // Snap back with elastic and animate rope onUpdate
      const ease = prefersReduced ? 'power2.out' : 'elastic.out(1, 0.5)';
      const duration = prefersReduced ? 0.12 : 0.6;
      gsap.to(this.target, {
        x: 0,
        y: 0,
        duration,
        ease,
        onUpdate: () => {
          const nx = KNOB_HOME.x + (this.x || 0);
          const ny = KNOB_HOME.y + (this.y || 0);
          updateRope(nx, ny);
        },
        onComplete: () => {
          updateRope(KNOB_HOME.x, KNOB_HOME.y);
          if (bulb) gsap.to(bulb, { rotation: 0, duration: 0.2, ease: 'power2.out' });
          this.applyBounds({ minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity });
        },
      });
    };

    const drag = Draggable.create(knob, {
      type: 'x,y',
      edgeResistance: 0.85,
      onDrag,
      onRelease,
    })[0];

    // Keyboard toggle and click tap
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const angle = lastAngleRef.current;
        const r = 65;
        const tx = Math.cos(angle) * r;
        const ty = Math.sin(angle) * r;
        const next = readState() === 'open' ? 'closed' : 'open';
        const ease = prefersReduced ? 'power2.out' : 'elastic.out(1, 0.5)';
        const duration = prefersReduced ? 0.12 : 0.6;
        gsap.fromTo(
          knob,
          { x: 0, y: 0 },
          {
            x: tx,
            y: ty,
            duration: 0.12,
            ease: 'power2.out',
            onUpdate: () => updateRope(KNOB_HOME.x + (gsap.getProperty(knob, 'x') as number) || KNOB_HOME.x, KNOB_HOME.y + (gsap.getProperty(knob, 'y') as number) || KNOB_HOME.y),
            onComplete: () => {
              emitState(next);
              flashBulb();
              gsap.to(knob, {
                x: 0,
                y: 0,
                duration,
                ease,
                onUpdate: () => updateRope(KNOB_HOME.x + (gsap.getProperty(knob, 'x') as number) || KNOB_HOME.x, KNOB_HOME.y + (gsap.getProperty(knob, 'y') as number) || KNOB_HOME.y),
                onComplete: () => updateRope(KNOB_HOME.x, KNOB_HOME.y),
              });
            },
          }
        );
      }
    };
    const onClick = (e: Event) => {
      const next = readState() === 'open' ? 'closed' : 'open';
      const ease = prefersReduced ? 'power2.out' : 'elastic.out(1, 0.5)';
      const duration = prefersReduced ? 0.12 : 0.6;
      // small staged pull straight down
      gsap.fromTo(
        knob,
        { x: 0, y: 0 },
        {
          x: 0,
          y: 65,
          duration: 0.12,
          ease: 'power2.out',
          onUpdate: () => updateRope(KNOB_HOME.x + (gsap.getProperty(knob, 'x') as number) || KNOB_HOME.x, KNOB_HOME.y + (gsap.getProperty(knob, 'y') as number) || KNOB_HOME.y),
          onComplete: () => {
            emitState(next);
            flashBulb();
            gsap.to(knob, {
              x: 0,
              y: 0,
              duration,
              ease,
              onUpdate: () => updateRope(KNOB_HOME.x + (gsap.getProperty(knob, 'x') as number) || KNOB_HOME.x, KNOB_HOME.y + (gsap.getProperty(knob, 'y') as number) || KNOB_HOME.y),
              onComplete: () => updateRope(KNOB_HOME.x, KNOB_HOME.y),
            });
          },
        }
      );
    };
    knob.addEventListener('keydown', onKey as any);
    knob.addEventListener('click', onClick as any);

    return () => {
      knob.removeEventListener('keydown', onKey as any);
      knob.removeEventListener('click', onClick as any);
      try { drag?.kill?.(); } catch {}
    };
  }, [getState, onToggle, prefersReduced]);

  const ariaPressed = isOpen ? true : false;

  return (
    <svg
      ref={svgRef}
      className="fixed left-1/2 -translate-x-1/2 top-[calc(var(--header-h)+6px)] z-40 pointer-events-none select-none"
      width="120"
      height="100"
      viewBox="0 0 96 80"
      role="presentation"
      aria-hidden="false"
    >
      {/* Bulb anchor */}
      <g ref={bulbRef} className="bulb" transform={`translate(${ANCHOR.x},${ANCHOR.y - 14})`}>
        <circle r="8" fill="var(--bulb-fill)" stroke="var(--bulb-stroke)" strokeWidth="1" />
        <circle className="bulb-ring" r="11" fill="none" stroke="var(--bulb-stroke)" strokeWidth="1" opacity="0" />
      </g>

      {/* Curved cord path */}
      <path ref={pathRef} d="" stroke="var(--cord)" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Dummy straight line for hint */}
      <line ref={lineRef} x1={ANCHOR.x} y1={ANCHOR.y} x2={KNOB_HOME.x} y2={KNOB_HOME.y} stroke="var(--cord)" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />

      {/* Knob/handle (draggable target) */}
      <g transform={`translate(${KNOB_HOME.x},${KNOB_HOME.y})`}>
        <circle
          ref={knobRef}
          r="6"
          fill="var(--cord-end)"
          stroke="var(--cord)"
          strokeWidth="1.5"
          className="pointer-events-auto cursor-pointer"
          role="button"
          aria-label="Toggle sub navigation"
          aria-pressed={ariaPressed}
          tabIndex={0}
        />
      </g>
    </svg>
  );
}
