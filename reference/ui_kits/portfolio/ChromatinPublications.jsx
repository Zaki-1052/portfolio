// Chromatin scale — publications and research writeups. Inter headings,
// blue home-base accent, neutral. "Your writing is regulation of how people
// understand your work."
function ChromatinPublications() {
  const { ScaleSection } = window.BiologicalScaleDescentDesignSystem_acc404;

  const writeups = [
    {
      status: "in prep · fall 2026",
      title: "Regulation of chromatin conformation by the histone deubiquitinase BAP1 in the brain",
      body: "BAP1 loss drives H2AK119ub accumulation, which collapses distance-dependent loops and breaks enhancer-gene connections at synaptic and developmental loci. Presented at the UCSD Undergraduate Research Conference and the ACS-SA Symposium.",
      venue: "URC · ACS-SA Symposium",
    },
    {
      status: "in prep · fall 2026",
      title: "Coordinated methylation and hydroxymethylation changes at gene bodies after BAP1 loss",
      body: "Genome-wide 5mC gain paired with 5hmC loss at ~6,750 gene bodies, integrated with ATAC-seq, RNA-seq and CUT&RUN for H2AK119ub and H3K27ac/me3. Logistic regression and permutation testing to model the predictors.",
      venue: "Ferguson Lab",
    },
  ];

  return (
    <ScaleSection scale="chromatin" magnification="10,000×" title="What I write down" kicker="the regulation layer">
      <p className="prose" style={{ marginBottom: "var(--space-7)", maxWidth: "64ch" }}>
        Writing is its own kind of regulation. It decides how people read the work. Two papers are heading out this fall, both on what happens to the developing cerebellum when BAP1 goes missing.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: "var(--measure)" }}>
        {writeups.map((w) => (
          <article key={w.title} style={{ borderLeft: "1px solid var(--accent-line)", paddingLeft: "var(--space-5)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--accent)", marginBottom: "var(--space-2)", letterSpacing: "0.03em" }}>
              {w.status}
            </div>
            <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-lg)", color: "var(--text-strong)", maxWidth: "40ch" }}>
              {w.title}
            </h3>
            <p style={{ margin: "0 0 var(--space-3)", color: "var(--text-body)", lineHeight: "var(--leading-normal)" }}>
              {w.body}
            </p>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {w.venue}
            </div>
          </article>
        ))}
      </div>
    </ScaleSection>
  );
}
window.ChromatinPublications = ChromatinPublications;
