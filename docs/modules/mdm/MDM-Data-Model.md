# JSW MES v2 — Master Data Management: data-model design (Phase 2, pass 1)

**Date:** 2026-09-12 · **Status:** design draft v0.1 for review · **Scope:** BRD §15 / epic E12 (46 stories) and the 49 reviewed points of `Master Data Management__Functional_gap (Bluemingo review).xlsx`; the 24 design items of area 1 in the Phase 2 backlog.
**Basis:** the live MES PC + QA database (`bluemingo_mes_ambica`, 223 tables), the live Allocator database (583 tables) and the delivered QA design (`docs/qa-module/Data-Model.md` §1–§27). Every "exists" claim below was checked against the live catalogue on 2026-09-12; nothing is taken from product documentation.
**Scope rules in force (JSW/Bluemingo, 2026-09-12):** platform foundations P1–P6 are deferred — this design names the *content* they will consume (events, approval points, upload sheets, effective-dating columns) and flags the dependency; integration is designed on the MES side only; **PSN is an extension of the TDC record (D-04)**; every other parked decision is designed under a stated assumption and flagged `[assumption — D-nn]`.

---

## 0. How this design is organised

### 0.1 Ownership and landing

Three owners share the master surface. The owner decides where the DDL lives and how a change is raised (nothing inside MES PC or the Allocator is coded from the QA side — it is raised as a request item):

| Owner tag | Tables | DDL lives in | How it lands |
|---|---|---|---|
| **QA** | `mes_qc_*` | QA module Flyway (`mes-qa` repo) | This design is copied as **§28 of the QA `Data-Model.md`** (lands as **§33 in the development copy**, whose §25–§32 are used); migrations follow the dev repo's approval rule |
| **PLATFORM** | `mes_*` (non-QA) | MES PC Flyway (`Bluemingo_MES`) | Raised as request items **MDM-R-01…** in `Requests-MDM.md` (the `Requests-From-QA.md` channel pattern); never edited directly |
| **ALLOCATOR** | Allocator MySQL | Allocator repo | Raised as request items **ALC-R-01…**; the Allocator keeps its own copies and receives MES masters by the existing MES PC → MySQL sync path (the Equipment Linkage master already has a "Sync to MySQL" action) |

### 0.2 Conventions (identical to the QA Data-Model §2)

- PK `<entity>_id bigint` identity · **`+ audit tail`** = `active_status varchar(20)` · `txn_access_code varchar(50)` · `created_by bigint` · `created_date timestamptz` · `updated_by bigint` · `updated_date timestamptz` · `version_id bigint` (Hibernate optimistic lock — *not* history).
- `(Y)` = nullable. Measures `numeric(18,4)` unless stated; codes `varchar(50)`; names `varchar(255)`; enumerations via CHECK; timestamps `timestamptz`.
- **Scope key set S** (used by every rule-type master; all `(Y)`; blank = applies to all): `factory_id` FK `mes_factories` · `operation_id` FK `mes_operations` (the *unit / process step* — SMS, BRM, BLM, ABGM, Annealing, GMM, Bright Bar are operation/factory rows, never columns) · `equipment_id` FK `mes_equipments` · `material_form_id` FK `mes_material_forms` · `product_category_id` FK `mes_product_category_input` · `sku_id` FK `mes_skus` · `shape varchar(30)` · `size_min` / `size_max numeric(12,3)` · `grade varchar(50)` · `grade_series varchar(30)` · `customer_id` FK `mes_customers` · **`tdc_id` FK `mes_tdc_input` — the PSN axis (D-04)**. Resolution rule **R-S**: among active rows whose set keys all match (blank matches anything), take the lowest `priority`, then the most keys matched. Same rule as `mes_qc_path_rule` (§26.1) and the QA screen-policy scoping.
- **Effective dating columns `effective_from date` (Y) · `effective_to date` (Y)** are added to every new master now (additive, cheap) so P3 does not re-migrate twenty tables later. Until P3 lands they are informational: **`active_status` governs** and resolution is "as of now". `[platform P3]`
- **Approval:** masters marked *maker-checker* list the checker role by name; enforcement is P1 `[assumption — D-03: roles named, not enforced]`.
- **Upload:** every master has an upload sheet (Annex A) on the shared Excel-import engine (MES PC `UploadHelperClass` on 9 screens; QA `mes_qc_import_batch`). Generalising the engine to every master is P3; the sheet definitions are content.

### 0.3 Reuse before create — the patterns this design copies

| Existing (live) | Rows | Reused for |
|---|---|---|
| `Mst_Allocation_Matrix` (from-form → to-form, priority, yield, crop) — Allocator | 1,624 | Product Form Conversion Rules shape (§2.3) |
| `Mst_Compatible_Value` (directional permitted substitution) — Allocator | 0 (structure) | Swap compatibility values (§3.9) |
| `mst_planning_length_rules` (shape × size category × order length → planning length, priority, no. of rolled lengths) — Allocator | 20 | Length Master derivation shape (§3.1) |
| `Mst_Length_Master` — Allocator | 7,905 (7,835 with a range; group/type/tolerance columns all empty) | Finished-length vocabulary migration (§3.1) |
| `mst_category_rolling_size` (mill × rolling type × shape × size band) — Allocator; empty twin `mes_category_rolling_size` in MES PC | 28 / 0 | Section → mill mapping under Family & Section Load (§3.4) |
| `mes_batch_number_generation_config` (per-operation numbering + `config_json`) · `mes_dispatch_series` (prefix / date part / separator / padding) | 2 / 2 | PSN number format (§4.10), batch derivation numbering (§4.11) |
| `mes_consumable_operation_map` (consumable × equipment × operation → rate, basis) | 4 | Ferro-alloy norm shape (§3.6) |
| `mes_process_attributes` (process × operation × attribute → target, lower, upper, captured-from) | 6 | Process Parameter master — extended, not replaced (§3.7) |
| `mes_equipment_speed` (+ attribute-scoped rows) · `mes_equipments.batch_min_qty / batch_max_qty` | 850 / 99 | Annealing production rate and furnace capacity (§4.9) |
| `mes_delay_reasons` / `mes_hold_reasons` | 4 / 3 | Downtime reason hierarchy (§5.6) — extended |
| `mes_global_attributes` (191) + `mes_attribute_possible_value` (2,851) + Custom Master framework (`custom_master_screen/_field/_key`, `master_table_registry`) | — | Generic LOVs (§4.16) |
| `mes_qc_attachment` (polymorphic `entity_type` / `entity_id`) | 0 | Defect reference images (§4.13) |
| `mes_qc_screen_policy` (scoped key/value policies) | 58 | Scope-key convention S |
| `mes_qc_path_rule` (designed §26.1) | — | Resolution rule R-S |
| `mes_qc_tdc_ht` (HT steps per TDC) | 0 (live) | Annealing PSN master = HT cycle catalogue linked from TDC (§4.9) |

### 0.4 Live facts that shaped the design (verified 2026-09-12)

- `mes_tdc_input` holds **678 TDC headers** with the wide chemistry ranges (`mes_tdc_attr_range`, 678); the JSW extension columns (`grade`, `customer_id`, `shape`, `execution`, `htc_code`, `revision_no`…) exist but are **empty** — the PSN work in the CQ pass starts from headers + ranges, not from a populated spec.
- `mes_role` has 6 QA roles, `mes_user` 0 rows, no enforcement (P1). `mes_qc_role_screen_access` (118 rows) is the only permission matrix in the QA build.
- `mes_material_forms` (10, two duplicate sets of Heat/Billet/RCS/Rolled/FG) and `mes_product_category_input` (26 size-band categories like "16–24 Round") are the platform's product vocabulary; `mes_shape_weight_master` (13 shapes AN/BT/FB/FT/HX/RC/RO/SQ/WR…) is the shape vocabulary; `mes_grades` 185 grades in 8 series.
- `mes_qc_standard.standard_type` currently carries **PRODUCT / TEST_METHOD** (5 rows) — the "IS / customer / works" origin needed by row 27 is a *second* dimension, not a replacement.
- `mes_qc_sample.draw_position` already exists — the Front/Middle/Back vocabulary of §4.2 lands on it.
- `mes_tolerance` (MES PC, 0 rows: tolerance / description / type) is a generic tolerance label master, unrelated to dimensional tolerance bands; not touched.
- Allocator `Operation_Yield` is structure only (0 rows); `Mst_Allocation_Matrix.Total_Yield` (0.95 on the sampled rows) is what MRP actually uses today.

---

## 1. Cross-cutting decisions for MDM

| # | Decision | Rationale |
|---|---|---|
| **M-01** | **One master per concept, scoped by S — never one master per unit.** "BRM length master" and "BLM length master" are rows of one length master with different `operation_id`; "SMS / BRM / BLM / GMM / BB / ABGM yield masters" are rows of one yield master. | D0 product-agnostic; JSW's units are data. Avoids seven near-identical tables. |
| **M-02** | **PSN-wise = `tdc_id`-scoped.** Every "PSN-wise" master (process validation, ABGM, pit cooling, colour code, grinding, HT cycle, distribution list) carries `tdc_id` in S and, when the PSN revision matters, resolves through the TDC revision chain (`parent_tdc_id`, `revision_no`). | D-04 decided: PSN extends TDC; no second spec object. |
| **M-03** | **Extend before create.** `mes_process_attributes`, `mes_delay_reasons`, `mes_qc_sampling_rule`, `mes_qc_path_rule`, `mes_qc_instrument`, `mes_qc_barcode_type`, `mes_qc_notification_rule`, `mes_qc_grade_chemistry`, `mes_qc_tdc_ht`, `mes_category_rolling_size`, `mes_consumables` gain columns; new tables only where no owner-shape exists. | Fewer screens, fewer migrations, the 31 + 29 existing master screens stay the surface. |
| **M-04** | **Rule masters carry `priority` + S and resolve by R-S; vocabulary masters carry `code` / `name` only.** | One resolution routine serves every engine (path, sampling, yield, MoQ, swap, pit, process validation). |
| **M-05** | **Number generation is configuration**, modelled on `mes_dispatch_series` (mask / padding / running sequence) — PSN numbers, derived batch numbers. | Two live precedents; no code per format. |
| **M-06** | **The Allocator keeps a copy, MES is the book of record** for length, yield, section-load and swap data. Sync MES → Allocator MySQL through the existing sync path; the Allocator's hand-maintained twins become read-only after migration. | The Allocator cannot be edited from here; both products need the same numbers. |
| **M-07** | **Governance content, not console.** The master catalogue (owner department, book-of-record system, surface, upload sheet, approval, version need) is Annex B — the deferred P3 console reads it. `[D-11 parked]` | Scope decision 2026-09-12. |

---

## 2. Product & Grade masters (BRD §15.1)

### 2.1 Grade master — consolidated chemistry + mechanical view *(rows 1–2; F12.1-01, F12.1-02)* — QA
Running today: `mes_grades` (185), `mes_qc_grade_chemistry` (works chemistry per grade × element, 17 rows), `mes_qc_standard_limit` (published mechanical/chemical limits per standard × grade × characteristic). The gap is presentation, not data: no single view of a grade.

- **View `v_mdm_grade_profile`** — per `grade_code`: series, group, description · works chemistry rows (element, min / aim / max) · published limits grouped by standard (`standard_code`, characteristic, min / max / target, uom) · count of TDCs referencing the grade · active flag. Read-only; feeds the consolidated **Grade Profile** screen (mock-up `master-grade-profile.html`).
- `mes_qc_grade_chemistry` gains **`standard_id` FK `mes_qc_standard` (Y)** — the standard the works spec was derived from (row 27 needs it too).
- Precedence stays **TDC > Grade > report-only** (QA §5.9). No new table.

