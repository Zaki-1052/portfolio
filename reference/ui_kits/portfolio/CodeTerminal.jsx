// Code scale — terminal aesthetic. Fira Code headings, green accent, square
// corners, no post-processing. Featured Tier-1 software, then the Tier-2
// ls -la listing.
function CodeTerminal() {
  const { ScaleSection, TerminalListing } = window.BiologicalScaleDescentDesignSystem_acc404;

  const tier2 = [
    { name: "GPTPortal", description: "Multi-provider AI chat interface", stars: 397, href: "https://github.com/Zaki-1052/GPTPortal" },
    { name: "WebReg", description: "UCSD course enrollment auto-enroller (Rust, Tokio)", href: "https://github.com/Zaki-1052/WebReg-Auto-Enroller" },
    { name: "AO3-Explorer", description: "Reading-history exporter + explorer", href: "https://github.com/Zaki-1052/AO3-History-Explorer" },
    { name: "YeastMSA", description: "Reference-guided MSA, w303 genome", href: "https://github.com/Zaki-1052/Yeast_MSA" },
    { name: "MPro-Analysis", description: "SARS-CoV-2 protease MD analysis", href: "https://github.com/Zaki-1052" },
    { name: "Crime-Analysis", description: "Political leaning vs. incarceration (R)", href: "https://github.com/Zaki-1052/Crime_Analysis" },
  ];

  return (
    <ScaleSection scale="code" title="~/projects" kicker="the sequence level">
      <p className="prose" style={{ marginBottom: "var(--space-6)", maxWidth: "70ch", fontSize: "var(--text-base)" }}>
        At the base level, where the nucleotides are, is where the actual code lives. 300+ analysis scripts, ~100,000 lines across 20 projects, mostly R, Python and Bash. A few of them grew into real software.
      </p>

      <div style={{ marginBottom: "var(--space-6)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        <Featured
          name="cleave"
          line="Self-hosted CUT&RUN platform. React + FastAPI + PostgreSQL on AWS. 8 pipelines, 68+ endpoints, 600+ tests, 60k LoC."
          href="https://github.com/Zaki-1052/cleave"
        />
        <Featured
          name="metaencode"
          line="ENCODE similarity engine. SBERT embeddings, UMAP / t-SNE, faceted search with spell correction."
          href="https://github.com/Zaki-1052/MetaEncode"
        />
      </div>

      <TerminalListing cwd="~/projects" items={tier2} />
    </ScaleSection>
  );

  function Featured({ name, line, href }) {
    return (
      <a href={href} style={{ display: "block", textDecoration: "none", border: "1px solid var(--hairline)", borderRadius: 0, padding: "var(--space-4)", background: "var(--surface-deep)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--accent)", marginBottom: "var(--space-2)" }}>
          <span style={{ color: "var(--text-faint)" }}>$ </span>cat {name}/README.md
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: "var(--leading-normal)" }}>
          {line}
        </div>
      </a>
    );
  }
}
window.CodeTerminal = CodeTerminal;
