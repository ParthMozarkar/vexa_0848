# Testing Patterns

**Analysis Date:** 2026-05-13

## Test Frameworks

### Frontend (TypeScript)

**Runner:** Vitest
- Config: `frontend/vitest.config.ts`
- Environment: `node`
- Globals: enabled (no need to import `describe`/`it`/`expect` per file — but current test files import them explicitly anyway)
- Path alias `@/` → `frontend/src/` is configured in the vitest resolver

**Assertion Library:** Vitest's built-in `expect` (Jest-compatible API)

**Run Commands:**
```bash
# From frontend/ directory
npx vitest                    # Run all tests (watch mode)
npx vitest run                # Single run (CI mode)
npx vitest run --coverage     # Coverage report
npx vitest src/lib/__tests__  # Run specific directory
```

### Backend (Python)

**Runner:** pytest 9.0.2
- No `pytest.ini`, `setup.cfg`, or `pyproject.toml` found — pytest uses default discovery
- `sys.path.insert(0, ...)` used in test files to resolve imports from the backend root

**Assertion Library:** pytest built-in `assert`, `pytest.approx` for floats

**Run Commands:**
```bash
# From backend/ directory
pytest tests/                        # Run all tests
pytest tests/test_archetype_selector.py  # Single file
pytest -v tests/                     # Verbose output
pytest -k "test_select_archetypes"   # Filter by name
```

## Test File Organization

### Frontend

**Location:** Co-located `__tests__/` subdirectory within the module being tested
```
frontend/src/lib/
├── fitEngine.ts
├── morphEngine.ts
└── __tests__/
    ├── fitEngine.test.ts
    └── morphEngine.test.ts
```

**Naming:** `[moduleName].test.ts` — matches the source file name exactly.

**Coverage:** Only `src/lib/` pure utility functions are currently tested. API routes, components, hooks, and store are not tested.

### Backend

**Location:** `backend/tests/` — separate top-level directory
```
backend/
├── pipeline/
│   ├── body_generator.py
│   ├── archetype_selector.py
│   └── face_texture.py
└── tests/
    ├── test_body_generator.py
    ├── test_archetype_selector.py
    └── test_pipeline.py
```

**Naming:** `test_[module].py` — matches Python pytest discovery convention.

## Test Structure

### Frontend (Vitest)

Tests use explicit imports of `describe`, `it`, `expect` from `vitest` (even though globals are enabled in config):

```typescript
import { describe, it, expect } from 'vitest';
import { getFitRecommendation, getFitScore } from '../fitEngine';

describe('getFitScore', () => {
  it('returns 95 for True to size', () => {
    expect(getFitScore('True to size')).toBe(95);
  });

  it('returns 80 for unknown labels', () => {
    expect(getFitScore('Unknown')).toBe(80);
  });
});

describe('getFitRecommendation', () => {
  const sizeChart = [
    { size: 'S', chest: 86, waist: 70, hips: 90 },
    { size: 'M', chest: 92, waist: 76, hips: 96 },
    { size: 'L', chest: 98, waist: 82, hips: 102 },
  ];

  it('recommends M for average measurements', () => {
    const result = getFitRecommendation({ chest: 92, waist: 76, hips: 96 }, sizeChart as any);
    expect(result.recommendedSize).toBe('M');
    expect(result.fitLabel).toBe('True to size');
  });
});
```

**Patterns:**
- One `describe` block per exported function under test
- `it` descriptions are human-readable complete sentences
- Inline test fixture data defined as `const` inside the `describe` block
- `as any` cast used when passing partial fixture data that doesn't satisfy full type signatures

### Backend (pytest)

Two patterns are mixed:

**Pattern 1 — Module-level functions** (in `test_archetype_selector.py`):
```python
import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pipeline.archetype_selector import ARCHETYPES, select_archetypes

def test_archetype_catalog():
    assert len(ARCHETYPES) == 10

def test_select_archetypes_top_k_weights_sum():
    out = select_archetypes([0.0] * 10, top_k=3)
    assert len(out) == 3
    s = sum(item["weight"] for item in out)
    assert s == pytest.approx(1.0, rel=1e-5)
```

