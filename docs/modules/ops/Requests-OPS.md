# Request register — Operations design → MES PC

**Direction:** the Operations design (`OPS-Data-Model.md`) is a platform design: every table lives in the production-confirmation application (`Bluemingo_MES`), so the whole design is raised here as change requests to the platform team. The Allocator receives no new item (ALC-R-05 … 08 of the PPC register already cover swap effects, holds and the feed). Same rules as the other registers (append, one item = one ask, permanent ids, raise before the migration). Drafted 2026-09-15.

**Statuses:** `DRAFT` → `OPEN` · `NEEDS_INFO` · `ACCEPTED` · `IN_PROGRESS` · `DONE` · `REJECTED`

**Flags:** `[P4]` device foundation deferred — records and manual fallback only · `[D-08]` Level-1/2 exchange designed as messages under assumption · `[D-01]` ERP posting MES side only · `[D-05]` ABGM in scope.

---

## MES PC items

### OPS-R-01 — Pulpit configuration, stage events and pulpit notes
**Date:** 2026-09-15 · **From:** Operations design §2 · **Status:** DRAFT
**Ask:** `mes_operations` + `pulpit_code`, `pulpit_sequence`; `mes_pc_screen_config` + `pulpit_mode` (FULL / ACKNOWLEDGE / HMI), the panel flags, `dimension_check_mode`, `order_tolerance_mode`, `require_scan_before_confirm`, `charge_overrun_pieces`, `mass_balance_tolerance_pct`, `erp_trigger_mode`, `downtime_alert_minutes`, `confirm_warning_text`, `wallboard_enabled`; new `mes_stage_event`, `mes_pulpit_note`, `mes_pulpit_note_ack`; a pulpit screen = the union of the queues of the operations sharing the pulpit code; ACKNOWLEDGE mode creates the automatic confirmation (`is_auto`) from the acknowledgement so PC step 9 promotes the next pulpit unchanged; a wallboard (read-only) mode.
**Why:** BRD 9.1 additional point 1, PLT-001…003, IBA-002, SEQ-009, CHG-04 — station-wise screens, paper-free hand-over between pulpits, CAPA / instruction display.
**Affects:** Production Confirmation screen and screen-config service; queue endpoints.

### OPS-R-02 — Scan events and charging validation
**Date:** 2026-09-15 · **From:** §3 · **Status:** DRAFT `[P4]`
**Ask:** new `mes_scan_event`; `mes_inventory_charges` + `scan_event_id`, `charge_seq`, `planned_seq`, `sequence_deviation`, `deviation_action`, `psn_check`, `production_order_id`, weights and `weight_source`, `charged_at`, `discharged_at`, `charge_ack_mode`, `hot_out_id`, `status`; `mes_charges` + `production_order_id`, `block_id`, `assigned_pieces`, `overrun_allowance`; the validation order of R-OPS-04 (exists → cleared → code allowed → section limit → PSN match → duplicate → sequence → quantity) with the REMOVE / SWAP / ACCEPT choices and the privileged overrides; manual entry mode with image reference; theoretical weight from `mes_billet_master`.
**Why:** CHG-001…010, CHG-04…08, BLM-001/002, SEQ-006 — barcode-driven charging with PSN validation, duplicate prevention, sequence alerts, quantity control.
**Affects:** Material Charging screen and service (ChargeMath, release, reconciliation); Manual Sequencing (edits re-stamp `planned_seq`).

### OPS-R-03 — Furnace SOP panel, dwell and overstay
**Date:** 2026-09-15 · **From:** §4 · **Status:** DRAFT `[D-08]`
**Ask:** `mes_process_attributes` + `parameter_group`, `zone_code`, `l2_tag`, `dwell_min_minutes`, `dwell_max_minutes`; the SOP panel resolved by R-S (furnace, PSN, grade family, size family) on the furnace pulpit; dwell from the charge line timestamps with the overstay hot-out event; `discharged_at` on the confirmation when the standalone discharge screen is removed.
**Why:** RHF-001…005, HOT-001, F8.1-02, F8.2-04.
**Affects:** process-parameter capture on the confirmation card.

### OPS-R-04 — Virtual identities and the reconciliation queue
**Date:** 2026-09-15 · **From:** §5 · **Status:** DRAFT
**Ask:** new `mes_virtual_id`; `mes_inventory` + `virtual_id`, `identity_kind`; the missing-number check on a NOT_FOUND scan against the heat's planned numbers; creation gated by VIRTUAL_ID_CREATE; the placeholder inventory row; ERP rows HELD_VIRTUAL; reconciliation through the existing planned → actual rename cascade (MaterialNumberCascade) with re-addressing of the held rows; the overdue alert.
**Why:** VID-001…006, 9.6 additional point, 9.15.1 sensor swap — production must not stop for a late batch id.
**Affects:** heat generation / material-number cascade; charging; ERP queue (OPS-R-05).

