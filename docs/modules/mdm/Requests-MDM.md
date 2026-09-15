# Request register — Master Data Management design → MES PC and Allocator

**Direction:** the MDM design (`MDM-Data-Model.md`) raises here everything that must change *inside* MES PC (`Bluemingo_MES`) or the Allocator (`allocator_mrp`). Neither product is edited from the design side; the owning team acts on the items. Same rules as `Bluemingo_MES/docs/integration/Requests-From-QA.md`: append, never rewrite · one item = one ask · ids are permanent · raise before the migration. Items are **drafted here** (2026-09-12) and are ready to be filed into the MES PC channel as QA-018 onwards when JSW/Bluemingo confirm the MDM design; the Allocator has no channel file yet — `ALC-R-nn` is proposed as its twin.

**Statuses:** `DRAFT` (this register) → `OPEN` (filed) · `NEEDS_INFO` · `ACCEPTED` · `IN_PROGRESS` · `DONE` · `REJECTED`

**DDL ownership reminder:** `mes_qc_*` belongs to the QA Flyway (designed in the QA `Data-Model.md` §28); **every table below is MES PC's or the Allocator's.**

---

## MES PC (PLATFORM) items

### MDM-R-01 — Product Form Conversion Rules master
**Date:** 2026-09-12 · **From:** MDM design §2.3 · **Status:** DRAFT
**Ask:** new table `mes_form_conversion_rule` (from/to material form, trigger event, operation, order type, supply condition, BOM level, from/to SKU pattern, `sap_executes`, `derivation_rule_id`, priority, effective dates) + a generic-registry Masters screen + upload sheet FORM_CONVERSION_RULE.
**Why:** BRD F12.2-02, 8.12, 10.9 — form-code transitions on clearance / grinding / conversion are hard-coded nowhere today; QA's UD and the path re-match (§3.3) read this rule.
**Affects:** production confirmation (code after confirmation), UD hand-off, charging validation.

### MDM-R-02 — Departments, super-user flag and privileged-action vocabulary `[platform P1 — content only]`
**Date:** 2026-09-12 · **From:** §2.6 · **Status:** DRAFT
**Ask:** new `mes_department`; `mes_user` + `department_id`, `employee_no`, `designation`; `mes_role` + `is_super_user`, `department_id`; new `mes_privileged_action` + `mes_role_privileged_action`. No enforcement asked for now.
**Why:** F12.4-01/02 — the master-data content P1 will enforce; role codes become the single vocabulary QA's notification rules and inspector master reference.
**Affects:** none at runtime until P1.

### MDM-R-03 — Length master (BRM / BLM, Primary / Alternate 1 / Alternate 2)
**Date:** 2026-09-12 · **From:** §3.1 · **Status:** DRAFT
**Ask:** new `mes_length_master` (mill operation, input form/shape/size, output shape/size, SKU, grade series, finished length (+ FK to QA `mes_qc_length_master`), rolled primary/alt1/alt2, pieces, tolerance, market type, derivation, priority, effective dates) + Masters screen with Excel upload (LENGTH_MASTER) + "Sync to MySQL" action like Equipment Linkage.
**Why:** F12.5-01/02, BRD 7.4 — casting plan auto-pick and BRM/BLM auto-map need it; the Allocator's `Mst_Length_Master` is only a finished-length code list.
**Affects:** casting plan (PPC pass), sequencing; Allocator sync (ALC-R-02).

### MDM-R-04 — Yield master (unit × product / output section, gross vs net)
**Date:** 2026-09-12 · **From:** §3.2 · **Status:** DRAFT
**Ask:** new `mes_yield_master` (S-scoped, `yield_basis`, `yield_pct`, `loss_breakup_json`, source, priority, effective dates) + Masters screen + upload YIELD_MASTER + a nightly job proposing CALCULATED rows from the Rolling Yield report data.
**Why:** F12.6-01…04, F7.11-01/02 — BTR/BTC and dependent demand must factor yield per step; today only a report exists.
**Affects:** BTR/BTC computation (PPC pass); Allocator `Total_Yield` (ALC-R-03).

