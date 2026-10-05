# Composite Material Route — cross-module design note (2026-09-30)

Design item raised by JSW after the SMS QA review: today the plant has a **process route** and, separately, an **inspection route**, resolved from different keys and never joined. The requirement is **one composite material route, resolved from the PSN plus the order attributes**, that says for a given material which operations it passes and what quality work each of those operations owes.

This note is the design source for the item. It is cross-module: Planning and Master Data own the stages, the Quality module owns the quality content of each stage, Operations executes them, and the platform changes are raised as requests (RTE-R-01…07). Nothing in the production-confirmation or Allocation applications is changed directly.

## 1. Decisions taken (30-Sep-2026)

- **D-RTE-1 — Build:** the PSN and the order attributes become routing axes of the existing attribute-scoped process routing; a **composite route instance** then binds the resolved process route and the resolved inspection path stage by stage, carrying the quality content on each stage. The platform's routing master is not replaced and the pulpits keep their next-operation logic.
- **D-RTE-2 — Granularity:** the route is resolved and pinned **per order line at release**; batches produced against the line inherit it (R-RTE-05).
- **D-RTE-3 — Conditional stages:** pit cooling, ABGM grinding, hot-out re-roll, salvage re-entry and supplementary inspection are **stages of the route** with their trigger written on the stage, not separate mechanisms.
- **D-RTE-4 — Ownership:** stages and equipment belong to Planning and Master Data; the inspection, test, sampling and clearance content of a stage belongs to Customer Quality with the PSN.

## 2. What exists today (the starting point)

- **Process route (platform, running, with its own screens):** maintained today on **Standard Routing** (the operation chain), **Production Routing** (read-only: routing, process, chain and one column per routing attribute) and **Double Routing Attribute** (equipment rows and their input-to-output rules); axis values are set by the wide-attribute Excel import or the API. `mes_process_routings` + `mes_operation_routings` (131 rows), attribute-scoped through `mes_routing_attr_value` on Shape, Execution, Grade group, HTC Code, HT Condition, Customer FG Size and Customer Length; equipment routing `mes_operation_equipment_routing` + `mes_oer_rule`; equipment linkage `mes_equipment_linkage`. The route is keyed by **size and grade, not by PSN**.
- **Runtime pointer (platform, running):** `mes_inventory.prev_operation` / `next_operation` / `routing_complete`, with `mes_route_deviation` (Operations design) recording a runtime choice that differs from the scheduled route.
- **Inspection route (Quality, designed):** `mes_qc_inspection_path` + `mes_qc_inspection_path_stage` (ordered stages keyed by the same operation codes) + `mes_qc_path_rule` (priority matrix on SO characteristic, PSN, customer, grade, product form, supply condition) allocating one path per lot into `mes_qc_material_path`.
- **Quality content per operation (Quality, designed):** `mes_qc_stage_qc_map` (what is inspected or tested at an operation, product-scoped, with the raise condition added in the SMS review), `mes_qc_sampling_rule` (already carrying `path_id`), the clearance gates of `mes_qc_clearance`.
- **The finder, precisely:** `mes_global_attributes` defines every attribute once with a `column_reference` naming the physical slot it occupies, plus flags for where it may be used (order, routing, inventory, speed) and its matching criteria. The order line's values sit in `mes_order_attr_value` / `_range`, a routing's conditions in `mes_routing_attr_value` / `_range`, the material's own values in `mes_inventory_attr_value` — same slots, so matching is a column comparison: a discrete slot must equal, a range slot must fall inside min and max, an empty slot is a wildcard. The winning routing is stamped on `mes_order_line_items.routing_id`.
- **The per-material stage rows already exist:** scheduling materialises the routing as `mes_schedule_material_childs` — one row per material and operation with `planned_seq`, `planned_equipment_id` and the order line. The composite route therefore must not create a second copy of them; it is the stable plan those rows reference (R-RTE-08).
- **For heats released by the Allocation application the operation chain comes from there**, imported into the same schedule structure, not resolved from the routing master. Which of the two speaks for a given material is OPEN-RTE-5.
- **Live state (checked 01-Oct-2026):** `mes_qc_stage_qc_map` exists with 3 demo rows (Ambica operations), `mes_qc_sampling_rule` 3 rows, `mes_qc_inspection` 6 rows; `mes_qc_inspection_path`, `mes_qc_path_rule` and `mes_qc_material_path` **do not exist in the database** — the inspection route is design-only. Filling the Stage-QC Map with JSW content is a master-data exercise, not a build task, and it decides whether the route means anything on day one.
- **PSN already drives fragments:** annealing route by PSN and annealing type, ABGM by `mes_qc_grinding_rule`, pit cooling by `mes_qc_pit_cooling_rule`, sampling by rule with `path_id`, form conversion by `mes_form_conversion_rule`. The composite route is where these stop being fragments.

