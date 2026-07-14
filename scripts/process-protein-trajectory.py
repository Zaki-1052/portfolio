# scripts/process-protein-trajectory.py
#
# Offline pipeline for Phase 6 (protein scale). Processes Gq and Gi MD
# trajectories + static MPro dimer into binary assets for the TS renderer.
#
# Run: conda activate biochemcore && python scripts/process-protein-trajectory.py
#
# Gi frame sampling: Option B — stride every 10th frame across all 100 DCDs
# (1000 frames → 100), spanning the full 100 ns trajectory.

import json
from pathlib import Path

import numpy as np
import pandas as pd
import MDAnalysis as mda
from MDAnalysis.analysis import align
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

# ---------------------------------------------------------------------------
# Paths — all absolute, rooted at the user's machine
# ---------------------------------------------------------------------------

AMAROLAB = Path('/Users/zakiralibhai/Documents/VS_Code/amarolab')
MPRO     = Path('/Users/zakiralibhai/Documents/GitHub/mpro-analysis')
PORTFOLIO = Path('/Users/zakiralibhai/Documents/VS_Code/new-portfolio')

OUT_DIR  = PORTFOLIO / 'public' / 'protein'
VAL_DIR  = PORTFOLIO / 'scripts' / 'validation'

SYSTEMS = {
    'gq': {
        'psf': str(AMAROLAB / 'openmm' / 'step5_input.psf'),
        'dcds': [str(AMAROLAB / 'openmm' / f'step7_{i}.dcd') for i in range(1, 11)],
        'stride': 1,
        'rmsf_csv': str(AMAROLAB / 'analysis' / 'phase3_rmsf' / 'rmsf_data.csv'),
        'hbonds_csv': str(AMAROLAB / 'analysis' / 'phase8_hbonds' / 'hbond_occupancy.csv'),
        'aromatics_csv': str(AMAROLAB / 'analysis' / 'phase9_aromatics' / 'aromatic_summary.csv'),
        'receptor_segids': 'PROA PROB PROC',
        'galpha_segids': 'PROD PROE PROF',
        'gbeta_segids': 'PROG PROH',
        'ggamma_segids': 'PROI PROJ',
        'expected_receptor_ca': 266,
        'expected_galpha_ca': 246,
        'expected_gbeta_ca': 338,
        'expected_ggamma_ca': 71,
        'timestep_ns': 0.1,
    },
    'gi': {
        'psf': str(AMAROLAB / 'new-Gi' / 'charmm-gui-8313215931' / 'openmm' / 'step5_input.psf'),
        'dcds': [str(AMAROLAB / 'new-Gi' / 'charmm-gui-8313215931' / 'openmm' / f'step7_{i}.dcd')
                 for i in range(1, 101)],
        'stride': 10,
        'rmsf_csv': str(AMAROLAB / 'new-Gi' / 'analysis' / 'phase3_rmsf' / 'rmsf_data.csv'),
        'hbonds_csv': None,
        'aromatics_csv': None,
        'receptor_segids': 'PROE PROF',
        'galpha_segids': 'PROA',
        'gbeta_segids': 'PROC PROD',
        'ggamma_segids': 'PROB',
        'expected_receptor_ca': 262,
        'expected_galpha_ca': 340,
        'expected_gbeta_ca': 227,
        'expected_ggamma_ca': 71,
        'timestep_ns': 0.1,
    },
}

MPRO_PDB = str(MPRO / 'vmd' / 'mpro_dimer.pdb')

MPRO_DOMAINS = [
    ('nterm',   1,  16),
    ('domain1', 17, 109),
    ('domain2', 110, 175),
    ('idl',     176, 200),
    ('domain3', 201, 289),
    ('cterm',   290, 306),
]

MPRO_ACTIVE_LOOPS = [[1, 20], [39, 55], [110, 131], [131, 146],
                     [146, 175], [176, 200], [290, 306]]

MPRO_CATALYTIC_DYAD = {'C145': 145, 'H41': 41}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def select_ca_and_o(universe, segid_str):
    """Select paired CA and backbone-carbonyl O atoms for a set of segids.
    Returns (ca_group, o_group) with matching residue pairing."""
    ca = universe.select_atoms(f'segid {segid_str} and name CA')
    o = universe.select_atoms(f'segid {segid_str} and name O and not name OY OXT')
    if len(ca) != len(o):
        print(f'  WARNING: CA/O count mismatch for segid {segid_str}: '
              f'{len(ca)} CA vs {len(o)} O')
        common_resids = np.intersect1d(ca.resids, o.resids)
        resid_list = ' '.join(str(r) for r in common_resids)
        ca = universe.select_atoms(f'segid {segid_str} and name CA and resid {resid_list}')
        o = universe.select_atoms(f'segid {segid_str} and name O and not name OY OXT '
                                  f'and resid {resid_list}')
    return ca, o


def detect_fragments(ca_positions, threshold=7.0):
    """Detect backbone breaks by CA-CA distance. Returns list of (start, end) tuples."""
    n = len(ca_positions)
    if n == 0:
        return []
    fragments = []
    frag_start = 0
    for i in range(1, n):
        dist = np.linalg.norm(ca_positions[i] - ca_positions[i - 1])
        if dist > threshold:
            fragments.append((frag_start, i - 1))
            frag_start = i
    fragments.append((frag_start, n - 1))
    return fragments