**Pattern 2 — Class-based with fake objects** (in `test_pipeline.py`):
```python
class FakeMeasurements:
    height = 170.0
    chest = 92.0
    waist = 78.0
    hips = 96.0

def test_measurements_to_betas_shape():
    betas = measurements_to_betas(FakeMeasurements())
    assert betas.shape == (1, 10)
```

**Patterns:**
- No `setUp`/`tearDown` — fixtures constructed inline or as class attributes
- `pytest.approx` for all floating-point comparisons
- `sys.path.insert` at the top of each file for import resolution (no conftest.py)

## Mocking

### Frontend

No mocking framework is used in current frontend tests. Tests cover only pure functions with no I/O or side effects (`fitEngine.ts`, `morphEngine.ts`). No `vi.mock`, `vi.fn`, or `vi.spyOn` patterns are in use.

When mocking becomes necessary (e.g., testing API routes or Supabase calls), use:
```typescript
import { vi } from 'vitest';
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
```

### Backend

`unittest.mock.patch` is used via context manager in `test_pipeline.py`:

```python
from unittest.mock import patch

def test_face_texture_output_shape():
    fake_img = _make_fake_face_image()

    with patch('pipeline.face_texture.download_image', return_value=fake_img), \
         patch('pipeline.face_texture.mp') as mock_mp:
        mock_mp.solutions.face_mesh.FaceMesh.return_value.__enter__ = lambda s: s
        mock_mp.solutions.face_mesh.FaceMesh.return_value.__exit__ = lambda *a: None
        mock_mp.solutions.face_mesh.FaceMesh.return_value.process = lambda x: FakeMediapipeResult()

        result = extract_face_texture("http://fake.url/photo.jpg", output_size=256)
        assert result.shape == (256, 256, 3)
```

**What to mock:** External I/O (HTTP downloads, file system), ML framework context managers (mediapipe), GPU/model inference
**What NOT to mock:** Pure computational functions — test these directly

## Fixtures and Factories

### Frontend

Test data is defined as inline `const` inside `describe` blocks — no shared fixture files:

```typescript
describe('getFitRecommendation', () => {
  const sizeChart = [
    { size: 'S', chest: 86, waist: 70, hips: 90 },
    { size: 'M', chest: 92, waist: 76, hips: 96 },
    { size: 'L', chest: 98, waist: 82, hips: 102 },
  ];
  // used across all `it` blocks in this describe
});
```

**Location:** Inline only — no fixture files or factory functions exist yet.

### Backend

**Inline class fixtures** for object-style dependencies:
```python
class FakeMeasurements:
    height = 170.0
    chest = 92.0
    waist = 78.0
    hips = 96.0
    inseam = 80.0
    shoulder_width = 44.0
```

**Inline list fixtures** for parametric cases (`test_body_generator.py`):
```python
CASES = [
    { "height": 165, "chest": 85, "waist": 70, "hips": 92, "inseam": 74, "shoulder_width": 38 },
    { "height": 180, "chest": 100, "waist": 85, "hips": 102, "inseam": 82, "shoulder_width": 44 },
    # ...
]
```

**Helper image factories** for CV tests:
```python
def _make_fake_face_image() -> np.ndarray:
    """Create a synthetic 300x300 BGR image with a simple face-like oval."""
    img = np.ones((300, 300, 3), dtype=np.uint8) * 200
    cv2.ellipse(img, (150, 150), (80, 100), 0, 0, 360, (180, 140, 120), -1)
    return img
```

**Location:** All fixtures are defined within the test file that uses them. No shared `conftest.py`.

## Conditional Test Skipping (Backend)

Hardware-dependent tests use `pytest.mark.skipif` to skip when model files are absent:

```python
_NEUTRAL_MODEL = Path(__file__).resolve().parent.parent / "models" / "smplx" / "SMPLX_NEUTRAL.npz"

requires_smplx_files = pytest.mark.skipif(
    not _NEUTRAL_MODEL.is_file(),
    reason=f"SMPL-X weights missing: expected {_NEUTRAL_MODEL}",
)

@requires_smplx_files
def test_mesh_generation():
    ...
```

Use this pattern for any test requiring downloaded model weights, GPU, or external services.

## Coverage

**Requirements:** None enforced — no coverage thresholds are configured.

**View Coverage:**
```bash
# Frontend
npx vitest run --coverage

# Backend
pytest --cov=pipeline tests/
```

## Test Types

**Unit Tests (all current tests):**
- Frontend: Pure function logic in `src/lib/` — fit scoring, morph blending, vector math
- Backend: Pipeline functions with controlled inputs — archetype selection, beta generation, mesh export

**Integration Tests:** Not present. No tests for API routes, database interactions, or cross-service flows.

**E2E Tests:** Not present. No Playwright, Cypress, or similar framework configured.

## Common Patterns

**Determinism testing (frontend):**
```typescript
it('is deterministic — same input always yields same output', () => {
  const blend1 = computeMorphBlend([0.5, 0], archetypes, 2);
  const blend2 = computeMorphBlend([0.5, 0], archetypes, 2);
  expect(blend1.archetypeIds).toEqual(blend2.archetypeIds);
  blend1.weights.forEach((w, i) => expect(w).toBeCloseTo(blend2.weights[i]));
});
```

**Boundary / edge case testing (frontend):**
```typescript
it('clamps k to available archetypes without throwing', () => {
  const archetypes = [{ id: 'only', glbUrl: '', betas: [0, 0] }];
  const blend = computeMorphBlend([0, 0], archetypes, 10); // k > length
  expect(blend.archetypeIds.length).toBe(1);
  expect(blend.weights[0]).toBeCloseTo(1.0);
});
```

**Exception testing (frontend):**
```typescript
it('throws for mismatched lengths', () => {
  expect(() => l2SquaredDistance([1, 2], [1, 2, 3])).toThrow();
});

it('handles missing optional measurements gracefully', () => {
  expect(() => getFitRecommendation({ chest: 92 }, sizeChart as any)).not.toThrow();
});
```

**Floating-point comparisons (frontend):**
```typescript
expect(sum).toBeCloseTo(1);          // default precision
blend1.weights.forEach((w, i) => expect(w).toBeCloseTo(blend2.weights[i]));
```

**Floating-point comparisons (backend):**
```python
assert s == pytest.approx(1.0, rel=1e-5)
assert abs(total - 1.0) < 1e-5
```

**File output testing (backend):**
```python
with tempfile.TemporaryDirectory() as tmp:
    save_path = os.path.join(tmp, "texture.png")
    extract_face_texture("http://fake.url/photo.jpg", save_path=save_path)
    assert os.path.exists(save_path)
    loaded = cv2.imread(save_path)
    assert loaded is not None
```

## Test Coverage Gaps

The following areas have zero test coverage:

- All Next.js API route handlers (`src/app/api/`) — auth, tryon, upload, keys, size, studio
- `src/lib/apiKeyMiddleware.ts` — `validateApiKey`, `withApiKey`, `requireApiKey`
- `src/lib/rateLimit.ts` and `src/lib/ipRateLimit.ts` — IP rate limiting logic
- `src/lib/supabase.ts`, `src/lib/r2.ts`, `src/lib/admin.ts` — external service wrappers
- `src/lib/measurementUtils.ts` — unit conversion and validation functions (no test file)
- `src/lib/clothingCategory.ts` — category mapping
- All React components (`src/components/`)
- All custom hooks (`src/hooks/`)
- All Zustand stores (`src/store/`)
- Backend `pipeline/face_texture.py` — only partially covered via mocked integration test
- Backend `main.py` — FastAPI endpoints entirely untested

---

*Testing analysis: 2026-05-13*
