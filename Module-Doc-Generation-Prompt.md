# Module Documentation Generation Prompt

**Purpose:** a reusable prompt to generate, for any single MES module, the same pair of
consultant-facing deliverables produced for the whole system in session 30:

1. a **Solution Capability & Fit-Gap** design doc (Word) + fillable matrix (Excel), and
2. a **Functional Specification Document** (Word),

all in plain, consultant-friendly language, reproducible from a code-generated data module.

**Exemplars to match (already in the repo):** `docs/design/MES-Capability-FitGap-Design.docx`,
`docs/design/MES-Capability-FitGap-Matrix.xlsx`, `docs/design/MES-Functional-Specification.docx`
and their generators (`gen_capability_fitgap.py` + `fitgap_data.py`, `gen_functional_spec.py`
+ `fsd_content.py`). New module docs should look and read identically — just scoped to one module.

**How to use:** copy the prompt below, fill `<MODULE>` / `<MODULE SCOPE>` / `<KEY SOURCES>`,
and run it once per module. Module anchors already in mind:
- **Allocator** — *reserving planned output to customer orders and reconciling actual-vs-plan.*
  Survey the allocation engine (order reservations, reconcile-actual-vs-plan, cross-order draw,
  produced-attribute deviation → auto-release) plus the planned material-allocator screen
  (backlog — expect several Roadmap rows).
- **QA** — *quality control across the plant.* Survey the hold/quarantine mechanism, Heat
  Generation, and today's produced-attribute checks; then the sampling / inspection / NCR /
  test-certificate scope from the gap analysis (largely Roadmap).

---

## The prompt

```
You are documenting ONE module of the Bluemingo MES: <MODULE>  (e.g. Allocator / QA).
Module scope (one-liner to anchor you): <MODULE SCOPE>
Primary sources to survey: the codebase (services/controllers/migrations/frontend for this
module), docs/specs/MES-Specifications.md, docs/specs/MES-CODEGEN-CONTEXT.md,
docs/analysis/Ambica-PC-UI-Gap-Analysis-v1.md, and any module-specific docs.

Produce THREE artifacts in docs/design/, mirroring the existing MES-wide deliverables exactly
in structure, styling, taxonomy and tone:
1. <MODULE>-Capability-FitGap-Design.docx  — the design doc (Part A capability reference +
   Part B requirement-coverage method + a sample matrix).
2. <MODULE>-Capability-FitGap-Matrix.xlsx  — the fillable workbook: Sheet 1 "Requirement
   Coverage" (BRD-driven, Coverage dropdown Fully/Partially/Gap + Mapped-capability-ID +
   Priority/Module dropdowns + ~200 blank rows), Sheet 2 "Capability Catalog" (all capabilities
   with stable IDs), Sheet 3 "Legend" (+ Glossary).
3. <MODULE>-Functional-Specification.docx — the FSD: purpose/scope/audience/glossary → system
   context → per-sub-area functionality (overview + numbered functional requirements
   FR-<AREA>-NN + business rules + workflows) → data-model summary → consolidated business-rule
   catalogue → non-functional characteristics → assumptions/constraints/dependencies.

METHOD (do this in order)
1. Survey the actual build first — never invent. Launch a few parallel Explore/general-purpose
   agents, each owning a slice of <MODULE> (engine/logic · config & mapping levers · data &
   integration · UI & reporting). Each returns capabilities as records:
   Capability · plain description · Delivered via (Config|Mapping|Master|Code|NFR|Domain) ·
   Maturity (Built|Partial|Roadmap) · Evidence (file:line / spec §) · Tailoring note.
   Flag every partial/stub/roadmap item honestly — those become the Gap-scoring rows.
2. Synthesize the findings into a capability catalogue grouped into coherent sub-areas (each
   capability gets a stable ID like ALC-01). Keep the whole build in scope.
3. Generate reproducibly. COPY the existing generators as the rendering framework and swap in
   new data modules — do NOT re-derive styling:
   - gen_capability_fitgap.py + a new <module>_fitgap_data.py (AREAS list).
   - gen_functional_spec.py + a new <module>_fsd_content.py (BLOCKS list).
   Generators must be self-contained (write outputs next to themselves) so the docs regenerate
   in-repo by editing the data module and re-running.
4. Verify before publishing: run an automated jargon scan and confirm zero internal terms in
   the fit-gap catalogue and that rule codes in the FSD appear ONLY in the Business-Rules
   catalogue + one explanatory note; print the counts (areas / capabilities / FRs).
5. Publish & housekeep: put all files in docs/design/; add rows to docs/DOCUMENT-MAP.md; update
   .claude/TASKS.md + documents/Development-Session-Log.md; commit + push. .gitignore already
   covers __pycache__/ and Office ~$ lock files.

HARD CONSTRAINTS (non-negotiable — this is what makes the docs usable)
- Plain, consultant-friendly language. No internal jargon in prose: write "planned batch" not
  "SM/SMC", "order reservation" not "SMA", "recipe" not "BOM", "balance check" not "IC5a",
  "automatic numbering" not "PC11a cascade". No class names or migration IDs in consultant-
  facing text. Add a plain-language Glossary to every artifact. Keep internal rule codes ONLY
  in the FSD's Business-Rules catalogue, prefaced by a note saying "read the plain summaries,
  ignore the codes".
- BRD-driven fit-gap. The client's requirement doc/BRD is the driving axis: the consultant
  enters each requirement, maps it to a capability ID, and marks Coverage (Fully / Partially /
  Gap). The capability catalogue is the reference the requirements map against.
- Evidence-based & honest. Every capability is grounded in the code/spec (read, don't assume).
  Mark maturity truthfully (Built / Partial / Roadmap) and surface real gaps. If something
  (e.g. authentication/RBAC) isn't visible in the survey, flag it as a deployment/roadmap
  concern to confirm — never over-claim it as built.
- Reproducible & living. Data lives in the *_data.py / *_content.py module; edit + re-run to
  regenerate. Landscape for the fit-gap tables; portrait for the FSD; navy headings, status
  colour chips (Built=green / Partial=yellow / Roadmap=orange), shaded consultant-fill columns.

Deliver the three files, the jargon-scan result, and a short summary of the coverage
distribution (Built/Partial/Roadmap) and the top gaps for <MODULE>.
```

---

## Taxonomy reference (keep consistent across modules)

| Axis | Values |
|------|--------|
| **Coverage** (consultant sets per BRD requirement) | Fully Supported · Partially Supported · Gap |
| **Platform status** (pre-filled per capability) | Built · Partial · Roadmap |
| **How delivered** (the tailoring lever) | Config · Mapping · Master · Code · NFR · Domain |

**Stable IDs:** `<AREA>-NN` (e.g. `ALC-01`, `QA-07`) so BRD requirements can reference capabilities.

**Companion analyses** to cite: `docs/analysis/Ambica-PC-UI-Gap-Analysis-v1.md` (phased roadmap),
`docs/design/MES-Capability-FitGap-*` (the whole-system baseline these module docs specialise).