def compute_reference_normals(ca_pos, o_pos, fragments):
    """Compute flip-corrected ribbon normals from CA and O positions.
    Returns (n_residues, 3) array of unit normals."""
    n = len(ca_pos)
    normals = np.zeros((n, 3), dtype=np.float64)

    for frag_start, frag_end in fragments:
        # Raw normals: O - CA, projected perpendicular to backbone tangent
        for i in range(frag_start, frag_end + 1):
            raw = o_pos[i] - ca_pos[i]
            if i == frag_start:
                tangent = ca_pos[min(i + 1, frag_end)] - ca_pos[i]
            elif i == frag_end:
                tangent = ca_pos[i] - ca_pos[max(i - 1, frag_start)]
            else:
                tangent = ca_pos[i + 1] - ca_pos[i - 1]
            t_len = np.linalg.norm(tangent)
            if t_len > 1e-8:
                tangent = tangent / t_len
            raw = raw - np.dot(raw, tangent) * tangent
            r_len = np.linalg.norm(raw)
            if r_len > 1e-8:
                normals[i] = raw / r_len
            else:
                normals[i] = np.array([0.0, 1.0, 0.0])

        # 3-residue running average (within fragment)
        smoothed = normals.copy()
        for i in range(frag_start + 1, frag_end):
            avg = normals[i - 1] + normals[i] + normals[i + 1]
            a_len = np.linalg.norm(avg)
            if a_len > 1e-8:
                smoothed[i] = avg / a_len
        normals[frag_start:frag_end + 1] = smoothed[frag_start:frag_end + 1]

        # Dot-product flip walk
        flip_count = 0
        for i in range(frag_start + 1, frag_end + 1):
            if np.dot(normals[i], normals[i - 1]) < 0:
                normals[i] = -normals[i]
                flip_count += 1
        print(f'    Fragment [{frag_start}, {frag_end}]: {flip_count} flips corrected')

    return normals.astype(np.float32)


def extract_membrane_geometry(universe, frame_idx=0):
    """Extract membrane midplane, thickness, and radius from phosphate positions."""
    phosphates = universe.select_atoms('(segid MEMB or segid GLPA) and name P')
    print(f'  Phosphorus atoms: {len(phosphates)}')

    universe.trajectory[frame_idx]
    pos = phosphates.positions

    z_vals = pos[:, 2]
    z_mid = np.median(z_vals)
    upper = pos[z_vals > z_mid]
    lower = pos[z_vals <= z_mid]

    upper_z = float(upper[:, 2].mean())
    lower_z = float(lower[:, 2].mean())
    midplane = (upper_z + lower_z) / 2.0
    thickness = upper_z - lower_z

    xy_center = pos[:, :2].mean(axis=0)
    lateral = np.linalg.norm(pos[:, :2] - xy_center, axis=1)
    radius = float(np.max(lateral) * 1.2)

    print(f'  Membrane: midplane Z={midplane:.1f}, thickness={thickness:.1f} A, radius={radius:.1f} A')
    return {'midplaneY': round(midplane, 2), 'thickness': round(thickness, 2),
            'radius': round(radius, 2)}


def extract_ligand_bonds(universe, selection_str):
    """Extract bond pairs among selected ligand atoms using PSF topology."""
    lig = universe.select_atoms(selection_str)
    idx_set = set(lig.indices)
    global_to_local = {g: l for l, g in enumerate(lig.indices)}

    bonds = []
    if hasattr(universe, 'bonds'):
        for bond in universe.bonds:
            a0, a1 = bond.atoms[0].index, bond.atoms[1].index
            if a0 in idx_set and a1 in idx_set:
                bonds.append([global_to_local[a0], global_to_local[a1]])
    else:
        print('  WARNING: No bond information in topology — ligand bonds empty')

    return bonds


def run_dssp(universe, protein_sel_str='protein'):
    """Run DSSP on frame 0 and return per-residue SS assignment (H/E/C).
    Falls back to writing a temp PDB if DSSP fails on the PSF topology."""
    from MDAnalysis.analysis.dssp import DSSP
    import tempfile, os

    universe.trajectory[0]
    protein = universe.select_atoms(protein_sel_str)

    raw = None

    # Attempt 1: DSSP on the full universe
    try:
        dssp = DSSP(universe).run(start=0, stop=1)
        raw = dssp.results.dssp[0]
    except Exception as e1:
        print(f'  DSSP attempt 1 failed ({e1})')

    # Attempt 2: write a clean protein-only PDB (strip altlocs, non-protein)
    if raw is None:
        print('  Falling back to clean protein-only temp PDB for DSSP...')
        try:
            clean = universe.select_atoms(f'{protein_sel_str} and not altLoc B')
            tmp = tempfile.NamedTemporaryFile(suffix='.pdb', delete=False)
            tmp.close()
            clean.write(tmp.name)
            u_tmp = mda.Universe(tmp.name)
            dssp = DSSP(u_tmp).run(start=0, stop=1)
            raw = dssp.results.dssp[0]
            os.unlink(tmp.name)
        except Exception as e2:
            print(f'  DSSP attempt 2 also failed ({e2})')
            print('  Using all-coil fallback for DSSP')
            return ['C'] * len(protein.residues)

    # Map 8-class to 3-class
    mapping = {'H': 'H', 'G': 'H', 'I': 'H', 'E': 'E', 'B': 'E'}
    ss = [mapping.get(str(c), 'C') for c in raw]
    return ss


