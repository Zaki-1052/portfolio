# MetaENCODE

**Discover related ENCODE datasets and visualize dataset similarity.**

MetaENCODE is a Streamlit web application that helps researchers discover related [ENCODE](https://www.encodeproject.org/) biological datasets through metadata-driven similarity scoring. It uses SBERT text embeddings, categorical/numeric feature encoding, and cosine similarity to rank and recommend datasets from across ~27,000 ENCODE experiments.

> **DS3 x UBIC Collaborative Project** at UC San Diego.

![MetaENCODE UI](MetaENCODE.jpeg)

## Features

- **Faceted Search** -- Filter ENCODE experiments by assay type, organism, biosample, histone mark/target, life stage, lab, and replicate counts. Enter an accession directly (e.g. `ENCSR000AKS`) or search by description with automatic spell correction.
- **Similarity Ranking** -- Select any experiment as a seed and retrieve the most similar datasets, ranked by a multi-modal similarity score that blends text, categorical, and numeric features with configurable weights.
- **Interactive Visualization** -- Explore the embedding space via 2D scatter plots (UMAP, PCA, t-SNE) colored by assay type, organism, organ system, cell type, germ layer, body system, lab, or similarity score.

## Architecture

```
ENCODE REST API (encodeproject.org)
    |
EncodeClient          -- rate-limited 10 req/sec, paginated, nested JSON parsing
    |
MetadataProcessor     -- text cleaning, missing value imputation, ontology mapping
    |
EmbeddingGenerator    -- SBERT all-MiniLM-L6-v2 -> 384-dim text vectors
    |
FeatureCombiner       -- weighted concatenation -> ~437-dim combined vectors
    |
CacheManager          -- atomic pickle I/O in data/cache/
    |
SimilarityEngine      -- cosine similarity via scikit-learn NearestNeighbors
    |
Streamlit UI          -- 3 tabs: Search & Select | Similar Datasets | Visualize
```

**Feature weights** (default): text 50%, assay type 20%, organism 15%, cell type 10%, lab 3%, numeric 2%. Weights are applied as `sqrt(weight)` scaling on sub-vectors so cosine similarity contributions remain proportional.

## Getting Started

### Prerequisites

- Python 3.10+
- ~2 GB disk for full precomputed cache (embeddings + visualization coordinates)

### Installation

```bash
# Clone the repository
git clone https://github.com/vanshika-s/MetaEncode.git
cd MetaEncode

# Create virtual environment and install dependencies
bash scripts/setup.sh

# Or manually:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Precompute Embeddings (required before first run)

```bash
# Quick test (~100 experiments)
python scripts/precompute_embeddings.py --limit 100

# Medium (~1000 experiments)
python scripts/precompute_embeddings.py --limit 1000

# Full dataset (~27,000 experiments)
python scripts/precompute_embeddings.py --limit all --batch-size 64

# Force recompute from scratch
python scripts/precompute_embeddings.py --limit 1000 --refresh
```

### Precompute Visualizations (optional, recommended)

Precomputes PCA, t-SNE, and UMAP coordinates so the Visualize tab loads instantly:

```bash
python scripts/precompute_visualizations.py
```

A SLURM job script (`scripts/precompute.sb`) is included for HPC environments (tested on SDSC Expanse: 8 CPUs, 40 GB RAM, 6-hour limit).

### Run the Application

```bash
streamlit run app.py
```

The app opens at [http://localhost:8501](http://localhost:8501).

## Project Structure

```
MetaENCODE/
├── app.py                              # Entry point
├── requirements.txt                    # Python dependencies
├── scripts/
│   ├── setup.sh                        # Virtual environment setup
│   ├── precompute_embeddings.py        # Fetch + embed + cache pipeline
│   ├── precompute_visualizations.py    # PCA / t-SNE / UMAP coordinate cache
│   ├── fetch_encode_facets.py          # Regenerate vocabulary JSON from ENCODE API
│   └── precompute.sb                   # SLURM job script for HPC
├── src/
│   ├── api/                            # ENCODE REST API client with rate limiting
│   ├── ml/                             # Embeddings, feature combination, similarity engine
│   ├── processing/                     # Text cleaning, categorical/numeric encoding
│   ├── ui/                             # Streamlit components, sidebar, tabs, session state
│   ├── utils/                          # Cache manager, spell check, selection history
│   └── visualization/                  # Dimensionality reduction + Plotly plots
├── data/
│   ├── encode_facets_raw.json          # Vocabulary source (27,398 experiments)
│   └── cache/                          # Precomputed pickle files (gitignored)
└── tests/                              # pytest suite (~708 tests)
```

## Testing

```bash
# Run all tests
python -m pytest tests/ -v

# With coverage report
python -m pytest tests/ --cov=src --cov-report=term-missing

# Single module / file / test
python -m pytest tests/test_ml/ -v
python -m pytest tests/test_ml/test_embeddings.py -v
python -m pytest tests/test_ml/test_embeddings.py::test_name -v
```

> Some tests require `sentence-transformers` (PyTorch) and `umap-learn`. Without these, ~30 tests are skipped.

## Code Quality

```bash
black src/ tests/ scripts/ app.py       # Format
isort src/ tests/ scripts/ app.py       # Sort imports
flake8 src/ tests/                      # Lint
mypy src/                               # Type check
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | [Streamlit](https://streamlit.io/) + [Plotly](https://plotly.com/python/) |
| Text Embeddings | [sentence-transformers](https://www.sbert.net/) (all-MiniLM-L6-v2, 384-dim) |
| ML / Similarity | [scikit-learn](https://scikit-learn.org/) NearestNeighbors (cosine) |
| Dimensionality Reduction | PCA, t-SNE (scikit-learn), [UMAP](https://umap-learn.readthedocs.io/) |
| Spell Correction | [symspellpy](https://github.com/wolfgarbe/SymSpell) + [jellyfish](https://github.com/jamesturk/jellyfish) |
| Data Source | [ENCODE REST API](https://www.encodeproject.org/help/rest-api/) (no auth required) |

## How It Works

1. **Data Ingestion** -- `EncodeClient` fetches experiment metadata from the ENCODE REST API with rate limiting (10 req/sec) and pagination support.

2. **Processing** -- `MetadataProcessor` cleans text fields, imputes missing values, and maps biosamples to ontology categories (organ system, cell type, germ layer, body system) using hierarchical mappings from `encode_facets_raw.json`.

3. **Embedding** -- `EmbeddingGenerator` encodes combined text descriptions into 384-dimensional vectors using the all-MiniLM-L6-v2 SBERT model.

4. **Feature Combination** -- `FeatureCombiner` concatenates text embeddings with one-hot categorical encodings and min-max scaled numeric features, applying `sqrt(weight)` scaling to each sub-vector.

5. **Similarity Search** -- `SimilarityEngine` uses scikit-learn's `NearestNeighbors` with brute-force cosine distance to find the most similar experiments to any query.

6. **Visualization** -- `DimensionalityReducer` projects the high-dimensional embeddings into 2D via PCA, t-SNE, or UMAP. `PlotGenerator` renders interactive Plotly scatter plots with configurable color mappings.

## Vocabulary Management

All ENCODE vocabularies (assay types, organisms, biosamples, hierarchical organ/cell mappings) are loaded from `data/encode_facets_raw.json` via `src/ui/vocabularies.py`. To regenerate:

```bash
python scripts/fetch_encode_facets.py
```

Never hardcode vocabulary lists -- always regenerate from the ENCODE API.

## License

This project is licensed under the [MIT License](LICENSE).