### MDM-R-05 — Product family, section bands and section load
**Date:** 2026-09-12 · **From:** §3.4 · **Status:** DRAFT
**Ask:** new `mes_product_family`; `mes_category_rolling_size` + `family_id`, `product_category_id` (and load the Allocator's 28 section-band rows); new `mes_section_load`; screens + uploads PRODUCT_FAMILY / SECTION_BAND / SECTION_LOAD.
**Why:** F12.11-01 — rolling-sequence finalisation validates family blocks against a defined load.
**Affects:** sequencing (PPC pass); Roll Management (roll-set code) later.

### MDM-R-06 — MoQ validation rules
**Date:** 2026-09-12 · **From:** §3.5 · **Status:** DRAFT
**Ask:** new `mes_moq_rule` (unit, rule type, S scope, min qty + unit, enforcement BLOCK / WARN_WITH_REMARK, override action, priority) + screen + upload MOQ_RULE.
**Why:** F12.11-02 — mandatory BRM remark when MoQ is not met needs a rule to test against.
**Affects:** casting plan and sequence finalisation (PPC pass).

### MDM-R-07 — Ferro-alloy norms, consumable prices, grade cost category
**Date:** 2026-09-12 · **From:** §3.6 · **Status:** DRAFT
**Ask:** `mes_consumables` + `consumable_category`, `sap_material_code`; new `mes_ferro_alloy_norm`, `mes_consumable_price`, `mes_grade_cost_category`; screens + uploads.
**Why:** F12.16-01, BRD 7.7 FER-01…11, CMG-003 — monthly FeAl requirement and variance need a norm per tonne by grade/PSN, a price feed and A/B/C/D categories.
**Affects:** FeAl planning screens (PPC pass); consumption variance (Operations pass).

### MDM-R-08 — Process Parameter master: equipment + grouping keys + validation mode
**Date:** 2026-09-12 · **From:** §3.7 · **Status:** DRAFT
**Ask:** `mes_process_attributes` + `equipment_id`, `tdc_id`, `grade_series`, `grade`, `product_category_id`, `shape`, `size_min/max`, `validation_mode`, `is_critical`, `display_sequence`, `corrected_value_capture`, `priority`, effective dates; the Process Attributes Masters screen shows the new columns; resolution by the most-specific active row.
**Why:** F12.17-01/02, BRD §5.1 — one master serves unit-wise parameters and PSN-wise validation; the band already exists.
**Affects:** production-confirmation parameter capture (reads the resolved row set); Process Control pass designs the deviation runtime.

### MDM-R-09 — Equipment section limits (machine capability)
**Date:** 2026-09-12 · **From:** §3.8 · **Status:** DRAFT `[assumption — D-05]`
**Ask:** new `mes_equipment_section_limit` (equipment, capability code, shape, size band, length/weight limits, grade series, `is_allowed`) + screen + upload.
**Why:** F12.22-01 — ABGM section limitation as a hard rule at reallocation; generic for other machines.
**Affects:** ABGM scheduling / charging validation (PPC and Operations passes).

### MDM-R-10 — Swap rules and compatible values
**Date:** 2026-09-12 · **From:** §3.9 · **Status:** DRAFT
**Ask:** new `mes_swap_rule`, `mes_swap_compatible_value` + screen + uploads; seed the six BRD 4.1.3 rules.
**Why:** F12.23-01, F7.12-05 — manual/auto/reverse swap validation must be data.
**Affects:** swapping transaction (PPC pass).

### MDM-R-11 — Customer priority, order-book rules, order hold reasons
**Date:** 2026-09-12 · **From:** §3.10 · **Status:** DRAFT
**Ask:** new `mes_customer_priority`, `mes_order_book_rule`; `mes_hold_reasons.applied_at` gains value `Order` and the table gains `requires_action_code`; screens + uploads.
**Why:** F12.24-01 — BTP/BTD/OTIF derivation, priority tiers and hold/release configuration for the super-user screen.
**Affects:** order book screens (PPC pass).

### MDM-R-12 — Annealing load rules (+ two attribute rows)
**Date:** 2026-09-12 · **From:** §4.9 · **Status:** DRAFT
**Ask:** new `mes_annealing_load_rule` + screen + upload; add `mes_global_attributes` rows "Annealing Type" and "Product Type" flagged `use_for_speed` so `mes_equipment_speed` carries type-wise rates (data only).
**Why:** F12.21-01 — grade-load combinations per furnace; rate and capacity reuse existing tables.
**Affects:** annealing scheduling (PPC pass).

### MDM-R-13 — Batch derivation rules
**Date:** 2026-09-12 · **From:** §4.11 · **Status:** DRAFT
**Ask:** new `mes_batch_derivation_rule`, `mes_batch_derivation_characteristic` (FK to `mes_batch_number_generation_config`) + screen + uploads.
**Why:** F12.15-01, BRD 8.11/8.12/10.9 — batch numbering on split/merge/conversion and the characteristic derivation for the later SAP batch-characteristic update.
**Affects:** batch generation, split/merge (Operations pass); QA UD hand-off.

### MDM-R-14 — Downtime reason hierarchy and equipment maintenance plan
**Date:** 2026-09-12 · **From:** §5.6 · **Status:** DRAFT
**Ask:** `mes_delay_reasons` + `downtime_class`, `parent_delay_reason_id`, `operation_id`, `equipment_id`, `is_roll_related`, `affects_oee`, effective dates; new `mes_equipment_maintenance_plan`; Delay Reasons screen shows the hierarchy; new Maintenance Plan screen.
**Why:** F12.3-02 (dup 2), BRD 9.16 DWN-001 — planned vs unplanned with a reason hierarchy per unit; maintenance windows for planning.
**Affects:** production confirmation delay capture; Operations pass (downtime capture, OEE); Allocator availability (ALC-R-04).

### MDM-R-15 — External code map (SAP / SFDC / LIMS codes)
**Date:** 2026-09-12 · **From:** §5.7 · **Status:** DRAFT `[integration deferred — design part only]`
**Ask:** new `mes_external_code_map` + screen + upload EXTERNAL_CODE_MAP.
**Why:** BRD F13.1-09/10 — every interface resolves codes from data; the Allocator's `SAP_*` tables are order-side and unrelated.
**Affects:** SAP order feed and postings (Integration, later); form conversion `sap_executes`.

### MDM-R-16 — Custom Master registry approvals and LOV attributes (configuration)
**Date:** 2026-09-12 · **From:** §4.16 · **Status:** DRAFT
**Ask:** approve the new MDM tables in `master_table_registry`; add VALUE-type attributes Packing Type, Strapping, Binding Media, Supply Condition, Rolling Route, Market, Cost Category with possible values; enforce "in-use value cannot be deleted" on `mes_attribute_possible_value` via a where-used check.
**Why:** F12.12-01, F1.1-12 — dropdown masters for PSN attributes without code.
**Affects:** Custom Master UI, attribute pickers.

### MDM-R-17 — Register the new masters with master search and the audit log (configuration)
**Date:** 2026-09-12 · **From:** §5.3, §5.4 · **Status:** DRAFT
**Ask:** add the MDM and QA masters to `MasterSearchController`'s entity list; return referencing tables + counts (where-used) for a master row; register every new table as an audited entity.
**Why:** F12.0-03/04 — search, cross-reference before deactivation, audit trail for all masters.
**Affects:** header search, Reports › Audit Logs filters.

---

## Allocator items

### ALC-R-01 — Migrate finished-length vocabulary
**Date:** 2026-09-12 · **From:** §3.1 · **Status:** DRAFT
**Ask:** export the 7,835 ranged rows of `Mst_Length_Master` with unit normalisation (values < 1,000 are metres → mm) for loading into QA `mes_qc_length_master` / `mes_length_master.finished_length_mm`; confirm with JSW whether this set is authoritative (open point 1).
**Why:** avoid re-keying 7,800 lengths; the Allocator table's group/type/tolerance columns are empty, so only the ranges carry information.

### ALC-R-02 — Read rolled lengths from MES
**Date:** 2026-09-12 · **From:** §3.1 · **Status:** DRAFT
**Ask:** receive `mes_length_master` by the MES PC → MySQL sync and use its Primary / Alternate lengths in place of `mst_planning_length_rules` for JSW (the rules table stays for non-JSW deployments).
**Why:** one book of record for rolled lengths (M-06).

### ALC-R-03 — Yield from MES
**Date:** 2026-09-12 · **From:** §3.2 · **Status:** DRAFT
**Ask:** populate `Operation_Yield` and derive `Mst_Allocation_Matrix.Total_Yield` from the synced `mes_yield_master` (resolution by the most-specific row) instead of hand-maintained values.
**Why:** MRP and BTR/BTC must use the same yield numbers.

### ALC-R-04 — Equipment availability from MES maintenance plans
**Date:** 2026-09-12 · **From:** §5.6 · **Status:** DRAFT
**Ask:** fill `EquipmentHoliday` / `Equipment_Availability_Calender` (both empty) from synced `mes_equipment_maintenance_plan` windows.
**Why:** planner capacity should exclude planned downtime; `EquipmentMaintenance` (liquid-blending leftover) must not be used.