def dssp_with_overrides(ss_list, resids, rmsf_df):
    """Cross-check DSSP against RMSF region labels and override mismatches."""
    region_map = dict(zip(rmsf_df['resid'].values, rmsf_df['region'].values))
    overrides = 0
    for i, rid in enumerate(resids):
        region = region_map.get(int(rid), '')
        if region.startswith('TM') or region == 'H8':
            if ss_list[i] != 'H':
                print(f'    Override resid {rid} ({region}): {ss_list[i]} -> H')
                ss_list[i] = 'H'
                overrides += 1
        elif region.startswith('ICL') or region.startswith('ECL') or region == 'Ct':
            if ss_list[i] != 'C':
                print(f'    Override resid {rid} ({region}): {ss_list[i]} -> C')
                ss_list[i] = 'C'
                overrides += 1
    print(f'  DSSP overrides: {overrides}')
    return ss_list


def catmull_rom_point(p0, p1, p2, p3, t, alpha=0.5):
    """Centripetal Catmull-Rom interpolation at parameter t in [0,1]."""
    def tj(ti, pi, pj):
        d = np.linalg.norm(pj - pi)
        return ti + max(d, 1e-8) ** alpha

    t0 = 0.0
    t1 = tj(t0, p0, p1)
    t2 = tj(t1, p1, p2)
    t3 = tj(t2, p2, p3)

    u = t1 + t * (t2 - t1)

    def lerp_t(a, b, ta, tb, tv):
        denom = tb - ta
        if abs(denom) < 1e-12:
            return a
        return a + (tv - ta) / denom * (b - a)

    a1 = lerp_t(p0, p1, t0, t1, u)
    a2 = lerp_t(p1, p2, t1, t2, u)
    a3 = lerp_t(p2, p3, t2, t3, u)

    b1 = lerp_t(a1, a2, t0, t2, u)
    b2 = lerp_t(a2, a3, t1, t3, u)

    return lerp_t(b1, b2, t1, t2, u)


def catmull_rom_tangent(p0, p1, p2, p3, t, alpha=0.5, eps=1e-4):
    """Numerical tangent via finite difference."""
    pt_plus = catmull_rom_point(p0, p1, p2, p3, min(t + eps, 1.0), alpha)
    pt_minus = catmull_rom_point(p0, p1, p2, p3, max(t - eps, 0.0), alpha)
    tang = pt_plus - pt_minus
    n = np.linalg.norm(tang)
    return tang / n if n > 1e-8 else np.array([1.0, 0.0, 0.0])


def build_guide_points(ca_pos, normals, fragments, n_sub=4):
    """Build Catmull-Rom guide points for a static structure (MPro).
    Returns list of (position, tangent, normal) tuples."""
    guides = []

    for frag_start, frag_end in fragments:
        for idx in range(frag_start, frag_end + 1):
            i0 = max(frag_start, idx - 1)
            i1 = idx
            i2 = min(frag_end, idx + 1)
            i3 = min(frag_end, idx + 2)

            for j in range(n_sub):
                t = j / n_sub
                pos = catmull_rom_point(ca_pos[i0], ca_pos[i1],
                                        ca_pos[i2], ca_pos[i3], t)
                tang = catmull_rom_tangent(ca_pos[i0], ca_pos[i1],
                                           ca_pos[i2], ca_pos[i3], t)

                # Interpolate normal
                t_blend = t
                n_a = normals[idx]
                n_b = normals[min(idx + 1, frag_end)]
                n_interp = (1 - t_blend) * n_a + t_blend * n_b
                n_len = np.linalg.norm(n_interp)
                if n_len > 1e-8:
                    n_interp = n_interp / n_len
                # Orthogonalize against tangent
                n_interp = n_interp - np.dot(n_interp, tang) * tang
                n_len = np.linalg.norm(n_interp)
                if n_len > 1e-8:
                    n_interp = n_interp / n_len

                guides.append((pos.astype(np.float32),
                               tang.astype(np.float32),
                               n_interp.astype(np.float32)))

    return guides


# ---------------------------------------------------------------------------
# Main processing: trajectory system
# ---------------------------------------------------------------------------

