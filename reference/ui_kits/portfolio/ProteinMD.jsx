// Protein scale — the Amaro Lab molecular-dynamics work. Cyan accent, sharper,
// bloom decreasing. Honest about it being new.
function ProteinMD() {
  const { ScaleSection, Tag } = window.BiologicalScaleDescentDesignSystem_acc404;
  return (
    <ScaleSection scale="protein" magnification="1,000,000×" title="Down to the molecule" kicker="structural biology, lately">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: "var(--space-7)", alignItems: "start" }}>
        <div className="prose">
          <p>In June 2026 I joined the Amaro Lab to model a postsynaptic CNS membrane protein with molecular dynamics. My first trajectory is running as you read this.</p>
          <p>I'll be honest: I find genetics more interesting than structural biology right now. But I just started, the simulations are beautiful, and the methods are pure computation, which is home for me. Ask me again in a few months.</p>
          <p>It fits the descent. The chromatin work asks how genes get switched. This asks what the switched-on proteins actually do, atom by atom, in a membrane.</p>
        </div>

        <aside style={{ border: "1px solid var(--hairline)", borderRadius: "var(--radius)", padding: "var(--space-5)", background: "var(--surface-raised)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: "var(--space-3)", letterSpacing: "0.04em" }}>
            trajectory · status
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Row k="system" v="postsynaptic membrane protein" />
            <Row k="lab" v="Amaro Lab, UCSD" />
            <Row k="state" v="first trajectory running" />
            <Row k="compute" v="SDSC Expanse (SLURM)" />
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-4)" }}>
            <Tag tone="accent">MD</Tag><Tag>GROMACS</Tag><Tag>membrane</Tag>
          </div>
        </aside>
      </div>
    </ScaleSection>
  );

  function Row({ k, v }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-4)", alignItems: "baseline", borderBottom: "1px solid var(--hairline-soft)", paddingBottom: "var(--space-2)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{k}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-body)", textAlign: "right" }}>{v}</span>
      </div>
    );
  }
}
window.ProteinMD = ProteinMD;
