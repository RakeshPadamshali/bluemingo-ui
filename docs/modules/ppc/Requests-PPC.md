# Request register — PPC module → the production-confirmation application

## PPC as a separate module (22-Oct-2026)
PPC is now a separate module, built like the Quality module: its own tables `mes_ppc_*` in its own migration history, its own screens and backend. It reads the shared database and writes to the production-confirmation application only through the services that application's screens already use; the production-confirmation application and the Allocation application stay unchanged, because another client (Ambica) runs them as they are. This register therefore holds four change requests to the production-confirmation application — PPC-R-32 … PPC-R-35, each off by default or behaviour-identical for Ambica — and none to the Allocation application. Every earlier request (PPC-R-01 … PPC-R-31, ALC-R-05 … ALC-R-08) is withdrawn and kept below as history with where it went (`PPC-Data-Model.md` §21).

**Direction until 21-Oct-2026 (history):** the PPC design (`PPC-Data-Model.md`) is a platform design: every table lives in the production-confirmation application (`Bluemingo_MES`), so the whole design is raised here as change requests to the platform team; the Allocator receives four alignment items. Same rules as the other registers (append, one item = one ask, permanent ids, raise before the migration). Drafted 2026-09-15.

**Statuses:** `DRAFT` → `OPEN` · `NEEDS_INFO` · `ACCEPTED` · `IN_PROGRESS` · `DONE` · `REJECTED` · `WITHDRAWN`

---

## Change requests to the production-confirmation application

### PPC-R-32 — Swap bridge
**Date:** 2026-10-22 · **From:** §21.2 (R-PPC-122, R-PPC-123) · **Status:** DRAFT
**Ask:** a code-only service, switched by an application setting that is off by default — no table and no screen change. PPC calls it after the Allocation application has released batch X to order line B. The service cross-checks that release through the allocator read connection the application already has and then, in one transaction: deactivates the lot's active `mes_order_inventory` row for the old line and adds one for the new line (history kept — the table never deletes); re-points the lot's remaining `mes_schedule_material_allocations` rows and the `mes_schedule_material_childs.order_line_id` copy; recomputes pending for both lines; writes `mes_audit_log` with the PPC swap reference. No-op when the lot is already on B; refuses a lot consumed, dispatched or on hold, or a closed target line. It also gives a new lot its first order (bought billets and blooms through PPC-R-34, migrated stock, ISO orders before release). Whole lots only for now — part-lot swap is an open point.
**Why:** swaps are decided in PPC and executed by the Allocation application (deallocate → set-release-block → run → allocate), but the Allocation pull never touches a heat once generated, so a produced lot's order link — `mes_order_inventory`, written at confirmation — has no path to the new order; no existing service adds or moves a link (only the deallocate that salvage uses).
**Affects:** the swapped lot's order-inventory, schedule-allocation and child order-line records; the pending quantity of both lines; the audit log. No screen.
**Ambica:** unchanged — off by default.

### PPC-R-33 — Scan to charge
**Date:** 2026-10-22 · **From:** §21.3 (R-PPC-126) · **Status:** DRAFT
**Ask:** an installation-level application setting, off by default (user: "per installations"), that shows a scan box on the existing Charging screen: the scanned lot is selected from the list and charged as today through the same service, or the screen says why it is not chargeable — not in today's sequence, not cleared by Quality, already charged, not at this mill. No order logic, no pegging, no table.
**Why:** the charging pool has no scan path; JSW charges by label scan (BRM-007 / 008), and with the existing `require_sequencing_before_charge` switched on the scan finds the lot PPC released or tells the operator why not.
**Affects:** the Charging screen (the scan box while the setting is on); the charge service is unchanged.
**Ambica:** unchanged — off by default.

### PPC-R-34 — Billet / bloom lot from the accepted receipt
**Date:** 2026-10-22 · **From:** §21.6 (R-PPC-133); successor of PPC-R-26 · **Status:** DRAFT
**Ask:** switched by an application setting, off by default: when the Quality module accepts a purchased or customer-supplied billet or bloom receipt, create the lot at the mill's charging stage with what the receipt holds (supplier heat, form, grade, section, quantity, pieces, certificate chemistry). The lot's order comes through the Allocation application and the swap bridge (PPC-R-32).
**Why:** no receipt → lot path exists today — the Quality inward never creates a lot, and the only lot creator, the inventory upload, is wired to the Ambica installation (code); bought and transferred billets and blooms must reach charging with their order (BRD V5 §7 additional requirements; checkpoint PPC-06).
**Affects:** lot creation on Quality acceptance; the Quality receipt screens are unchanged.
**Ambica:** unchanged — off by default.

### PPC-R-35 — Remove the Ambica code wiring in the "fix now" paths
**Date:** 2026-10-22 · **From:** §21.5, §21.11 (R-PPC-130, R-PPC-142) · **Status:** DRAFT
**Ask:** resolve codes from master data instead of the fixed Ambica wiring in schedule building (`dumpPlan`, both `equipmentFor`), the Allocation pull, the casting-plan import, the inventory upload (factory id map, "AMB-" forms) and the order upload's naming rules (SKU naming, fixed attribute names, post-process codes). A product fix, not a switch.
**Why:** a JSW installation cannot use these paths as they are — they carry the casting-plan sheet PPC posts (§21.5), SMS batch arrival (§21.11), the one-time stock migration and the order forwarding (§21.7); every schedule builder resolves codes as "AMB-" + code (code).
**Affects:** the five paths named; no table, no screen.
**Ambica:** behaviour identical — Ambica's codes resolve to the same values from its master data.