def process_trajectory_system(name, cfg):
    """Process a single MD system (Gq or Gi). Returns a dict of extracted data."""
    print(f'\n{"="*60}')
    print(f'Processing {name.upper()} system')
    print(f'{"="*60}')

    # Load
    print(f'  Loading PSF + {len(cfg["dcds"])} DCDs...')
    u = mda.Universe(cfg['psf'], cfg['dcds'])
    n_frames_raw = len(u.trajectory)
    stride = cfg['stride']
    n_frames = len(range(0, n_frames_raw, stride))
    print(f'  Raw frames: {n_frames_raw}, stride: {stride}, output frames: {n_frames}')

    # Select atoms
    receptor_ca, receptor_o = select_ca_and_o(u, cfg['receptor_segids'])
    galpha_ca, galpha_o = select_ca_and_o(u, cfg['galpha_segids'])
    gbeta_ca, gbeta_o = select_ca_and_o(u, cfg['gbeta_segids'])
    ggamma_ca, ggamma_o = select_ca_and_o(u, cfg['ggamma_segids'])
    ligand = u.select_atoms('segid HETA and resname LIG and not name H*')

    print(f'  Receptor CA: {len(receptor_ca)} (expected {cfg["expected_receptor_ca"]})')
    print(f'  Galpha CA: {len(galpha_ca)} (expected {cfg["expected_galpha_ca"]})')
    print(f'  Gbeta CA: {len(gbeta_ca)} (expected {cfg["expected_gbeta_ca"]})')
    print(f'  Ggamma CA: {len(ggamma_ca)} (expected {cfg["expected_ggamma_ca"]})')
    print(f'  Ligand heavy atoms: {len(ligand)}')

    assert len(receptor_ca) == cfg['expected_receptor_ca'], \
        f'Receptor CA count mismatch: {len(receptor_ca)} != {cfg["expected_receptor_ca"]}'
    assert len(galpha_ca) == cfg['expected_galpha_ca']
    assert len(gbeta_ca) == cfg['expected_gbeta_ca']
    assert len(ggamma_ca) == cfg['expected_ggamma_ca']
    assert len(ligand) == 15, f'Ligand heavy atom count: {len(ligand)}'

    # Align to frame 0 (receptor CA)
    print('  Aligning trajectory to frame 0 (receptor CA)...')
    align.AlignTraj(
        u, u,
        select=f'segid {cfg["receptor_segids"]} and name CA',
        ref_frame=0,
        in_memory=True,
    ).run()
    print('  Alignment complete.')

    # DSSP on frame 0
    print('  Running DSSP on frame 0...')
    u.trajectory[0]
    all_protein_ss = run_dssp(u, protein_sel_str='protein')

    # Extract receptor SS by matching residue indices
    protein_atoms = u.select_atoms('protein')
    protein_residues = protein_atoms.residues
    receptor_residues = receptor_ca.residues

    prot_resid_segid = [(r.resid, r.segid) for r in protein_residues]
    rec_resid_segid = [(r.resid, r.segid) for r in receptor_residues]

    prot_lookup = {(rid, sid): i for i, (rid, sid) in enumerate(prot_resid_segid)}
    receptor_ss = []
    for rid, sid in rec_resid_segid:
        idx = prot_lookup.get((rid, sid))
        if idx is not None and idx < len(all_protein_ss):
            receptor_ss.append(all_protein_ss[idx])
        else:
            receptor_ss.append('C')

    # G-protein SS
    gprotein_chains_data = []
    for chain_name, ca_grp, o_grp, _ in [
        ('galpha', galpha_ca, galpha_o, cfg['galpha_segids']),
        ('gbeta', gbeta_ca, gbeta_o, cfg['gbeta_segids']),
        ('ggamma', ggamma_ca, ggamma_o, cfg['ggamma_segids']),
    ]:
        chain_residues = ca_grp.residues
        chain_ss = []
        for r in chain_residues:
            idx = prot_lookup.get((r.resid, r.segid))
            if idx is not None and idx < len(all_protein_ss):
                chain_ss.append(all_protein_ss[idx])
            else:
                chain_ss.append('C')
        gprotein_chains_data.append({
            'name': chain_name,
            'residueCount': len(ca_grp),
            'ss': ''.join(chain_ss),
        })

    ss_counts = {'H': receptor_ss.count('H'), 'E': receptor_ss.count('E'),
                 'C': receptor_ss.count('C')}
    print(f'  Receptor SS: H={ss_counts["H"]}, E={ss_counts["E"]}, C={ss_counts["C"]}')

    for cd in gprotein_chains_data:
        ss_c = {k: cd['ss'].count(k) for k in 'HEC'}
        print(f'  {cd["name"]} SS: H={ss_c["H"]}, E={ss_c["E"]}, C={ss_c["C"]}')

    # DSSP overrides from RMSF region labels
    rmsf_df = pd.read_csv(cfg['rmsf_csv'])
    receptor_ss = dssp_with_overrides(receptor_ss, receptor_ca.resids, rmsf_df)

    # Detect fragments
    u.trajectory[0]
    fragments = detect_fragments(receptor_ca.positions)
    print(f'  Receptor fragments: {len(fragments)} — {fragments}')

    # Reference normals (frame 0)
    print('  Computing reference normals...')
    ref_normals = compute_reference_normals(
        receptor_ca.positions.copy(), receptor_o.positions.copy(), fragments
    )

    # Membrane geometry
    membrane = extract_membrane_geometry(u, frame_idx=0)

    # Ligand bonds
    lig_bonds = extract_ligand_bonds(u, 'segid HETA and resname LIG and not name H*')
    print(f'  Ligand bonds: {len(lig_bonds)}')

    # RMSF and region data
    rmsf_values = rmsf_df['rmsf'].values.tolist()
    lit_resids = rmsf_df['lit_resid'].values.tolist()
    regions = rmsf_df['region'].values.tolist()

    # Binding pocket and aromatic cage from CSVs
    binding_pocket_lits = []
    aromatic_cage_lits = [234, 243, 336, 339, 340, 370]

    if cfg.get('hbonds_csv'):
        hbonds_df = pd.read_csv(cfg['hbonds_csv'])
        binding_pocket_lits = sorted(hbonds_df['lit_resid'].unique().tolist())
        print(f'  Binding pocket residues (lit): {binding_pocket_lits}')

    if cfg.get('aromatics_csv'):
        arom_df = pd.read_csv(cfg['aromatics_csv'])
        parsed_lits = []
        for label in arom_df['ring_label']:
            if label == 'Psilocin':
                continue
            digits = ''.join(c for c in label if c.isdigit())
            if digits:
                parsed_lits.append(int(digits))
        aromatic_cage_lits = sorted(parsed_lits)
        print(f'  Aromatic cage residues (lit): {aromatic_cage_lits}')

    # Extract per-frame data
    print(f'  Extracting {n_frames} frames...')
    n_rec = len(receptor_ca)
    n_gprot = len(galpha_ca) + len(gbeta_ca) + len(ggamma_ca)
    n_lig = len(ligand)
    floats_per_frame = n_rec * 6 + n_gprot * 6 + n_lig * 3
    all_frames = np.zeros((n_frames, floats_per_frame), dtype=np.float32)

    def interleave_ca_o(ca_pos, o_pos):
        """Interleave CA and O positions: [ca0x,ca0y,ca0z,o0x,o0y,o0z, ...]"""
        n = len(ca_pos)
        out = np.empty((n, 6), dtype=np.float32)
        out[:, 0:3] = ca_pos
        out[:, 3:6] = o_pos
        return out.ravel()

    frame_indices = list(range(0, n_frames_raw, stride))
    for out_idx, ts_idx in enumerate(frame_indices):
        u.trajectory[ts_idx]
        offset = 0

        # Receptor CA+O interleaved
        block = interleave_ca_o(receptor_ca.positions, receptor_o.positions)
        all_frames[out_idx, offset:offset + len(block)] = block
        offset += len(block)

        # G-protein chains: galpha, gbeta, ggamma
        for ca_grp, o_grp in [(galpha_ca, galpha_o),
                               (gbeta_ca, gbeta_o),
                               (ggamma_ca, ggamma_o)]:
            block = interleave_ca_o(ca_grp.positions, o_grp.positions)
            all_frames[out_idx, offset:offset + len(block)] = block
            offset += len(block)

        # Ligand heavy atoms
        lig_flat = ligand.positions.ravel().astype(np.float32)
        all_frames[out_idx, offset:offset + len(lig_flat)] = lig_flat
        offset += len(lig_flat)

        if (out_idx + 1) % 25 == 0:
            print(f'    Frame {out_idx + 1}/{n_frames}')

    print(f'  Extracted {n_frames} frames, {floats_per_frame} floats/frame')

    gprotein_chain_names = {
        'gq': [
            {'name': 'Galpha-q', 'residueCount': cfg['expected_galpha_ca']},
            {'name': 'Gbeta1', 'residueCount': cfg['expected_gbeta_ca']},
            {'name': 'Ggamma2', 'residueCount': cfg['expected_ggamma_ca']},
        ],
        'gi': [
            {'name': 'Galpha-i1', 'residueCount': cfg['expected_galpha_ca']},
            {'name': 'Gbeta1', 'residueCount': cfg['expected_gbeta_ca']},
            {'name': 'Ggamma2', 'residueCount': cfg['expected_ggamma_ca']},
        ],
    }

    return {
        'name': name,
        'frameCount': n_frames,
        'timestepNs': cfg['timestep_ns'] * stride,
        'totalTimeNs': n_frames * cfg['timestep_ns'] * stride,
        'receptor': {
            'residueCount': n_rec,
            'guidePointsPerResidue': 4,
            'totalGuidePoints': n_rec * 4,
            'fragments': [{'startResidue': s, 'endResidue': e, 'count': e - s + 1}
                          for s, e in fragments],
            'ss': ''.join(receptor_ss),
            'rmsf': [round(v, 6) for v in rmsf_values],
            'litResids': lit_resids,
            'regions': regions,
            'bindingPocketLitResids': binding_pocket_lits,
            'aromaticCageLitResids': aromatic_cage_lits,
            'referenceNormals': ref_normals.flatten().tolist(),
        },
        'gprotein': {
            'chains': [{**gprotein_chain_names[name][i], 'ss': gprotein_chains_data[i]['ss']}
                       for i in range(3)],
            'totalResidues': n_gprot,
        },
        'ligand_bonds': lig_bonds,
        'membrane': membrane,
        'frames': all_frames,
    }