### 2.2 Product master with production-line mapping *(row 3; F12.2-01)* — PLATFORM, covered
`mes_skus` (13,406) + `mes_sku_attributes` + `mes_product_category_input` + `mes_process_routings` / `mes_operation_routings` and four Masters screens. **Data loading only** — JSW product catalogue and routing per line. No design change.

### 2.3 Product Form Conversion Rules *(row 4; F12.2-02; BRD 8.12, 10.9)* — PLATFORM (owner PPC / Operations)
Which form-code transition happens, on which event, and what the product code becomes. Modelled on `Mst_Allocation_Matrix` (from-form → to-form, priority).

- **`mes_form_conversion_rule`** — `rule_id` PK · `rule_code` UQ · `from_material_form_id` FK · `to_material_form_id` FK · `trigger_event varchar(30)` (QA_CLEARANCE / PRODUCTION_CONFIRMATION / GRINDING_CONFIRMATION / ORDER_TYPE_CHANGE / MANUAL) · `operation_id` FK (Y — the confirming unit) · `order_type varchar(20)` (Y) · `supply_condition varchar(50)` (Y) · `bom_level int` (Y) · `from_sku_pattern varchar(100)` (Y — e.g. `S_NBLTW`) · `to_sku_pattern varchar(100)` (Y — e.g. `S_GNDBLTW`; `{grade}`/`{size}` placeholders allowed) · `sap_executes boolean` (default true — BRD 7.6: material-code conversion is executed in SAP; MES records the intent and validates the step) · `derivation_rule_id` FK `mes_batch_derivation_rule` (Y — §4.11, how the batch identity follows) · `priority int` · `effective_from/to` · **+ audit tail**.
- Seeds (JSW, BRD 8.12): S_NBLTW→S_GNDBLTW, S_NBLMW→S_GNDBLMW, S_RBLMW→S_GNDRBLMW, S_RCSBW→S_GNDRCSBW on GRINDING_CONFIRMATION; gross→net→G&D billet on QA_CLEARANCE.
- Consumers: SMS final clearance / UD (BRD 8.11), ABGM confirmation (8.12), post-clearance re-inspection (10.9 — the new product code re-enters the path matrix §3.3), charging validation (a batch may only be charged into a step its current code allows; forced-override prompt = a privileged action, P1).

### 2.4 Plant & facility master *(row 5; F12.3-01)* — PLATFORM, covered
`mes_factories` (5) → `mes_processes` → `mes_operations` (41) → `mes_equipments` (99) → `mes_secondary_equipments`. JSW Salem's units (SMS, BRM, BLM, ABGM, Annealing, GMM, Bright Bar, M&M Lab) are **factory / process / operation rows** — data loading. `mes_equipments.equipment_type` carries the machine class; pits (§3.11) and furnaces (§4.9) are equipment rows.

### 2.5 PSN Product Type Matrix *(row 6; F12.3-02 dup-1; BRD 4.2.1 F1.1-11)* — QA
The 11 product types (Bar, Wire Rod Coil, RCS, Flat, Hex Bar, Hex Coil, Annealed WRC, Annealed Bar, Bright Bar, HT Bright Bar, Grinding Media — data rows) mapped to PSN format codes, applicable input sections, rolling type and market; **must be populated before a PSN can be created** (validation on the PSN wizard, CQ pass).

- **`mes_qc_psn_product_type`** — `product_type_id` PK · `code` / `name` UQ · `material_form_id` FK (Y — platform form the type maps to) · `product_category_id` FK (Y) · `rolling_type varchar(20)` (Y — SINGLE / DOUBLE / COIL … data) · `market varchar(20)` (DOMESTIC / EXPORT / ALL) · `sequence_no` · `description` · `effective_from/to` · **+ audit tail**.
- **`mes_qc_psn_product_type_section`** — `id` PK · `product_type_id` FK · `shape varchar(30)` · `size_min` / `size_max numeric(12,3)` · `input_section varchar(50)` (Y — cast size code, e.g. 160 sq / 200 sq) · **+ audit tail**. *(Applicable input sections per type.)*
- **`mes_qc_psn_product_type_format`** — `id` PK · `product_type_id` FK · `psn_number_format_id` FK `mes_qc_psn_number_format` (§4.10) · `is_default boolean` · **+ audit tail**.
- **`mes_qc_psn_product_type_attribute`** — `id` PK · `product_type_id` FK · `psn_attribute_id` FK `mes_qc_psn_attribute` (§4.10) · `is_applicable boolean` · `is_mandatory boolean` (Y — overrides the attribute default) · `sequence_override int` (Y) · **+ audit tail**. *(Drives wizard field visibility per product type.)*

### 2.6 Users & Roles with department mapping; Super-user role *(rows 7–8; F12.4-01, F12.4-02)* — PLATFORM `[platform P1 — assumption D-03]`
Enforcement, Keycloak and maker-checker are P1. The **master-data content** is designed now so P1 has something to enforce:

- **`mes_department`** — `department_id` PK · `code` / `name` UQ · `parent_department_id` FK (Y) · `factory_id` FK (Y) · `head_user_id bigint` (Y) · **+ audit tail**. *(SMS, BRM, BLM, PPC, Customer Quality, SMS QA, Mills QA, M&M Lab, Roll Shop, Dispatch — data.)*
- `mes_user` gains **`department_id` FK (Y)** · `employee_no varchar(30)` (Y) · `designation varchar(100)` (Y). `mes_role` gains **`is_super_user boolean`** (default false) · `department_id` FK (Y — the department a role belongs to, blank = cross-department).
- **`mes_privileged_action`** — `action_id` PK · `action_code` UQ (e.g. ORDER_MASS_HOLD, ORDER_MASS_RELEASE, CHEMISTRY_DEVIATION_DECISION, PATH_OVERRIDE, SWAP_APPROVE, FORCED_CHARGE_OVERRIDE, MASTER_APPROVE) · `name` · `screen_code varchar(50)` · `description` · **+ audit tail**; **`mes_role_privileged_action`** — `id` PK · `role_id` FK · `action_id` FK · **+ audit tail**. The Allocator's `mst_screen_action_permission` (screen + action + principal, 17 rows) is the proven shape; this is its role-keyed form. The QA `mes_qc_role_screen_access` (view/create/edit/delete/approve per screen, 118 rows) stays for screen-level rights.
- Naming rule: role codes used by notification rules (§25.4 `recipient_role`), inspector master (§4.6) and approval chains are **`mes_role.role_code` values** — one vocabulary.

---

## 3. Process & Planning masters (BRD §15.2)

### 3.1 Length master — BRM / BLM with Primary / Alternate 1 / Alternate 2 *(row 9; F12.5-01, F12.5-02; BRD 7.4 LEN-001…005, BRM-001, BLM-012)* — PLATFORM (owner PPC)
What exists: the Allocator's `Mst_Length_Master` is a **finished-length code list** (7,905 rows; only `FG_Length_Code`, `Length_Range`, `Length_Min/Max` populated; group / type / tolerance columns all NULL; ranges mixed in metres and millimetres) and `mst_planning_length_rules` (20 rows) derives a planning (rolled) length from shape × size category × ordered length with `Priority` and `No_of_Rolled_Length` — the alternates concept in embryo. Neither models input size × rolling size × finished length → rolled lengths, so the JSW master is new, with the Allocator data migrated as vocabulary.

- **`mes_length_master`** — `length_master_id` PK · `operation_id` FK (**the mill** — BRM / BLM rows) · `material_form_id` FK (Y — input form: billet / bloom) · `input_shape varchar(30)` · `input_size numeric(12,3)` (cast/input section, mm) · `output_shape varchar(30)` · `output_size numeric(12,3)` (rolling size, mm) · `sku_id` FK (Y — material code / product type when the rule is code-specific) · `grade_series varchar(30)` (Y) · `finished_length_mm numeric(12,2)` (customer-required finished length) · `finished_length_id` FK `mes_qc_length_master` (Y — the QA saleable-length vocabulary §25.5, when the length is a standard one) · **`rolled_length_primary_mm numeric(12,2)`** · **`rolled_length_alt1_mm`** (Y) · **`rolled_length_alt2_mm`** (Y) · `pieces_per_rolled_length int` (Y) · `length_tolerance_mm numeric(9,2)` (Y — e.g. ±100 for soft-match at allocation, BRD MAT-003) · `market_type varchar(20)` (Y — ALL / EXPORT / LOCAL, as in the planning rules) · `derivation varchar(20)` (UPLOADED / CALCULATED) · `priority int` · `effective_from/to` · **+ audit tail**. UQ (`operation_id`, `input_shape`, `input_size`, `output_shape`, `output_size`, `finished_length_mm`, `sku_id`, `market_type`).
- **Rules:** R-LEN-01 the casting plan resolves the row by (mill, output section, finished length, grade/PSN) and **pre-selects Primary**; the scheduler may switch to Alt-1 / Alt-2 with a reason (LEN-003/004). R-LEN-02 billets per cast = floor(cast length ÷ selected rolled length); last-piece variance is *not* constrained by the master (LEN-005, open item stays open). R-LEN-03 BRM/BLM auto-map the rolled length to the sales-order line at sequencing (BRM-001); a mismatch beyond `length_tolerance_mm` is a soft flag with PPC override (MAT-003).
- **Upload:** sheet `LENGTH_MASTER` (Annex A); the primary/alt columns are named **Primary / Alternate 1 / Alternate 2** on the sheet (BLM-012 wording).
- **Allocator:** `ALC-R-01` — migrate the 7,835 ranged `Mst_Length_Master` rows into `mes_qc_length_master` / `finished_length_mm` after unit normalisation (m → mm); `mst_planning_length_rules` remain the Allocator's planning-length derivation until it reads `mes_length_master` via sync (`ALC-R-02`). Open data question for JSW (findings brief Q3): are the 7,835 rows the authoritative set?

### 3.2 Yield master — unit × product / output section, gross vs net *(row 10; F12.6-01…04; BRD 7.7 F7.11)* — PLATFORM (owner PPC)
One master, S-scoped (M-01): BRM product-wise, BLM product-wise, SMS output-section-wise, GMM / Bright Bar / ABGM are rows.

- **`mes_yield_master`** — `yield_id` PK · `operation_id` FK (**unit / process step**) · `equipment_id` FK (Y) · `material_form_id` FK (Y — output form) · `product_category_id` FK (Y — product / size family) · `sku_id` FK (Y) · `shape` / `size_min` / `size_max` (Y — output section for SMS) · `grade_series` / `grade` (Y) · `tdc_id` FK (Y) · **`yield_basis varchar(10)`** (GROSS / NET — net = post-inspection) · **`yield_pct numeric(7,3)`** · `loss_breakup_json jsonb` (Y — e.g. {"EC":1.2,"BL":0.8,"MR":0.5} keyed by `mes_operation_loss_config.loss_code`) · `source varchar(20)` (MASTER / SAP / CALCULATED) · `valid_sample_months int` (Y — when CALCULATED, the actuals window) · `priority int` · `effective_from/to` · **+ audit tail**.
- **Rules:** R-YLD-01 BTR/BTC and dependent demand (F7.10-01, F7.11-01/02) walk the BOM chain Annealing → BRM → ABGM → SMS applying the R-S-resolved `yield_pct` per step; worked example: order 1,000 t FG bright bar, BB net 97 %, BRM net 93 %, ABGM 99 %, SMS gross 96 % → cast requirement 1,000 ÷ (0.97 × 0.93 × 0.99 × 0.96) = 1,166 t. R-YLD-02 the Rolling Yield *report* (built) becomes the CALCULATED feed: a nightly job proposes `yield_pct` from actuals; adoption is a maker-checker action (P1).
- **Allocator:** `ALC-R-03` — populate `Operation_Yield` / derive `Mst_Allocation_Matrix.Total_Yield` from `mes_yield_master` by sync instead of hand entry.

