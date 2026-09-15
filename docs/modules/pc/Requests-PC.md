# Request register — Process Control design → MES PC

**Direction:** the Process Control design (`PC-Data-Model.md`) is a platform design: the parameter master, the captured readings, the deviation events, the alert ledger, the correction loop, the length profile, the trials and the publication ledger live in the production-confirmation application (`Bluemingo_MES`), so the design is raised here as change requests to the platform team. The Quality touchpoints are designed in the QA Data-Model §31 (not requests). No Allocator item. Same rules as the other registers (append, one item = one ask, permanent ids, raise before the migration). Drafted 2026-09-15.

**Statuses:** `DRAFT` → `OPEN` · `NEEDS_INFO` · `ACCEPTED` · `IN_PROGRESS` · `DONE` · `REJECTED`

**Flags:** `[P2]` notification engine deferred — rules and ledger only · `[P5]` OPC-UA / MQTT transport deferred · `[D-08]` Level-2 capture on the Operations message ledger under assumption · `[D-14]` trials designed in scope.

---

## MES PC items

### PC-R-01 — Parameter master completion and the coverage view
**Date:** 2026-09-15 · **From:** Process Control design §2 (on top of MDM-R for §3.7 and OPS-R-03) · **Status:** DRAFT
**Ask:** `mes_process_attributes` + `value_type`, `accepted_values_json`, `expected_boolean`, `is_mandatory`, `skip_allowed`, `grace_pct`, `capture_stage`, `display_on_lab`, `display_on_inspection`, `trend_window_n`, `sop_document_ref`, `share_topic`, `default_severity`; resolution precedence PSN → grade family → size family → equipment → operation default (seeded priorities) with the resolved row snapshotted at capture; the Process Attributes master screen shows the new columns; view `v_pc_master_coverage`.
**Why:** PC-001, PC-004, F2.1-01, F2.1-06; rows 1, 2, 7, 11, 29 — one master per unit and grouping, with the acceptance rules for every value type.
**Affects:** Process Attributes master screen and `ProcessAttributeController`; the process-parameters call of the confirmation screen.

### PC-R-02 — Capture extensions, validation at entry, mandatory enforcement, Level-2 capture and failover
**Date:** 2026-09-15 · **From:** §3 · **Status:** DRAFT `[D-08]`
**Ask:** `mes_process_parameters_captured` + `original_value`, `corrected_value` (+ by / at / reason / `correction_id`), `capture_status`, `skip_reason`, `captured_at`, `captured_by`, `equipment_id`, `batch_id`, `heat_number`, `schedule_material_child_id`, `tdc_id`, `process_attribute_id`, limit snapshots, `breach_class`, `deviation_id`, `l2_message_id`, `expected_source`, `trial_id`, `is_mandatory_snapshot`; `mes_pc_screen_config` + `enforce_mandatory_parameters`, `deviation_hold_severity`, `show_spec_panel`, `l2_capture_window_s`, `lock_auto_values`; server-side validation of R-PC-05 (NUMERIC with the configurable grace band, LIST, BOOLEAN) with the breach persisted; mandatory enforcement with skip reason; a row per parameter of the resolved set (MISSING for blanks); standard / actual / corrected columns on the card; PARAMETER_ACTUAL messages (OPS-R-10) writing AUTO rows, FALLBACK after the window, OVERRIDDEN with reason; views `v_pc_parameter_trace` (searchable by heat / batch / unit; feeds Genealogy) and `v_pc_fallback_exceptions`; reversal mirror extended with the new columns.
**Why:** PC-002, PC-003, PC-005, F2.1-02/03, F2.2-01…04, 5.3 additional point 4; rows 5, 6, 8, 9, 10, 22, 28 — the reading becomes the record of truth; nothing stays browser-only.
**Affects:** Production Confirmation (Process Parameters card and submit payload), reversal service, Genealogy report.

### PC-R-03 — Deviation events and the severity matrix
**Date:** 2026-09-15 · **From:** §4 · **Status:** DRAFT
**Ask:** new `mes_process_deviation`, `mes_deviation_severity_rule`; a deviation written by the capture (and by the Level-2 message) whenever the breach class is not IN_RANGE; severity by R-PC-09 (rules by scope, attribute, breach class, magnitude band; critical parameters never below MAJOR); numbering `DEV-{unit}-{yyyymm}-{seq}`; one event per reading, closed by an in-range correction, voided by reversal; view `v_pc_deviation_log`.
**Why:** PDA-002, PDA-005, F2.1-05; rows 14, 19.
**Affects:** confirmation service (post-capture hook), a new Deviation Log screen.

### PC-R-04 — Alert ledger with acknowledgement and escalation
**Date:** 2026-09-15 · **From:** §5 · **Status:** DRAFT `[P2]`
**Ask:** new `mes_process_alert` — one row per recipient role of the resolved rule (parallel routing to the operating shift and the Quality on-duty contact), shift-aware recipient resolution, acknowledgement with user and time, automatic escalation rows after `escalate_after_min` along the hierarchy until acknowledged, MINOR expiry at shift end, `pulpit_code` for the wallboard; the delivery engine is the deferred notification foundation — the ledger is written now (in-app bell as the first channel).
**Why:** PDA-001, PDA-003; rows 17, 18, 20.
**Affects:** notification store (severity from the rule), the Operations wallboard (OPS-R-01).