# ---------------------------------------------------------------------------
# Main processing: MPro static
# ---------------------------------------------------------------------------

def process_mpro():
    """Process the MPro dimer PDB into static guide-point data."""
    print(f'\n{"="*60}')
    print('Processing MPro dimer (static)')
    print(f'{"="*60}')

    if not Path(MPRO_PDB).exists():
        print(f'  MPro PDB not found at {MPRO_PDB}, skipping.')
        return None

    u = mda.Universe(MPRO_PDB)
    print(f'  Loaded {len(u.atoms)} atoms')

    # Run DSSP on a clean copy (no altloc B), build a lookup by (resid, chainID)
    dssp_lookup = {}
    try:
        import tempfile, os
        clean_sel = u.select_atoms('protein and not altLoc B')
        tmp = tempfile.NamedTemporaryFile(suffix='.pdb', delete=False)
        tmp.close()
        clean_sel.write(tmp.name)
        u_clean = mda.Universe(tmp.name)

        ss_full = run_dssp(u_clean)
        clean_residues = u_clean.select_atoms('protein').residues
        for i, r in enumerate(clean_residues):
            if i >= len(ss_full):
                break
            cid = getattr(r.atoms[0], 'chainID', r.segid)
            dssp_lookup[(r.resid, cid)] = ss_full[i]
        os.unlink(tmp.name)
        print(f'  DSSP: {len(dssp_lookup)} residues assigned')
    except Exception as e:
        print(f'  DSSP failed ({e}), will use all-C fallback')

    chains_data = []
    ligand_data = None

    for chain_id in ['A', 'B']:
        ca = u.select_atoms(f'protein and chainID {chain_id} and name CA and not altLoc B')
        o = u.select_atoms(f'protein and chainID {chain_id} and name O and not altLoc B '
                           f'and not name OY OXT')

        # Filter to matching resids
        ca_resids = ca.resids
        o_resids = o.resids
        common = np.intersect1d(ca_resids, o_resids)
        if len(common) < len(ca):
            resid_list = ' '.join(str(r) for r in common)
            ca = u.select_atoms(f'protein and chainID {chain_id} and name CA '
                                f'and not altLoc B and resid {resid_list}')
            o = u.select_atoms(f'protein and chainID {chain_id} and name O '
                               f'and not altLoc B and not name OY OXT '
                               f'and resid {resid_list}')

        print(f'  Chain {chain_id}: {len(ca)} CA atoms')

        ca_pos = ca.positions.copy()
        o_pos = o.positions.copy()

        # Detect fragments (chain B may have gaps)
        fragments = detect_fragments(ca_pos)
        print(f'    Fragments: {len(fragments)} — {fragments}')

        # Map DSSP assignments to this chain's residues
        chain_ss = []
        for r in ca.residues:
            cid = getattr(r.atoms[0], 'chainID', r.segid)
            chain_ss.append(dssp_lookup.get((r.resid, cid), 'C'))

        ss_c = {k: chain_ss.count(k) for k in 'HEC'}
        print(f'    SS: H={ss_c["H"]}, E={ss_c["E"]}, C={ss_c["C"]}')

        # Normals
        normals = compute_reference_normals(ca_pos, o_pos, fragments)

        # Guide points (Catmull-Rom, 4 per residue)
        guides = build_guide_points(ca_pos, normals, fragments, n_sub=4)
        guide_flat = []
        for pos, tang, norm in guides:
            guide_flat.extend(pos.tolist())
            guide_flat.extend(tang.tolist())
            guide_flat.extend(norm.tolist())

        # Domain labels
        resids = ca.resids
        domains = []
        for rid in resids:
            assigned = 'other'
            for dname, dstart, dend in MPRO_DOMAINS:
                if dstart <= rid <= dend:
                    assigned = dname
                    break
            domains.append(assigned)

        chains_data.append({
            'name': chain_id,
            'residueCount': len(ca),
            'guidePointsPerResidue': 4,
            'totalGuidePoints': len(guides),
            'fragments': [{'startResidue': s, 'endResidue': e, 'count': e - s + 1}
                          for s, e in fragments],
            'ss': ''.join(chain_ss),
            'domains': domains,
            'guide': [round(v, 4) for v in guide_flat],
        })

    # Ligand (7YY, chain A only for static display)
    lig_heavy = u.select_atoms('resname 7YY and not name H*')
    if len(lig_heavy) > 0:
        # Take chain A ligand if both exist
        lig_a = u.select_atoms('resname 7YY and chainID A and not name H*')
        if len(lig_a) > 0:
            lig_heavy = lig_a
        lig_pos = lig_heavy.positions.tolist()
        lig_bonds = extract_ligand_bonds(u, 'resname 7YY and chainID A and not name H*')
        ligand_data = {
            'chain': 'A',
            'resname': '7YY',
            'heavyAtomCount': len(lig_heavy),
            'positions': [round(v, 3) for pos in lig_pos for v in pos],
            'bonds': lig_bonds,
        }
        print(f'  Ligand 7YY: {len(lig_heavy)} heavy atoms, {len(lig_bonds)} bonds')

    return {
        'format': 'mpro-static-v1',
        'chains': chains_data,
        'catalyticDyad': {
            'A': MPRO_CATALYTIC_DYAD,
            'B': MPRO_CATALYTIC_DYAD,
        },
        'activeLoops': MPRO_ACTIVE_LOOPS,
        'ligand': ligand_data,
    }


