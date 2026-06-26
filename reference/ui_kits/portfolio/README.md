<!-- @template name="..." is NOT used here; this is the kit README, not a template. -->
# Portfolio UI kit — Zara Alibhai's scale-descent site

An interactive recreation of the real portfolio (`zalibhai.com`): a single
scroll-driven page that descends through six biological scales, warm at the top
and cool at the bottom. This is the HTML content layer, which is the real,
accessible page. The R3F 3D scenes are out of scope here; the warm-to-cool
atmosphere is carried by the per-scale tokens plus a little CSS grain and bloom.

## Run it

Open `index.html`. Scroll, or click a dot on the right-edge depth indicator to
jump between scales. The active scale name and magnification show next to the
glowing dot, and the line fills as you descend. The URL hash tracks the scale.

## Screens (top → bottom)

| File | Scale | What it is |
|---|---|---|
| `ArrivalHero.jsx` | tissue | Name, identity, intro prose, "currently working on" status. Serif, warm, soft corners, film grain + bloom. |
| `DendriteIndex.jsx` | cellular | Project index as three clickable branches (epigenetics / structural / software). Focus one, the others dim, its project cards appear. The FOV-focus interaction flattened to HTML. |
| `ChromatinPublications.jsx` | chromatin | Two in-prep papers as research writeups. Inter, blue home-base accent. |
| `ProteinMD.jsx` | protein | Amaro Lab molecular-dynamics work + a trajectory status panel. Cyan, sharper. |
| `CodeTerminal.jsx` | code | Featured software (Cleave, MetaENCODE) + a Tier-2 `ls -la` listing. Fira Code, green, square. |
| `Contact.jsx` | expression | Email, socials, resume as a terminal-flavored link list. Bookend. |

`kit.css` holds kit-local atmosphere (grain, bloom, dendrite branch layout,
contact rows). It is not part of the design-system token closure.

## What it composes

From the design system bundle (`window.BiologicalScaleDescentDesignSystem_acc404`):
`ScaleSection` (owns `[data-scale]`), `ProjectCard`, `TerminalListing`,
`DepthIndicator`, `Tag`. Screens are plain functions registered on `window` and
stitched together by the inline app in `index.html`, which also runs the scroll
→ active-scale logic and the jump-nav.

## Notes

- All copy follows the Voice DNA: first person, sentence case, specific, no em
  dashes, no emoji, no negative parallelism. It is written in Zara's register
  but is illustrative; she writes the real copy.
- Fully usable with zero WebGL and respects `prefers-reduced-motion`.
