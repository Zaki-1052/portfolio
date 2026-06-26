// Tissue scale — the hero / identity. Serif, warm, soft, asymmetric.
function ArrivalHero() {
  const { ScaleSection } = window.BiologicalScaleDescentDesignSystem_acc404;
  return (
    <ScaleSection
      scale="tissue"
      magnification="1×"
      full
      className="grain bloom"
      style={{ display: "flex", alignItems: "center" }}
    >
      <div className="kit-content" style={{ maxWidth: 760 }}>
        <p style={{ margin: "0 0 var(--space-3)", color: "var(--accent)", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", letterSpacing: "0.02em" }}>
          computational biology @ UCSD
        </p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-5xl)", lineHeight: 1.02, letterSpacing: "-0.02em", margin: "0 0 var(--space-5)", maxWidth: "12ch" }}>
          Zara Alibhai
        </h1>
        <div className="prose" style={{ fontFamily: "var(--font-sans)" }}>
          <p>I build the computational infrastructure for epigenetics research. Mostly cerebellum, mostly chromatin, mostly in R and my terminal.</p>
          <p>Right now I work in two labs at UCSD. One asks how losing a single histone enzyme rewires the 3D genome of the developing brain. The other is teaching me molecular dynamics, one trajectory at a time.</p>
          <p>Nearly everything I touch turns out to be about the brain. So this site goes there, all the way down.</p>
        </div>

        <div style={{ marginTop: "var(--space-6)", padding: "var(--space-4) var(--space-5)", border: "1px solid var(--hairline)", borderRadius: "var(--radius)", background: "var(--surface-overlay)", maxWidth: 540 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 6, letterSpacing: "0.04em" }}>currently</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
            molecular dynamics of a postsynaptic membrane protein at the Amaro Lab
          </div>
        </div>

        <div className="scroll-hint">descend <span aria-hidden="true">↓</span></div>
      </div>
    </ScaleSection>
  );
}
window.ArrivalHero = ArrivalHero;