# ---------------------------------------------------------------------------
# Shared receptor map
# ---------------------------------------------------------------------------

def build_shared_map(gq_rmsf_csv, gi_rmsf_csv):
    """Build the shared receptor residue map from lit_resid matching."""
    gq_df = pd.read_csv(gq_rmsf_csv)
    gi_df = pd.read_csv(gi_rmsf_csv)

    gq_lits = gq_df['lit_resid'].values
    gi_lits = gi_df['lit_resid'].values

    shared = sorted(set(gq_lits) & set(gi_lits))

    gq_map = {lit: idx for idx, lit in enumerate(gq_lits)}
    gi_map = {lit: idx for idx, lit in enumerate(gi_lits)}

    gq_indices = [gq_map[lit] for lit in shared]
    gi_indices = [gi_map[lit] for lit in shared]

    print(f'\n  Shared receptor map: {len(shared)} residues')
    print(f'    Gq-only lit_resids: {sorted(set(gq_lits) - set(gi_lits))}')
    print(f'    Gi-only lit_resids: {sorted(set(gi_lits) - set(gq_lits))}')

    return {
        'count': len(shared),
        'gqResidueIndices': gq_indices,
        'giResidueIndices': gi_indices,
    }


# ---------------------------------------------------------------------------
# Validation plot
# ---------------------------------------------------------------------------

