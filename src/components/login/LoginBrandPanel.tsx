import { LoginMotif } from "./LoginMotif";

/**
 * LoginBrandPanel — the brand-forward left/header surface of the sign-in
 * screen, ported from the SSI suite reference (E-mteja): a deep Brand-Blue
 * field with the shared login background, a cool brand-gradient wash, a
 * low-opacity aurora tint, the interactive constellation motif, and the
 * un-boxed Sub-Sahara Institute wordmark lifted with a soft white glow.
 *
 * All colour comes from the Calm Studio tokens (--blue/--gold/--green + soft
 * tints) — no off-brand hex.
 */
export type LoginBrandPanelProps = {
  appName: string;
  tagline: string;
  bullets: string[];
  variant?: "full" | "band";
};

export function LoginBrandPanel({
  appName,
  tagline,
  bullets,
  variant = "full",
}: LoginBrandPanelProps) {
  if (variant === "band") {
    // Mobile: slim gradient header band above the card.
    return (
      <div className="relative overflow-hidden rounded-card grad-primary px-6 py-7 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/login-bg.jpg), url(/login-bg.svg)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(11,33,79,0.90) 0%, rgba(21,72,158,0.68) 55%, rgba(46,158,91,0.34) 100%)",
          }}
        />
        {/* Aurora wash — refined multi-stop blue→green→gold, low opacity. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(120% 100% at 100% 0%, var(--green-soft) 0%, transparent 55%), radial-gradient(120% 120% at 0% 100%, var(--gold-soft) 0%, transparent 50%), radial-gradient(100% 80% at 50% -10%, rgba(255,255,255,0.10) 0%, transparent 60%)",
          }}
        />
        <LoginMotif className="pointer-events-none absolute -right-6 -top-8 h-36 w-36 opacity-90" />
        <div className="relative z-10">
          <BrandWordmark appName={appName} />
          <p className="mt-1 text-sm text-white/85">{tagline}</p>
        </div>
      </div>
    );
  }

  // Desktop: full brand column.
  return (
    <div className="relative isolate hidden overflow-hidden grad-primary text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Background photo (falls back to the shared SVG contour + gradient). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/login-bg.jpg), url(/login-bg.svg)" }}
      />
      {/* Cool brand gradient wash — keeps text legible + on-brand. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, rgba(11,33,79,0.90) 0%, rgba(21,72,158,0.66) 48%, rgba(46,158,91,0.34) 100%)",
        }}
      />
      {/* Refined aurora wash — layered blue→green→gold radial tints. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 85% 12%, var(--green-soft) 0%, transparent 55%), radial-gradient(80% 80% at 8% 95%, var(--gold-soft) 0%, transparent 50%), radial-gradient(130% 100% at 50% 0%, rgba(255,255,255,0.10) 0%, transparent 55%), radial-gradient(120% 90% at 50% 60%, rgba(255,255,255,0.05) 0%, transparent 60%)",
        }}
      />
      {/* Interactive constellation motif — drifts + reacts to the cursor. */}
      <LoginMotif className="pointer-events-auto absolute inset-0 opacity-90" />

      {/* Top: wordmark + tagline. */}
      <div className="relative z-10">
        <BrandWordmark appName={appName} large />
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/85">
          {tagline}
        </p>
      </div>

      {/* Bottom: value lines. */}
      <ul className="pointer-events-none relative z-10 space-y-3">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-3 text-sm text-white/90">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.12)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
              }}
            >
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none">
                <path
                  d="M4 10.5l3.5 3.5L16 5.5"
                  stroke="var(--gold)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Wordmark: the real SSI logo + name rendered directly on the gradient
 *  panel — un-boxed (no tile/badge), lifted with a soft white radial glow. */
function BrandWordmark({
  appName,
  large = false,
}: {
  appName: string;
  large?: boolean;
}) {
  const dim = large ? 60 : 44;
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="relative grid shrink-0 place-items-center"
        style={{ width: dim, height: dim }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,255,255,0.92), rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 78%)",
          }}
        />
        <img
          src="/ssi-logo.png"
          alt="Sub-Sahara Institute"
          width={dim}
          height={dim}
          className="relative h-full w-full object-contain"
        />
      </span>
      <span
        className={
          large
            ? "text-2xl font-medium tracking-tight"
            : "text-lg font-medium tracking-tight"
        }
      >
        {appName}
      </span>
    </div>
  );
}