### PC-R-05 — Hold interlock and disposition
**Date:** 2026-09-15 · **From:** §6 · **Status:** DRAFT
**Ask:** a deviation at or above the unit's hold severity raises an inventory hold (existing `InventoryHoldService`) with the seeded reason PROCESS_DEVIATION and links it; release only through the disposition (ACCEPT with reason, REWORK, REJECT) by a role of the rule, or DEVIATION_OVERRIDE (privileged); CRITICAL (or `raise_ncr`) requests a Quality NCR with `nc_against = PROCESS` and stores the NCR number; the hold blocks scheduling, charging and auto-clearance (existing gates; the Quality rule in QA §31.2).
**Why:** PDA-004; row 21.
**Affects:** holds, confirmation gates, Deviation Log screen.

### PC-R-06 — Setup sheets, online non-conformance, parameter corrections, suspect flag
**Date:** 2026-09-15 · **From:** §7 · **Status:** DRAFT
**Ask:** new `mes_setup_sheet`, `mes_setup_sheet_line`, `mes_online_nc`, `mes_parameter_correction`; `mes_batches` + `suspect_flag`, `suspect_reason`, `suspect_online_nc_id`, `suspect_raised_at`, `suspect_cleared_by`, `suspect_cleared_at`, `suspect_result`; the setup sheet's set-points as the standard column on the mill pulpit; online NC against the running batch with defect and position; the correction linked to the NC and the deviation; the suspect flag from the NC's sequence position, cleared only by the offline inspection result (QA §31.4); view `v_pc_correction_loop`.
**Why:** 5.3 additional point 3; row 23; PPC row 9.2 (setup sheet to the operation people).
**Affects:** confirmation card (standard column), size-setting mode, batch queue (suspect chip), sample hand-off.

### PC-R-07 — Length-wise quality profile and apportionment
**Date:** 2026-09-15 · **From:** §8 · **Status:** DRAFT `[D-08 / P5 — interface deferred]`
**Ask:** new `mes_length_profile`, `mes_length_profile_segment`, `mes_length_profile_allocation`; the profile received per input billet (message ledger / device register of OPS-R-10); apportionment at the cooling-bed split (OPS-R-09) with min / max / length-weighted average / pooled standard deviation / worst surface index / mean quality index per bundle or coil; REJECT segments flag the bundle for segregation; view `v_pc_length_quality`.
**Why:** 5.3 additional point 1; row 24.
**Affects:** cooling-bed bundling, segregation entry, Genealogy.

### PC-R-08 — Heat-wise trials with an approved envelope
**Date:** 2026-09-15 · **From:** §9 · **Status:** DRAFT `[D-14]`
**Ask:** new `mes_process_trial`, `mes_process_trial_parameter`; request → approve (TRIAL_APPROVE) → running → close with outcome; readings inside the trial envelope get breach class TRIAL and no standard deviation, outside it a deviation marked with the trial; ADOPTED proposes a master change request; view `v_pc_trial_followup` (the SOW trial follow-up report).
**Why:** 5.3 additional point 5; row 26; OPEN-GEN-1.
**Affects:** validation at entry (R-PC-05), confirmation card (trial banner).

### PC-R-09 — Publication ledger and the critical-parameter matrix
**Date:** 2026-09-15 · **From:** §10 · **Status:** DRAFT `[P5]`
**Ask:** new `mes_parameter_publication` — a row per captured value of a critical parameter per protocol with the node / topic rendered from `share_topic`, the payload at batch-id level and the status; view `v_pc_critical_matrix`; the OPC-UA server and the MQTT client are the deferred transport (address space, security profile, QoS and retention agreed with JSW IT).
**Why:** PC-008, F2.3-03…05; rows 15, 16.
**Affects:** post-capture hook; a new External Sharing screen.

### PC-R-10 — Specification and SOP panel, batch-wise view, pulpit feed
**Date:** 2026-09-15 · **From:** §11 · **Status:** DRAFT
**Ask:** with `show_spec_panel` the confirmation screen shows the PSN unit view (CQ-R-01 resolution), the resolved parameter set and the SOP references beside the capture card; batch-wise view per unit from `v_pc_parameter_trace`; open alerts and deviations exposed to the Operations wallboard by `pulpit_code`; charging and scheduling refuse a BLOCKED PSN (the CQ lifecycle check, CQ-R-04).
**Why:** F2.1-04, F2.2-04, 5.3 additional point 2, 5.1 additional point, SOW general requirement; rows 3, 25, 27, 30.
**Affects:** confirmation screen, wallboard, charging validation (OPS-R-02).

### PC-R-11 — Reports and the monitoring dashboard
**Date:** 2026-09-15 · **From:** §12 · **Status:** DRAFT
**Ask:** view `v_pc_monitoring` (trend, out-of-range and NEAR rates, deviations by severity, fallback rate, unit comparison) and the report list over the views of PC-R-01 … 09 with drill-through to the PC detail drawer and export; layouts on the deferred document service.
**Why:** PC-006, PC-007, F2.3-01/02, F2.1-05; rows 12, 13, 14.
**Affects:** reports menu, dashboard.

---

## Quality module items (designed in the QA Data-Model §31, not requests)
- §31.1 read-only parameter panel on inspection and test entry (rows 4, 3).
- §31.2 deviation disposition dialog, usage-decision auto-clearance interlock, NCR raised for CRITICAL deviations (`mes_qc_ncr.process_deviation_id`) (row 21).
- §31.3 notification-rule master extension — severity, condition, escalate-after, escalation role, multiple and shift-aware recipients, the process events (rows 17–20).
- §31.4 suspect-flag verification in offline inspection (row 23).
- §31.5 PSN block on repeat rejection — screen policy PSN_REJECTION_BLOCK (row 27).
