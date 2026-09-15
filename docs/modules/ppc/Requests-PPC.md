# Request register — PPC design → MES PC and the Allocator

**Direction:** the PPC design (`PPC-Data-Model.md`) is a platform design: every table lives in the production-confirmation application (`Bluemingo_MES`), so the whole design is raised here as change requests to the platform team; the Allocator receives four alignment items. Same rules as the other registers (append, one item = one ask, permanent ids, raise before the migration). Drafted 2026-09-15.

**Statuses:** `DRAFT` → `OPEN` · `NEEDS_INFO` · `ACCEPTED` · `IN_PROGRESS` · `DONE` · `REJECTED`

---

## MES PC items

### PPC-R-01 — Order header and line extensions; order categories and SAP order types
**Date:** 2026-09-15 · **From:** PPC design §2.1, §2.7, §2.8 · **Status:** DRAFT
**Ask:** `mes_orders` + `order_category`, `sap_order_type`, `sap_order_no`, `sap_status`, `sap_status_at`, `reference_order_id`, `planning_relevant`, `planning_override_by`, `marketing_rank`, `trial_flags_json`, `plant_of_supply`, `job_work_vendor_id`, `received_at`; `mes_order_line_items` + `psn_no`, `section_shape`, `section_size`, `input_section`, `grinding_required`, `length_tolerance_mm`, `release_qty` (+ by / at), `dispatched_qty`, `fgho_qty`, `rejected_qty`, `diverted_qty`, `short_closed_qty`, `hold_status`, `slot_score`, `sla_delivery_date`, `otif_status`, `flags_json`; Orders screen shows category / type / flags; creation of ISO / internal / NCO / trial orders by PPC (with-reference inherits attributes).
**Why:** BRD OMB-001…006, 7.1.3, F7.1-07/09 — one order book for planning, balances, allocation and campaigns.
**Affects:** Orders screen and import; order-data post-process; QA reads `psn_no`.

### PPC-R-02 — MES production orders split from the SAP order
**Date:** 2026-09-15 · **From:** §2.2 · **Status:** DRAFT
**Ask:** new `mes_production_order`; `mes_schedule_materials.production_order_id`; the sum of a line's active production orders ≤ `release_qty`; the Confirmation queue keeps reading schedules.
**Why:** BRM-011 — partial release and separate MES production orders per unit.

### PPC-R-03 — Stage balances (BTC / BTR / BTP / BTD / OTIF) as a computed snapshot
**Date:** 2026-09-15 · **From:** §2.3, §3.4 · **Status:** DRAFT
**Ask:** new `mes_order_stage_balance` and `mes_order_link`; a per-shift scheduled job (the application has no scheduler today — add one) plus event triggers on confirmation, usage decision, swap, amendment and inter-plant receipt; yields resolved from `mes_yield_master` (MDM-R-04); OTIF from the order-book rules; dependent-demand links per upstream unit.
**Why:** OMB-007…011, BRM-010, F7.11-01, F7.10-01 — every screen and report reads one balance.

### PPC-R-04 — Inbound order staging and SAP status guard (MES side only)
**Date:** 2026-09-15 · **From:** §2.4 · **Status:** DRAFT `[integration deferred]`
**Ask:** new `mes_order_inbound` with the apply rules (create / amend / status / hold / dispatch), the closure-conflict guard (a SAP closure on a line with charging or rolling begun is held for PPC confirmation), codes through the external code map (MDM-R-15); Excel import stays as fallback.
**Why:** OMB-001, F7.1-08, SWP-009/010.

### PPC-R-05 — Amendments, tolerance matrix, short-close
**Date:** 2026-09-15 · **From:** §2.5 · **Status:** DRAFT
**Ask:** new `mes_order_amendment`; order-book rule type TOLERANCE_MATRIX with bands (MDM-R-11); approval actions ORDER_AMEND_APPROVE / TOLERANCE_OVERRUN_APPROVE on the privileged-action master (content; enforcement deferred); rejections at UD reduce the balance without an amendment.
**Why:** OMB-012…016, F7.1-02/05/06.