## 3. The model

### 3.1 Routing axes (extension of the running mechanism)
- `mes_routing_attr_value` gains the axes **PSN** (`tdc_id`, and `psn_no` for display), **product type** (`product_type_id`), **supply condition**, **rolling route**, **annealing type**, **market**, **order type** and **BOM level**. The existing axes stay. Resolution keeps the platform's own semantics: the most specific active routing wins, blank axes are wildcards (RTE-R-01).
- The inspection-path matrix `mes_qc_path_rule` keeps its axes and gains **product type** and **order type** so both sides can be driven from the same attribute set (R-RTE-02).

### 3.2 `mes_material_route` — the composite instance (platform; RTE-R-02)
- **`mes_material_route`** — `route_id` PK · `order_line_id` FK `mes_order_line_items` · `production_order_id` FK `mes_production_order` (Y) · `tdc_id` FK `mes_tdc_input` (the PSN the route was resolved from) · `psn_revision_no int` (Y — the revision pinned at release) · `process_routing_id` FK `mes_process_routings` · `path_id` FK `mes_qc_inspection_path` · `resolved_from_json jsonb` (the attribute values that decided it — audit of the resolution) · `status varchar(20)` (PLANNED / ACTIVE / COMPLETED / CANCELLED) · `resolved_at timestamptz` · `resolved_by bigint` · **+ audit tail**.
- **`mes_material_route_stage`** — `route_stage_id` PK · `route_id` FK `mes_material_route` · `sequence_no int` · `operation_id` FK `mes_operations` · `unit_group varchar(30)` (Y — e.g. AUTOLINE) · `equipment_id` FK `mes_equipments` (Y — when the routing pins one) · `stage_kind varchar(20)` (PROCESS / QUALITY / BOTH) · `condition_type varchar(20)` (ALWAYS / RULE / OUTCOME / MANUAL) · `condition_ref varchar(100)` (Y — the rule or finding that triggers it, e.g. a grinding-rule code) · `is_mandatory boolean` · `qc_content_json jsonb` (the pinned quality content — inspection and test items with their limit source, sampling rule, clearance gates, raise conditions) · `expected_form_conversion_id` FK `mes_form_conversion_rule` (Y) · `tally_required varchar(20)` (NONE / STAGE / HEAT, default NONE — whether the stage owes a production tally: STAGE reconciles what entered the stage against what left it, HEAT reconciles what was produced for the heat against everything Quality has decided) · `tally_basis varchar(10)` (Y — PIECES / WEIGHT / BOTH — the quantity basis the reconciliation is done on, so a plant that works in weight never sees a piece column) · `tally_tol_pieces int` (Y, default 0 — a piece variance within this is not a mismatch) · `tally_tol_weight_pct numeric(5,2)` (Y, default 0.50 — a weight variance within this percentage is not a mismatch; never empty when the basis includes weight) · `status varchar(20)` (PLANNED / TRIGGERED / IN_PROGRESS / DONE / SKIPPED) · `skip_reason varchar(255)` (Y) · `planned_start` / `actual_start` / `actual_end timestamptz` (Y) · `confirmation_id` FK `mes_production_confirmation` (Y) · **+ audit tail**.
- `mes_route_deviation` gains **`route_stage_id` FK `mes_material_route_stage`** (Y) so a runtime diversion is recorded against the stage it left.
- `mes_inventory` gains **`route_id` FK `mes_material_route`** (Y) and **`route_stage_id`** (Y — the stage the material is at); `next_operation` stays the runtime pointer and is set from the route (RTE-R-03).

### 3.3 Quality content of a stage
The `qc_content_json` of a stage is resolved at release from the Quality masters and pinned, so a later master change never rewrites material in flight:
- the active `mes_qc_stage_qc_map` rows for the operation and the product scope, each with its kind, type, characteristic, limit source, mandatory flag, capture source, default mode and raise condition;
- the `mes_qc_sampling_rule` rows matching the operation and the path, with their draw positions;
- the clearance dimensions the stage must satisfy before release (chemistry, mechanical, physical, NDT);
- the hold behaviour on failure (hold, salvage entry, NCR).
The Quality module resolves and owns this content; Planning and Master Data own everything else on the stage.