def generate_validation_plot(gq_data, gi_data, output_path):
    """Generate matplotlib 3D validation plot for Gate 1."""
    print(f'\n  Generating validation plot...')

    fig = plt.figure(figsize=(22, 28))
    fig.suptitle('Protein Pipeline Validation — Frame 0', fontsize=14, y=0.98)

    ss_colors = {'H': '#2c7bb6', 'E': '#d7191c', 'C': '#999999'}

    def plot_chain(ax, ca_pos, ss_str, normals, title, fragments=None):
        ax.set_title(title, fontsize=10)
        n = len(ca_pos)
        for i in range(n - 1):
            skip = False
            if fragments:
                for _, fe in fragments:
                    if i == fe:
                        skip = True
                        break
            if skip:
                continue
            color = ss_colors.get(ss_str[i], '#999999')
            ax.plot3D(ca_pos[i:i+2, 0], ca_pos[i:i+2, 1], ca_pos[i:i+2, 2],
                      color=color, linewidth=1.5)

        # Normal vectors at every 10th residue
        for i in range(0, n, 10):
            ax.quiver(ca_pos[i, 0], ca_pos[i, 1], ca_pos[i, 2],
                      normals[i, 0], normals[i, 1], normals[i, 2],
                      length=3.0, color='green', alpha=0.5, arrow_length_ratio=0.2)

        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_zlabel('Z')

    # Reconstruct frame-0 positions from the stored flat arrays
    def extract_frame0_ca_o(data):
        n_rec = data['receptor']['residueCount']
        frame0 = data['frames'][0]
        ca = np.zeros((n_rec, 3), dtype=np.float32)
        o = np.zeros((n_rec, 3), dtype=np.float32)
        for i in range(n_rec):
            ca[i] = frame0[i * 6: i * 6 + 3]
            o[i] = frame0[i * 6 + 3: i * 6 + 6]
        return ca, o

    # 4 rows x 2 cols: rec_frag1, rec_frag2, galpha, gbeta, ggamma, overview
    for sys_idx, (data, sys_label) in enumerate([(gq_data, 'Gq'), (gi_data, 'Gi')]):
        col = sys_idx
        ca, _ = extract_frame0_ca_o(data)
        ss = data['receptor']['ss']
        normals = np.array(data['receptor']['referenceNormals']).reshape(-1, 3)
        frags = [(f['startResidue'], f['endResidue']) for f in data['receptor']['fragments']]

        # Receptor fragments
        for frag_idx, (fs, fe) in enumerate(frags):
            ax = fig.add_subplot(4, 2, frag_idx * 2 + col + 1, projection='3d')
            plot_chain(ax, ca[fs:fe+1], ss[fs:fe+1], normals[fs:fe+1],
                       f'{sys_label} Receptor frag {frag_idx+1} [{fs}-{fe}]')

        # G-protein chains
        n_rec = data['receptor']['residueCount']
        gprot_offset = n_rec * 6
        frame0 = data['frames'][0]
        gprot_chains = data['gprotein']['chains']

        for gi_idx, gchain in enumerate(gprot_chains):
            if gi_idx >= 1:
                break
            n_g = gchain['residueCount']
            g_ca = np.zeros((n_g, 3), dtype=np.float32)
            g_o = np.zeros((n_g, 3), dtype=np.float32)
            for i in range(n_g):
                g_ca[i] = frame0[gprot_offset + i * 6: gprot_offset + i * 6 + 3]
                g_o[i] = frame0[gprot_offset + i * 6 + 3: gprot_offset + i * 6 + 6]

            g_frags = detect_fragments(g_ca)
            g_normals = compute_reference_normals(g_ca, g_o, g_frags)
            ax = fig.add_subplot(4, 2, 5 + col, projection='3d')
            plot_chain(ax, g_ca, gchain['ss'], g_normals,
                       f'{sys_label} {gchain["name"]}', g_frags)

        # Overview with ligand and membrane
        ax = fig.add_subplot(4, 2, 7 + col, projection='3d')
        ax.set_title(f'{sys_label} Overview', fontsize=10)
        for i in range(len(ca) - 1):
            skip = any(i == fe for _, fe in frags)
            if skip:
                continue
            color = ss_colors.get(ss[i], '#999999')
            ax.plot3D(ca[i:i+2, 0], ca[i:i+2, 1], ca[i:i+2, 2],
                      color=color, linewidth=0.8, alpha=0.6)

        # Ligand
        n_gprot_total = data['gprotein']['totalResidues']
        lig_offset = n_rec * 6 + n_gprot_total * 6
        lig_pos = frame0[lig_offset:lig_offset + 15 * 3].reshape(15, 3)
        lig_center = lig_pos.mean(axis=0)
        ax.scatter(*lig_center, c='gold', s=120, zorder=5, edgecolors='orange',
                   linewidths=1, label='Ligand')

        # Membrane midplane
        mem = data['membrane']
        theta = np.linspace(0, 2 * np.pi, 64)
        cx, cy = ca[:, 0].mean(), ca[:, 1].mean()
        r = mem['radius'] * 0.3
        x_circ = r * np.cos(theta) + cx
        y_circ = r * np.sin(theta) + cy
        z_circ = np.full_like(theta, mem['midplaneY'])
        ax.plot(x_circ, y_circ, z_circ, color='grey', alpha=0.3, linewidth=1)
        ax.plot([cx - r, cx + r], [cy, cy], [mem['midplaneY'], mem['midplaneY']],
                color='grey', alpha=0.3, linewidth=0.5)

        ax.legend(fontsize=7)
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_zlabel('Z')

    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(str(output_path), dpi=150, bbox_inches='tight')
    plt.close()
    print(f'  Validation plot saved: {output_path}')


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    print('Protein Scale Pipeline')
    print(f'Output: {OUT_DIR}')
    print(f'Validation: {VAL_DIR}')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    VAL_DIR.mkdir(parents=True, exist_ok=True)

    # Process trajectory systems
    results = {}
    for name, cfg in SYSTEMS.items():
        results[name] = process_trajectory_system(name, cfg)

    # Shared receptor map
    shared_map = build_shared_map(SYSTEMS['gq']['rmsf_csv'], SYSTEMS['gi']['rmsf_csv'])

    # MPro
    mpro_data = process_mpro()

    # Write binary trajectory files
    for name in ['gq', 'gi']:
        bin_path = OUT_DIR / f'{name}-trajectory.bin'
        results[name]['frames'].tofile(str(bin_path))
        size_mb = bin_path.stat().st_size / (1024 * 1024)
        print(f'\n  Wrote {bin_path.name}: {size_mb:.2f} MB')

    # Write protein-meta.json
    meta = {
        'format': 'protein-scale-v1',
        'systems': {},
        'receptor': {},
        'gprotein': {},
        'ligand': {
            'heavyAtomCount': 15,
            'bonds': results['gq']['ligand_bonds'],
        },
        'membrane': {},
    }

    for name in ['gq', 'gi']:
        r = results[name]
        meta['systems'][name] = {
            'file': f'{name}-trajectory.bin',
            'frameCount': r['frameCount'],
            'timestepNs': r['timestepNs'],
            'totalTimeNs': r['totalTimeNs'],
        }
        meta['receptor'][name] = r['receptor']
        meta['gprotein'][name] = r['gprotein']
        meta['membrane'][name] = r['membrane']

    meta['receptor']['sharedMap'] = shared_map

    meta_path = OUT_DIR / 'protein-meta.json'
    with open(str(meta_path), 'w') as f:
        json.dump(meta, f, indent=2)
    meta_size = meta_path.stat().st_size / 1024
    print(f'  Wrote protein-meta.json: {meta_size:.1f} KB')

    # Write mpro-static.json
    if mpro_data:
        mpro_path = OUT_DIR / 'mpro-static.json'
        with open(str(mpro_path), 'w') as f:
            json.dump(mpro_data, f, indent=2)
        mpro_size = mpro_path.stat().st_size / 1024
        print(f'  Wrote mpro-static.json: {mpro_size:.1f} KB')

    # Validation plot
    generate_validation_plot(
        results['gq'], results['gi'],
        VAL_DIR / 'protein-pipeline-validation.png'
    )

    # Summary
    print(f'\n{"="*60}')
    print('PIPELINE COMPLETE')
    print(f'{"="*60}')
    print(f'  Gq: {results["gq"]["frameCount"]} frames, '
          f'{results["gq"]["receptor"]["residueCount"]} receptor residues, '
          f'{results["gq"]["gprotein"]["totalResidues"]} G-protein residues')
    print(f'  Gi: {results["gi"]["frameCount"]} frames, '
          f'{results["gi"]["receptor"]["residueCount"]} receptor residues, '
          f'{results["gi"]["gprotein"]["totalResidues"]} G-protein residues')
    print(f'  Shared map: {shared_map["count"]} residues')
    if mpro_data:
        for c in mpro_data['chains']:
            print(f'  MPro chain {c["name"]}: {c["residueCount"]} residues, '
                  f'{c["totalGuidePoints"]} guide points')
    print(f'\n  Output files in {OUT_DIR}/')
    for p in sorted(OUT_DIR.glob('*')):
        print(f'    {p.name}: {p.stat().st_size / 1024:.1f} KB')
