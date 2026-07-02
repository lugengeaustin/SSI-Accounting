import React, { useEffect, useRef, useState } from "react";

/**
 * LoginMotif — the SSI suite's interactive constellation for the sign-in
 * brand panel (ported from the E-mteja reference implementation).
 *
 * A small constellation of nodes drifts gently and connects with light lines
 * when near each other, with a single brighter gold node at the centre. The
 * field leans toward the cursor, so the panel feels alive without being loud.
 *
 * Accessibility / restraint:
 *   - `prefers-reduced-motion: reduce` → the rAF loop never starts; a calm,
 *     static rendering of the same constellation is shown instead.
 *   - aria-hidden; purely decorative.
 *   - Colours are brand tokens only (var(--gold)) + white tints via rgba.
 */

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** the core node renders gold + larger */
  core?: boolean;
};

// Seeded layout so the first paint is stable (no flash).
const SEED: Array<Omit<Node, "vx" | "vy">> = [
  { x: 50, y: 48, r: 3.4, core: true },
  { x: 24, y: 26, r: 1.8 },
  { x: 73, y: 22, r: 2.0 },
  { x: 82, y: 58, r: 1.7 },
  { x: 64, y: 78, r: 2.1 },
  { x: 33, y: 72, r: 1.6 },
  { x: 14, y: 54, r: 1.9 },
  { x: 46, y: 16, r: 1.5 },
  { x: 90, y: 38, r: 1.4 },
  { x: 58, y: 40, r: 1.5 },
  { x: 38, y: 50, r: 1.4 },
  { x: 70, y: 60, r: 1.6 },
];

const LINK_DIST = 34; // proximity threshold for drawing an edge (viewBox units)

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}

function edges(nodes: Array<Pick<Node, "x" | "y">>) {
  const out: Array<{ a: number; b: number; o: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d = Math.hypot(dx, dy);
      if (d < LINK_DIST) {
        out.push({ a: i, b: j, o: (1 - d / LINK_DIST) * 0.45 });
      }
    }
  }
  return out;
}

export function LoginMotif({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();

  const staticNodes = SEED.map((n) => ({ ...n }));
  const staticEdges = edges(staticNodes);

  if (reduced) {
    return (
      <Constellation
        className={className}
        nodes={staticNodes}
        edges={staticEdges}
        parallax={{ x: 0, y: 0 }}
      />
    );
  }
  return <AnimatedMotif className={className} />;
}

function AnimatedMotif({ className }: { className?: string }) {
  const [, force] = useState(0);
  const nodesRef = useRef<Node[]>(
    SEED.map((n, i) => ({
      ...n,
      vx: Math.cos(i * 1.7) * 0.05,
      vy: Math.sin(i * 2.3) * 0.05,
    })),
  );
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const parallaxRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last) / 16.6667;
      last = now;
      const nodes = nodesRef.current;
      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < 4 || n.x > 96) n.vx *= -1;
        if (n.y < 4 || n.y > 96) n.vy *= -1;
        n.x = Math.max(4, Math.min(96, n.x));
        n.y = Math.max(4, Math.min(96, n.y));
      }
      const target = pointerRef.current.active
        ? { x: (pointerRef.current.x - 50) * 0.06, y: (pointerRef.current.y - 50) * 0.06 }
        : { x: 0, y: 0 };
      parallaxRef.current.x += (target.x - parallaxRef.current.x) * 0.06;
      parallaxRef.current.y += (target.y - parallaxRef.current.y) * 0.06;

      force((v) => (v + 1) % 1000000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pointerRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      active: true,
    };
  };
  const onPointerLeave = () => {
    pointerRef.current.active = false;
  };

  const nodes = nodesRef.current;
  return (
    <div
      ref={wrapRef}
      className={className}
      aria-hidden="true"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <Constellation
        nodes={nodes}
        edges={edges(nodes)}
        parallax={parallaxRef.current}
        pulse
        fill
      />
    </div>
  );
}

/** Pure SVG renderer shared by the live + static paths. */
function Constellation({
  className,
  nodes,
  edges: links,
  parallax,
  pulse = false,
  fill = false,
}: {
  className?: string;
  nodes: Array<Pick<Node, "x" | "y" | "r" | "core">>;
  edges: Array<{ a: number; b: number; o: number }>;
  parallax: { x: number; y: number };
  pulse?: boolean;
  fill?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={fill ? "h-full w-full" : className}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <g
        style={{
          transform: `translate(${parallax.x}px, ${parallax.y}px)`,
          transition: "transform 60ms linear",
        }}
      >
        <g stroke="white" strokeWidth="0.35">
          {links.map((l, i) => (
            <line
              key={i}
              x1={nodes[l.a].x}
              y1={nodes[l.a].y}
              x2={nodes[l.b].x}
              y2={nodes[l.b].y}
              style={{ opacity: l.o }}
            >
              {pulse && (
                <animate
                  attributeName="stroke-opacity"
                  values="0.55;1;0.55"
                  dur={`${3 + (i % 4)}s`}
                  repeatCount="indefinite"
                />
              )}
            </line>
          ))}
        </g>
        <g>
          {nodes.map((n, i) =>
            n.core ? (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r={n.r * 2.4} fill="var(--gold)" opacity={0.18} />
                <circle cx={n.x} cy={n.y} r={n.r} fill="var(--gold)" opacity={0.95} />
              </g>
            ) : (
              <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="white" opacity={0.7}>
                {pulse && (
                  <animate
                    attributeName="opacity"
                    values="0.45;0.85;0.45"
                    dur={`${4 + (i % 5)}s`}
                    repeatCount="indefinite"
                  />
                )}
              </circle>
            ),
          )}
        </g>
      </g>
    </svg>
  );
}