### 3.4 What a stage actually carries — material-bound work, draws and gates
A test and an inspection are different records: an inspection is recorded against the material (heat, batch, charge or piece) at an operation; a test is recorded against a sample in the laboratory. The boundary that matters for the route is not the word but **where the work happens**:
- **Material-bound checks** need the material at the operation — visual, dimensional, marking and colour, and the methods done on the material itself such as the spark test on a piece, hardness on a bar, or the ultrasonic, flux-leakage and eddy-current units of the auto line. These are stage content.
- **Sample-bound tests** leave the material's path: the sample travels, the material does not. The laboratory is therefore **not a stage of the material route**; its own flow — receipt, preparation, testing, retest, resample — stays outside.
A sample-bound test still leaves two marks on the route, and both must be planned:
1. **The draw** — at this stage, pull samples by this sampling rule, at these positions. A material event at a real operation.
2. **The gate** — this stage releases only when the results of those tests are in and pass. The gate often sits at a **later** stage than the draw (sample at casting, mechanical gate before final clearance).
Each stage therefore carries: material-bound checks owed, sampling obligations, the clearance gates that must be satisfied to leave it with the draws that feed them, and a **wait state distinct from pending inspection** — material parked for a laboratory result rather than for an inspector.

## 4. Rules

- **R-RTE-01 — Resolution at release:** when an order line is released (release quantity set, production orders created), the route resolves in one pass: (a) the process routing from the extended attribute set, PSN first; (b) the inspection path from its matrix; (c) the stage list by merging the two on the operation code — an operation in both is one stage of kind BOTH, an operation only in the process route is PROCESS, an inspection-path stage with no process operation (bench inspection, lab stage) is QUALITY; (d) the quality content of each stage pinned as above; (e) the conditional stages added in their route position. The attribute values used are stored on the route for audit.
- **R-RTE-02 — Fallbacks, so resolution never fails:** no PSN-specific routing leaves the existing size and grade routing in force; no matching path rule allocates the standard path STD; an operation with no active Stage-QC Map row is a process-only stage. A route is always produced, and the fallbacks used are visible on it.
- **R-RTE-03 — Execution:** the pulpits keep choosing the next operation as they do now; the route stage is the reference the choice is compared against. A confirmation at an operation sets the stage to DONE and the inventory pointer to the next planned stage. A choice that differs writes a route deviation against the stage it left, which Planning sees on the schedule.
- **R-RTE-04 — Conditional stages:** a conditional stage is planned but not owed until its trigger fires. RULE triggers come from a master (the grinding rule sends the batch to ABGM at SMS final clearance; the pit-cooling rule adds the pit stage when cooling hours resolve). OUTCOME triggers come from a result (a hot-out declaration adds the hot-out clearance stage and the re-roll return; a failed clearance adds the salvage re-entry; a supplementary inspection adds its own stage). MANUAL triggers are added by a named role with a reason. An untriggered conditional stage ends as SKIPPED with its reason; nothing silently disappears.
- **R-RTE-05 — Batch inheritance:** batches produced against the order line carry its `route_id`. A split inherits the parent's route and stage position; a merge is allowed only between batches on the same route, otherwise the merge asks for the route to keep (audited). A batch that leaves its route — a divert at the usage decision or a hot-out decision — records a deviation and continues on the same route instance with the new stage position.
- **R-RTE-06 — PSN revision:** the route pins the PSN revision it resolved from. A new PSN revision does not rewrite a running route; it applies to order lines released afterwards. Where Quality judges the change safety-relevant, the route can be re-resolved for material not yet started, which supersedes the instance and is audited (OPEN-RTE-2).
- **R-RTE-07 — Inspection content ladder:** the quality content of a stage resolves in a fixed order and the level used is stored on the stage, so "why was this not inspected" is always answerable. (1) The PSN or TDC required tests and characteristics with their standards and limits, placed on stages by the map; (2) the Stage-QC Map rows for the operation and product scope — the plant's standard inspection route; (3) the operation floor — a catch-all map row scoped to the operation with a blank product scope, which generates a generic inspection of the operation's default type so nothing passes unexamined; (4) nothing, allowed but recorded with its reason. A report lists every stage that resolved at level 3 or 4 for Quality to review before production.
- **R-RTE-08 — Draw and gate pairing, and the unplaceable requirement:** a test required by the PSN is placed as a pair — the stage that draws the sample and the stage whose gate consumes the result. If the route hosts neither, resolution **fails at release** with the requirement named, rather than surfacing later as an unexplained hold. The expected laboratory turnaround is carried on the gate (OPEN-RTE-7).
- **R-RTE-09 — Late resolution:** material that has no release-time route — raw-material inward, salvage re-entry, hot-out pieces, trial and development heats, job work — and stages created at run time by a diversion or by operation assignment resolve their content at confirmation using the same ladder, with the level recorded and the route updated so the plan matches what happened. A PSN attached after release re-resolves the stages not yet started.
- **R-RTE-10 — The route plans, the schedule executes:** the composite route is the stable plan; `mes_schedule_material_childs` stays the executable per-material row set and references the route stage it realises. Scheduling may void and recreate children; the route stage and its history do not change with them.
- **R-RTE-11 — Visibility:** one screen shows the route of an order line or a batch: the stages in order with their kind, condition, status, the quality content owed and given, the deviations and the skipped stages with reasons. The QC worklist keeps its path chip, now naming the route stage.