### 3.3 Inspection Path Matrix — extra dimensions *(row 11; F12.7-01; BRD 10.3, 10.9)* — QA (extends §26.1)
`mes_qc_inspection_path` / `_stage` / `mes_qc_path_rule` / `mes_qc_material_path` are designed (not built). `mes_qc_path_rule` already carries `so_characteristic`, `tdc_id`, `customer_id`, `grade`, `product_form`, `supply_condition`. Gaps closed here:

- `mes_qc_path_rule` gains **`material_form_id` FK (Y)** (typed form instead of the free-text `product_form`, which stays for the SO characteristic text) · **`sku_id` FK (Y)** (the product code *after* conversion — BRD 10.9 re-inspection) · **`order_type varchar(20)` (Y)** · **`bom_level int` (Y)** · `operation_id` FK (Y — unit) · `effective_from/to`.
- `mes_qc_inspection_path` gains **`route_group varchar(50)`** — the eight named groupings are seed rows: STD Inspection, Double Rolling Route, Annealing Supplies, Annealed Bright Bar Supplies, Bright Bar Supplies, Slow Cooled Material, Auto Inspection Line Route, Inwarded Subcon WIP Material Route (BRD 10.3).
- R-PATH-02 (new): on product-code conversion (§2.3) the batch is re-matched against the matrix with the new `sku_id` / `order_type` / `bom_level` and a **fresh inspection cycle** is opened (BRD 10.9); the previous `mes_qc_material_path` row is closed with `source = CONVERSION`.
- Build item: the four path tables are in the "build the nine designed masters" list (§6).

### 3.4 Family & Section Load master *(row 12; F12.11-01; SOW 7.5)* — PLATFORM (owner PPC)
Groups sections into rolling families and states the load a family/section carries in a sequence. `mes_category_rolling_size` (MES PC, 0 rows; Allocator twin has 28 rows: mill × rolling type × shape × size band) already maps a section to a mill and rolling type — it becomes the section vocabulary.