### OPS-R-05 — ERP outbound queue and bypass mode
**Date:** 2026-09-15 · **From:** §6, annex D · **Status:** DRAFT `[D-01 — design part only]`
**Ask:** new `mes_erp_outbound`, `mes_bypass_mode`; rows written on confirmation, reversal, scrap, sample scrap, by-product, code conversion, storage location, weight correction and the Quality usage decision; AUTO / MANUAL trigger per unit with multi-select send; `depends_on_id` ordering (input weight before output confirmation); bypass by ERP_BYPASS_ENABLE with threshold and background sync; the transport and message formats wait for D-01.
**Why:** SAP-001…006, 9.15.1, ANL-004/009/011, DSP-001.
**Affects:** confirmation, reversal and sample services (queue writes); a background sync worker (the application has no scheduler today — add one, see PPC-R-03).

### OPS-R-06 — Declarations, route deviations, loss classes, guide positions, labels
**Date:** 2026-09-15 · **From:** §7 · **Status:** DRAFT `[P4 for printing]`
**Ask:** `mes_production_confirmation` + `declaration`, `discharged_at`, `route_deviation_id`, `order_tolerance_check`, `excess_qty`, `nco_declaration_id`, `dimension_check`, `l2_pdi_message_id`, `erp_outbound_id`, `pulpit_code`, `stage_event_id`, `cut_plan_id`; new `mes_route_deviation` (feasibility from the equipment-routing and linkage rules, approval when infeasible, visible to PPC); `mes_operation_loss_config` + `loss_class`, `posts_to_erp`, `byproduct_sku_code`, `movement_type`; `mes_secondary_equipment_instance` + `equipment_id`, `position_code`, `mounted_at`, `removed_at`; new `mes_label_template`, `mes_label_print` with auto-print on confirmation and reprint by reason; `v_ops_heat_yield`.
**Why:** MO-001…007, F8.1-04…14, F8.2-06…19 — declaration-driven routing, cobble handling, yield with scale loss, labels.
**Affects:** confirmation card, next-operation selection, loss engine, secondary-equipment usage.

### OPS-R-07 — Hot-out events, pieces and the digital shift log
**Date:** 2026-09-15 · **From:** §8 · **Status:** DRAFT
**Ask:** new `mes_hot_out_event`, `mes_hot_out_piece`, `mes_shift_log`; direct hot-out from charging / furnace (charge line HOT_OUT, inventory back to AVAILABLE, re-weigh on re-charge, single loss booking); indirect hot-out split 2–6 through the batch-derivation SPLIT rule with re-measure, classification and re-sequencing; overstay events waiting for the Quality decision (`qa_decision` written by the Quality module); shift-log auto-entries and the hand-over acknowledgement alert.
**Why:** HO-001…005, HOT-001, 9.9 gap note.
**Affects:** charging, salvage / scrap confirmation, Manual Sequencing, inventory holds.

### OPS-R-08 — Finishing interlocks and the NCO prompt
**Date:** 2026-09-15 · **From:** §9 · **Status:** DRAFT
**Ask:** `dimension_check_mode` = BLOCK turns the attribute guard into a refusal against the dimensional-tolerance master (MDM-R); remaining allowable quantity from the PPC stage balance and tolerance matrix on the card; EXCEEDED sets `order_tolerance_check` / `excess_qty` and prompts the NCO declaration (PPC-R-12); sample label with the sample position.
**Why:** QA-001…004, F8.1-15, F8.2-20, F8.2-07.
**Affects:** confirmation validation (SkuAttributeGuard), NCO declaration service.

### OPS-R-09 — Cut plan, bundles, weighing, cooling boxes, segregation
**Date:** 2026-09-15 · **From:** §10 · **Status:** DRAFT `[P4 for scales]`
**Ask:** new `mes_cut_plan` (calculator R-OPS-29 pre-filling the cooling-bed entry; BLOOM_LENGTH multi-length mode), `mes_weighing_event`, `mes_cooling_box_entry`, `mes_segregation_entry`, `mes_segregation_line`; `mes_batches` + `bundle_no`, `tag_no`, `scale_weight_kg`, `weight_source`, `weighing_event_id`, `input_weight_kg`, `exit_hold`, `exit_hold_reason`, `double_rolled`, `production_order_id`, `label_print_id`, `handover_status`; mix-up hold on the built mass balance with BUNDLE_WEIGHT_CORRECT; MERGE of linked billets on the declaration; segregation booking the SEGREGATION loss and the rejected-code conversion.
**Why:** BND-001…004, BLM-003…005, F8.1-06/07, F8.2-02/11/12/14/15, 9 additional point 2, 9.11 additional point, SEG-001…004.
**Affects:** Cooling Bed / Batch Formation (BundleRules, IC5a mass balance), batch derivation, inventory holds.