### PPC-R-06 — Order holds, single and mass
**Date:** 2026-09-15 · **From:** §2.6 · **Status:** DRAFT
**Ask:** new `mes_order_hold`; held lines excluded from every scheduling screen; SAP / SFDC holds applied automatically; mass actions gated by ORDER_MASS_HOLD / RELEASE (MDM-R-02).
**Why:** OMB-015, F7.1-03.

### PPC-R-07 — SMS → Mills batch feed as a scheduled job
**Date:** 2026-09-15 · **From:** §3.1 · **Status:** DRAFT `[assumption — D-07]`
**Ask:** new `mes_sms_batch_feed`; turn the Allocation pull (`AllocatorReadService`, marked ADHOC / TEMPORARY) into the first feed producer on a schedule (policy PPC_FEED_MINUTES, default 5); idempotent upsert into batches / inventory / pre-allocation with grade / section / quantity validation and discrepancy rows.
**Why:** MAT-001/002, F7.2-03 — near-real-time, validated flow with order linkage.

### PPC-R-08 — Allocation extensions and discrepancies; free-batch attach with eligible orders
**Date:** 2026-09-15 · **From:** §3.2 · **Status:** DRAFT
**Ask:** `mes_batch_order_allocation` + `source`, `status`, `allocated_by`, `validation_json`, `soft_mismatch`, `override_by`, `override_reason`, `swap_transaction_id`, `stage_operation_id`; new `mes_batch_link_discrepancy`; the Batch Allocation screen (free batches, eligible orders by attribute match using the swap rules with scope FREE_TO_SO, soft-mismatch override by PPC).
**Why:** MAT-003…005, F7.2-03, F7.3-03, F7.12-04.

### PPC-R-09 — Swapping engine
**Date:** 2026-09-15 · **From:** §3.3 · **Status:** DRAFT
**Ask:** new `mes_swap_transaction`, `mes_swap_line`; one-transaction execution re-pointing allocation, lot pegging and schedule children; reverse as a new transaction; auto-swap candidate search and ranking (YMS toggle); rule evaluation from `mes_swap_rule` (MDM-R-10); refusal on SAP-closed / held lines; FG swaps refused; Swapping screen reachable from Campaign / Sequence and from Material Charging.
**Why:** 7.2.2, SWP-002…013, MAT-006/007, F7.12-02 — no swap object exists.

### PPC-R-10 — Order links: dependent demand, GMM two-order model
**Date:** 2026-09-15 · **From:** §3.4, §6.2 · **Status:** DRAFT
**Ask:** new `mes_order_link` (DEPENDENT_DEMAND / GMM_PRODUCTION / GMM_DISPATCH / ANNEALING_SUPPLY / ISO_REFERENCE) created by the balance job and by PPC.
**Why:** F7.10-01, F7.7-01.

### PPC-R-11 — Campaign planning, constraints, review loop, rolling schedule, release into the queue, casting indent
**Date:** 2026-09-15 · **From:** §4, §5.1 · **Status:** DRAFT `[assumption — D-02]`
**Ask:** new `mes_campaign`, `mes_campaign_order`, `mes_campaign_day`, `mes_scheduling_constraint`, `mes_feasibility_result`, `mes_campaign_review`, `mes_rolling_schedule`, `mes_rolling_schedule_block`, `mes_rolling_schedule_block_order`, `mes_schedule_change_log`, `mes_casting_indent`, `mes_casting_indent_line`; `mes_schedule_materials` + `rolling_schedule_id`, `block_id`, `production_order_id`; `mes_schedules` + `rolling_schedule_id`; `mes_material_sequence` + `block_id`; `mes_rolling_program` + `source`, `rolling_schedule_id`, `block_id` and `mes_rolling_program_upload` + `origin`, `rolling_schedule_id`. **Release generates a schedule-origin rolling program** (one row per pegged batch / Demand UID per block, in block order) and runs the built `RollingProgramInwardCheck` / `RollingProgramMaterialCheck` on it, then writes the queue rows with `planned_seq` pre-set and the mill from the block refined by `RollingMillAssignmentService`; **Manual Sequencing stays** as the lot-level sequencing inside a block — a cross-block or cross-mill move after acceptance re-stamps `block_id` and writes `mes_schedule_change_log`; the Excel rolling-program upload remains the fallback (`source = UPLOAD`). The casting-plan upload and heat generation take indent lines as their demand (Excel stays as fallback); length auto-mapping from `mes_length_master` (MDM-R-03) with bypass and approval; feasibility evaluation on add and finalisation; change log and alerts.
**Why:** 7.3, 7.3.1, 7.3.2, 7.4, 7.5 — the Excel campaign process systematised.