---

## Backlog — product clean-up (noted 22-Oct-2026, not yet a request)
Widen the clean-up of PPC-R-35 to all 42 core files of the production-confirmation application (~170 code lines: AMB prefix 125, fixed attribute names 31, fixed operation names 14, id maps 2), proven on a non-Ambica test installation with JSW masters. Ambica-only reports and Ambica seed data in migrations stay backlog. User: "keep a note, will work on it later".

---

## Withdrawn requests (history)
Every request below was withdrawn on 22-Oct-2026 when PPC became a separate module; the text is kept as it was raised, with a first line saying where it went.

| Withdrawn | Where it went |
|---|---|
| PPC-R-01 … 06, 09 … 15, 17, 18, 21 … 25, 28, 29, 31 | moved into the PPC module — `mes_ppc_*` tables, hand-offs through existing services (data model §21) |
| PPC-R-09 (produced lots), PPC-R-26 | superseded by PPC-R-32 (swap bridge) and PPC-R-34 (billet / bloom lot from the accepted receipt) |
| PPC-R-19, PPC-R-20 | replaced by the existing `require_sequencing_before_charge` setting + PPC-R-33, and by lot holds through the existing service |
| PPC-R-07 | replaced by SMS batch arrival — Route B, replayed through existing services (§21.11) |
| PPC-R-27 | deferred and PPC-owned — one PPC outbox once the SAP contract exists (§21.9) |
| PPC-R-08, PPC-R-16, PPC-R-30 | dropped — no platform columns: swap fields on `mes_ppc_swap_line`; location, restricted and charge status read; code state derived (`v_ppc_lot_code_state`) |
| ALC-R-05, ALC-R-08 | superseded — swaps and order blocks through the Allocation application's existing services |
| ALC-R-06, ALC-R-07 | dropped — allocation stays delivery-date-first; no scheduled pull |

**Production-confirmation application items (raised 2026-09-15 … 2026-10-21)**

### PPC-R-01 — Order header and line extensions; order categories and SAP order types
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_order` and `mes_ppc_order_line` (data model §2.1); orders PPC creates reach `mes_orders` through its forwarding to the existing order upload (§21.7).
**Date:** 2026-09-15 · **From:** PPC design §2.1, §2.7, §2.8 · **Status:** DRAFT
**Ask:** `mes_orders` + `order_category`, `sap_order_type`, `sap_order_no`, `sap_status`, `sap_status_at`, `reference_order_id`, `planning_relevant`, `planning_override_by`, `marketing_rank`, `trial_flags_json`, `plant_of_supply`, `job_work_vendor_id`, `received_at`; `mes_order_line_items` + `psn_no`, `section_shape`, `section_size`, `input_section`, `grinding_required`, `length_tolerance_mm`, `release_qty` (+ by / at), `dispatched_qty`, `fgho_qty`, `rejected_qty`, `diverted_qty`, `short_closed_qty`, `hold_status`, `slot_score`, `sla_delivery_date`, `otif_status`, `flags_json`; Orders screen shows category / type / flags; creation of ISO / internal / NCO / trial orders by PPC (with-reference inherits attributes).
**Why:** BRD OMB-001…006, 7.1.3, F7.1-07/09 — one order book for planning, balances, allocation and campaigns.
**Affects:** Orders screen and import; order-data post-process; QA reads `psn_no`.
**Amended 2026-10-13:** `hold_status` withdrawn — the hold state is the existing line `status` ON_HOLD / BLOCKED (§19.2 R-PPC-57); `sap_status` gains LOCKED; `mes_orders` + `capa_id`.

### PPC-R-02 — MES production orders split from the SAP order
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_production_order`; the queue link is `mes_ppc_queue_link.production_order_id` (§4.6), no column on `mes_schedule_materials`.
**Date:** 2026-09-15 · **From:** §2.2 · **Status:** DRAFT
**Ask:** new `mes_ppc_production_order`; `mes_schedule_materials.production_order_id`; the sum of a line's active production orders ≤ `release_qty`; the Confirmation queue keeps reading schedules.
**Why:** BRM-011 — partial release and separate MES production orders per unit.