- **`mes_product_family`** — `family_id` PK · `code` / `name` UQ · `operation_id` FK (**mill**) · `rolling_type varchar(20)` (Y — SINGLE / DOUBLE) · `roll_set_code varchar(50)` (Y — the roll/pass design the family shares; links to Roll Management later) · `changeover_minutes int` (Y — family-to-family) · `sequence_rank int` (Y — preferred order of families in a campaign) · `description` · `effective_from/to` · **+ audit tail**.
- `mes_category_rolling_size` gains **`family_id` FK (Y)** · `product_category_id` FK (Y) — so each section band belongs to a family. (Data: load the Allocator's 28 rows.)
- **`mes_section_load`** — `section_load_id` PK · `family_id` FK (Y) · `category_rolling_size_id` FK (Y — the section band; one of family / section must be set) · `operation_id` FK (mill) · `min_load_mt numeric(12,3)` · `max_load_mt numeric(12,3)` (Y) · `campaign_min_mt numeric(12,3)` (Y) · `max_consecutive_heats int` (Y) · `remark_required_below_min boolean` · `priority int` · `effective_from/to` · **+ audit tail**.
- **Rules:** R-FAM-01 rolling-sequence finalisation (BRD F7.2-04) validates each family block against `min_load_mt`; below it the planner must give a remark (MoQ rule §3.5 handles tonnage per sequence; this handles per-family/section load). R-FAM-02 changeover minutes feed the campaign duration.

### 3.5 MoQ Validation Rules master *(row 13; F12.11-02; SOW 7.5)* — PLATFORM (owner PPC)
- **`mes_moq_rule`** — `moq_rule_id` PK · `rule_code` UQ · `operation_id` FK (casting / rolling unit) · `rule_type varchar(30)` (MIN_SECTION_MT / MIN_TONNAGE_PER_SEQUENCE / MIN_HEATS_PER_SEQUENCE / MIN_ORDER_MT) · S (`shape`, `size_min/max`, `product_category_id`, `grade_series`, `tdc_id`, `customer_id`) · `min_qty numeric(12,3)` · `unit_id` FK `mes_units` · `enforcement varchar(20)` (BLOCK / WARN_WITH_REMARK) · `remark_required boolean` · `override_action_code varchar(50)` (Y — `mes_privileged_action` §2.6, e.g. MOQ_OVERRIDE) · `priority int` · `effective_from/to` · **+ audit tail**.
- **Rules:** R-MOQ-01 at casting-plan and rolling-sequence finalisation, each planned block is checked against the R-S-resolved rule; WARN_WITH_REMARK captures a **mandatory remark by BRM** (SOW 7.5) into the sequence record; BLOCK needs the override action. Worked example: rule MIN_TONNAGE_PER_SEQUENCE 120 t for 25–40 Round at BRM; a 95 t block → remark dialog "MoQ 120 t not met (95 t)".

### 3.6 Ferro Alloy Requirements master *(row 14; F12.16-01; BRD 7.7 FER-01…11, CMG-003)* — PLATFORM (owner PPC / SMS)
Norm per tonne by grade / PSN, price and cost category. Shape copied from `mes_consumable_operation_map`; ferro alloys are `mes_consumables` rows.

- `mes_consumables` gains **`consumable_category varchar(30)` (Y)** (FERRO_ALLOY / FLUX / REFRACTORY / ROLL / GENERAL — data; CMG-003) · `sap_material_code varchar(50)` (Y — or via §5.7 map).
- **`mes_ferro_alloy_norm`** — `norm_id` PK · `consumable_id` FK `mes_consumables` · `operation_id` FK (SMS) · `equipment_id` FK (Y — furnace / LRF) · `grade` / `grade_series` (Y) · `tdc_id` FK (Y) · `shape` / `size_min` / `size_max` (Y) · `rolling_type varchar(20)` (Y) · **`norm_qty numeric(12,4)`** · `norm_basis varchar(20)` (PER_T_LIQUID / PER_T_CAST / PER_HEAT) · `norm_unit_id` FK `mes_units` · `recovery_pct numeric(6,2)` (Y) · `priority int` · `effective_from/to` · **+ audit tail**.
- **`mes_consumable_price`** — `price_id` PK · `consumable_id` FK · `price_per_unit numeric(14,4)` · `currency varchar(3)` · `price_unit_id` FK · `effective_from date` · `effective_to date` (Y) · `source varchar(20)` (UPLOAD / MANUAL) · **+ audit tail**. *(FER-09 "price uploading option"; separate cadence from the norm.)*
- **`mes_grade_cost_category`** — `id` PK · `grade` (Y) · `grade_series` (Y) · `tdc_id` FK (Y) · `cost_category varchar(5)` (A / B / C / D — data) · `effective_from/to` · **+ audit tail**. *(FER-09…11: manual price-based categorisation at PSN/grade level.)*
- **Rules:** R-FEA-01 monthly requirement = Σ over the order set (grade/PSN × quantity) of `norm_qty × quantity × (1 / recovery)` per alloy — worked example: 5,000 t of grade X at FeCr norm 12.5 kg/t liquid, recovery 92 % → 5,000 × 12.5 ÷ 0.92 = 67.9 t FeCr. R-FEA-02 actual consumption per heat (CMG-001, from the SMS interface — MES side only) is reconciled against the same norm to give variance per grade / PSN / heat. The planning screens are the PPC pass.

### 3.7 Process Parameter master per unit + PSN-wise Process Validation *(rows 15–16; F12.17-01, F12.17-02; BRD §5.1)* — PLATFORM (owner Process Control; table lives in MES PC)
`mes_process_attributes` (process × operation × attribute → `target_value`, `target_lower_limit`, `target_upper_limit`, `default_captured_from`) is the base — the tolerance band **already exists**. What is missing is the *grouping key* and the validation behaviour. **One master, not two:** the "PSN-wise Process Validation Parameter master" is the same table filtered to rows with `tdc_id` set (M-01, M-02).

- `mes_process_attributes` gains: **`equipment_id` FK (Y)** (per unit/machine) · **`tdc_id` FK (Y)** (PSN) · **`grade_series` (Y)** · **`grade` (Y)** (grade family) · **`product_category_id` FK (Y)** (size family) · `shape` / `size_min` / `size_max` (Y) · **`validation_mode varchar(20)`** (NONE / WARN / BLOCK / DEVIATION — DEVIATION raises a quality deviation for QA disposition) · **`is_critical boolean`** (flags the row for external sharing — the OPC-UA/MQTT contract itself is deferred `[integration deferred]`) · `display_sequence int` (Y) · `corrected_value_capture boolean` (BRD §5.3 point 4: standard / actual / corrected value columns on the capture screen) · `priority int` · `effective_from/to`.
- **Rules:** R-PP-01 the parameter set shown at an operation resolves by R-S on (operation, equipment, PSN, grade family, size family); R-PP-02 an actual outside [lower, upper] behaves per `validation_mode` — WARN colours the cell, BLOCK refuses the confirmation, DEVIATION records a `mes_process_parameters_captured` row flagged `out_of_range` and opens the QA deviation (approval §10.3 / NCR §12) — the runtime is the Process Control pass. Worked example: casting speed target 1.1 m/min, band 1.0–1.2, PSN row mode DEVIATION; actual 1.25 → deviation raised, batch flagged for the UD screen's process-validation panel.

### 3.8 ABGM masters — PSN-wise grinding requirement + section limitation *(row 17; F12.22-01; SOW SMSQA10, 7.6)* — `[assumption — D-05: ABGM in scope]`
Two different things: a **spec** (does this PSN/grade/section need grinding, of what kind) and an **equipment capability** (which sections a grinder can take).

- **`mes_qc_grinding_rule`** — QA — `grinding_rule_id` PK · `tdc_id` FK (Y) · `grade` / `grade_series` (Y) · `customer_id` FK (Y) · `shape` / `size_min` / `size_max` (Y) · `material_form_id` FK (Y) · **`grinding_required varchar(15)`** (YES / NO / CONDITIONAL) · `grinding_type varchar(30)` (Y — FULL / SPOT / PARTIAL — data) · `depth_mm numeric(6,2)` (Y) · `condition_text varchar(255)` (Y — e.g. "surface defect grade ≥ 2 at SMS final inspection") · `priority int` · `effective_from/to` · **+ audit tail**. *(Consumers: path allocation — the "further-ABGM route" of BRD 8.11; camp planning; the ABGM schedule's "deviation heats" category (7.6).)*
- **`mes_equipment_section_limit`** — PLATFORM — `limit_id` PK · `equipment_id` FK · `capability_code varchar(30)` (GRIND / STRAIGHTEN / PEEL / … — data) · `shape` · `size_min` / `size_max` · `max_length_mm numeric(12,2)` (Y) · `min_length_mm` (Y) · `max_piece_weight_kg numeric(12,3)` (Y) · `grade_series` (Y — excluded/allowed families) · `is_allowed boolean` (default true; false rows are explicit exclusions) · `effective_from/to` · **+ audit tail**. *(Generic machine capability; ABGM section limitation is its first use. Hard-rule validation at reallocation, no bypass — 7.6 ABGM-01…06.)*
- R-ABGM-01 a billet may be scheduled/charged to a grinder only if an allowed `mes_equipment_section_limit` row matches its shape/size (and no exclusion row matches); the "Annealing/ABGM bypass indicator" is a route-definition flag maintained by PPC (`mes_qc_inspection_path_stage.is_mandatory = false` with an approved exception reason — P1 approval).

### 3.9 Swapping Validation Table *(row 18; F12.23-01; BRD 7.2.2 4.1.3, MAT-003…005)* — PLATFORM (owner PPC)
Configurable compatibility rules for batch/heat swapping (manual, auto, reverse). Directional permitted values follow `Mst_Compatible_Value`.

- **`mes_swap_rule`** — `swap_rule_id` PK · `rule_code` UQ · `swap_scope varchar(30)` (ALL / BATCH_TO_BATCH / FREE_TO_SO / CROSS_SO_PARTIAL / REVERSE / ISO_TO_SO) · `stage_scope varchar(20)` (SEQUENCING / CHARGING / WIP / ALL) · `operation_id` FK (Y — unit) · **`attribute_key varchar(50)`** (PSN / GRADE / SECTION / INPUT_SIZE / LENGTH / CHEMISTRY / HEAT / or an `attribute_id` FK `mes_global_attributes` (Y) for any dictionary attribute) · **`match_mode varchar(20)`** (EXACT / TOLERANCE / COMPATIBLE_LIST / IGNORE) · `tolerance_value numeric(12,3)` (Y) · `tolerance_unit_id` FK (Y) · **`is_blocking boolean`** (hard interlock vs soft flag) · `override_action_code varchar(50)` (Y — privileged action for soft overrides, e.g. SWAP_APPROVE) · `priority int` · `effective_from/to` · **+ audit tail**.
- **`mes_swap_compatible_value`** — `id` PK · `swap_rule_id` FK · `from_value varchar(100)` · `to_value varchar(100)` · `direction varchar(10)` (ONE_WAY / BOTH) · **+ audit tail**. *(Used when `match_mode = COMPATIBLE_LIST`, e.g. grade 304 may replace 304L one-way.)*
- **Seeds (BRD 4.1.3):** PSN EXACT blocking · GRADE EXACT blocking · SECTION EXACT blocking ("200 mm cannot replace 220 mm") · INPUT_SIZE EXACT blocking · LENGTH TOLERANCE ±100 mm non-blocking with PPC override (MAT-003) · CHEMISTRY IGNORE (acknowledged limitation). The YMS-reliability toggle for auto-swap ordering is a PPC screen policy, not a rule row.
- R-SWP-01 a swap executes only if every blocking rule passes; non-blocking failures are listed and need the override action; the executed swap stores the rule evaluation as evidence (PPC pass designs the transaction).

### 3.10 Order Book master *(row 19; F12.24-01; BRD 7.1)* — PLATFORM (owner PPC)
Orders themselves are built (`mes_orders` 1,201, `mes_order_line_items` 5,585, Excel import). The master content is the **derivation rules, customer priority and hold/release configuration**:

- **`mes_customer_priority`** — `id` PK · `customer_id` FK (Y) · `customer_group varchar(50)` (Y — e.g. OEM / EXPORT / TRADER, data) · **`priority_tier int`** (1 = highest) · `otif_target_pct numeric(5,2)` (Y) · `commit_window_days int` (Y) · `effective_from/to` · **+ audit tail**. R-S on customer then group.
- **`mes_order_book_rule`** — `rule_id` PK · `rule_code` UQ · **`rule_type varchar(30)`** (BTP_BASIS / BTD_BASIS / OTIF_WINDOW / RELEASE_TOLERANCE / PARTIAL_RELEASE / SHORT_CLOSE_GUARD / PRIORITY_OVERRIDE) · S (`order_type`, `material_form_id`, `customer_id`, `tdc_id`) · `param_num numeric(12,3)` (Y) · `param_text varchar(100)` (Y) · `param_json jsonb` (Y) · `description varchar(255)` · `priority int` · `effective_from/to` · **+ audit tail**. Seeds: BTP = SO qty − produced + rejected (BRM-010) with RELEASE_TOLERANCE from the SO tolerance; OTIF_WINDOW ±0 days on the confirmed delivery date; SHORT_CLOSE_GUARD = block SAP short-closure once charging has begun (SWP-009/010, MES side only).
- **Hold / release:** reuse `mes_hold_reasons` — its `applied_at` vocabulary gains the value **`Order`**; the table gains `requires_action_code varchar(50)` (Y — ORDER_MASS_HOLD / ORDER_MASS_RELEASE privileged actions, §2.6). The order-hold transaction and the super-user mass hold/release screen are the PPC pass.

### 3.11 Pit Cooling Requirement master *(row 20; F12.25-01; BRD 8.8 PIT-001…006, BRM-PIT-01…05)* — QA (extends §25.2)
§25.2 already stores the pit-cooling transaction (`mes_qc_pit_cooling.spec_hours` "from the governing spec") and the reminder (NTF-PIT-01). The master that *supplies* the hours and the pit capacity is new:

- **`mes_qc_pit_cooling_rule`** — `rule_id` PK · `tdc_id` FK (Y — PSN-wise) · `grade` / `grade_series` (Y) · `shape` / `size_min` / `size_max` (Y — cast section) · `material_form_id` FK (Y) · **`cooling_hours numeric(6,1)`** · `cooling_class varchar(20)` (Y — 24H / 36H / 48H / 72H labels, data) · `min_hours_is_constraint boolean` (default true — "the minimum defined value is the system constraint", BRM-PIT-01) · `priority int` · `effective_from/to` · **+ audit tail**. Precedence: an explicit TDC characteristic "pit cooling hours" (`mes_qc_tdc_limit.text_value`) > this rule (R-S) > none.
- **`mes_qc_pit`** — `pit_id` PK · `code` / `name` UQ · `equipment_id` FK `mes_equipments` (Y — the caster it serves, e.g. CCM2 / CCM3 rows) · `factory_id` FK (Y) · **`capacity_heats int`** (e.g. 5) · **`max_concurrent_heats int`** (e.g. 3 — PIT-001) · `location_text varchar(100)` (Y) · `effective_from/to` · **+ audit tail**. Seeds: CCM2 pits ×3 (capacity 15 heats in total), CCM3 pit ×1.
- `mes_qc_pit_cooling` gains **`pit_id` FK (Y)** (typed pit beside the free `pit_location`) · `rule_id` FK (Y — which rule supplied `spec_hours`, for traceability).
- **Rules:** R-PIT-01 `due_out_time = entry_time + cooling_hours`; R-PIT-02 occupancy = active IN_PIT rows per pit; a new entry is refused when `max_concurrent_heats` is reached and SMS MES is notified (event `QA_PIT_CAPACITY_FULL`, P2 content; interface deferred); R-PIT-03 a heat is rolling-eligible only when `actual_out_time ≥ due_out_time` or a Quality override with reason (the "evacuated early" rule is an open item, PIT-005 — proposed default: Quality override, audited). The live pit-occupancy view is `v_qc_pit_cooling` (§25.2) extended with pit capacity.

---

## 4. Quality & Testing masters (BRD §15.3)

### 4.1 Colour Code (PSN-wise) and End Discard *(rows 21–22; F12.8-01, F12.8-02)* — QA (extends §25.5)
Both masters are designed (§25.5) and in the build list. The PSN-wise *assignment* is a mapping, not a column on the colour row (one colour serves many PSNs):

- **`mes_qc_colour_code_map`** — `id` PK · `colour_code_id` FK `mes_qc_colour_code` · `usage varchar(20)` (IDENTIFICATION / MARKING / SCRAP) · `tdc_id` FK (Y) · `grade` / `grade_series` (Y) · `customer_id` FK (Y) · `material_form_id` FK (Y) · `band_position varchar(30)` (Y — END / MID / FULL — data) · `priority int` · `effective_from/to` · **+ audit tail**. Resolution R-S at offline inspection (§25.6 `colour_code_id` pre-filled, editable with reason). The Colour Code *Chart* = the map rendered as a report.
- End Discard: no change; confirm it is the source of the PSN-wise end-cut report (`v_qc_end_cut`, §25.6).

### 4.2 Sampling Plan masters and the Sample Collection & Generation Matrix *(rows 23–24; F12.9-01, F12.9-02)* — QA (extends §7.5.3)
Sampling rules run today (`mes_qc_sampling_rule` keyed by operation / form / category / sku / grade / tdc / sample type). The matrix adds the **route and position dimensions**:

- `mes_qc_sampling_rule` gains **`path_id` FK `mes_qc_inspection_path` (Y)** (process path / inspection route — hot-charging, pit-cooling, direct-inspection, ABGM routes are path rows) · `trigger_event varchar(30)` (Y — EVERY_N_PIECES / GRADE_CHANGE / PSN_CHANGE / HEAT_START / SHIFT_START — data; "every 5 billets / every grade or PSN change" per IMSW/TS/QA-RP/01) · `trigger_n int` (Y) · `route_stage varchar(50)` (Y — which stage on the path draws the sample) · `effective_from/to`.
- **`mes_qc_sampling_rule_position`** — `id` PK · `sampling_rule_id` FK · **`draw_position varchar(20)`** (FRONT / MIDDLE / BACK — data; lands on `mes_qc_sample.draw_position`) · `samples_count int` · `sample_length numeric(9,2)` (Y) · `sample_pieces int` (Y) · `is_mandatory boolean` · `sequence_no int` · **+ audit tail**. *(The Front/Middle/Back matrix that differs by route.)*
- R-SMP-02 (new): on the trigger event the engine resolves the rule by R-S (+ path) and generates one sample id per position row; the generation itself is the built sampling engine (§7.5) — this only widens its key.

### 4.3 Calibration and alerting frequency *(row 25; F12.10-01)* — QA (built + P2)
Built: `mes_qc_instrument` (interval, last/next date, critical), `mes_qc_calibration` (agency, certificate, result, next due), `mes_qc_instrument_verification`, the Instruments & Calibration screen. Design content only:

- `mes_qc_instrument_type` gains **`default_calibration_interval_days int` (Y)** · **`alert_lead_days int` (Y)** · `alert_frequency varchar(20)` (Y — DAILY / WEEKLY digest) — type-level defaults; `mes_qc_instrument.alert_lead_days int` (Y) overrides per instrument.
- NTF-CAL-01 (`QA_CALIBRATION_OVERDUE`, daily digest) and a new **`QA_CALIBRATION_DUE`** (lead-time reminder) read these — P2 engine; rule rows are content (§25.4). Full calibration-certificate parameter capture stays an explicit BRD exclusion.

### 4.4 Dimensional Tolerance *(row 26; F12.18-01)* — QA (extends §25.5)
`mes_qc_dim_tolerance` (designed) gains **`standard_id` FK `mes_qc_standard` (Y)** · `tolerance_class varchar(30)` (Y — e.g. IS 1732 class, data) · `material_form_id` FK (Y) · `supply_condition varchar(50)` (Y — as-rolled vs bright differ) · `priority int` · `effective_from/to`. Precedence unchanged: TDC characteristic tolerance > this master (R-S) > none. Platform `mes_tolerance` is unrelated (generic label master, 0 rows) — not touched.

### 4.5 International Standard Grade & Chemistry master *(row 27; F12.19-01; SOW SMSQA7)* — QA (extends §11.3–11.4)
Built: `mes_qc_standard` (5; `standard_type` = PRODUCT / TEST_METHOD), `mes_qc_standard_limit` (0 rows), `mes_qc_element`, `mes_qc_grade_chemistry`. Needed: hold **IS / international / customer / works** standards side by side and compare heat chemistry against PSN *and* standard chemistry with colour-coded deviation.

- `mes_qc_standard` gains **`origin varchar(20)`** (INTERNATIONAL / NATIONAL / CUSTOMER / WORKS — the second dimension; `standard_type` keeps PRODUCT / TEST_METHOD) · `issuing_body varchar(50)` (Y — ASTM / EN / IS / JIS / customer name) · `customer_id` FK (Y — for CUSTOMER origin).
- `mes_qc_standard_limit` gains `tier varchar(10)` (Y — mirrors `mes_qc_tdc_limit.tier`, so a standard may carry ordered / internal / aim tiers) · `text_value varchar(255)` (Y).
- **View `v_qc_chemistry_compare`** — per heat × element: actual, PSN band (TDC limit), works band (`grade_chemistry`), standard band (`standard_limit` for each linked standard), and a computed `deviation_class` (WITHIN / OUT_PSN / OUT_STD / OUT_BOTH) that the Heat Chemistry screen colours (CQ pass builds the panel). Data loading of the IS / international grade list is content, not build.

### 4.6 Agency Allocation (covered) and Inspector master *(rows 28–29; F12.20-01; SOW MQA18/19)* — QA
`mes_qc_agency` runs (IN_HOUSE / THIRD_PARTY, scope text). New:

- **`mes_qc_inspector`** — `inspector_id` PK · `code` / `name` UQ · `user_id bigint` (Y — the platform user once P1 lands) · `agency_id` FK `mes_qc_agency` (Y — internal or third-party) · `operation_id` FK (Y — home unit) · `department_id bigint` (Y — §2.6) · `employee_no varchar(30)` (Y) · `effective_from/to` · **+ audit tail**.
- **`mes_qc_inspector_qualification`** — `id` PK · `inspector_id` FK · `qualification_code varchar(50)` (e.g. ASNT-II-MT, ASNT-II-UT, VISUAL-L1 — data) · `inspection_type_id` FK (Y) · `test_id` FK (Y) · `certificate_no varchar(50)` (Y) · `certified_by varchar(100)` (Y) · `valid_from date` · `valid_to date` (Y) · `level varchar(20)` (Y) · **+ audit tail**.
- `mes_qc_inspection` and `mes_qc_test_record` gain **`inspector_id` FK (Y)**. R-INS-01: when the inspection/test type has a qualification requirement, the selected inspector must hold a matching qualification valid on the record date; otherwise the entry is refused with the reason (MPI / manual UT inspector records, MQA18/19).

### 4.7 Barcode Sticker Type *(row 30; F12.20-02; SOW MQA24)* — QA (extends §26.7)
`mes_qc_barcode_type` (designed) — add the **applicability scope**:

- **`mes_qc_barcode_type_scope`** — `id` PK · `barcode_type_id` FK · `print_point varchar(30)` (SAMPLE_ID / SMS_FINAL_CLEARANCE / MILLS_CLEARANCE / BUNDLE / DISPATCH — data) · `material_form_id` FK (Y) · `customer_id` FK (Y) · `tdc_id` FK (Y) · `is_default boolean` · `priority int` · **+ audit tail**. Resolution R-S at each print point pre-selects the sticker type; the user may change it. Printing itself is the P4 device layer.

### 4.8 PSN Approval Mail Distribution List *(row 31; F12.20-03; SOW CQ19)* — QA (extends §25.4)
- **`mes_qc_distribution_list`** — `list_id` PK · `code` / `name` UQ · `scope_type varchar(20)` (PSN_APPROVAL / EVENT / DEPARTMENT / CUSTOMER) · `tdc_id` FK (Y) · `customer_id` FK (Y) · `product_type_id` FK `mes_qc_psn_product_type` (Y) · `department_id bigint` (Y) · `effective_from/to` · **+ audit tail**.
- **`mes_qc_distribution_list_member`** — `id` PK · `list_id` FK · `email varchar(255)` · `display_name varchar(100)` (Y) · `member_type varchar(5)` (TO / CC) · `user_id bigint` (Y) · **+ audit tail**.
- `mes_qc_notification_rule` gains **`distribution_list_id` FK (Y)** — a rule may address a role, a user, *or* a list; the PSN-approved event (`QA_PSN_APPROVED`, new) attaches the PSN PDF (P6 document service) and mails the R-S-resolved list. Engine = P2.

### 4.9 Annealing masters — grade load, production rate & capacity; Annealing PSN (HT cycles) *(row 32; F12.21-01, F12.21-02; SOW 7.5)*
Split by owner; two of the four asks are **reuse**:

- **Capacity** — PLATFORM, covered: furnace capacity = `mes_equipments.batch_min_qty / batch_max_qty` on each furnace row (BAF / CRHF / TPL furnaces are equipment rows, type = FURNACE).
- **Production rate** — PLATFORM, covered by extension: `mes_equipment_speed` (850 rows; speed/hr per equipment with attribute-scoped rows via `use_for_speed` attributes) — add the attributes **Annealing Type** and **Product Type** to `mes_global_attributes` (data) so the rate differs by annealing type × product type without schema change; `variable_time` carries the cycle hours.
- **Grade load combination** — PLATFORM (owner PPC), new: **`mes_annealing_load_rule`** — `rule_id` PK · `equipment_id` FK (Y — furnace) · `annealing_type varchar(30)` (data — e.g. SOLUTION / SOFT / STRESS_RELIEF) · `grade_series` / `grade` (Y) · **`load_group varchar(50)`** (grades sharing a load group may be charged together on one base) · `max_load_mt numeric(12,3)` (Y) · `min_load_mt` (Y) · `mix_allowed boolean` · `priority int` · `effective_from/to` · **+ audit tail**. R-ANN-01: a furnace charge may contain only batches whose resolved `load_group` is the same (or `mix_allowed`), within `max_load_mt`.
- **Annealing PSN master (HT cycles)** — QA, new catalogue linked from the TDC (M-02): **`mes_qc_ht_cycle`** — `cycle_id` PK · `code` / `name` UQ · `furnace_type varchar(30)` (BAF / CRHF / TPL — data) · `annealing_type varchar(30)` · `total_hours numeric(6,1)` (Y) · `description` · `effective_from/to` · **+ audit tail**; **`mes_qc_ht_cycle_step`** — `id` PK · `cycle_id` FK · `sequence_no` · `stage varchar(20)` (HEAT / SOAK / COOL / QUENCH / TEMPER) · `temperature_c numeric(7,1)` (Y) · `duration_min int` (Y) · `rate_c_per_hour numeric(7,1)` (Y) · `atmosphere varchar(30)` (Y) · `cooling_medium varchar(30)` (Y) · **+ audit tail**. `mes_qc_tdc_ht` (live: `sequence_no`, `ht_description`, `ht_code`, `reduction_ratio`) gains **`cycle_id` FK (Y)** — a TDC/PSN HT step may point at a catalogued cycle instead of free text. The HT charge card (Operations pass) prints the cycle steps.

### 4.10 PSN Configuration master and PSN Number Generator *(rows 33–34; F12.13-01, F12.14-01; BRD 4.2.1 F1.1-02/06/10/12/13)* — QA
The PSN is the TDC record plus the wizard's ten segments (D-04). Configuration is **data** — segments, attributes, sequence, mandatory flags — so fields are added without code. No versioning: a new attribute applies to new PSNs; a sequence change may apply to existing ones (F1.1-10).

- **`mes_qc_psn_segment`** — `segment_id` PK · `code` / `name` UQ · `sequence_no int` · `description` · `is_active` · **+ audit tail**. *(Seed: the 10 segments — Header/Key, Chemistry, Mechanical, Metallurgical, Testing, Annealing, Binding Media, Logistics, Documents, Remarks — data.)*
- **`mes_qc_psn_attribute`** — `psn_attribute_id` PK · `segment_id` FK · `code` UQ · `label varchar(100)` · **`data_type varchar(15)`** (TEXT / NUMBER / RANGE / DATE / BOOLEAN / LOV / MULTI_LOV / DOCUMENT) · **`attribute_id` FK `mes_global_attributes` (Y)** *xor* **`element_id` FK `mes_qc_element` (Y)** (values of measured characteristics land in `mes_qc_tdc_limit` via the dictionaries — QA D1) · `lov_source varchar(100)` (Y — master table / attribute possible values / LOV code, §4.16) · `sequence_no int` · `is_mandatory boolean` · `is_key_field boolean` (the common key set: Customer, Grade, TDC, Size, Supply Condition, Date, Active — CLN-001/002; entered once, shared by all tabs) · `multi_value_keyed boolean` (F1.1-13 — one attribute may hold several values keyed by distinct Customer/TDC/Grade/Size combinations; storage = `mes_qc_tdc_limit` rows with scope columns, CQ pass) · `applies_from date` (Y — informational: "new fields apply to new PSNs") · `print_flag boolean` · `help_text varchar(255)` (Y) · `is_active` · **+ audit tail**.
- Applicability per product type: `mes_qc_psn_product_type_attribute` (§2.5).
- **`mes_qc_psn_number_format`** — `format_id` PK · **`format_code varchar(20)`** UQ (QDQA06 … QDQA41 — data) · `name` · `product_type_id` FK (Y) · **`supply_condition varchar(50)`** (Y) · **`rolling_route varchar(50)`** (Y) · **`input_cast_size varchar(30)`** (Y) — the three drivers (F1.1-06) · `market varchar(20)` (Y — Domestic / Export) · `heat_treated boolean` (Y) · `bright_bar boolean` (Y) · **`mask varchar(60)`** (default `{FORMAT}_{SEQ}`) · `seq_padding int` (default 3) · `next_seq int` · `reset_policy varchar(10)` (NEVER / YEARLY) · `revision_style varchar(20)` (SUFFIX_REV — "Rev 0, 1, 2…") · `priority int` · `effective_from/to` · **+ audit tail**. Shape = `mes_dispatch_series` (M-05).
- `mes_tdc_input` gains **`psn_no varchar(40)` (Y)** · **`psn_format_id` FK (Y)** · `product_type_id` FK (Y) — the number is allocated on first approval (`next_seq` consumed atomically); a revision keeps the base number and increments `revision_no` (already present). R-PSN-01: format resolves by R-S on (product type, supply condition, rolling route, input cast size); no match = the wizard refuses to submit ("populate the Product Type Matrix first", F1.1-11). Worked example: Bright Bar, Domestic, route BRM→BB, cast 160 sq → QDQA27, `next_seq` 118 → **QDQA27_118 Rev 0**; a later change → QDQA27_118 Rev 1.
- The wizard, tabs, document upload (F1.1-03) and SAP VC replication are the **CQ/PSN pass**; this section fixes the masters they read.

### 4.11 Batch Derivation Logic master *(row 35; F12.15-01; BRD 8.11, 8.12, 10.9; SOW SMSQA10, MQA28/29)* — PLATFORM (owner Operations / PPC)
How a batch identity and its characteristics derive when material is confirmed, cleared, split, merged or converted. Numbering reuses `mes_batch_number_generation_config` (per operation, `config_json`); this master adds the event, the parent→child rule and the characteristic map (the SAP batch-characteristic update is interface-deferred — MES side only).

- **`mes_batch_derivation_rule`** — `rule_id` PK · `rule_code` UQ · `operation_id` FK (unit) · `material_form_id` FK (Y — input form) · `to_material_form_id` FK (Y) · **`event varchar(30)`** (PRODUCTION_CONFIRMATION / USAGE_DECISION / SPLIT / MERGE / GRINDING_CONFIRMATION / CODE_CONVERSION / INWARD) · **`numbering_rule varchar(20)`** (KEEP_PARENT / PARENT_SUFFIX / NEW_SERIES / HEAT_BASED) · `suffix_pattern varchar(30)` (Y — e.g. `-{n:02}` for split children) · `generation_config_id` FK `mes_batch_number_generation_config` (Y — when NEW_SERIES) · `weight_rule varchar(20)` (PROPORTIONAL / MEASURED / INHERIT — split/merge weight, incl. proportional end-cut/salvage weights, MQA25) · `priority int` · `effective_from/to` · **+ audit tail**.
- **`mes_batch_derivation_characteristic`** — `id` PK · `rule_id` FK · `characteristic_code varchar(50)` (HEAT_NO / GRADE / PSN / SIZE / LENGTH / WEIGHT / PIECES / SUPPLY_CONDITION / or `attribute_id` FK (Y)) · **`derivation varchar(20)`** (COPY / PROPORTIONAL / RECOMPUTE / CLEAR / LOOKUP) · `lookup_source varchar(100)` (Y — e.g. `mes_form_conversion_rule`) · `external_characteristic varchar(60)` (Y — the SAP batch-characteristic name for the later interface; design part only) · `sequence_no` · **+ audit tail**.
- R-BDL-01: on the event, the rule resolves by R-S; the child batch number follows `numbering_rule` (KEEP_PARENT on code conversion without split — BRD 8.12 "retention of the same code"; PARENT_SUFFIX on split — 8.11 "child batch IDs linked to the parent"), `mes_batch_relations` records parent↔child, characteristics derive per row. Worked example: split of B030268 (12 pcs, 2,400 kg) into 8 + 4 → B030268-01 (1,600 kg) and B030268-02 (800 kg), PSN/grade/heat COPY, weight PROPORTIONAL.

### 4.12 Measuring Instrument Checklist *(row 36; F12.26-01)* — QA, designed (§25.1, §26.4) — build item
No design change. `mes_qc_instrument_checklist` (+ items, records, machine log-book extension) covers the shift-gated checklist with the remark column; the first-login pop-up is the platform session hook (P1).

### 4.13 Defect & NCR — reference-image library *(row 37)* — QA (extends §5.4, reuses §12.6)
- **`mes_qc_defect_reference`** — `reference_id` PK · `defect_id` FK `mes_qc_defect` · `severity varchar(20)` (Y — the severity the image illustrates) · `title varchar(150)` · `standard_ref varchar(100)` (Y — e.g. ASTM E381 plate S2) · `attachment_id` FK `mes_qc_attachment` (entity_type = DEFECT_REFERENCE) · `is_default boolean` · `sequence_no` · **+ audit tail**. The Defects screen shows the reference images beside the captured macro image for side-by-side comparison; the macro-etch test result gains nothing (the captured image is already an attachment).

### 4.14 Usage Decision, Test catalogue, Supplier *(rows 38–40)* — QA, covered
Data loading of JSW codes (UD types / reasons / actions / salvage types / material statuses; the test catalogue incl. macro etch, MPI, UT, spark, spectro, ball drop; RM suppliers). No design change.

### 4.15 Notification rules *(row 41)* — QA, designed (§25.4) — build item; P2 for severity / escalation
The MDM content is the **event vocabulary** this pass adds: `QA_CALIBRATION_DUE`, `QA_PIT_CAPACITY_FULL`, `QA_PSN_APPROVED`, `MDM_MASTER_CHANGED` (a master row changed — for downstream owners), `MDM_UPLOAD_COMPLETED` (the existing `QA_IMPORT_COMPLETED` shape). Rule rows are data; the engine (channels beyond in-app, escalation) is P2.

### 4.16 LOV masters *(row 42; F12.12-01; BRD F1.1-12)* — PLATFORM, configuration
The generic mechanism exists twice: `mes_global_attributes` (VALUE / DYNAMIC types) + `mes_attribute_possible_value` (2,851 rows) for attribute-shaped lists, and the Custom Master framework (approve a table, configure a screen — 0 screens configured) for table-shaped lists. No new table. Design content:

| LOV (BRD F1.1-12 / SOW) | Backing master | Mechanism |
|---|---|---|
| Customer Name | `mes_customers` (5,396) | existing master |
| Grade | `mes_grades` (185) | existing master |
| Size / Input size / Product size | `mes_global_attributes` "Size" (DYNAMIC) + possible values; section bands `mes_category_rolling_size` | attribute LOV |
| Packing type, Strapping, Binding media | new `mes_global_attributes` rows (VALUE) + possible values | attribute LOV — data |
| Barcode sticker type | `mes_qc_barcode_type` (§4.7) | QA master |
| Supply condition, Rolling route, Market, Annealing type, Cost category | attribute LOVs (VALUE) — one row each | data |

- **R-LOV-01 — in-use values cannot be deleted:** a possible value or master row referenced by any TDC/PSN, order or transaction is refused on delete and must be deactivated (where-used through the master search cross-reference, §5.3). The Custom Master framework's `master_table_registry` is extended by *approving* the new MDM tables (data) so their screens can be configured without code — the framework's stated scope (masters only, no workflow) fits.

---

## 5. Master-data platform capabilities (BRD §15.4) — content only; engines deferred

### 5.1 Bulk upload / download *(row 43; F12.0-01)* `[platform P3]`
Annex A defines one upload sheet per master (sheet name, key columns, columns, validations). The engine exists (MES PC `UploadHelperClass` — 9 screens with template download, row preview, warnings, rejected-row report; QA `mes_qc_import_batch`); generalising it to the generic Masters engine and to every QA master is P3. Sheet definitions are content and go into **`JSW-MDM-Master-Data-Templates.xlsx`** (generated from Annex A, like the QA templates workbook).

### 5.2 Version control & effective dating *(row 44; F12.0-02)* `[platform P3]`
Every new master carries `effective_from / effective_to` (§0.2); TDC/PSN revisions use `revision_no` + `parent_tdc_id` (already live). The "as-of" resolution service, the version-history table and the master-change approval flow are P3. Design note for P3: rule masters (R-S) resolve *as of the production/inspection date* by adding `effective_from ≤ date < effective_to` to the R-S predicate — no further schema change.

### 5.3 Search & cross-reference *(row 45; F12.0-03)* — covered (+ one rule)
`MasterSearchController` (~30 entities) + header search. Add: the QA and MDM masters to the search index (configuration), and **where-used** before deactivation (R-LOV-01) — the cross-reference is the FK graph; the response lists referencing tables and counts.

### 5.4 Audit trail *(row 46; F12.0-04)* — covered
`mes_audit_log` (old/new JSON per entity, action, user) + Reports › Audit Logs. Every new table in this design is an audited entity (configuration). No change.

### 5.5 Governance catalogue *(row 47; BRD §15 closing note)* `[D-11 parked — content only]`
Annex B is the catalogue the deferred console renders: each master's owner department, book-of-record system (MES PC / QA / Allocator / SAP), surface (screen), upload sheet, approval, version need and current state (BUILT / DESIGNED / NEW).

### 5.6 Equipment maintenance & planned downtime; Downtime Reason master *(row 48; F12.3-02 dup-2; BRD 9.16 DWN-001)* — PLATFORM (owner Operations)
Reuse `mes_delay_reasons` (4 rows, `delay_reason_category` unused) as the downtime reason master rather than a second reason table:

- `mes_delay_reasons` gains **`downtime_class varchar(10)`** (PLANNED / UNPLANNED) · **`parent_delay_reason_id` FK (Y)** (category → sub-reason hierarchy) · `operation_id` FK (Y) · `equipment_id` FK (Y) — per-unit scoping · `is_roll_related boolean` (feeds Roll Management, BRD 14.3) · `affects_oee boolean` (default true) · `effective_from/to`. Seeds (DWN-001): PLANNED → Scheduled maintenance, Changeover, Shift break; UNPLANNED → Breakdown (mechanical / electrical), Power failure, Material shortage, Quality hold, Waiting for instruction.
- **`mes_equipment_maintenance_plan`** — `plan_id` PK · `equipment_id` FK · `plan_type varchar(20)` (PREVENTIVE / SHUTDOWN / CHANGEOVER / INSPECTION) · `delay_reason_id` FK `mes_delay_reasons` (the PLANNED reason it books) · `planned_start timestamptz` · `planned_end timestamptz` · `recurrence varchar(50)` (Y — cron-like, e.g. weekly Sunday 06:00–10:00) · `status varchar(20)` (PLANNED / IN_PROGRESS / DONE / CANCELLED) · `actual_start` / `actual_end timestamptz` (Y) · `remarks varchar(255)` · **+ audit tail**.
- Downtime *capture* (DWN-002/003, start/end, batch linkage) and the OEE / analysis views (DWN-004…006) are the Operations pass; `mes_production_confirmation`'s delay section already reads `mes_delay_reasons`. Allocator: `ALC-R-04` — feed `EquipmentHoliday` / `Equipment_Availability_Calender` from the maintenance plan by sync (planner-side availability, both 0 rows today). The Allocator's `EquipmentMaintenance` table is a liquid-blending leftover and is **not** used.

### 5.7 SAP material / product-form code mapping *(row 49; BRD F13.1-09/10)* — PLATFORM `[integration deferred — design part only]`
A generic external-code map so every interface (SAP today; SFDC, LIMS later) resolves codes from data:

- **`mes_external_code_map`** — `map_id` PK · `external_system varchar(20)` (SAP / SFDC / LIMS / SMS_MES — data) · **`object_type varchar(30)`** (MATERIAL / PRODUCT_FORM / BATCH_CHARACTERISTIC / CUSTOMER / GRADE / UNIT / PLANT / STORAGE_LOCATION / CONSUMABLE) · `mes_table varchar(60)` · `mes_ref_id bigint` (Y) · `mes_code varchar(100)` (Y — when the MES side is a code, e.g. a form name) · **`external_code varchar(100)`** · `external_desc varchar(255)` (Y) · `direction varchar(5)` (IN / OUT / BOTH) · `is_default boolean` · `effective_from/to` · **+ audit tail**. UQ (`external_system`, `object_type`, `external_code`, `direction`).
- Consumers (all later passes): the SAP order feed (customer / material / plant codes), product-code conversion (§2.3 `sap_executes`), batch-characteristic update (§4.11 `external_characteristic`), consumable stock (§3.6). The monitoring / retry dashboard is P5. The Allocator's `SAP_*` tables are order-side and are not this map (findings brief §7).

---

## 6. Landing summary — what goes where

### 6.1 New tables (42) and views (2); extended tables (22)

| # | Table | Owner | Kind | Section |
|---|---|---|---|---|
| 1 | `v_mdm_grade_profile` (view) | QA | new view | 2.1 |
| 2 | `mes_form_conversion_rule` | PLATFORM | new | 2.3 |
| 3 | `mes_qc_psn_product_type` (+ `_section`, `_format`, `_attribute`) | QA | new ×4 | 2.5 |
| 4 | `mes_department` · `mes_privileged_action` · `mes_role_privileged_action` | PLATFORM | new ×3 `[P1]` | 2.6 |
| 5 | `mes_length_master` | PLATFORM | new | 3.1 |
| 6 | `mes_yield_master` | PLATFORM | new | 3.2 |
| 7 | `mes_product_family` · `mes_section_load` | PLATFORM | new ×2 | 3.4 |
| 8 | `mes_moq_rule` | PLATFORM | new | 3.5 |
| 9 | `mes_ferro_alloy_norm` · `mes_consumable_price` · `mes_grade_cost_category` | PLATFORM | new ×3 | 3.6 |
| 10 | `mes_qc_grinding_rule` | QA | new `[D-05]` | 3.8 |
| 11 | `mes_equipment_section_limit` | PLATFORM | new | 3.8 |
| 12 | `mes_swap_rule` · `mes_swap_compatible_value` | PLATFORM | new ×2 | 3.9 |
| 13 | `mes_customer_priority` · `mes_order_book_rule` | PLATFORM | new ×2 | 3.10 |
| 14 | `mes_qc_pit_cooling_rule` · `mes_qc_pit` | QA | new ×2 | 3.11 |
| 15 | `mes_qc_colour_code_map` | QA | new | 4.1 |
| 16 | `mes_qc_sampling_rule_position` | QA | new | 4.2 |
| 17 | `v_qc_chemistry_compare` (view) | QA | new view | 4.5 |
| 18 | `mes_qc_inspector` · `mes_qc_inspector_qualification` | QA | new ×2 | 4.6 |
| 19 | `mes_qc_barcode_type_scope` | QA | new | 4.7 |
| 20 | `mes_qc_distribution_list` · `_member` | QA | new ×2 | 4.8 |
| 21 | `mes_annealing_load_rule` | PLATFORM | new | 4.9 |
| 22 | `mes_qc_ht_cycle` · `mes_qc_ht_cycle_step` | QA | new ×2 | 4.9 |
| 23 | `mes_qc_psn_segment` · `mes_qc_psn_attribute` · `mes_qc_psn_number_format` | QA | new ×3 | 4.10 |
| 24 | `mes_batch_derivation_rule` · `_characteristic` | PLATFORM | new ×2 | 4.11 |
| 25 | `mes_qc_defect_reference` | QA | new | 4.13 |
| 26 | `mes_equipment_maintenance_plan` | PLATFORM | new | 5.6 |
| 27 | `mes_external_code_map` | PLATFORM | new | 5.7 |

Extended (columns added): `mes_qc_grade_chemistry` (2.1) · `mes_user`, `mes_role` (2.6) · `mes_qc_path_rule`, `mes_qc_inspection_path` (3.3) · `mes_category_rolling_size` (3.4) · `mes_consumables` (3.6) · `mes_process_attributes` (3.7) · `mes_hold_reasons` (3.10) · `mes_qc_pit_cooling` (3.11) · `mes_qc_sampling_rule` (4.2) · `mes_qc_instrument_type`, `mes_qc_instrument` (4.3) · `mes_qc_dim_tolerance` (4.4) · `mes_qc_standard`, `mes_qc_standard_limit` (4.5) · `mes_qc_inspection`, `mes_qc_test_record` (4.6) · `mes_qc_notification_rule` (4.8) · `mes_qc_tdc_ht` (4.9) · `mes_tdc_input` (4.10) · `mes_delay_reasons` (5.6).

Count by owner (from the parsed catalogue, LLD): **QA** 20 new tables + 2 views + 15 extended tables (`grade_chemistry`, `path_rule`, `inspection_path`, `pit_cooling`, `sampling_rule`, `instrument_type`, `instrument`, `dim_tolerance`, `standard`, `standard_limit`, `inspection`, `test_record`, `notification_rule`, `tdc_ht`, `tdc_input`) → QA `Data-Model.md` §28 · **PLATFORM** 22 new tables + 7 extended (`user`, `role`, `category_rolling_size`, `consumables`, `process_attributes`, `hold_reasons`, `delay_reasons`) → `Requests-MDM.md` MDM-R-01…17 · **ALLOCATOR** 0 tables, 4 sync/migration requests (ALC-R-01…04).

### 6.2 Build list carried from the QA design (designed, not built — 9 masters, 13 tables)
Colour Code · End Discard · Dim Tolerance · Length (`mes_qc_length_master`) · Notification Rule · Instrument Checklist (4 tables) · Inspection Path (+ stage) · Path Rule (+ material path) · Barcode Type. These precede the extensions above in the build order.

### 6.3 Screens (mock-ups in `docs/modules/mdm/ui/`, generated by `docs/modules/_pipeline/mdm/gen_mdm_ui.py`)
**30 new master screens + the MDM hub** (`mdm-hub.html` — the master catalogue of Annex B), in the QA master-screen shell with an owner tag per screen:

| Area | Screens |
|---|---|
| Product & Grade (5) | Grade Profile (view) · Form Conversion Rules · PSN Product Type Matrix · Departments · Privileged Actions |
| Process & Planning (12) | Length Master · Yield Master · Product Family & Section Load · MoQ Rules · Ferro Alloy Norms · Process Parameter Master (extended platform screen) · Grinding Rules · Equipment Section Limits · Swap Rules · Order Book Rules & Customer Priority · Pit Cooling Rules · Pits |
| Quality & Testing (9) | Colour Code Map · Inspectors · Distribution Lists · Annealing Load Rules · HT Cycles · PSN Segments · PSN Attributes · PSN Number Formats · Defect Reference Images |
| Platform (4) | Batch Derivation Rules · Downtime Reasons · Equipment Maintenance Plans · External Code Map |

Extended existing screens (QA family, not re-drawn): Sampling Rule (positions, path, trigger), Dim Tolerance, Standard (origin), Barcode Type (scope), Instrument Type (alert defaults), Notification Rule (list recipient), TDC (PSN number, product type); MES PC Masters: Process Attributes (new columns), Delay Reasons (hierarchy), Consumables (category), Hold Reasons (Order).

---

## 7. Traceability

### 7.1 Backlog item (area 1) → sections → workbook rows → BRD stories

| # | Backlog item | Section | Rows | Stories |
|---|---|---|---|---|
| 1 | Product Form Conversion Rules master | 2.3 | 4 | F12.2-02 |
| 2 | PSN Product Type Matrix | 2.5 | 6 | F12.3-02 (dup 1), F1.1-11 |
| 3 | BRM/BLM Length Master with B1/B2/B3 | 3.1 | 9 | F12.5-01, F12.5-02, F7.3-02 |
| 4 | Yield masters — unit × product / output section, gross vs net | 3.2 | 10 | F12.6-01…04, F7.11-01/02 |
| 5 | Inspection Path Matrix dimensions | 3.3 | 11 | F12.7-01, F5.12-01…03 |
| 6 | Family & Section Load master | 3.4 | 12 | F12.11-01 |
| 7 | MoQ Validation Rules master | 3.5 | 13 | F12.11-02 |
| 8 | Ferro Alloy Requirements master | 3.6 | 14 | F12.16-01, F7.9-03 |
| 9 | Process Parameter master: equipment + grouping key | 3.7 | 15 | F12.17-01 |
| 10 | PSN-wise Process Validation Parameter master | 3.7 | 16 | F12.17-02 |
| 11 | ABGM master [D-05] | 3.8 | 17 | F12.22-01 |
| 12 | Swapping Validation Table | 3.9 | 18 | F12.23-01, F7.12-05 |
| 13 | Order Book master | 3.10 | 19 | F12.24-01 |
| 14 | Pit Cooling Requirement master | 3.11 | 20 | F12.25-01, F4.4-01 |
| 15 | Sample Collection & Generation Matrix | 4.2 | 24 | F12.9-02 |
| 16 | Inspector master | 4.6 | 29 | (SOW MQA18/19) |
| 17 | Mail distribution list master | 4.8 | 31 | F12.20-03 |
| 18 | Annealing masters | 4.9 | 32 | F12.21-01, F12.21-02 |
| 19 | PSN Configuration + PSN Number Generator | 4.10 (+2.5) | 33, 34 | F12.13-01, F12.14-01, F1.1-06/10/12/13 |
| 20 | Batch Derivation Logic master | 4.11 | 35 | F12.15-01 |
| 21 | Defect reference-image library | 4.13 | 37 | (SOW SMS QA macro etch) |
| 22 | International-standard type dimension + comparison view | 4.5 | 27 | F12.19-01 |
| 23 | Equipment maintenance / planned downtime + Downtime Reason master | 5.6 | 48 | F12.3-02 (dup 2), DWN-001 |
| 24 | SAP material / product-form code mapping master | 5.7 | 49 | F13.1-09/10 |
| — | Build the nine designed QA masters | 6.2 | 21, 22, 26, 30, 36, 41, (9), (11) | F12.8-01/02, F12.18-01, F12.20-02, F12.26-01 |
| — | Consolidated Grade view; Colour-code map; Users/Roles content; Calibration alert content; LOVs; platform capabilities | 2.1, 4.1, 2.6, 4.3, 4.16, 5.x | 2, 21, 7, 8, 25, 42, 43–47 | F12.1-02, F12.4-01/02, F12.10-01, F12.12-01, F12.0-01…04 |

Every one of the 46 E12 stories and 49 workbook rows maps to a section above; rows 1, 3, 5, 23, 28, 38, 39, 40, 45, 46 are COVERED and carry a data-loading note only.

### 7.2 Open points for JSW (carried, not decided here)
1. Length master authority — are the Allocator's 7,835 ranged length rows the JSW set to migrate (§3.1)?
2. Early pit evacuation — Quality override vs auto-unlock (PIT-005; default proposed: override, audited) (§3.11).
3. Last-piece length variance rule at casting (LEN-005) — stays an open item.
4. ABGM scheduling in or out (D-05) — masters designed under "in".
5. Which department owns each master (Annex B column "Owner" is proposed, to be confirmed).

---

## Annex A — Upload sheets (one per master; keys in bold)

| Sheet | Master | Key columns | Other columns |
|---|---|---|---|
| FORM_CONVERSION_RULE | §2.3 | **rule_code** | from_form, to_form, trigger_event, operation, order_type, supply_condition, bom_level, from_sku_pattern, to_sku_pattern, sap_executes, derivation_rule, priority, effective_from, effective_to |
| PSN_PRODUCT_TYPE | §2.5 | **code** | name, material_form, product_category, rolling_type, market, sequence |
| PSN_PRODUCT_TYPE_SECTION | §2.5 | **product_type, shape, size_min, size_max** | input_section |
| PSN_PRODUCT_TYPE_ATTRIBUTE | §2.5 | **product_type, psn_attribute** | is_applicable, is_mandatory, sequence_override |
| DEPARTMENT | §2.6 | **code** | name, parent, factory, head_user |
| LENGTH_MASTER | §3.1 | **mill, input_shape, input_size, output_shape, output_size, finished_length_mm, sku, market_type** | input_form, grade_series, Primary, Alternate 1, Alternate 2, pieces_per_rolled_length, length_tolerance_mm, derivation, priority, effective_from, effective_to |
| YIELD_MASTER | §3.2 | **unit, equipment, output_form, product_category, sku, shape, size_min, size_max, grade_series, grade, psn, yield_basis** | yield_pct, loss_breakup (EC/BL/MR…), source, priority, effective_from, effective_to |
| PRODUCT_FAMILY | §3.4 | **code** | name, mill, rolling_type, roll_set_code, changeover_minutes, sequence_rank |
| SECTION_BAND | §3.4 | **mill, rolling_type, shape, size_min, size_max** | family, product_category |
| SECTION_LOAD | §3.4 | **family / section_band, mill** | min_load_mt, max_load_mt, campaign_min_mt, max_consecutive_heats, remark_required_below_min, priority |
| MOQ_RULE | §3.5 | **rule_code** | unit, rule_type, shape, size_min, size_max, product_category, grade_series, psn, customer, min_qty, unit_of_measure, enforcement, remark_required, override_action, priority |
| FERRO_ALLOY_NORM | §3.6 | **consumable, unit, equipment, grade, grade_series, psn, shape, size_min, size_max, rolling_type** | norm_qty, norm_basis, norm_unit, recovery_pct, priority, effective_from, effective_to |
| CONSUMABLE_PRICE | §3.6 | **consumable, effective_from** | price_per_unit, currency, price_unit, effective_to |
| GRADE_COST_CATEGORY | §3.6 | **grade / grade_series / psn** | cost_category, effective_from, effective_to |
| PROCESS_PARAMETER | §3.7 | **process, operation, equipment, attribute, psn, grade_series, grade, product_category, shape, size_min, size_max** | target, lower, upper, captured_from, validation_mode, is_critical, display_sequence, corrected_value_capture, priority |
| GRINDING_RULE | §3.8 | **psn, grade, grade_series, customer, shape, size_min, size_max, form** | grinding_required, grinding_type, depth_mm, condition_text, priority |
| EQUIPMENT_SECTION_LIMIT | §3.8 | **equipment, capability_code, shape, size_min, size_max** | max_length_mm, min_length_mm, max_piece_weight_kg, grade_series, is_allowed |
| SWAP_RULE | §3.9 | **rule_code** | swap_scope, stage_scope, unit, attribute_key, match_mode, tolerance_value, tolerance_unit, is_blocking, override_action, priority |
| SWAP_COMPATIBLE_VALUE | §3.9 | **rule_code, from_value, to_value** | direction |
| CUSTOMER_PRIORITY | §3.10 | **customer / customer_group** | priority_tier, otif_target_pct, commit_window_days, effective_from, effective_to |
| ORDER_BOOK_RULE | §3.10 | **rule_code** | rule_type, order_type, form, customer, psn, param_num, param_text, description, priority |
| PIT_COOLING_RULE | §3.11 | **psn, grade, grade_series, shape, size_min, size_max, form** | cooling_hours, cooling_class, min_hours_is_constraint, priority |
| PIT | §3.11 | **code** | name, caster_equipment, factory, capacity_heats, max_concurrent_heats, location |
| COLOUR_CODE_MAP | §4.1 | **colour_code, usage, psn, grade, grade_series, customer, form** | band_position, priority |
| SAMPLING_RULE_POSITION | §4.2 | **sampling_rule, draw_position** | samples_count, sample_length, sample_pieces, is_mandatory, sequence |
| INSPECTOR | §4.6 | **code** | name, user, agency, unit, department, employee_no, effective_from, effective_to |
| INSPECTOR_QUALIFICATION | §4.6 | **inspector, qualification_code** | inspection_type, test, certificate_no, certified_by, valid_from, valid_to, level |
| BARCODE_TYPE_SCOPE | §4.7 | **barcode_type, print_point, form, customer, psn** | is_default, priority |
| DISTRIBUTION_LIST | §4.8 | **code** | name, scope_type, psn, customer, product_type, department |
| DISTRIBUTION_LIST_MEMBER | §4.8 | **list, email** | display_name, member_type, user |
| ANNEALING_LOAD_RULE | §4.9 | **furnace, annealing_type, grade_series, grade** | load_group, max_load_mt, min_load_mt, mix_allowed, priority |
| HT_CYCLE | §4.9 | **code** | name, furnace_type, annealing_type, total_hours, description |
| HT_CYCLE_STEP | §4.9 | **cycle, sequence** | stage, temperature_c, duration_min, rate_c_per_hour, atmosphere, cooling_medium |
| PSN_SEGMENT | §4.10 | **code** | name, sequence, description |
| PSN_ATTRIBUTE | §4.10 | **code** | segment, label, data_type, attribute / element, lov_source, sequence, is_mandatory, is_key_field, multi_value_keyed, print_flag, help_text |
| PSN_NUMBER_FORMAT | §4.10 | **format_code** | name, product_type, supply_condition, rolling_route, input_cast_size, market, heat_treated, bright_bar, mask, seq_padding, next_seq, reset_policy, revision_style, priority |
| BATCH_DERIVATION_RULE | §4.11 | **rule_code** | unit, input_form, to_form, event, numbering_rule, suffix_pattern, generation_config, weight_rule, priority |
| BATCH_DERIVATION_CHARACTERISTIC | §4.11 | **rule_code, characteristic_code** | derivation, lookup_source, external_characteristic, sequence |
| DEFECT_REFERENCE | §4.13 | **defect, title** | severity, standard_ref, image file, is_default, sequence |
| DELAY_REASON (extended) | §5.6 | **code** | name, downtime_class, parent_reason, unit, equipment, is_roll_related, affects_oee |
| EQUIPMENT_MAINTENANCE_PLAN | §5.6 | **equipment, planned_start** | plan_type, delay_reason, planned_end, recurrence, status, remarks |
| EXTERNAL_CODE_MAP | §5.7 | **external_system, object_type, external_code, direction** | mes_table, mes_ref / mes_code, external_desc, is_default, effective_from, effective_to |

Common sheet rules: first row = headers exactly as above; blank scope column = applies to all; codes are matched case-insensitively against the referenced master and rejected (row-level) when not found; `effective_from` blank = today; every upload produces the existing preview → warnings → rejected-row report.

## Annex B — Master catalogue (governance content for the deferred console)

| Master | Owner dept (proposed) | Book of record | Surface | Approval | State |
|---|---|---|---|---|---|
| Grade | Customer Quality | MES PC `mes_grades` (SAP source) | MES PC Masters | — | BUILT |
| Grade chemistry / standard limits / standards | Customer Quality | QA | QA masters | maker-checker | BUILT (+ext) |
| Product (SKU), category, routing | PPC | MES PC (SAP source) | MES PC Masters | — | BUILT |
| Form conversion rules | PPC + Customer Quality | MES PC | new | maker-checker | NEW |
| Plant / unit / equipment | Operations | MES PC | MES PC Masters | — | BUILT |
| PSN product type matrix | Customer Quality | QA | new | maker-checker | NEW |
| Departments / roles / privileged actions | IT | MES PC | new | admin | NEW [P1] |
| Length master | PPC (Mills upload) | MES PC (→ Allocator sync) | new | maker-checker | NEW |
| Yield master | PPC | MES PC (→ Allocator sync) | new | maker-checker | NEW |
| Inspection path + rule | Mills QA | QA | QA masters (designed) | role-gated | DESIGNED (+ext) |
| Product family / section band / section load | PPC | MES PC (→ Allocator sync) | new | maker-checker | NEW |
| MoQ rules | PPC | MES PC | new | maker-checker | NEW |
| Ferro-alloy norms / prices / cost category | PPC + SMS | MES PC | new | maker-checker | NEW |
| Process parameters (extended) | Process Control (per unit) | MES PC | MES PC Masters (ext) | maker-checker for PSN rows | BUILT (+ext) |
| Grinding rules / equipment section limits | Customer Quality / Operations | QA / MES PC | new | role-gated | NEW [D-05] |
| Swap rules | PPC | MES PC | new | maker-checker | NEW |
| Customer priority / order-book rules | PPC | MES PC | new | maker-checker | NEW |
| Pit cooling rules / pits | SMS QA | QA | new | role-gated | NEW |
| Colour code (+ map), end discard, dim tolerance, length vocabulary, barcode type (+ scope) | SMS QA / Mills QA | QA | QA masters (designed) | role-gated | DESIGNED (+ext) |
| Sampling rules (+ positions), sample types, size basis | SMS QA / Mills QA / M&M | QA | QA masters | role-gated | BUILT (+ext) |
| Instruments, calibration, instrument types | M&M / Mills QA | QA | QA screens | — | BUILT (+ext) |
| Agencies, inspectors | Mills QA | QA | QA masters / new | role-gated | BUILT / NEW |
| Distribution lists, notification rules | Customer Quality / IT | QA | new / designed | role-gated | NEW / DESIGNED |
| Annealing load rules / HT cycles | PPC / Customer Quality | MES PC / QA | new | maker-checker | NEW |
| PSN segments, attributes, number formats | Customer Quality | QA | new | maker-checker | NEW |
| Batch derivation rules | Operations + PPC | MES PC | new | maker-checker | NEW |
| Defect catalogue (+ reference images), UD vocabulary, test catalogue, suppliers | QA (all) | QA | QA masters | role-gated | BUILT (+ext) |
| Delay/downtime reasons, maintenance plans | Operations | MES PC (→ Allocator sync) | MES PC Masters (ext) / new | — | BUILT (+ext) / NEW |
| External code map | IT | MES PC | new | admin | NEW |
| LOVs (attributes + possible values, custom masters) | per owner | MES PC | MES PC Masters / Custom Master UI | — | BUILT (config) |

## Annex C — Seed vocabularies (data, not code)
- **Route groups (§3.3):** STD Inspection · Double Rolling Route · Annealing Supplies · Annealed Bright Bar Supplies · Bright Bar Supplies · Slow Cooled Material · Auto Inspection Line Route · Inwarded Subcon WIP Material Route.
- **PSN product types (§2.5):** Bar · Wire Rod Coil · RCS · Flat · Hex Bar · Hex Coil · Annealed WRC · Annealed Bar · Bright Bar · HT Bright Bar · Grinding Media (BRD 4.2.1; the workbook's list also names GMM and Semi — reconcile with JSW).
- **PSN segments (§4.10):** Header/Key · Chemistry · Mechanical · Metallurgical · Testing · Annealing · Binding Media · Logistics · Documents · Remarks.
- **PSN format codes (§4.10):** QDQA06 … QDQA41 per supply condition × rolling route × input cast size (JSW to supply the full list).
- **Swap rule seeds (§3.9):** PSN / GRADE / SECTION / INPUT_SIZE exact-blocking; LENGTH ±100 mm soft; CHEMISTRY ignored.
- **Downtime reasons (§5.6):** PLANNED — scheduled maintenance, changeover, shift break; UNPLANNED — mechanical breakdown, electrical breakdown, power failure, material shortage, quality hold, waiting for instruction.
- **Form conversions (§2.3):** S_NBLTW→S_GNDBLTW · S_NBLMW→S_GNDBLMW · S_RBLMW→S_GNDRBLMW · S_RCSBW→S_GNDRCSBW (grinding); gross→net→G&D billet (clearance).
- **Pit cooling classes (§3.11):** 24H · 36H · 48H · 72H; pits CCM2-P1/P2/P3 (cap. 5 each, max 3 concurrent), CCM3-P1.
- **Events added to the notification vocabulary (§4.15):** QA_CALIBRATION_DUE · QA_PIT_CAPACITY_FULL · QA_PSN_APPROVED · MDM_MASTER_CHANGED · MDM_UPLOAD_COMPLETED.