### PPC-R-12 — NCO declaration, rejected-heat recompute, priority hard lock
**Date:** 2026-09-15 · **From:** §5.2 · **Status:** DRAFT
**Ask:** new `mes_nco_declaration`; declaration beyond the tolerance band books the excess to an internal NCO order; rejected heats re-open the indent line's BTC; `priority_locked` on indent lines with the SMS view-only rule.
**Why:** F7.4-03/04/07, SWP-013.

### PPC-R-13 — ABGM schedules
**Date:** 2026-09-15 · **From:** §6.1 · **Status:** DRAFT `[assumption — D-05]`
**Ask:** new `mes_abgm_schedule`, `mes_abgm_schedule_line`; auto-release from campaign release using the grinding rules (QA) and equipment section limits (MDM-R-09); capacity constraint; charging-team allocation screen with the forced-override prompt (FORCED_CHARGE_OVERRIDE).
**Why:** F7.5-01…03, ABGM-01…06, MAT-01…04.

### PPC-R-14 — Downstream schedules (annealing, GMM, bright bar) and GMM lots
**Date:** 2026-09-15 · **From:** §6.2 · **Status:** DRAFT
**Ask:** new `mes_downstream_schedule`, `mes_downstream_schedule_line`, `mes_gmm_lot`, `mes_gmm_lot_heat`; annealing charges from the annealing load rules (MDM-R-12) and HT cycles (QA); GMM 10-heat lots forming one batch id through the batch derivation rule MERGE (MDM-R-13); weekly Bright Bar schedule feeding the built operation-assignment screen.
**Why:** ANL-01…07, F7.6-01…04, F7.7-01/02, F7.8-01.

### PPC-R-15 — Ferro-alloy requirement plans and variance
**Date:** 2026-09-15 · **From:** §7 · **Status:** DRAFT
**Ask:** new `mes_fealloy_plan`, `mes_fealloy_plan_line`, `mes_fealloy_plan_alloy`, `mes_fealloy_stock`; computation from the norms, prices and cost categories (MDM-R-07); variance view over `mes_consumable_usage`; Excel upload for forecast months.
**Why:** FER-01…11, CMG-001, F7.9-01…03.

### PPC-R-16 — Inventory extensions, views and reports
**Date:** 2026-09-15 · **From:** §8, §9 · **Status:** DRAFT
**Ask:** `mes_inventory` + `current_equipment_id`, `location_code`, `location_updated_at`, `restricted`, `scan_status`, `planned_material_number`; views `v_ppc_wip_by_stage`, `v_ppc_stock_per_order`, `v_ppc_billet_availability`, `v_ppc_daily_stock`, `v_ppc_plan_vs_actual`, `v_ppc_fealloy_variance`; the 17 report list on the existing report platform.
**Why:** 7.9, 7.10, F7.2-06, F7.12-01…04, F7.14-01…17.

---

## Allocator items

### ALC-R-05 — Read swap effects
**Date:** 2026-09-15 · **From:** §3.3 · **Status:** DRAFT
**Ask:** the Allocation application treats `mes_batch_order_allocation` rows with `source = SWAP` as the allocation of record for swapped batches (its own release state must not re-point them on the next run).

### ALC-R-06 — Order sort by MES slot score
**Date:** 2026-09-15 · **From:** §2.8 · **Status:** DRAFT
**Ask:** the run's order ordering (delivery date → priority → line id, hard-coded) takes the MES `slot_score` and `priority_locked` flag when present.

### ALC-R-07 — The pull as a scheduled feed
**Date:** 2026-09-15 · **From:** §3.1 · **Status:** DRAFT
**Ask:** expose released heats as a stable read model for the scheduled feed (PPC-R-07); mark the ADHOC / TEMPORARY path as the interim link (D-07).

### ALC-R-08 — Order holds as block-release constraints
**Date:** 2026-09-15 · **From:** §2.6 · **Status:** DRAFT
**Ask:** a HELD MES order line is honoured like `Mst_Order_Inventory_Constraint` (batch exclusion) on the next run.
