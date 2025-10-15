"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap/all';
import { Draggable } from 'gsap/all';

gsap.registerPlugin(Draggable);

type State = 'open' | 'closed';

interface Props {
  getState: () => State;
  onToggle: (next: State) => void;
}

const CSSVars: Record<string, string> = {
  '--cord': 'hsl(210 14% 50%)',
  '--cord-end': 'hsl(210 14% 65%)',
  '--bulb-stroke': 'hsl(210 10% 72%)',
  '--bulb-fill': 'hsla(200 80% 70% / .08)',
};

export default function SubnavBulbCord({ getState, onToggle }: Props) {
  const [mounted, setMounted] = useState(false);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const bulbRef = useRef<SVGGElement | null>(null);
  const cordRef = useRef<SVGPathElement | null>(null);
  const dummyRef = useRef<SVGLineElement | null>(null);
  const knobRef = useRef<SVGGElement | null>(null);
  const hitRef = useRef<SVGCircleElement | null>(null);
  const debounceRef = useRef<number>(0);
  const lastAngleRef = useRef<number>(Math.PI / 2);
  const prefersReduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    // Create portal layer in body
    const div = document.createElement('div');
    div.id = 'gt-cord-layer';
    Object.assign(div.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '48',
      pointerEvents: 'none',
      overflow: 'visible',
    } as CSSStyleDeclaration);
    document.body.appendChild(div);
    layerRef.current = div;
    setMounted(true);
    return () => {
      div.remove();
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const bulb = bulbRef.current;
    const cord = cordRef.current;
    const dummy = dummyRef.current;
    const knob = knobRef.current as unknown as Element | null;
    const hit = hitRef.current as unknown as Element | null;
    if (!wrap || !bulb || !cord || !dummy || !knob || !hit) return;

    const ANCHOR = { x: 0, y: 28 };
    const KNOB_HOME = { x: 0, y: 112 };
    const MAX_RADIUS = 90;
    const THRESHOLD = 56;
    const SAG_FACTOR = 0.18;
    const MAX_SAG = 40;
    const SWAY_LIMIT = 6;

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const updateRope = (kx: number, ky: number) => {
      const ax = ANCHOR.x, ay = ANCHOR.y;
      const dx = kx - ax, dy = ky - ay;
      const dist = Math.hypot(dx, dy);
      // tangent and normal
      const tx = (dx || 0) / (dist || 1);
      const ty = (dy || 0) / (dist || 1);
      const nx = -ty, ny = tx;
      const sag = clamp(dist * SAG_FACTOR, 0, MAX_SAG);
      // symmetric control points at 1/3 and 2/3 along the line, offset by normal*sag
      const c1x = ax + tx * (dist / 3) + nx * sag;
      const c1y = ay + ty * (dist / 3) + ny * sag;
      const c2x = ax + tx * (2 * dist / 3) + nx * sag;
      const c2y = ay + ty * (2 * dist / 3) + ny * sag;
      const d = `M ${ax},${ay} C ${c1x},${c1y} ${c2x},${c2y} ${kx},${ky}`;
      gsap.set(cord, { attr: { d } });
      gsap.set(dummy, { attr: { x1: ax, y1: ay, x2: kx, y2: ky } });
      const angle = Math.atan2(dy, dx);
      lastAngleRef.current = angle;
      const deg = clamp((angle * 180) / Math.PI, -SWAY_LIMIT, SWAY_LIMIT);
      gsap.to(bulb, { rotation: deg, transformOrigin: '50% 50%', duration: 0.12 });
    };

    const flashBulb = () => {
      if (prefersReduced) return;
      gsap.to(bulb, { scale: 1.02, duration: 0.12, yoyo: true, repeat: 1, transformOrigin: '50% 50%' });
    };

    // Initialize geometry
    gsap.set(knob, { x: 0, y: KNOB_HOME.y - ANCHOR.y });
    updateRope(KNOB_HOME.x, KNOB_HOME.y);

    const onDrag = function (this: any) {
      let kx = ANCHOR.x + this.x;
      let ky = ANCHOR.y + this.y;
      // Constrain to circle radius
      const dx = kx - ANCHOR.x;
      const dy = ky - ANCHOR.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        const t = MAX_RADIUS / dist;
        kx = ANCHOR.x + dx * t;
        ky = ANCHOR.y + dy * t;
        const tx = kx - ANCHOR.x;
        const ty = ky - ANCHOR.y;
        this.applyBounds({ minX: tx, maxX: tx, minY: ty, maxY: ty });
      }
      updateRope(kx, ky);
    };

    const onRelease = function (this: any) {
      const kx = ANCHOR.x + this.x;
      const ky = ANCHOR.y + this.y;
      const dist = Math.hypot(kx - ANCHOR.x, ky - ANCHOR.y);
      const now = Date.now();
      if (dist >= THRESHOLD && now - debounceRef.current > 350) {
        const next: State = getState() === 'open' ? 'closed' : 'open';
        onToggle(next);
        flashBulb();
        debounceRef.current = now;
      }
      const ease = prefersReduced ? 'power2.out' : 'elastic.out(1, 0.5)';
      const duration = prefersReduced ? 0.12 : 0.6;
      gsap.to(knob, {
        x: 0,
        y: KNOB_HOME.y - ANCHOR.y,
        duration,
        ease,
        onUpdate: () => updateRope(ANCHOR.x + (gsap.getProperty(knob, 'x') as number), ANCHOR.y + (gsap.getProperty(knob, 'y') as number)),
        onComplete: () => {
          updateRope(KNOB_HOME.x, KNOB_HOME.y);
          gsap.to(bulb, { rotation: 0, duration: 0.2, ease: 'power2.out' });
          this.applyBounds({ minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity });
        },
      });
    };

    const drag = Draggable.create(knob, {
      type: 'x,y',
      edgeResistance: 0.85,
      onDrag,
      onRelease,
      cursor: 'grabbing',
      activeCursor: 'grabbing',
    })[0];

    // Keyboard and click on hit circle
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const r = 64;
        const angle = lastAngleRef.current;
        const tx = Math.cos(angle) * r;
        const ty = Math.sin(angle) * r;
        const next: State = getState() === 'open' ? 'closed' : 'open';
        const ease = prefersReduced ? 'power2.out' : 'elastic.out(1, 0.5)';
        const duration = prefersReduced ? 0.12 : 0.6;
        gsap.fromTo(
          knob,
          { x: 0, y: KNOB_HOME.y - ANCHOR.y },
          {
            x: tx,
            y: (KNOB_HOME.y - ANCHOR.y) + ty,
            duration: 0.12,
            ease: 'power2.out',
            onUpdate: () => updateRope(ANCHOR.x + (gsap.getProperty(knob, 'x') as number), ANCHOR.y + (gsap.getProperty(knob, 'y') as number)),
            onComplete: () => {
              onToggle(next);
              flashBulb();
              gsap.to(knob, {
                x: 0,
                y: KNOB_HOME.y - ANCHOR.y,
                duration,
                ease,
                onUpdate: () => updateRope(ANCHOR.x + (gsap.getProperty(knob, 'x') as number), ANCHOR.y + (gsap.getProperty(knob, 'y') as number)),
                onComplete: () => updateRope(KNOB_HOME.x, KNOB_HOME.y),
              });
            },
          }
        );
      }
    };

    const onClick = (e: Event) => {
      const next: State = getState() === 'open' ? 'closed' : 'open';
      const ease = prefersReduced ? 'power2.out' : 'elastic.out(1, 0.5)';
      const duration = prefersReduced ? 0.12 : 0.6;
      gsap.fromTo(
        knob,
        { x: 0, y: KNOB_HOME.y - ANCHOR.y },
        {
          x: 0,
          y: KNOB_HOME.y - ANCHOR.y + 64,
          duration: 0.12,
          ease: 'power2.out',
          onUpdate: () => updateRope(ANCHOR.x + (gsap.getProperty(knob, 'x') as number), ANCHOR.y + (gsap.getProperty(knob, 'y') as number)),
          onComplete: () => {
            onToggle(next);
            flashBulb();
            gsap.to(knob, {
              x: 0,
              y: KNOB_HOME.y - ANCHOR.y,
              duration,
              ease,
              onUpdate: () => updateRope(ANCHOR.x + (gsap.getProperty(knob, 'x') as number), ANCHOR.y + (gsap.getProperty(knob, 'y') as number)),
              onComplete: () => updateRope(KNOB_HOME.x, KNOB_HOME.y),
            });
          },
        }
      );
    };

    hit.addEventListener('keydown', onKey as any);
    hit.addEventListener('click', onClick as any);

    return () => {
      hit.removeEventListener('keydown', onKey as any);
      hit.removeEventListener('click', onClick as any);
      try { drag?.kill?.(); } catch {}
    };
  }, [getState, onToggle, prefersReduced]);

  if (!mounted || !layerRef.current) return null;

  const portalNode = layerRef.current;
  const open = getState() === 'open';

  return createPortal(
    <div ref={wrapRef} className="pointer-events-none fixed left-1/2 -translate-x-1/2 top-[calc(var(--header-h,56px)+6px)]" style={CSSVars as React.CSSProperties}>
      <svg
        ref={svgRef}
        width={220}
        height={220}
        viewBox="-110 -20 220 240"
        fill="none"
        stroke="currentColor"
        className="select-none"
        role="presentation"
        aria-hidden="false"
      >
        {/* Bulb */}
        <g ref={bulbRef} id="bulb" transform="translate(0,0)">
          <circle cx="0" cy="0" r="18" stroke="var(--bulb-stroke)" strokeWidth="2" fill="var(--bulb-fill)" />
          <rect x="-4" y="18" width="8" height="10" rx="2" fill="var(--bulb-stroke)" opacity=".6" />
        </g>

        {/* Rope path */}
        <path ref={cordRef} id="cord" d="M 0 28 Q 0 70 0 112" stroke="var(--cord)" strokeWidth="3" strokeLinecap="round" />

        {/* Dummy straight line */}
        <line ref={dummyRef} id="dummy" x1="0" y1="28" x2="0" y2="112" stroke="var(--cord-end)" strokeWidth="1.5" strokeDasharray="4 6" opacity=".35" />

        {/* Draggable knob: only the hit area has pointer events */}
        <g ref={knobRef} id="knob" className="cursor-grab">
          <circle
            ref={hitRef}
            id="hit"
            cx="0"
            cy="112"
            r="10"
            fill="transparent"
            className="pointer-events-auto"
            role="button"
            tabIndex={0}
            aria-pressed={open}
            aria-label="Toggle sub navigation"
          />
          <circle cx="0" cy="112" r="6" fill="var(--cord-end)" />
        </g>
      </svg>
    </div>,
    portalNode
  );
}