### PPC-R-03 — Stage balances (BTC / BTR / BTP / BTD / OTIF) as a computed snapshot
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_order_stage_balance` and `mes_ppc_order_link`; the per-shift job runs in PPC's own backend.
**Date:** 2026-09-15 · **From:** §2.3, §3.4 · **Status:** DRAFT
**Ask:** new `mes_ppc_order_stage_balance` and `mes_ppc_order_link`; a per-shift scheduled job (the application has no scheduler today — add one) plus event triggers on confirmation, usage decision, swap, amendment and inter-plant receipt; yields resolved from `mes_yield_master` (MDM-R-04); OTIF from the order-book rules; dependent-demand links per upstream unit.
**Why:** OMB-007…011, BRM-010, F7.11-01, F7.10-01 — every screen and report reads one balance.

### PPC-R-04 — Inbound order staging and SAP status guard (MES side only)
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_order_inbound` with `mes_ppc_order_upload` — PPC's order upload, validated in PPC and forwarded through the existing order upload (§21.7); the SAP and FP sources wait for their integration details.
**Date:** 2026-09-15 · **From:** §2.4 · **Status:** DRAFT `[integration deferred]`
**Ask:** new `mes_ppc_order_inbound` with the apply rules (create / amend / status / hold / dispatch), the closure-conflict guard (a SAP closure on a line with charging or rolling begun is held for PPC confirmation), codes through the external code map (MDM-R-15); Excel import stays as fallback.
**Why:** OMB-001, F7.1-08, SWP-009/010.

### PPC-R-05 — Amendments, tolerance matrix, short-close
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_order_amendment`; an amendment the order upload refuses for a released order stays in PPC, "not applied — order released" (§21.7).
**Date:** 2026-09-15 · **From:** §2.5 · **Status:** DRAFT
**Ask:** new `mes_ppc_order_amendment`; order-book rule type TOLERANCE_MATRIX with bands (MDM-R-11); approval actions ORDER_AMEND_APPROVE / TOLERANCE_OVERRUN_APPROVE on the privileged-action master (content; enforcement deferred); rejections at UD reduce the balance without an amendment.
**Why:** OMB-012…016, F7.1-02/05/06.

### PPC-R-06 — Order holds, single and mass
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_order_hold` and `mes_ppc_hold_lot` — an order hold is applied as lot holds through the existing service and the order's plan entries are blocked in the Allocation application (§21.4).
**Date:** 2026-09-15 · **From:** §2.6 · **Status:** DRAFT
**Ask:** new `mes_ppc_order_hold`; held lines excluded from every scheduling screen; SAP / SFDC holds applied automatically; mass actions gated by ORDER_MASS_HOLD / RELEASE (MDM-R-02).
**Why:** OMB-015, F7.1-03.
**Amended 2026-10-13:** held lines are those with the existing line status ON_HOLD / BLOCKED; `mes_ppc_order_hold` is the history; a SAP lock applies a hold with reason SAP_LOCK (§19.2, §19.9).

### PPC-R-07 — SMS → Mills batch feed as a scheduled job
**Withdrawn 22-Oct-2026** — replaced by SMS batch arrival, Route B (§21.11): the actual heats are replayed through existing services; no scheduled pull (ALC-R-07 dropped).
**Date:** 2026-09-15 · **From:** §3.1 · **Status:** DRAFT `[assumption — D-07]`
**Ask:** new `mes_ppc_sms_batch_feed`; turn the Allocation pull (`AllocatorReadService`, marked ADHOC / TEMPORARY) into the first feed producer on a schedule (policy PPC_FEED_MINUTES, default 5); idempotent upsert into batches / inventory / pre-allocation with grade / section / quantity validation and discrepancy rows.
**Why:** MAT-001/002, F7.2-03 — near-real-time, validated flow with order linkage.

### PPC-R-08 — Allocation extensions and discrepancies; free-batch attach with eligible orders
**Withdrawn 22-Oct-2026** — dropped — `mes_batch_order_allocation` is empty and unused; the validation and override fields moved to `mes_ppc_swap_line`; `mes_ppc_batch_link_discrepancy` stays in PPC (§3.2).
**Date:** 2026-09-15 · **From:** §3.2 · **Status:** DRAFT
**Ask:** `mes_batch_order_allocation` + `source`, `status`, `allocated_by`, `validation_json`, `soft_mismatch`, `override_by`, `override_reason`, `swap_transaction_id`, `stage_operation_id`; new `mes_ppc_batch_link_discrepancy`; the Batch Allocation screen (free batches, eligible orders by attribute match using the swap rules with scope FREE_TO_SO, soft-mismatch override by PPC).
**Why:** MAT-003…005, F7.2-03, F7.3-03, F7.12-04.

### PPC-R-09 — Swapping engine
**Withdrawn 22-Oct-2026** — moved into the PPC module (`mes_ppc_swap_transaction`, `mes_ppc_swap_line`); execution through the Allocation application's existing services; the produced-lot part is superseded by PPC-R-32 (§21.2).
**Date:** 2026-09-15 · **From:** §3.3 · **Status:** DRAFT
**Ask:** new `mes_ppc_swap_transaction`, `mes_ppc_swap_line`; one-transaction execution re-pointing allocation, lot pegging and schedule children; reverse as a new transaction; auto-swap candidate search and ranking (YMS toggle); rule evaluation from `mes_swap_rule` (MDM-R-10); refusal on SAP-closed / held lines; FG swaps refused; Swapping screen reachable from Campaign / Sequence and from Material Charging.
**Why:** 7.2.2, SWP-002…013, MAT-006/007, F7.12-02 — no swap object exists.