### OPS-R-10 — Device register and Level-1/2 message ledger
**Date:** 2026-09-15 · **From:** §11 · **Status:** DRAFT `[P4]` `[D-08]`
**Ask:** new `mes_device`, `mes_l2_message`; PDI rows on the charge scan, PDO rows applying stage events and counts, feedback rows writing CHARGED / DISCHARGED events, RUN_STOP rows opening / closing downtime, PARAMETER_ACTUAL rows writing captured parameters with `captured_from = L2`, CYCLE_DOWNLOAD / SCADA_STATUS for annealing; status, retries, duplicate and acknowledgement flags, latency; the transport, the HMI / historian adapter and the Level-1 work-stream wait for D-08 and P4.
**Why:** 9.15.1, PLT-004, IBA-003, RHF-004, MO-006, CHG-005, F8.1-13, F9.1-05, F9.2-03.
**Affects:** PDI endpoint (`POST /schedule/{id}/pdi` becomes a message writer), process-parameter capture, downtime.

### OPS-R-11 — Downtime events and OEE
**Date:** 2026-09-15 · **From:** §12 · **Status:** DRAFT
**Ask:** new `mes_downtime_event`; manual start / stop on the pulpit's downtime panel, RUN_STOP automation, COBBLE auto-open, maintenance-plan windows (MDM-R-16) opening PLANNED events; batch / heat / order linkage at the stop; views `v_ops_equipment_status`, `v_ops_downtime_pareto`, `v_ops_oee`; alerts on threshold and overrun.
**Why:** DWN-001…006, F12.3-02, F8.3-11.
**Affects:** confirmation delay capture (kept for in-run delays), dashboards, PPC plan-vs-actual.

### OPS-R-12 — Mill reports
**Date:** 2026-09-15 · **From:** §13 · **Status:** DRAFT
**Ask:** views `v_ops_daily_production`, `v_ops_so_wise_production`, `v_ops_heat_yield`, `v_ops_process_parameters`, `v_ops_monthly_trend`, `v_ops_delay_cobble`, `v_ops_erp_confirmation`, `v_ops_yield_by_size`; the report screen lists them with filters; layouts on the deferred document service.
**Why:** F8.3-01…11, F9.0-02/03.
**Affects:** report endpoints (19 existing reports stay).

### OPS-R-13 — Annealing and pickling jobs
**Date:** 2026-09-15 · **From:** §14 · **Status:** DRAFT `[D-08 for SCADA]`
**Ask:** new `mes_ht_job`, `mes_ht_job_line`, `mes_ht_sample_position_rule`; `mes_production_sample` + `input_weight_kg`, `theoretical_cut_kg`, `cut_confirmed_at`, `erp_outbound_id`; jobs built from the PPC downstream schedule with hook / base / layer positions, the HT-cycle code from the PSN, cycle download and SCADA status, probable unloading time, invisible loss and by-product posting, sample cutting after confirmation with the SAMPLE_SCRAP posting, auto-swap of inaccessible coils through the swap engine; views `v_ops_ht_status`, `v_ops_base_utilisation`.
**Why:** ANL-001…013, SCH-001/002, F9.1-01…10, F9.2-01…04, F9.3-01…03, 12.1.4 additional points.
**Affects:** confirmation card for batch operations, production sample, swap engine (PPC-R-09), routing attribute rules (data).

### OPS-R-14 — ABGM, Bright Bar and GMM objects: code conversion, packs, bar outputs, bunkers
**Date:** 2026-09-15 · **From:** §15, §16, §17, §18 · **Status:** DRAFT `[D-05]`
**Ask:** new `mes_code_conversion_event`, `mes_pack`, `mes_pack_line`, `mes_gmm_zone_config`, `mes_gmm_bar_output`, `mes_bunker_movement`; `mes_abgm_schedule_line` + `status`, `scan_event_id`, `machine_priority`, `day_priority`, `grinding_confirmation_id`, `code_conversion_id`, `location_after`; `mes_downstream_schedule_line` + `dispatch_due_date`, `tempering_buffer_days`, `lead_time_days`, `required_production_date`; the ABGM screen over the schedule lines with the section-limit check and the grinding confirmation producing the converted code; bright-bar conversion per BOM level and packing; GMM counts and yield (R-OPS-51), segregation, bunker movements and bag numbering with heat shares, dispatch weight variance, the one-way save warning; views `v_ops_pending_material`, `v_ops_genealogy_flow`, `v_ops_gmm_prime_yield`.
**Why:** F9.5-01…03, F9.6-01…06, F9.4-01…08, GMM-001…011, SEG-001…004, PCK-001…006, DSP-001…003, F9.0-01.
**Affects:** confirmation card (produced SKU from the conversion rule), form-conversion rules (MDM-R), GMM lots (PPC-R-14), dispatch challan.

---

## Quality module items (designed in the QA Data-Model §30, not requests)
- §30.1 hot-out decision worklist item writing `mes_hot_out_event.qa_decision`.
- §30.2 bar segregation entry screen over `mes_segregation_entry` / `_line` (`entered_by_role = QUALITY`).
- §30.3 auto-clearance rule trigger on the acknowledged ERP confirmation (pickling).
- §30.4 GMM hardness tests against the ball lot; downstream sampling frequency from the PSN.
