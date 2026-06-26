// Cellular scale — the project index as dendrite branches.
// Three branches: epigenetics, structural biology, software. Click to focus;
// others dim; the branch's project cards fade in. The FOV-focus interaction,
// flattened to the HTML content layer.
function DendriteIndex() {
  const { ScaleSection, ProjectCard } = window.BiologicalScaleDescentDesignSystem_acc404;
  const [focus, setFocus] = React.useState("epigenetics");

  const branches = {
    epigenetics: {
      label: "epigenetics",
      blurb: "how BAP1 loss rewires chromatin and methylation in the cerebellum",
      cards: [
        {
          title: "Chromatin conformation analysis (Hi-C)",
          href: "https://github.com/Zaki-1052/mariner_hi-c",
          description: "Replicate-aware differential loop calling. 2,910 dysregulated loops in BAP1-knockout mouse cerebellum, with APA, ABC, and TAD analysis.",
          tags: ["R", "mariner", "edgeR", "Hi-C"],
          meta: "Ferguson Lab",
        },
        {
          title: "DNA methylation (Biomodal DUET evoC)",
          href: "https://github.com/Zaki-1052/mariner_hi-c",
          description: "A 50-script pipeline for simultaneous 5mC / 5hmC profiling. Coordinated hyper-methylation and hypo-hydroxymethylation at ~6,750 gene bodies.",
          tags: ["R", "5mC/5hmC", "DMRs", "ROC"],
          meta: "Ferguson Lab",
        },
      ],
    },
    structural: {
      label: "structural biology",
      blurb: "modeling a postsynaptic membrane protein with molecular dynamics",
      cards: [
        {
          title: "Postsynaptic membrane protein MD",
          description: "Building and running the first trajectories of a CNS membrane protein. New territory for me, started June 2026.",
          tags: ["MD", "GROMACS", "structural"],
          meta: "Amaro Lab",
        },
        {
          title: "Yeast regulatory network analysis",
          href: "https://github.com/Zaki-1052/Yeast_MSA",
          description: "Variant calling and gene-network reconstruction across yeast strains; hierarchical conservation in essential sterol pathways.",
          tags: ["Python", "BioPython", "bcftools"],
          meta: "Budin Lab",
        },
      ],
    },
    software: {
      label: "software",
      blurb: "the tools and platforms that make the science runnable",
      cards: [
        {
          title: "Cleave",
          href: "https://github.com/Zaki-1052/cleave",
          description: "Full-stack self-hosted CUT&RUN analysis platform serving ~10 lab members. Eight pipelines, 68+ endpoints, 600+ tests, 60k LoC.",
          tags: ["React", "FastAPI", "PostgreSQL", "AWS"],
          meta: "350 files",
        },
        {
          title: "MetaENCODE",
          href: "https://github.com/Zaki-1052/MetaEncode",
          description: "ENCODE dataset similarity engine. SBERT embeddings with interactive UMAP / t-SNE and faceted search.",
          tags: ["SBERT", "UMAP", "search"],
          meta: "DS3 × UBIC",
        },
      ],
    },
  };

  const order = ["epigenetics", "structural", "software"];

  return (
    <ScaleSection scale="cellular" magnification="100×" title="Three branches of one tree" kicker="pick a branch">
      <p className="prose" style={{ marginBottom: "var(--space-6)", maxWidth: "60ch", fontSize: "var(--text-base)" }}>
        My work splits cleanly into three domains. Click one to see what grows there. Everything here shows up again deeper in the descent, at its own scale.
      </p>

      <div className="branches" style={{ marginBottom: "var(--space-7)" }}>
        {order.map((key) => (
          <button
            key={key}
            className="branch"
            aria-pressed={focus === key}
            data-dim={focus !== key}
            onClick={() => setFocus(key)}
          >
            <h4>{branches[key].label}</h4>
            <p>{branches[key].blurb}</p>
          </button>
        ))}
      </div>

      <div className="cards-col">
        {branches[focus].cards.map((c) => (
          <ProjectCard key={c.title} {...c} />
        ))}
      </div>
    </ScaleSection>
  );
}
window.DendriteIndex = DendriteIndex;