### PPC-R-10 — Order links: dependent demand, GMM two-order model
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_order_link`.
**Date:** 2026-09-15 · **From:** §3.4, §6.2 · **Status:** DRAFT
**Ask:** new `mes_ppc_order_link` (DEPENDENT_DEMAND / GMM_PRODUCTION / GMM_DISPATCH / ANNEALING_SUPPLY / ISO_REFERENCE) created by the balance job and by PPC.
**Why:** F7.10-01, F7.7-01.

### PPC-R-11 — Campaign planning, constraints, review loop, rolling schedule, release into the queue, casting indent
**Withdrawn 22-Oct-2026** — moved into the PPC module (campaign, constraints, review, rolling schedule, casting indent); release = rolling-program import + resequence (`mes_ppc_program_upload`, `mes_ppc_queue_link`, §21.1); the casting-plan sheet is filled by PPC and posted through the existing upload (§21.5); no column on production-confirmation tables.
**Date:** 2026-09-15 · **From:** §4, §5.1 · **Status:** DRAFT `[assumption — D-02]`
**Ask:** new `mes_ppc_campaign`, `mes_ppc_campaign_order`, `mes_ppc_campaign_day`, `mes_ppc_scheduling_constraint`, `mes_ppc_feasibility_result`, `mes_ppc_campaign_review`, `mes_ppc_rolling_schedule`, `mes_ppc_rolling_schedule_block`, `mes_ppc_rolling_schedule_block_order`, `mes_ppc_schedule_change_log`, `mes_ppc_casting_indent`, `mes_ppc_casting_indent_line`; `mes_schedule_materials` + `rolling_schedule_id`, `block_id`, `production_order_id`; `mes_schedules` + `rolling_schedule_id`; `mes_material_sequence` + `block_id`; `mes_rolling_program` + `source`, `rolling_schedule_id`, `block_id` and `mes_rolling_program_upload` + `origin`, `rolling_schedule_id`. **Release generates a schedule-origin rolling program** (one row per pegged batch / Demand UID per block, in block order) and runs the built `RollingProgramInwardCheck` / `RollingProgramMaterialCheck` on it, then writes the queue rows with `planned_seq` pre-set and the mill from the block refined by `RollingMillAssignmentService`; **Manual Sequencing stays** as the lot-level sequencing inside a block — a cross-block or cross-mill move after acceptance re-stamps `block_id` and writes `mes_ppc_schedule_change_log`; the Excel rolling-program upload remains the fallback (`source = UPLOAD`). The casting-plan upload and heat generation take indent lines as their demand (Excel stays as fallback); length auto-mapping from `mes_length_master` (MDM-R-03) with bypass and approval; feasibility evaluation on add and finalisation; change log and alerts.
**Why:** 7.3, 7.3.1, 7.3.2, 7.4, 7.5 — the Excel campaign process systematised.

### PPC-R-12 — NCO declaration, rejected-heat recompute, priority hard lock
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_nco_declaration` and the indent rules.
**Date:** 2026-09-15 · **From:** §5.2 · **Status:** DRAFT
**Ask:** new `mes_ppc_nco_declaration`; declaration beyond the tolerance band books the excess to an internal NCO order; rejected heats re-open the indent line's BTC; `priority_locked` on indent lines with the SMS view-only rule.
**Why:** F7.4-03/04/07, SWP-013.

### PPC-R-13 — ABGM schedules
**Withdrawn 22-Oct-2026** — moved into the PPC module; the forced-override prompt becomes what PPC sequences under `require_sequencing_before_charge` (§21.3).
**Date:** 2026-09-15 · **From:** §6.1 · **Status:** DRAFT `[assumption — D-05]`
**Ask:** new `mes_ppc_abgm_schedule`, `mes_ppc_abgm_schedule_line`; auto-release from campaign release using the grinding rules (QA) and equipment section limits (MDM-R-09); capacity constraint; charging-team allocation screen with the forced-override prompt (FORCED_CHARGE_OVERRIDE).
**Why:** F7.5-01…03, ABGM-01…06, MAT-01…04.

### PPC-R-14 — Downstream schedules (annealing, GMM, bright bar) and GMM lots
**Withdrawn 22-Oct-2026** — moved into the PPC module; the first operation is set through the existing operation assignment (R-PPC-39).
**Date:** 2026-09-15 · **From:** §6.2 · **Status:** DRAFT
**Ask:** new `mes_ppc_downstream_schedule`, `mes_ppc_downstream_schedule_line`, `mes_ppc_gmm_lot`, `mes_ppc_gmm_lot_heat`; annealing charges from the annealing load rules (MDM-R-12) and HT cycles (QA); GMM 10-heat lots forming one batch id through the batch derivation rule MERGE (MDM-R-13); weekly Bright Bar schedule feeding the built operation-assignment screen.
**Why:** ANL-01…07, F7.6-01…04, F7.7-01/02, F7.8-01.
**Amended 2026-10-13:** period MONTH added; release with or without WIP; supply condition as campaign basis; GMM single sales order by default with the two-order model configurable (§19.6, PPC-R-23).