## 5. Ownership

| Part | Maintained by | Where it lives |
|---|---|---|
| Process routing and its attribute axes | PPC with Master Data | Platform routing master (Master Data design) |
| Equipment routing and linkage | PPC with Operations | Platform, unchanged |
| Inspection path and its matrix | Customer Quality | Quality module, unchanged |
| Quality content per operation (Stage-QC Map, sampling, clearance) | Customer Quality | Quality module, unchanged |
| Composite route instance and its stages | Resolved by the system, not maintained by hand | Platform (RTE-R-02) |
| Conditional triggers | The owning master (grinding, pit cooling, hot-out, salvage) | As designed today |

## 6. Screens

- **Material Route (new)** — per order line and per batch: the stage list with process and quality content side by side, status, conditional stages fired or skipped, deviations, and the attribute values the resolution used. Placed in Planning, read-only in the Quality family.
- **Routing master (extension)** — the attribute axes gain PSN, product type, supply condition, rolling route, annealing type, market, order type and BOM level; maintained by PPC with Master Data. Until now the routing master was data-loading only.
- **Inspection Path master (extension)** — two axes added to the matrix; unchanged otherwise.
- **QC Worklist** — the path chip names the route stage and links to the Material Route screen.

## 7. Change requests

| Request | Subject |
|---|---|
| RTE-R-01 | Routing attribute axes: PSN, product type, supply condition, rolling route, annealing type, market, order type, BOM level on `mes_routing_attr_value`, with the existing resolution semantics |
| RTE-R-02 | Composite route instance `mes_material_route` + `mes_material_route_stage`, resolved at order-line release and pinned |
| RTE-R-03 | `mes_inventory` gains `route_id` and `route_stage_id`; the next-operation pointer is set from the route stage |
| RTE-R-04 | `mes_route_deviation` gains `route_stage_id` |
| RTE-R-05 | Conditional stage insertion on a rule or outcome trigger, and the skip with reason |
| RTE-R-06 | Batch inheritance of the route on production, split and merge |
| RTE-R-07 | The Quality module resolves and pins the quality content of each stage at release, and reads the stage status back |

## 8. Open items

- **OPEN-RTE-1** — whether Planning schedules capacity from the composite route (including conditional stages at a probability) or continues to schedule from the process route alone. Proposed default: schedule from the process route; conditional stages are shown but not costed.
- **OPEN-RTE-2** — whether a PSN revision may re-resolve the route of material already released but not started. Proposed default: only on a Quality decision, audited, superseding the instance.
- **OPEN-RTE-3** — the merge rule when two batches on different routes must be merged. Proposed default: refuse unless a named role picks the surviving route with a reason.
- **OPEN-RTE-5** — for heats released by the Allocation application, whether its operation chain or the routing master decides the process stages when both speak. Proposed default: the Allocation application's chain wins for the material it releases, and the routing master supplies any stage the chain does not name.
- **OPEN-RTE-6** — where the operation floor lives: a catch-all Stage-QC Map row in the Quality master, or a flag on the platform operation. Proposed default: the catch-all row, so the master that decides what to inspect is the only source and no platform change is needed.
- **OPEN-RTE-7** — whether Planning carries the expected laboratory turnaround as lead time on the gate, so the schedule shows the wait. Proposed default: carry it.
- **OPEN-RTE-8** — whether the quality content pinned at release may be refreshed when a master is corrected mid-flight. Proposed default: pinned, with an explicit, audited refresh action for stages not yet started.
- **OPEN-RTE-4** — whether the lab stages of the inspection path (bench inspection, laboratory testing) appear as QUALITY stages in the route or stay outside it. Proposed default: they appear, so the route is the whole story.

## 9. Impact on the existing designs

| Document | Change |
|---|---|
| Master Data | The three routing screens that run today gain the new attribute axes, maintainable axis values, the specificity tie-break and the deactivation guard; the note that routing is data-loading only is withdrawn |
| Planning | Route resolution at order-line release; the Material Route screen; the route reference on the schedule and on WIP visibility |
| Operations | The pulpit next-operation choice compares against the route stage; deviations carry the stage; hot-out and ABGM become conditional stages of the route |
| Quality | The inspection path allocation feeds the route rather than standing alone; the worklist path chip names the route stage; the quality content of each stage is pinned at release |
| Customer Quality / PSN | The PSN is a routing axis; a revision pins per route (R-RTE-06) |
