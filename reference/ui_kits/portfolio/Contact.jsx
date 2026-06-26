// Expression scale — contact, socials, resume. Stays in the cool/code register
// with a faint warm return as a bookend. Mono, terminal-flavored.
function Contact() {
  const { ScaleSection } = window.BiologicalScaleDescentDesignSystem_acc404;

  const links = [
    { k: "email", v: "zalibhai@ucsd.edu", href: "mailto:zalibhai@ucsd.edu" },
    { k: "github", v: "github.com/Zaki-1052", href: "https://github.com/Zaki-1052" },
    { k: "linkedin", v: "in/zakir-alibhai", href: "https://www.linkedin.com/in/zakir-alibhai-541454276/" },
    { k: "bluesky", v: "@zaki1052.bsky.social", href: "https://bsky.app/profile/zaki1052.bsky.social" },
    { k: "resume", v: "zalibhai.com/cv.pdf  ↗", href: "#" },
  ];

  return (
    <ScaleSection scale="expression" title="$ whoami --contact" kicker="surface, again">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--space-7)", alignItems: "start" }}>
        <div className="prose" style={{ fontSize: "var(--text-base)" }}>
          <p>That's the whole descent, tissue to code. Thanks for scrolling all the way down.</p>
          <p>I'm open to research collaborations, internships, and the occasional web project. If any of this was interesting, or you just want to talk cerebellum, say hi.</p>
        </div>

        <nav className="contact-links" aria-label="Contact">
          {links.map((l) => (
            <a key={l.k} className="contact-row" href={l.href}>
              <span className="k">{l.k}</span>
              <span className="v">{l.v}</span>
            </a>
          ))}
        </nav>
      </div>

      <div style={{ marginTop: "var(--space-9)", display: "flex", alignItems: "center", gap: "var(--space-3)", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
        <img src={(window.__resources && window.__resources.zmark) || "../../assets/z-mark.png"} alt="" width="22" height="22" style={{ borderRadius: 4, opacity: 0.85 }} />
        <span>zalibhai.com — everything is the brain, all the way down.</span>
      </div>
    </ScaleSection>
  );
}
window.Contact = Contact;