### PPC-R-15 — Ferro-alloy requirement plans and variance
**Withdrawn 22-Oct-2026** — moved into the PPC module.
**Date:** 2026-09-15 · **From:** §7 · **Status:** DRAFT
**Ask:** new `mes_ppc_fealloy_plan`, `mes_ppc_fealloy_plan_line`, `mes_ppc_fealloy_plan_alloy`, `mes_ppc_fealloy_stock`; computation from the norms, prices and cost categories (MDM-R-07); variance view over `mes_consumable_usage`; Excel upload for forecast months.
**Why:** FER-01…11, CMG-001, F7.9-01…03.

### PPC-R-16 — Inventory extensions, views and reports
**Withdrawn 22-Oct-2026** — dropped — location from the Quality module, restricted from the Quality module's state, charge status from the charge records, planned ↔ actual heat in `mes_ppc_sms_batch_feed`; the views are PPC's (`v_ppc_*`, §8).
**Date:** 2026-09-15 · **From:** §8, §9 · **Status:** DRAFT
**Ask:** `mes_inventory` + `current_equipment_id`, `location_code`, `location_updated_at`, `restricted`, `scan_status`, `planned_material_number`; views `v_ppc_wip_by_stage`, `v_ppc_stock_per_order`, `v_ppc_billet_availability`, `v_ppc_daily_stock`, `v_ppc_plan_vs_actual`, `v_ppc_fealloy_variance`; the 17 report list on the existing report platform.
**Why:** 7.9, 7.10, F7.2-06, F7.12-01…04, F7.14-01…17.


