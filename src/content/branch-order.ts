// src/content/branch-order.ts
// The one shared mapping between the three project groups (content layer) and
// the arbor's three limb indices (3D layer). Both the fallback buttons, the
// annotation overlay, the focus store, and the focus camera poses read this —
// a single source of truth so the HTML and the scene can never disagree about
// which limb means what. Pure data, node-safe.

export type BranchKey = 'epigenetics' | 'structural' | 'software';

export const BRANCH_ORDER: readonly BranchKey[] = ['epigenetics', 'structural', 'software'];

export const BRANCH_META: Record<BranchKey, { label: string; blurb: string }> = {
  epigenetics: {
    label: 'epigenetics',
    blurb: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
  },
  structural: {
    label: 'structural biology',
    blurb: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
  },
  software: {
    label: 'software',
    blurb: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
  },
};

export function limbIndexOf(branch: BranchKey): 0 | 1 | 2 {
  return BRANCH_ORDER.indexOf(branch) as 0 | 1 | 2;
}

export function branchOfLimb(limb: 0 | 1 | 2): BranchKey {
  return BRANCH_ORDER[limb]!;
}