### PPC-R-19 — Make-to-stock beside make-to-order; pegging at charging; ISO at charging; order-scoped charging
**Withdrawn 22-Oct-2026** — replaced by the existing `require_sequencing_before_charge` setting + PPC-R-33 (scan to charge) and PPC's CHARGING_POOL_MODE constraint; pegging and the ISO order happen before release through the Allocation application and PPC-R-32; the stock-migration column is replaced by PPC's allocation sheet (§21.3).
**Date:** 2026-10-13 · **From:** §19.1 · **Status:** DRAFT
**Ask:** read the existing order-line `order_type` (MTO / MTS) as the production scenario, defaulted from the order-book rule PRODUCTION_SCENARIO; let open-stock children of a make-to-stock indent line follow a stock route (`mes_ppc_material_route.indent_line_id`) through inspection and grinding instead of stopping at billet cutting; on the charging screen, a label scan lists matching order lines (the rolling-program match widened with the FREE_TO_SO swap rules) with a supervisor soft-mismatch override, writing the allocation (`source = CHARGE_SCAN`) and the lot pegging; book an unmatched make-to-stock batch to an ISO order created at charging; `mes_pc_screen_config` + `charging_pool_mode` (ALL_CLEARED = today's pool of every cleared lot, pegged batches first, others with a warning; ORDER_SCOPED_MTO = pegged batches only for a make-to-order line, every cleared lot for a make-to-stock line — seed for BRM and BLM; ORDER_SCOPED = pegged batches only; FORCED_CHARGE_OVERRIDE with reason — amended 16-Oct-2026, §20.8); Σ allocations ≤ batch as a hard check where an allocation is made (warning only at confirmation); a charge-time swap writes its automatic REVERSE leg in the same transaction; the inventory upload gains an order-allocation column for the one-time SAP stock migration.
**Why:** BRD v5.0 general requirement (make-to-stock as well as make-to-order), points 8, 17, 35–38, 44, 58, 124, 125, 131.
**Affects:** Material Charging, Production Confirmation (open-stock children), inventory upload, allocation and swap services.

### PPC-R-20 — Schedule hold enforced
**Withdrawn 22-Oct-2026** — replaced by lot holds through the existing service — scope SCHEDULE of `mes_ppc_order_hold` (§21.4).
**Date:** 2026-10-13 · **From:** §19.2 R-PPC-58 · **Status:** DRAFT
**Ask:** `mes_schedules` + `hold_reason_id`, `hold_note`, `held_by`, `held_at`; a held schedule is hidden from the operator queue and refused at charging and confirmation; hold and release need a reason (hold-reason master, applied at Schedule); releases in the audit log.
**Why:** `is_hold` is stored and set today but read by nothing — a held schedule is still listed and chargeable (point 21).
**Affects:** schedule screen, work queue, Material Charging, Production Confirmation eligibility.

### PPC-R-21 — Campaign and sequence additions
**Withdrawn 22-Oct-2026** — moved into the PPC module; `over_attach_pct` on `mes_ppc_order_line`.
**Date:** 2026-10-13 · **From:** §19.3 · **Status:** DRAFT
**Ask:** `mes_ppc_scheduling_constraint` + `equipment_id`, `tolerance_pct`, `exempt_json` (constraint type LOT_HEATS added); `mes_ppc_campaign_order` + `wip_cover_json`; `mes_order_line_items` + `over_attach_pct`; `mes_ppc_rolling_schedule` + `family_id`, `schedule_seq_no`, `product_form`, `sequence_template_id`, `monthly_plan_id`; `mes_ppc_rolling_schedule_block` + `planned_hours`, `planned_output_t`, `pass_schedule_id`; new `mes_ppc_sequence_template`, `mes_ppc_sequence_template_rule`, `mes_ppc_monthly_plan`, `mes_ppc_monthly_plan_line`; view `v_ppc_day_timeline`; MoQ evaluated in MES at equipment level (the planner run keeps `moqProduction` off); wider WIP netting; schedule numbering per mill and family with one product form per schedule; the block calculator; the setup sheet printed from the Process Control setup sheet of the block.
**Why:** points 50, 53, 61, 67, 126–130; MoQ ownership (closes OPEN-PPC-1).

### PPC-R-22 — Casting-indent additions
**Withdrawn 22-Oct-2026** — moved into the PPC module; the casting-plan upload is fed by the sheet PPC fills (§21.5).
**Date:** 2026-10-13 · **From:** §19.4 · **Status:** DRAFT
**Ask:** `mes_ppc_casting_indent_line` + `demand_source` (ORDER / AS_CAST_SALE / MTS_STOCK / NCO_FILLER), `cast_form_id`, `cast_length_source`, `double_rolling`, `grinding_required`, `special_override_reason`; cast length from the Allocation application's per-line billet length where present, else the length master's cast lengths (MDM-R-19), within the caster's equipment section limits; NCO filler up to heat load or caster daily capacity, unplanned remainder left as the existing free metal; stock column from the existing Billet Stock Summary logic.
**Why:** points 70, 71, 78, 79, 80, 84.
**Affects:** casting-plan upload and heat generation (consume the indent's demand sources).

### PPC-R-23 — Downstream additions; GMM order model and lot size
**Withdrawn 22-Oct-2026** — moved into the PPC module; the grinding shift is PPC's, sequence moves are seen by PPC's queue read, the GMM minimum batch weight is PPC's check (§21.12).
**Date:** 2026-10-13 · **From:** §19.6 · **Status:** DRAFT
**Ask:** `mes_ppc_abgm_schedule_line` + `shift_id`, `bypass`, `bypass_reason`, `bypass_by` (a bypass writes a route deviation); `mes_ppc_downstream_schedule` + `supply_condition`; `mes_ppc_downstream_schedule_line` + `release_mode`; `mes_ppc_schedule_change_log` + `abgm_schedule_id`, `downstream_schedule_id`, `block_id` and the approval columns (SCHEDULE_CHANGE_APPROVE), also written by Manual Sequencing moves; `mes_ppc_gmm_lot` + `order_model`, `min_heats`, `max_heats`; a minimum batch weight in the batch-formation grouping configuration for the GMM operation (seed 1 t); period MONTH on downstream schedules; Manual Sequencing per equipment gains the shift for the grinding team.
**Why:** points 86, 95–98, 101, 104; conflicts 2 and 3 (single sales order through GMM by default, lot size a setting).

### PPC-R-24 — Ferro-alloy plan carry-forward and category filter
**Withdrawn 22-Oct-2026** — moved into the PPC module.
**Date:** 2026-10-13 · **From:** §19.7 · **Status:** DRAFT
**Ask:** `mes_ppc_fealloy_plan_line` + `carry_forward_t`, `carried_from_line_id`; part of an order on a plan line with the remainder carried to the next month; cost-category filter on the variance view.
**Why:** points 88, 111.

### PPC-R-25 — Job work
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_job_work_challan` and `mes_ppc_job_work_movement`; confirmation at a job-work operation through the existing service; lots held At vendor (§21.8).
**Date:** 2026-10-13 · **From:** §19.9 R-PPC-89 · **Status:** DRAFT
**Ask:** `mes_ppc_material_route_stage` + `job_work_vendor_id` (supplier master, type JOB_WORK); new `mes_ppc_job_work_movement` (send-out and receipt with output, visible loss, computed invisible loss, scrap, challan); the lot continues on its route after receipt; `mes_orders.job_work_vendor_id` references the supplier master.
**Why:** BRD v5.0 additional requirement 1 (point 3) — nothing exists for job work today.

### PPC-R-26 — Purchased billets and blooms become lots from the accepted raw-material receipt
**Withdrawn 22-Oct-2026** — superseded by PPC-R-34.
**Date:** 2026-10-13 · **From:** §19.9 R-PPC-90 · **Status:** DRAFT
**Ask:** when the Quality module accepts a raw-material receipt of form billet or bloom, create the lot at the mill's charging stage from the batch the receipt creates, with the supplier heat and the certificate chemistry, free for allocation or pegged to the order named on the purchase order.
**Why:** BRD v5.0 additional requirement 2 (point 5); the receipt and its inspection exist in the Quality design.
**Affects:** inventory creation; Quality raw-material receipt (reads, no change to its screens).
**Amended 16-Oct-2026 (§20.3, R-PPC-100):** the lot is pegged to the receipt's order line (`mes_qc_rm_receipt.for_order_line_id`, entered at receipt until the SAP purchase-order message exists) and reduces that line's balance to cast through `mes_ppc_order_stage_balance.purchased_qty`; expected PO and STO material is listed by the view `v_ppc_incoming` and counted only under the order-book rule INCOMING_COVER.

### PPC-R-27 — Outbound staging, IVL feed, planner variance, interface health
**Withdrawn 22-Oct-2026** — deferred and PPC-owned — SAP until a contract exists, then one PPC outbox (`mes_ppc_integration_outbound`, §21.9); the IVL and SMS MES feeds with their interface details (§21.11); the views stay in PPC.
**Date:** 2026-10-13 · **From:** §19.9 R-PPC-91…94 · **Status:** DRAFT `[integration deferred]`
**Ask:** new `mes_ppc_integration_outbound` (schedule changes to the planner daily, production confirmations to SAP, heat and batch messages to the IVL MES, casting-indent and ferro-alloy issues to the SMS MES); `mes_ppc_sms_batch_feed.source_system` + IVL_MES; views `v_ppc_planner_variance` and `v_ppc_integration_health`; `sap_status` + LOCKED applying an order hold with reason SAP_LOCK.
**Why:** points 108, 109, 123, 132, 133.
**Amended 16-Oct-2026 (§20.4, R-PPC-101):** message types ORDER_BOOK (a line change) and ORDER_BOOK_SNAPSHOT (the full open order book, daily) to SMS_MES — the read-only copy SMS MES works from until it moves to the platform; policies PPC_ORDER_BOOK_SNAPSHOT_TIME (06:00) and ORDER_BOOK_TO_SMS_MES (on).

### PPC-R-28 — Campaign and sequence: BLM, planning basis, campaign basis, heat size, shortage watch
**Withdrawn 22-Oct-2026** — moved into the PPC module; "the heat builder reads HEAT_SIZE_T instead of its fixed 25 t" is dropped — the builder is plan-sized since 07-Oct-2026 and PPC fills the casting-plan sheet (§21.5).
**Date:** 2026-10-16 · **From:** §20.1, §20.2, §20.8 (R-PPC-95 … R-PPC-99, R-PPC-110, R-PPC-111) · **Status:** DRAFT
**Ask:** `mes_ppc_scheduling_constraint` types CAMPAIGN_BASIS (the basis and the values offered, per mill or downstream unit) and HEAT_SIZE_T (per caster); `mes_ppc_rolling_schedule_block` + `charge_condition`, `cut_length_mm`, `cut_length_source`; `mes_ppc_campaign` + `planning_basis`, `planning_basis_reason` (default from the order-book rule PLANNING_BASIS, a different basis needs a reason); the BLM order pick — lines whose route passes BLM at the campaign's input size (double-rolled RCS demand and RCS sales) — with WIP netting over RCS and as-cast blooms; view `v_ppc_block_cover` and the event PPC_MATERIAL_SHORTAGE (policies PPC_SHORTAGE_LEAD_HOURS, PPC_SHORTAGE_TOLERANCE_PCT); the heat builder reads HEAT_SIZE_T instead of its fixed 25 t; `mes_ppc_monthly_plan_line` + `input_section` (BLM plan lines by input size, R-PPC-114 — amended 19-Oct-2026); on rolling-schedule release the event PPC_BLOCK_RELEASED per block, PPC_BLOCK_CHANGED on a change or removal after release, and the roll-readiness chip per block read from `v_qc_roll_requirement_board` (R-PPC-115, answers ROLL-R-03 — amended 21-Oct-2026).
**Why:** checkpoints PPC-01, PPC-46, PPC-52, PPC-64, PPC-66; BRD 7.3 CMP-001 (BLM campaigns by input size); BRD ROL-007 / ROL-008 (roll preparation starts from the sequence).
**Affects:** Campaign Planning, Rolling Sequence, casting-plan heat generation, WIP Visibility, Roll Management (roll requirements).

### PPC-R-29 — Order book: part hold, planning override, saved views, dummy orders, Quality pre-release, bought material
**Withdrawn 22-Oct-2026** — moved into the PPC module (`mes_ppc_order`, `mes_ppc_order_line`, `mes_ppc_order_hold`, `mes_ppc_saved_view`).
**Date:** 2026-10-16 · **From:** §20.3, §20.5, §20.6, §20.7 (R-PPC-100, R-PPC-102 … R-PPC-108) · **Status:** DRAFT
**Ask:** `mes_ppc_order_hold` + `hold_scope`, `held_qty` (a held balance cannot be released or the release quantity raised); `mes_order_line_items` + `planning_override`, `planning_override_reason`, `planning_override_by`, `planning_override_at`, `qa_pre_release_status`, `qa_pre_release_by`, `qa_pre_release_at`, `qa_pre_release_note`; `mes_orders` + `approval_status`, `dummy_reason`, `approved_by`, `approved_at`, `linked_order_id`; `mes_ppc_order_stage_balance` + `purchased_qty` (the balance formula subtracts it); new `mes_ppc_saved_view`; view `v_ppc_incoming`; hold and release, dummy-order approval and Quality pre-release checked against their privileged actions (MDM-R-20); AWAITING and RETURNED lines kept out of Campaign Planning and the casting indent; order types in or out of planning read from the order-book rule ORDER_TYPE_PLANNING, with a line override both ways.
**Why:** checkpoints PPC-06, PPC-10, PPC-12, PPC-16, PPC-19 (conflict), PPC-24, PPC-95.
**Affects:** Order Book, Order Hold & Release, Campaign Planning, Casting Indent, order upload (pre-release status on arrival).

### PPC-R-30 — Lot code state; billets per heat
**Withdrawn 22-Oct-2026** — code state derived by `v_ppc_lot_code_state` (§21.6); billets per heat in PPC.
**Date:** 2026-10-16 · **From:** §20.8 (R-PPC-109, R-PPC-110) · **Status:** DRAFT
**Ask:** `mes_inventory` + `code_state` (GROSS / NET / G&D), set by the form-conversion rule that applies (Quality clearance, grinding confirmation; no change on the hot-out route); `mes_ppc_casting_indent_line.billets_per_cast` becomes `billets_per_heat` and gains `last_piece_mm`, both computed from HEAT_SIZE_T, the cast length and the section.
**Why:** checkpoints PPC-53, PPC-64.
**Affects:** SMS final clearance, ABGM confirmation, WIP Visibility, Casting Indent.

### PPC-R-31 — Checks on a change inside a released downstream schedule
**Withdrawn 22-Oct-2026** — moved into the PPC module.
**Date:** 2026-10-16 · **From:** §20.9 (R-PPC-112) · **Status:** DRAFT
**Ask:** `mes_ppc_schedule_change_log` + `check_results_json`, `check_outcome`; on a proposed change of size, grade, customer priority or sequence, run the WIP-availability, equipment section limit, furnace load and grade-load, day capacity, order state, grade compatibility and setup checks; a BLOCK refuses the submission, warnings go with the change to the SCHEDULE_CHANGE_APPROVE approval.
**Why:** checkpoint PPC-84 (BRD 7.8 — changes "based on operations and WIP availability").
**Affects:** Downstream Schedules, ABGM Schedule, the schedule change log.

### PPC-R-17 — Composite material route
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_material_route` and `mes_ppc_material_route_stage` (§18).
*Filed under the production-confirmation items on 21-Oct-2026 — the tables it asks for belong to that application.*
`mes_ppc_material_route` and `mes_ppc_material_route_stage` as designed: resolved at order-line release from the routing attribute set (PSN among its axes) and the inspection-path matrix, merged on the operation code, with the quality content of each stage pinned and the conditional stages placed. The resolution stores the attribute values that decided it. A PSN-required test that consumes a drawn sample blocks the release when the route offers neither a draw stage nor a gate stage for it; a material-bound test — one the quality-test master does not require a sample for — needs neither, because it is recorded on the material where it stands. Each stage also carries the production-tally attributes — `tally_required` (NONE / STAGE / HEAT), `tally_basis` (PIECES / WEIGHT / BOTH) and the piece and weight tolerances — pinned with the rest of its quality content, so a tally is owed because the route stage says so rather than because of where the stage sits in the plant. Material with no route falls back to the Stage-QC Map row for the operation.

### PPC-R-18 — Route pointers and the routing axes
**Withdrawn 22-Oct-2026** — moved into the PPC module: `mes_ppc_lot_route` for the lot pointers and `mes_ppc_queue_link.route_stage_id`; the routing axes are master data; corrections through the existing operation assignment (§21.6).
`mes_inventory` gains `route_id` and `route_stage_id`, and the next-operation pointer is set from the route stage; `mes_schedule_material_childs` gains `route_stage_id`; `mes_routing_attr_value` / `_range` gain the PSN, product type, supply condition, rolling route, annealing type, market, order type and BOM-level axes, defined in `mes_global_attributes` as routing attributes.

**Allocation application items (raised 2026-09-15)**

### ALC-R-05 — Read swap effects
**Withdrawn 22-Oct-2026** — superseded — swaps run in the Allocation application itself through its existing services (§21.2).
**Date:** 2026-09-15 · **From:** §3.3 · **Status:** DRAFT
**Ask:** the Allocation application treats `mes_batch_order_allocation` rows with `source = SWAP` as the allocation of record for swapped batches (its own release state must not re-point them on the next run).

### ALC-R-06 — Order sort by MES slot score
**Withdrawn 22-Oct-2026** — dropped — allocation stays delivery-date-first; PPC's priority drives PPC's own planning (§21.10).
**Date:** 2026-09-15 · **From:** §2.8 · **Status:** DRAFT
**Ask:** the run's order ordering (delivery date → priority → line id, hard-coded) takes the MES `slot_score` and `priority_locked` flag when present.

### ALC-R-07 — The pull as a scheduled feed
**Withdrawn 22-Oct-2026** — dropped — no scheduled pull; the planner keeps pulling by hand and PPC shows the last pull (§21.10).
**Date:** 2026-09-15 · **From:** §3.1 · **Status:** DRAFT
**Ask:** expose released heats as a stable read model for the scheduled feed (PPC-R-07); mark the ADHOC / TEMPORARY path as the interim link (D-07).

### ALC-R-08 — Order holds as block-release constraints
**Withdrawn 22-Oct-2026** — superseded — held orders blocked through the existing set-release-block (§21.4).
**Date:** 2026-09-15 · **From:** §2.6 · **Status:** DRAFT
**Ask:** a HELD MES order line is honoured like `Mst_Order_Inventory_Constraint` (batch exclusion) on the next run.
