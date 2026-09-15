# JSW MES v2 — Customer Quality / PSN Management: data-model design (Phase 2, pass 2)

**Date:** 2026-09-15 · **Status:** design draft v0.1 for review · **Scope:** BRD §4 (PSN Management, 53 requirement rows / epic E1, 53 stories) and the 46 reviewed points of `CQ_PSN_SOW_vs_QA_Functional_gap (Bluemingo review).xlsx`; the 20 design items of area 5 in the Phase 2 backlog.
**Basis:** the live QA build (`mes_tdc_input` 678 TDCs with wide ranges; QA tier tables `mes_qc_tdc_limit`, `_standard`, `_test_standard`, `_customer_grade`, `_remark`, `_ht` — built; `mes_tdc_approval` built, 0 rows; generic `mes_qc_approval` in use for RM inspection and UD with an `APPROVAL_CHAIN` screen policy; `mes_qc_certificate` built; `mes_qc_attachment` built), the development repo's TDC authoring service (create / general / customer grades / tests / remarks / submit / approvals / status / copy) and its TDC resolution chain (sample → order line → `tdc_no` → `mes_tdc_input` → `mes_tdc_attr_range`), and the MDM design (§2.5 product type matrix, §4.8 distribution lists, §4.10 PSN segments / attributes / number formats). Every "exists" claim was checked on 2026-09-15.
**Scope rules in force (2026-09-12):** platform foundations deferred (identity P1, notifications P2, document/PDF P6, effective dating P3) — content named, engines not designed; integration designed MES-side only (SAP VC, SFDC/CFR); **D-04 decided: the PSN is the TDC record extended**; other decisions parked and flagged `[assumption — D-nn]` (D-03 roles named not enforced; D-10 segment content owners; D-14 development PSN in scope; D-01 SAP transport).

---

## 0. Organisation

### 0.1 Ownership and landing
Everything in this design is **QA-owned** (`mes_qc_*` tables and the QA-owned columns of `mes_tdc_input`, as §11.1 of the QA Data-Model already does): it lands as **§29 of the QA `Data-Model.md`** (development copy §34; its §25–§33 are used). Three things need the platform and are raised as change requests **CQ-R-01 … CQ-R-04** in `Requests-CQ.md`: the production-confirmation resolution by PSN, the order-line PSN revision pin, the development production category, and the planner's read of the PSN status. Nothing inside MES PC or the Allocator is coded here.

### 0.2 Conventions
As the QA Data-Model §2 and the MDM design §0.2: PK `<entity>_id bigint`; **`+ audit tail`**; `(Y)` nullable; scope keys and resolution rule **R-S**; `effective_from/to` informational until P3. **"PSN" and "TDC" name the same row of `mes_tdc_input`** (D-04): `tdc_id` is the PSN id; the JSW-facing number is `psn_no` (MDM §4.10); `tdc_no` remains the platform key the order line and the Allocator carry. Product-agnostic per D0: segments, attributes, statuses' labels, stages and templates are data.

### 0.3 Live facts that shaped the design (verified 2026-09-15)
- `mes_tdc_input`: 678 rows, all dated 2026-03-31 (one load), `status_tdc = false`, `status`, `revision_no`, `parent_tdc_id`, `customer_id`, `grade`, `shape` all NULL — the header extension columns exist but were never populated; the load carries `tdc_no` + `tdc_date` + wide ranges only. The development repo confirms `grade` is a "dead column" and resolves grade from the lot's attributes.
- `mes_order_line_items.tdc_no` is NULL on every row of this deployment, so the built TDC resolution chain stops at hop 3; the platform must populate it (dev note §26.1) — CQ-R-01 repeats the ask.
- Generic approval **`mes_qc_approval`** (entity_type, level, approver_role, approver_id, status, action_date, remarks) is live and exercised (RM inspection: 17 approved / 5 pending per level; UD: pending) and chains are configured as data (`APPROVAL_CHAIN` policy: `[{level, role, label}]`). The TDC-specific `mes_tdc_approval` has 0 rows. **The PSN workflow uses the generic table** (M-CQ-05).
- `mes_qc_screen_policy` (58 rows) already scopes policies by screen × operation / form / category / sku / supplier / customer / grade — the natural home for PSN policies (inactivity days, validation heats, similarity tolerances).
- `mes_qc_attachment` is polymorphic (`entity_type`, `entity_id`, `doc_type`, file, caption, instrument, captured_at) — reused for PSN documents.
- `mes_qc_certificate` already carries `tdc_id`, `customer_id`, `cert_type`, `status` lifecycle and lines with spec/actual — the CoA is a template and gate on top of it, not a new object.
- `mes_qc_notification_rule` (designed) has `subject_template` and `body_template`; the event vocabulary is a fixed select in the mock-up — this design adds the PSN events and makes the event list data (§7.6).

---

## 1. Cross-cutting decisions for Customer Quality / PSN

| # | Decision | Rationale |
|---|---|---|
| **M-CQ-01** | **The PSN is the TDC row.** `mes_tdc_input` gains the PSN header columns; the ten wizard segments are data over it; measured characteristics stay in the three-tier limit table; text / LOV / document attributes go to one generic attribute-value table. | D-04. The 678 loaded TDCs, the order-line link, the Allocator mirror, the certificate and every validation point already key on `tdc_id`. |
| **M-CQ-02** | **One PSN, many customer TDC references.** A PSN may serve several customer / TDC / grade / size combinations; attribute values and limits may be scoped to one combination or apply to all (F1.1-13, DUP-006/007). The header's `customer_id` / `customer_tdc_no` remain the *primary* combination. | Chemistry is shared across customers; a compatible new customer TDC is added to the existing PSN rather than duplicated. |
| **M-CQ-03** | **Aim / control chemistry is a fourth tier (`AIM`) of the limit table**, validated inside the applied customer range. Grade Chemistry's aim pre-fills it. | INT-007 / CHM-001: customer range and control range on one record, one screen, one resolution. |
| **M-CQ-04** | **Computed characteristics are formulas over the dictionaries** (carbon equivalent and similar): a formula master with expression, variables and precision, default or customer-specific; evaluated for AIM tiers and for heat actuals. | CHM-002…004; pattern = the Allocation application's computed-strategy engine. |
| **M-CQ-05** | **Workflow on the generic approval table** with a data-configured chain (Review 1 → Review 2 → Approval), role pools with first-claim lock, mandatory comments, return-to-creator. `mes_tdc_approval` is retired for new records. | Reuse the exercised mechanism; chains are already data. Enforcement of who may act is P1 `[assumption — D-03]`. |
| **M-CQ-06** | **Status is one vocabulary** on `mes_tdc_input.status`, widened from the TDC set to the PSN lifecycle; `psn_kind` separates COMMERCIAL from DEVELOPMENT; the current revision is the one in force. | One column every consumer already reads; no parallel PSN status. |
| **M-CQ-07** | **Revision = new row chained by `parent_tdc_id`** (as built), sharing `psn_no`, `revision_no + 1`; the previous revision becomes OBSOLETE on approval of the new one and stays readable to QA. Compare = a computed delta between two rows. | The built revision mechanism; nothing rebuilt. |
| **M-CQ-08** | **Engines deferred, content designed:** mail templates and events (P2), PSN PDF layout (P6), auto-save interval and logout hook (platform F15.7-01), SAP VC transfer and migration (D-01), SFDC/CFR ingestion (interface) — each has its MES-side table or policy here. | Scope decision 2026-09-12. |
| **M-CQ-09** | **Downstream visibility is a read model, not a screen**: the unit-wise matrix decides which PSN attributes each unit sees; the production-confirmation, inspection, testing and clearance screens resolve the PSN of the material and read the matrix. | Row 46: the distribution channel exists; only the PSN key is missing (CQ-R-01). |

---

## 2. PSN record (header) and its keys

### 2.1 `mes_tdc_input` — PSN header extension *(rows 1, 8, 28, 34, 45; F1.1-02, F1.1-06, F1.5-01, PDR-001)* — QA
The existing header (§11.1 of the QA Data-Model: customer, customer TDC no., item category, grade / series / group, shape, form, execution, HTC code, primary standard, print grade description, size range, requirement flags, status, revision chain, copy origin) plus the MDM additions (`psn_no`, `psn_format_id`, `product_type_id`) gains:

- `mes_tdc_input` gains: **`supply_condition varchar(50)`** (Y — LOV) · **`rolling_route varchar(50)`** (Y — LOV; the number-format driver) · **`input_cast_size varchar(30)`** (Y — LOV) · `market varchar(20)` (Y — DOMESTIC / EXPORT) · `size_text varchar(100)` (Y — the key "Size") · `size_min` / `size_max numeric(12,3)` (Y) · **`psn_kind varchar(15)`** (COMMERCIAL / DEVELOPMENT — default COMMERCIAL) · `development_owner_role varchar(50)` (Y — the role that may see a DEVELOPMENT PSN) · `promoted_to_tdc_id` FK `mes_tdc_input` (Y — the commercial PSN a development PSN became) · **`is_current boolean`** (default true — the revision in force; false on OBSOLETE rows) · `submitted_at timestamptz` (Y) · `submitted_by bigint` (Y) · `approved_at timestamptz` (Y) · `approved_by bigint` (Y) · `last_production_at timestamptz` (Y — refreshed by the inactivity monitor) · `inactive_since timestamptz` (Y) · `inactivity_reason varchar(30)` (Y — NO_PRODUCTION / MANUAL) · **`validation_status varchar(20)`** (Y — NOT_REQUIRED / IN_PROGRESS / PASSED / ATTENTION) · `flag_count int` (default 0 — open attribute flags, denormalised for the submission gate) · `source_type varchar(20)` (Y — CFR_MANUAL / CFR_PDF / SAP_VC_MIGRATION / SFDC / CLONE / REVISION) · `source_ref varchar(100)` (Y — CFR number / SAP VC object) · `sap_vc_status varchar(15)` (Y — NA / PENDING / SENT / ACKED / ERROR; design part only) · `sap_vc_sent_at timestamptz` (Y) · `creator_comments varchar(1000)` (Y — carried into the submission mail).
- **Status vocabulary (CHECK widened):** `DRAFT` · `PENDING_REVIEW_1` · `PENDING_REVIEW_2` · `PENDING_APPROVAL` · `RETURNED` · `APPROVED` (in force = the SOW "Active"; the built `RELEASED` maps here) · `INACTIVE` · `OBSOLETE` (superseded revision) · `BLOCKED` · `STOPPED`. The built `PENDING` reads as PENDING_REVIEW_1. Labels are data (`mes_qc_psn_status_label`, §8.1) so JSW's words (Under creation, Under review, Approved, Inactive, Obsolete) print without code.
- Uniqueness: (`psn_no`, `revision_no`) unique; at most one `is_current` row per `psn_no`.

### 2.2 `mes_qc_psn_customer_tdc` — customer / TDC / grade / size combinations under one PSN *(rows 18, 22; F1.1-13, DUP-006/007, CLN-005)* — QA
- **`mes_qc_psn_customer_tdc`** — `psn_customer_tdc_id` PK · `tdc_id` FK `mes_tdc_input` (the PSN) · `customer_id` FK `mes_customers` · `customer_tdc_no varchar(100)` (Y — the customer's TDC reference) · `customer_tdc_revision varchar(20)` (Y) · `grade varchar(50)` (Y) · `size_min` / `size_max numeric(12,3)` (Y) · `size_text varchar(100)` (Y) · `is_primary boolean` (mirrors the header's customer / TDC) · `sap_tdc_ref varchar(60)` (Y — CHM-005, auto-fetched TDC no. / revision from SAP; design part only) · `added_in_revision int` (the PSN revision that added the combination) · **+ audit tail**. UQ (`tdc_id`, `customer_id`, `customer_tdc_no`, `grade`, `size_min`, `size_max`).
- **R-CQ-01 — scoped resolution:** an attribute value or limit row carries `psn_customer_tdc_id` (Y); when the material's order line names a customer / TDC / grade / size combination, rows scoped to that combination win over unscoped rows (R-S with this one key); each combination is unique within an attribute (F1.1-13).

### 2.3 `mes_qc_psn_source` — provenance of the PSN content *(rows 2, 39; F1.1-01, INT-001…005; integration deferred)* — QA
- **`mes_qc_psn_source`** — `source_id` PK · `tdc_id` FK · `source_type varchar(20)` (CFR_MANUAL / CFR_PDF / SAP_VC_MIGRATION / SAP_VC_SYNC / SFDC / CLONE / REVISION) · `source_ref varchar(100)` (Y — CFR no., SFDC id, SAP VC object) · `received_at timestamptz` (Y) · `attachment_id` FK `mes_qc_attachment` (Y — the signed CFR PDF) · `extraction_status varchar(15)` (Y — NA / PENDING / DONE / FAILED — PDF field extraction is a deferred interface; MANUAL entry is the design default per INT-004) · `notes varchar(500)` (Y) · **+ audit tail**.
- The wizard's "Start from CFR" action creates this row and opens the key segment for manual entry (INT-004); the SFDC interface and PDF extraction, when contracted, only pre-fill the same fields.

---

## 3. Segments, attributes and values (the ten-segment wizard)

### 3.1 Configuration (from the MDM design) *(rows 17, 19, 20, 21; F1.1-10…12)* — QA
`mes_qc_psn_segment` (10 seeds), `mes_qc_psn_attribute` (segment, label, data type, dictionary link, dropdown source, sequence, mandatory, key field, multi-value keyed, print flag), `mes_qc_psn_product_type` (+ sections / formats / attribute applicability) and `mes_qc_psn_number_format` are defined in the MDM design §2.5 and §4.10 and are not repeated. Additions here:
- `mes_qc_psn_attribute` gains **`value_target varchar(15)`** (LIMIT / VALUE / DOCUMENT — where the value is stored: the tier table for measured characteristics, the attribute-value table for everything else, the attachment store for documents) · `unit_visibility_default varchar(10)` (Y — SHOW / HIDE for the unit matrix default, §11) · `compare_ignore boolean` (default false — excluded from revision compare, e.g. remarks) · `operations_facing boolean` (default false — RPT-006 default subset).
- Segment seeds carry the SOW sizes as guidance only (Chemistry ~150, General ~50, SMS ~50, Mills ~50–100, Testing ~400, Annealing ~200, Grinding Media ~200, Inspection ~200, Logistics ~20, Packing ~20). **The attribute lists themselves are data JSW's segment owners supply `[assumption — D-10]`**; Annex A seeds what the built TDC tabs and the BRD already name.

### 3.2 `mes_qc_psn_attribute_value` — values of non-measured attributes *(rows 8–16, 18, 27; F1.1-02, F1.1-07, F1.1-13)* — QA
- **`mes_qc_psn_attribute_value`** — `value_id` PK · `tdc_id` FK `mes_tdc_input` · `psn_attribute_id` FK `mes_qc_psn_attribute` · `psn_customer_tdc_id` FK (Y — scope, §2.2) · `value_text varchar(500)` (Y) · `value_num numeric(18,4)` (Y) · `value_min` / `value_max numeric(18,4)` (Y — RANGE attributes that are not dictionary characteristics) · `value_date date` (Y) · `value_bool boolean` (Y) · `lov_value varchar(100)` (Y — the chosen dropdown value / code) · `lov_ref_id bigint` (Y — id in the LOV's master when the source is a table) · `uom_unit_id` FK `mes_units` (Y) · **`is_flagged boolean`** (default false — CLN-007 "not yet available") · `flag_note varchar(255)` (Y) · `flagged_by bigint` (Y) · `flagged_at timestamptz` (Y) · `sequence_no int` (Y — multi-row attributes) · **+ audit tail**. UQ (`tdc_id`, `psn_attribute_id`, `psn_customer_tdc_id`, `sequence_no`).
- Measured characteristics (data type RANGE / NUMBER with a dictionary link) are **not** stored here: their values are `mes_qc_tdc_limit` rows (§4) so that inspection, testing and certificates keep one specification source. Documents are `mes_qc_attachment` rows (§5).
- **R-CQ-02 — value type by attribute:** the wizard writes exactly one of `value_text / value_num / value_min+max / value_date / value_bool / lov_value` according to the attribute's data type; a LOV value must exist and be active in its source (CL-05 of the MDM design — in-use values cannot be deleted).

### 3.3 The key field set (CLN-001/002)
The key segment's attributes are header columns (Customer, Grade, TDC reference, Size, Supply condition, Date, Active) — entered once on the header and shown read-only on every segment. Additional customer / TDC combinations are §2.2 rows, not re-entry per tab.

### 3.4 Wizard progress and drafts *(rows 25, 26; F1.1-08; platform F15.7-01)* — QA
- **`mes_qc_psn_draft`** — `draft_id` PK · `tdc_id` FK · `user_id bigint` · `segment_id` FK (Y — the segment being edited) · `payload_json jsonb` (the unsaved segment form state) · `saved_at timestamptz` · `save_reason varchar(15)` (INTERVAL / LOGOUT / MANUAL) · **+ audit tail**. One live draft per PSN × user; auto-save writes it at the configured interval and on the logout hook (the timer and hook are the platform behaviour F15.7-01; the interval is the policy `PSN_AUTOSAVE_SECONDS`, default 120). "Save as draft" persists the segment values proper and clears the draft row.
- Preview at any stage renders the PSN report layout (Annex C) from the saved values — P6 document service for the PDF; the HTML preview is the wizard's own.

---

## 4. Chemistry segment — tiers, aim and formulas

### 4.1 `mes_qc_tdc_limit` — fourth tier and scope *(rows 4, 5, 7, 18; INT-007, CHM-001)* — QA (extends §11.2)
- `mes_qc_tdc_limit` gains: **`tier` vocabulary gains `AIM`** (the internal control range used for casting; STANDARD / CUSTOMER / APPLIED unchanged) · **`psn_customer_tdc_id` FK (Y)** (scope, §2.2) · `psn_attribute_id` FK `mes_qc_psn_attribute` (Y — which wizard attribute the row belongs to) · `is_flagged boolean` · `flag_note varchar(255)` (Y) · `computed_by_formula_id` FK `mes_qc_formula` (Y — the row is a computed characteristic).
- **R-CQ-03 — aim validation (CHM-001):** on entry of an AIM min / max for an element, the value is compared with the APPLIED tier of the same element (and scope): outside → the cell is marked *caution* and the row flagged; the PSN can still be saved but not submitted until the flag is cleared or an explicit "accepted outside customer range" reason is recorded (audited). Worked example: Cr APPLIED 16.00–18.00, AIM entered 15.90–17.20 → caution "AIM min 15.90 below customer min 16.00".
- **R-CQ-04 — pre-fill:** on creating the chemistry segment, AIM rows pre-fill from `mes_qc_grade_chemistry` (works aim) for the PSN grade; the user overrides per PSN.
- **R-CQ-05 — who reads which tier:** casting (SMS) reads AIM; inspection, testing and certificates read APPLIED (unchanged); the comparison view (MDM §4.5 `v_qc_chemistry_compare`) shows all four.

### 4.2 `mes_qc_formula` — computed characteristics *(row 6; CHM-002…004)* — QA
- **`mes_qc_formula`** — `formula_id` PK · `formula_code` UQ · `name` · `target_element_id` FK `mes_qc_element` (Y) *xor* `target_attribute_id` FK `mes_global_attributes` (Y) — the computed characteristic (e.g. element CE, or attribute Carbon Equivalent) · **`expression varchar(500)`** (e.g. `C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15`; identifiers are element or attribute codes) · `variables varchar(255)` (CSV of the codes used, validated against the dictionaries) · `precision int` (default 3) · `customer_id` FK `mes_customers` (Y — customer-specific formula) · `standard_ref varchar(100)` (Y — e.g. IIW) · `is_default boolean` · `applies_to varchar(20)` (AIM / ACTUAL / BOTH) · `priority int` · `effective_from/to` · **+ audit tail**.
- `mes_qc_element` gains **`is_computed boolean`** (default false) · `default_formula_id` FK (Y). A computed element has no entered value: its AIM min / max are evaluated from the other elements' min / max (min over mins, max over maxes), its ACTUAL from the heat's actual values.
- **R-CQ-06 — formula selection:** for a PSN, the formula for a computed characteristic resolves by (customer of the PSN, default) — customer-specific first, then the default (CHM-004). Evaluation uses a safe arithmetic evaluator (+ − × ÷, parentheses, min / max) with no code execution. Worked example: default CE for AIM max: C 0.20 + Mn 1.50/6 + (Cr 0.30 + Mo 0.05 + V 0)/5 + (Ni 0.20 + Cu 0.25)/15 = **0.550**.

---

## 5. Documents *(row 3; F1.1-03)* — QA

- **`mes_qc_document_type`** — `document_type_id` PK · `code` / `name` UQ · `applies_to varchar(30)` (PSN / TDC / GRADE / SIZE / CUSTOMER / CERTIFICATE — CSV) · `allowed_formats varchar(100)` (DOCX,XLSX,PDF,PNG,JPG) · `restricted_roles varchar(255)` (Y — CSV of role codes that may open it; blank = every PSN reader) `[assumption — D-03]` · `title_required boolean` (the "Others" type asks for a title) · `sequence_no` · **+ audit tail**. Seeds: Customer TDC · Internal Clarification Mail · Final Signed CFR · Final Acceptance Mail · Technical Data — Carbon Equivalent · Technical Data — Jominy · Technical Data — DI · Technical Data — Mechanical Property · Technical Data — Metallurgical Property · Others.
- `mes_qc_attachment` gains **`document_type_id` FK (Y)** · `title varchar(150)` (Y) · `linked_grade varchar(50)` (Y) · `linked_size varchar(100)` (Y) · `linked_customer_id bigint` (Y) — a document attached "against Grade / Size / Customer" rather than one PSN (entity_type = PSN_DOCUMENT with `entity_id` = PSN, or GRADE / CUSTOMER with the link columns).
- **R-CQ-07 — retrieval:** documents of a PSN open in-portal only for users holding the QA role (or the type's restricted roles); other PSN readers see the document list without the file. Storage is the platform document service when it lands (P6); the attachment table already stores path and type.

---

## 6. Wizard behaviours — flags, submission gate, clone, duplicacy and similarity

### 6.1 Attribute flags and the submission gate *(row 27; CLN-007/008, F1.1-07)*
Flags live on the value rows (§3.2, §4.1). **R-CQ-08:** Submit for review is refused while `flag_count > 0`; the refusal lists the flagged attributes by segment. Clearing a flag requires a value or an explicit "not applicable" with a note. `flag_count` is recomputed on every value save.

### 6.2 Clone with section-level selection *(row 24; CLN-003…005, F1.1-05)* — extends the built Copy
The built copy (deep-copies limits, standards, tests, remarks, customer grades into a new DRAFT) is extended:
- Copy dialog gains **segment checkboxes** (which segments' values / limits to copy; the key segment is always copied) and a **customer / TDC combination selector** (which §2.2 rows come along; "header only" allowed).
- **R-CQ-09 — number on save, not on click:** the clone opens as an unsaved DRAFT without a `psn_no`; the number is allocated on the first Save (format resolution R-PSN-01 of the MDM design). Cancel discards everything.
- **R-CQ-10 — no-change block:** Save is refused when the clone's values, limits and combinations are identical to the source (hash of the copied rows compared after edit) — "at least one attribute must differ from the source".
- `mes_tdc_input.copied_from_tdc_id` (built) records the origin; `copy_segments varchar(255)` (Y) records which segments were copied.

### 6.3 Duplicacy check and similar-PSN search *(rows 22, 23; DUP-001…007, F1.1-04)*
- **Duplicacy gate (DUP-001):** New PSN first asks for the key fields (customer, grade, product type, supply condition, TDC reference) and lists existing PSNs matching on them — with status (Active / Inactive / Obsolete labels), revision and actions **View / Clone / Add TDC to this PSN** (DUP-007: the new customer TDC becomes a §2.2 combination of the existing PSN and a revision of its chemistry is opened). Customer and supply condition alone do not block creation (DUP-006).
- **Similarity search (DUP-002…005):** a search screen over the PSN set: filters Chemistry (per-element min / max), Grade, Size, Supply condition, TDC reference; **chemistry-range similarity** = every element of the candidate's AIM (or APPLIED when no AIM) range within ± tolerance of the searched range; tolerance per element from the policy `PSN_SIMILARITY_TOLERANCE` (json, default ± 0.05 % for every element; JSW tunes) · optional mechanical filters (Jominy / hardness attributes: range overlap). Result columns: PSN no., revision, status, customer(s), grade, size, supply condition, match score (elements within tolerance ÷ elements searched).
- View **`v_qc_psn_search`** — one row per PSN with the key fields, the AIM and APPLIED ranges per element pivoted (via `mes_qc_element.column_reference`, the same wide projection the heat-chemistry table uses) and the principal mechanical limits — the search reads this view; no new store.

---

## 7. Review and approval workflow *(rows 29–33; F1.2-01…05, WFL-002/003/007)*

### 7.1 Chain configuration (data)
`mes_qc_screen_policy` for the PSN screen: **`APPROVAL_CHAIN`** = `[{level 1, stage REVIEW_1, role_pool [ROLE_REVIEWER_1…], label "Review 1"}, {level 2, stage REVIEW_2, role_pool [...], label "Review 2"}, {level 3, stage APPROVAL, role_pool [...], label "Approval"}]` — the SOW roles (Prepared by → Reviewer 1 → Reviewer 2 → Approver: Shift In-charge, Head PDQC, Head TE & PDQC, Head TS / R&D) are role codes in the pools; **`COMMENT_MANDATORY`** = true for ADVANCE and RETURN; **`PREVIEW_IN_REVIEW`** = true; **`SUPER_USER_ACTION`** = PSN_SUPER_APPROVE (privileged action, MDM §2.6).

### 7.2 `mes_qc_approval` — extension for pools, claims and returns — QA (extends §10.3)
- `mes_qc_approval` gains: **`stage_code varchar(20)`** (REVIEW_1 / REVIEW_2 / APPROVAL — data from the chain) · **`role_pool varchar(255)`** (CSV of role codes eligible at this level) · **`claimed_by bigint`** (Y) · `claimed_at timestamptz` (Y) · **`action varchar(15)`** (Y — ADVANCE / RETURN / SUPER_APPROVE) · `returned_to varchar(20)` (Y — CREATOR / REVIEW_1 / REVIEW_2) · `cycle_no int` (default 1 — increments each time the PSN re-enters the chain after a return) · `preview_viewed_at timestamptz` (Y — the reviewer opened the preview).
- **R-CQ-11 — first-come-first-served:** on submission, level 1 rows are created with the pool; the first eligible user who opens **Act** claims the row (`claimed_by`, `claimed_at`) — others see it as "claimed by <name>" and receive the QA_PSN_CLAIMED notice; a claim expires after the policy `PSN_CLAIM_MINUTES` (default 240) without action and returns to the pool.
- **R-CQ-12 — advance / return:** ADVANCE needs a comment (COMMENT_MANDATORY) and moves the PSN to the next stage (status PENDING_REVIEW_2 / PENDING_APPROVAL / APPROVED); RETURN needs a comment and sends the PSN to `returned_to` (default CREATOR — status RETURNED; the creator edits and re-submits, which starts a new cycle at level 1 — WFL-003). Every action stamps approver, date, remarks; the approval history is the PSN's audit of decisions.
- **R-CQ-13 — final approval effects (F1.2-03):** status APPROVED, `approved_at/by`, `is_current` = true, previous revision (if any) → OBSOLETE with `is_current` = false; APPLIED tiers projected to `mes_tdc_attr_range` (built BR-TDC-10); the PSN PDF is generated (P6) and mailed to the resolved distribution list (MDM §4.8, event QA_PSN_APPROVED); the SAP VC transfer row is queued (§14); post-release validation opens (§10).
- **R-CQ-14 — super-user path (F1.2-04, WFL-002):** a user holding PSN_SUPER_APPROVE may run create → approve in one session; each step still writes its approval row with `action = SUPER_APPROVE` and the audit log records role and time; the emergency shared-mailbox route is a distribution-list entry, not a separate path `[assumption — D-03: enforcement deferred]`.

### 7.3 Events and mail templates *(row 31; WFL-002, F1.2-05; P2 content)*
- **`mes_qc_notification_event`** — `event_id` PK · `event_code` UQ · `name` · `module varchar(20)` · `placeholders varchar(500)` (CSV of the tokens the template may use) · `is_active` · **+ audit tail** — the event vocabulary becomes data (the mock-up's fixed select is replaced by this master); existing QA events are its first rows.
- `mes_qc_notification_rule.event_code` references it; `body_template` (designed) is used; new placeholders **{PSN} {REV} {CUSTOMER} {GRADE} {CREATOR} {COMMENTS} {STAGE} {ACTOR} {LINK}**.
- PSN events (seeds): `QA_PSN_SUBMITTED_R1` · `QA_PSN_SUBMITTED_R2` · `QA_PSN_SUBMITTED_APPROVAL` · `QA_PSN_RETURNED` · `QA_PSN_APPROVED` · `QA_PSN_CLAIMED` · `QA_PSN_REVISION_INITIATED` · `QA_PSN_INACTIVATED` · `QA_PSN_REACTIVATION_REQUESTED` · `QA_PSN_REACTIVATED` · `QA_PSN_VALIDATION_DUE` · `QA_PSN_VALIDATION_ATTENTION` · `QA_PSN_NEW_ORDER_ON_DRAFT_REVISION` (WFL-006). The eight SOW mail templates are seed rule rows (Annex B); revised-PSN mails prefix the subject "Revised PSN" (CLN-006).

---

## 8. Lifecycle — statuses, inactivation, reactivation, development PSN

### 8.1 `mes_qc_psn_status_label` — status labels and transitions as data *(row 28; F1.6-01)* — QA
- **`mes_qc_psn_status_label`** — `id` PK · `status_code varchar(30)` UQ (the CHECK values of §2.1) · `label varchar(60)` (JSW wording: Under creation, Under review 1, Under review 2, Under approval, Returned, Approved / Active, Inactive, Obsolete, Blocked, Stopped) · `colour_hex varchar(9)` · `is_terminal boolean` · `counts_as_active boolean` · `sequence_no` · **+ audit tail**.
- **`mes_qc_psn_transition`** — `id` PK · `from_status varchar(30)` · `event varchar(30)` (SUBMIT / ADVANCE / RETURN / APPROVE / INACTIVATE / REACTIVATE / REVISE / SUPERSEDE / BLOCK / UNBLOCK / STOP / PROMOTE) · `to_status varchar(30)` · `guard varchar(100)` (Y — e.g. flag_count = 0) · `required_action_code varchar(50)` (Y — privileged action) · **+ audit tail**. The state machine is data; the seed rows are the lifecycle table in the FDD.

### 8.2 Automatic inactivation and reactivation *(row 34; PSN-018, F1.5-01…03)* — QA
- Policy `PSN_INACTIVITY_DAYS` (default 365, per product type by policy scope). A scheduled check (the QA service's own scheduler) sets APPROVED PSNs with `last_production_at` older than the period (or never produced since approval) to INACTIVE, stamps `inactive_since`, `inactivity_reason = NO_PRODUCTION` and raises `QA_PSN_INACTIVATED` to PPC, SMS and QA. `last_production_at` is refreshed from production confirmations whose material resolves to the PSN (CQ-R-01).
- **`mes_qc_psn_reactivation_request`** — `request_id` PK · `tdc_id` FK · `requested_by bigint` · `requested_role varchar(50)` (PPC) · `order_ref varchar(60)` (Y — the new order that needs it) · `reason varchar(500)` · `status varchar(15)` (REQUESTED / APPROVED / REJECTED) · `decided_by bigint` (Y) · `decided_at timestamptz` (Y) · `decision_comment varchar(500)` (Y) · **+ audit tail**.
- **R-CQ-15:** approval of a reactivation request (QA role; explicit acknowledgement) sets the PSN back to APPROVED, clears `inactive_since`, opens a new post-release validation (§10, trigger REACTIVATION) and raises `QA_PSN_REACTIVATED`; rejection keeps INACTIVE with the comment. An INACTIVE PSN cannot be attached to new orders (read by PPC — CQ-R-04) but material already in process continues.

### 8.3 Development PSN *(row 45; PDR-001/002)* `[assumption — D-14 in scope]` — QA
`psn_kind = DEVELOPMENT` rows follow the same wizard and (optionally shorter) chain; they are visible only to `development_owner_role` and QA, excluded from the order book and campaign pipeline (CQ-R-03: PPC reads `psn_kind`), and usable only by the development production category (PPC / Operations pass). **Promote** creates the commercial PSN as a clone (§6.2) with `promoted_to_tdc_id` on the development row, which then goes OBSOLETE.

---

## 9. Revision — history, compare, interlock, obsolete access *(rows 35–38; F1.3-01…05, CLN-006/010/011, WFL-004…006, PSN-015)*

### 9.1 History and obsolete access — QA
- The built chain (`parent_tdc_id`, `revision_no`, `reason`) is the history; **view `v_qc_psn_revision_history`** — per `psn_no`: revision, status, created / submitted / approved dates and users, reason, is_current, link. Hyperlinks open the revision read-only.
- **R-CQ-16 — obsolete access:** OBSOLETE and non-current revisions are readable only by the QA role and the workflow roles; other users are redirected to the current revision (F1.3-04, CLN-011) `[assumption — D-03]`.

### 9.2 Compare — computed delta — QA
- **`mes_qc_psn_compare_run`** — `compare_id` PK · `tdc_id_old` FK · `tdc_id_new` FK · `run_by bigint` · `run_at timestamptz` · `summary_json jsonb` (counts per segment: added / removed / changed) · **+ audit tail**; **`mes_qc_psn_compare_line`** — `id` PK · `compare_id` FK · `segment_id` FK · `psn_attribute_id` FK (Y) · `element_id` FK (Y) · `attribute_id` FK (Y) · `psn_customer_tdc_id` FK (Y) · `tier varchar(20)` (Y) · `old_value varchar(500)` (Y) · `new_value varchar(500)` (Y) · `change_type varchar(10)` (ADDED / REMOVED / CHANGED) · **+ audit tail**. *(Persisted so the reviewer, approver and creator see the same delta and it is printable; recomputed on demand.)*
- **R-CQ-17:** the compare runs automatically when a revision is submitted (old = current revision, new = the submitted one) and is embedded in the review and approval screens; attributes with `compare_ignore` are omitted.

### 9.3 Revision interlock with plans, orders and inventory — QA (reads platform tables)
- **`mes_qc_psn_revision_impact`** — `impact_id` PK · `tdc_id_new` FK (the revision being initiated) · `link_type varchar(15)` (ORDER / INVENTORY / PLAN / SMS_PLAN) · `link_ref varchar(60)` (order line, lot, schedule id) · `link_qty numeric(18,4)` (Y) · `link_status varchar(30)` (Y) · **`decision varchar(20)`** (Y — HOLD_PLAN / OLD_REVISION_FOR_EXISTING / NEW_REVISION_FOR_ALL) · `decided_by bigint` (Y) · `decided_at timestamptz` (Y) · `comment varchar(500)` (Y) · **+ audit tail**.
- **R-CQ-18 — check at initiation (WFL-004/005):** New revision queries open order lines with the PSN's `tdc_no` (`mes_order_line_items`), lots carrying the PSN (`mes_inventory` via order allocation / attribute), schedules referencing them (`mes_schedule_materials`), and SMS plan rows; a non-empty result shows the warning and records impact rows; QA must record a decision per link type before the revision is submitted. The cut-off rule (PSN-015 — e.g. partially dispatched orders keep the old revision) is a policy `PSN_REVISION_CUTOFF` with an open default (OPEN-CQ-2).
- **R-CQ-19 — order pinning (WFL-006):** the order line records which revision governs it (`mes_order_line_items.tdc_id` + `psn_revision_no` — platform columns, CQ-R-02); a new order arriving while a revision is in DRAFT / review raises `QA_PSN_NEW_ORDER_ON_DRAFT_REVISION` to PPC to choose the revision. Operations are notified on revision initiation to align the heat-making plan (event QA_PSN_REVISION_INITIATED to SMS / PPC roles).

---

## 10. Post-release validation over the first heats *(row 40; PSN-017, F1.4-01…03)* — QA

- **`mes_qc_psn_validation`** — `validation_id` PK · `tdc_id` FK · `trigger varchar(15)` (RELEASE / REVISION / REACTIVATION) · `target_heats int` (from policy `PSN_VALIDATION_HEATS`, default 5) · `heats_done int` (default 0) · `heats_ok int` (default 0) · `status varchar(15)` (IN_PROGRESS / PASSED / ATTENTION / CLOSED) · `opened_at timestamptz` · `closed_at timestamptz` (Y) · `closed_by bigint` (Y) · `remarks varchar(500)` (Y) · **+ audit tail**.
- **`mes_qc_psn_validation_heat`** — `id` PK · `validation_id` FK · `sequence_no int` · `heat_number varchar(100)` · `batch_id` FK `mes_batches` (Y) · `confirmed_at timestamptz` · `chemistry_result varchar(10)` (Y — from heat-chemistry clearance) · `mechanical_result varchar(10)` (Y — from testing clearance) · `inspection_result varchar(10)` (Y — from inspection / UD) · `overall varchar(10)` (OK / NOK / PENDING) · `notes varchar(255)` (Y) · **+ audit tail**.
- **R-CQ-20:** the first `target_heats` heats produced against the PSN after the trigger are attached automatically (from production confirmations resolving to the PSN — CQ-R-01); each heat's results are read from the existing clearance / UD records, never re-tested. All OK → PASSED (the PSN is "fully commercial"; `validation_status` on the header); any NOK → ATTENTION with `QA_PSN_VALIDATION_ATTENTION` to Customer Quality, who close it with a remark (and may open a revision). The "~5-year historical check" of PSN-017 is a report over the same data (OPEN-CQ-3).
- Reports **`v_qc_psn_validation_review`** (per PSN: trigger, heats, results) and **`v_qc_psn_validation_tracking`** (per period: PSNs released / validated / in attention).

---

## 11. Unit-wise PSN matrix and operations-facing visibility *(rows 41, 42, 46; F1.7-01/02, RPT-006)* — QA (+ CQ-R-01)

- **`mes_qc_psn_unit_matrix`** — `matrix_id` PK · `psn_attribute_id` FK (Y) *or* `segment_id` FK (Y) — one of the two · `operation_id` FK `mes_operations` (the unit / process step) · `equipment_id` FK (Y — sub-unit) · `department_id bigint` (Y) · `surface varchar(15)` (OPERATION / TESTING / INSPECTION / VALIDATION — where it shows) · **`visibility varchar(10)`** (SHOW / HIDE) · `display_sequence int` (Y) · `is_key boolean` (shown as a header chip) · `product_type_id` FK (Y — scope) · `effective_from/to` · **+ audit tail**. UQ (attribute-or-segment, operation, equipment, surface).
- **R-CQ-21 — resolution:** for a unit and surface, the visible attribute set = segment rows expanded to their attributes, overridden by attribute rows (R-S on equipment then operation, product type); attributes with no row use `mes_qc_psn_attribute.unit_visibility_default`. RPT-006's exact matrix is data JSW fills (OPEN-CQ-4).
- **View `v_qc_psn_unit_view`** — per PSN × operation × surface: the visible attributes with their resolved values (scoped by the material's customer / TDC combination), the AIM chemistry for SMS, the APPLIED limits for testing / inspection, and the key chips. The production-confirmation screen, the inspection worklist, testing and clearance read this view for the PSN of the material — **CQ-R-01** asks the platform to resolve the PSN (tdc_id) of the batch's order line and pass it to the screen-config / process-parameters / applicable-samples calls, and to populate `mes_order_line_items.tdc_no` (dev note §26.1).

---

## 12. Reports and dashboards *(rows 28, 43; F1.6-01…22, F1.5-03, RPT-005, RPT-007/008)* — QA (P6 layouts deferred)

| Report (BRD) | Source view | Filters |
|---|---|---|
| PSN Report — full detail (F1.6-03) | `v_qc_psn_report` (header + every segment's values, tiers, tests, remarks, documents list, approvals) | PSN, revision |
| Consolidated Report of PSN (F1.6-04) | `v_qc_psn_search` | Customer, grade, product type, supply condition, status |
| PSN Status Board (F1.6-01) | `v_qc_psn_status_board` — counts and lists per status label | Product type, supply condition, customer, grade |
| PSN Dashboard, multi-dimensional (F1.6-02, RPT-005) | `v_qc_psn_dashboard` — counts by product type × supply condition × customer × grade × unit (from the unit matrix) | as F1.6-01 + equipment |
| Active / Inactive PSN tracking (F1.5-03), Active PSN report (F1.6-15) | `v_qc_psn_status_board` filtered on `counts_as_active` | as above |
| PSN-wise segment reports: Chemistry, General, SMS, Mills, Testing, Annealing, Grinding Media, Inspection, Logistics (F1.6-05…13), Cooling / Charging (F1.6-17), ABGM (F1.6-18) | `v_qc_psn_segment_report` (segment_code parameter) — attribute label, value / limits per scope | PSN, segment, customer combination |
| Process Path (F1.6-19), Inspection Path (F1.6-20) | `mes_qc_path_rule` / `mes_qc_inspection_path` resolved for the PSN (QA §26.1 + MDM §3.3) | PSN |
| End-cut master (F1.6-21), Colour code (F1.6-22) | `mes_qc_end_discard`, `mes_qc_colour_code_map` resolved for the PSN | PSN |
| PSN-wise Production Report (F1.6-16) | production confirmations resolving to the PSN (`mes_production_confirmation` + order line) | PSN, period |
| Heat-wise / batch-wise process-parameter monitoring (F1.6-14) | Process Control pass (`mes_process_parameters_captured` with PSN resolution) | PSN, heat |
| Validation Review (F1.4-02), Validation Tracking (F1.4-03) | §10 views | PSN, period |

All views expose the standard columns (PSN, revision, customer, grade, product type, supply condition) so the report platform's filters, PDF / Excel export and role scoping apply uniformly; "standard vs configurable layout" is P6. Category downloads (RPT-007: Chemistry, Testing, Annealing / Binding media, Logistics) are the segment report with the segment parameter; bulk upload of chemistry / TDC master lines (RPT-008) reuses the QA import framework with a PSN_CHEMISTRY sheet (Annex D).

---

## 13. Certificate of Analysis against the governing PSN *(row 44; COA-001…005)* — QA (extends §16)

- **`mes_qc_certificate_template`** — `template_id` PK · `code` / `name` UQ · `cert_kind varchar(20)` (MTC / COA) · `customer_id` FK (Y) · `standard_id` FK (Y) · `market varchar(20)` (Y — DOMESTIC / EXPORT) · `isi_marked boolean` (Y) · `layout_code varchar(50)` (the P6 layout id) · `letterhead_code varchar(50)` (Y) · `default_remarks varchar(1000)` (Y) · `print_sections varchar(255)` (CSV: CHEMISTRY, MECHANICAL, METALLURGICAL, DIMENSIONAL, INSPECTION) · `priority int` · `effective_from/to` · **+ audit tail**.
- `mes_qc_certificate` gains **`template_id` FK (Y)** · `dispatch_ref varchar(60)` (Y — dispatch batch / challan) · `order_lot_ref varchar(60)` (Y — customer-order lot when several batches are combined) · `psn_revision_no int` (Y — the revision certified) · `issued_email_to varchar(255)` (Y).
- **R-CQ-22 — generation and gate (COA-001/003):** a CoA is generated per dispatch batch / heat (or per customer-order lot) from the final chemistry (product chemistry if present, else tundish — CHM-006), test results and inspection clearance **against the PSN revision that governed the batch**; generation is refused unless the batch's usage decision is positive. The template resolves by R-S on (customer, standard, market, ISI); free-text remarks are allowed. The certificate stays stored against the batch (COA-004) and reachable from genealogy; distribution (PDF / print / mail) is P6 / integration.

---

## 14. SAP VC synchronisation — MES side only *(row 39; INT-001…003, INT-005, INT-008, F1.1-09; D-01 parked)*

- **`mes_qc_psn_transfer`** — `transfer_id` PK · `tdc_id` FK · `revision_no int` · `direction varchar(5)` (OUT — MES → SAP VC on approval; IN — migration / sync from SAP VC) · `mode varchar(10)` (DELTA / FULL) · `payload_json jsonb` (the changed attributes with their SAP characteristic names from the external code map, MDM §5.7) · `status varchar(10)` (PENDING / SENT / ACKED / ERROR / SKIPPED) · `sent_at` / `acked_at timestamptz` (Y) · `error_text varchar(500)` (Y) · `attempts int` · **+ audit tail**. *(The §25.3 write-back pattern; transport deferred.)*
- **R-CQ-23:** on final approval an OUT / DELTA row is queued with the attributes that changed against the previous revision (the §9.2 compare feeds it); INT-005's manual-first path (new customer / grade not in SAP) is the same queue; INT-008 (no closure of VC characteristics independent of production confirmation) is a PPC / Operations rule noted, not designed here.
- **One-time migration (INT-002):** IN / FULL rows per SAP VC PSN with `source_type = SAP_VC_MIGRATION` on the header; a reconciliation view `v_qc_psn_migration_reconcile` (count per status, unmatched characteristics) supports the cut-over count; provenance of the 678 loaded TDCs is OPEN-CQ-1.

---

## 15. Landing, screens, traceability

### 15.1 New tables and views
| Table / view | Section | Purpose |
|---|---|---|
| `mes_qc_psn_customer_tdc` | 2.2 | customer / TDC / grade / size combinations under a PSN |
| `mes_qc_psn_source` | 2.3 | provenance (CFR / SAP VC / SFDC / clone / revision) |
| `mes_qc_psn_attribute_value` | 3.2 | non-measured segment values with flags and scope |
| `mes_qc_psn_draft` | 3.4 | auto-save snapshots |
| `mes_qc_formula` | 4.2 | computed characteristics (carbon equivalent …) |
| `mes_qc_document_type` | 5 | PSN document types with role restriction |
| `mes_qc_notification_event` | 7.3 | event vocabulary as data |
| `mes_qc_psn_status_label` · `mes_qc_psn_transition` | 8.1 | lifecycle labels and state machine as data |
| `mes_qc_psn_reactivation_request` | 8.2 | PPC → QA reactivation |
| `mes_qc_psn_compare_run` · `mes_qc_psn_compare_line` | 9.2 | revision delta |
| `mes_qc_psn_revision_impact` | 9.3 | plan / order / inventory interlock decisions |
| `mes_qc_psn_validation` · `mes_qc_psn_validation_heat` | 10 | first-heats validation |
| `mes_qc_psn_unit_matrix` | 11 | unit-wise attribute visibility |
| `mes_qc_certificate_template` | 13 | CoA / MTC templates |
| `mes_qc_psn_transfer` | 14 | SAP VC queue (MES side) |
| views `v_qc_psn_search`, `v_qc_psn_revision_history`, `v_qc_psn_unit_view`, `v_qc_psn_report`, `v_qc_psn_status_board`, `v_qc_psn_dashboard`, `v_qc_psn_segment_report`, `v_qc_psn_validation_review`, `v_qc_psn_validation_tracking`, `v_qc_psn_migration_reconcile` | 6.3, 9.1, 11, 12, 10, 14 | search, history, unit view, reports |

Extended: `mes_tdc_input` (2.1), `mes_qc_psn_attribute` (3.1), `mes_qc_tdc_limit` (4.1), `mes_qc_element` (4.2), `mes_qc_attachment` (5), `mes_qc_approval` (7.2), `mes_qc_notification_rule` (7.3), `mes_qc_certificate` (13). Retired for new records: `mes_tdc_approval`.

### 15.2 Screens (QA mock-up family, `docs/qa-module/ui/`)
New functional screens — 6: **PSN** (`psn.html` — the TDC screen grown into the ten-segment wizard: key header, segment stepper, attribute rows with type / dropdown / mandatory / flag, chemistry tiers incl. AIM and computed CE, documents, customer-TDC combinations, actions Duplicacy check · Save draft · Preview · Clone · Submit) · **PSN Search** (`psn-search.html` — duplicacy gate + similarity search) · **PSN Review & Approval** (`psn-review.html` — role-pool inbox, claim, advance / return with mandatory comment, embedded preview and compare) · **PSN Revision Compare** (`psn-compare.html`) · **PSN Validation** (`psn-validation.html` — first-heats tracking) · **PSN Dashboard** (`psn-dashboard.html` — status board, multi-dimensional counts, active / inactive tracking, reactivation requests). New masters — 4: Formula (`master-formula.html`), Document Type (`master-document-type.html`), PSN Unit Matrix (`master-psn-unit-matrix.html`), Certificate Template (`master-certificate-template.html`). Extended: `certificate.html` (template, PSN revision, UD gate), `master-notification-rule.html` (event master, body template, PSN seeds), `tdc.html` (becomes the PSN screen; kept as the specification-core view). Family 56 → 66.

### 15.3 Platform change requests (`Requests-CQ.md`)
CQ-R-01 resolve the PSN of the material at the confirmation / inspection / testing resolution points and populate `mes_order_line_items.tdc_no` · CQ-R-02 order-line revision pin (`tdc_id`, `psn_revision_no`) · CQ-R-03 development production category reads `psn_kind` (PPC / Operations pass) · CQ-R-04 planner / order book read `status` (INACTIVE / OBSOLETE not attachable) and `psn_kind`.

### 15.4 Traceability — backlog item → sections → rows → stories
| # | Backlog item (area 5) | Sections | Rows | Stories / reqs |
|---|---|---|---|---|
| 1 | PSN entity and 10-segment wizard over the TDC | 2.1, 3.1–3.3 | 1, 8–16 | F1.1-02, CLN-001/002 |
| 2 | CFR ingestion (SFDC / PDF) — MES side | 2.3 | 2 | F1.1-01, INT-004 |
| 3 | Document upload with role-restricted retrieval | 5 | 3 | F1.1-03 |
| 4 | Aim chemistry validation; CE and customer formula master | 4.1, 4.2 | 5, 6 | CHM-001…004 |
| 5 | Customer vs aim / control chemistry view | 4.1 | 7 | INT-007 |
| 6 | PSN configuration, product type matrix, number generator | 3.1 (MDM) | 17, 19–21 | F1.1-06/10/11/12 |
| 7 | Duplicacy check and similarity search | 6.3 | 22, 23 | F1.1-04, DUP-001…007 |
| 8 | Clone with section-level selection | 6.2 | 24 | F1.1-05, CLN-003…005 |
| 9 | Draft / preview / auto-save; flagging with submission gate | 3.4, 6.1 | 25–27 | F1.1-07/08, CLN-007/008 |
| 10 | Lifecycle dashboard and multi-dimensional dashboard | 8.1, 12 | 28 | F1.6-01/02, F1.5-03, RPT-005 |
| 11 | Two-stage review, role pools, super-user | 7.1, 7.2 | 29, 32, 33 | F1.2-01…04, WFL-003 |
| 12 | Approval PDF, distribution list, stage mail templates | 7.3, R-CQ-13 | 30, 31 | F1.2-03/05, WFL-002/007 |
| 13 | Auto-inactivation and reactivation | 8.2 | 34 | PSN-018, F1.5-01/02 |
| 14 | Revision history, compare, interlock | 9 | 35–38 | F1.3-01…05, WFL-004…006, PSN-015 |
| 15 | SAP VC synchronisation and migration (MES side) | 14 | 39 | INT-001…003/005/008, F1.1-09 |
| 16 | Post-release validation over first heats | 10 | 40 | PSN-017, F1.4-01…03 |
| 17 | Unit-wise PSN matrix and operations-facing visibility | 11 | 41, 42, 46 | F1.7-01/02, RPT-006 |
| 18 | PSN reports (22) | 12 | 43 | F1.6-03…22, F1.4-02/03 |
| 19 | CoA against the governing PSN | 13 | 44 | COA-001…005 |
| 20 | Development PSN / trial grade runs | 8.3 | 45 | PDR-001/002 |

All 53 E1 stories and 46 rows map; §4.6 LAB rows are the M&M Lab scope already designed (QA §27).

### 15.5 Open points for JSW
1. **OPEN-CQ-1** Provenance of the 678 loaded TDCs — are they the SAP VC PSN set (INT-002) or a customer-TDC extract? Decides whether the migration is a re-load or an enrichment.
2. **OPEN-CQ-2** Revision cut-off rule (PSN-015) — proposed default: orders with any dispatch keep the old revision; undispatched orders follow the new one after PPC confirmation.
3. **OPEN-CQ-3** Validation basis — first 5 heats (default) versus a 5-year historical check; both referenced in PSN-017.
4. **OPEN-CQ-4** The exact operations-facing attribute subset per unit (RPT-006) — designed as data; JSW fills it.
5. **OPEN-CQ-5** Segment attribute lists and owners for SMS, Annealing, Grinding Media, Logistics, Packing (D-10) — the wizard runs on whatever is configured; seeds in Annex A cover only what the BRD names.
6. **OPEN-CQ-6** Review roles per stage (Shift In-charge, Head PDQC, Head TE & PDQC, Head TS / R&D) — confirm the pools per product type.
7. **OPEN-CQ-7** Emergency / off-hours approval via shared mailbox (WFL-002) — designed as a distribution-list entry plus the super-user action; confirm.

---

## Annex A — Segment attribute seeds (data; JSW owners complete them)
| Segment | Seeded attributes (from the built TDC tabs and the BRD) | Store |
|---|---|---|
| Key / General | Customer, Customer short code, Customer TDC no. (+ revision), Grade, Grade series / group, Product type, Shape, Form, Size / size range, Supply condition, Rolling route, Input cast size, Market, Execution, HTC code, Primary standard, Print grade description, HT chart required, IBR report, CE mark, Customer grades (multi), Date, Active | header / customer-grade rows |
| Chemistry | Elements of the dictionary with Standard / Customer / Applied / **Aim** tiers; computed CE (formula); product-chemistry vs tundish rule | limit tiers |
| SMS | Pit cooling hours (→ rule), hot charging allowed, cast size, casting speed band reference, tundish chemistry check, sample plan reference, special instructions | values / rules |
| Mills | Size / tolerance, surface roughness, straightness, out-of-roundness, eddy current, MPI, UT requirement, chamfering and degree, end cutting, colour code, material marking, bundle weight, rolling route, grinding requirement (→ rule) | limit text rows / values |
| Testing | Test method × standard × required × acceptance remark (built), sampling plan reference, specimen counts, mechanical limits (UTS, YS, EL, RA, hardness, impact), metallurgical (grain size, inclusion, decarb, micro, banding, Jominy, DI) | test-standard rows / limit tiers |
| Annealing | HT cycle (→ HT cycle master), annealing type, furnace type, load group, hardness after anneal, microstructure | values |
| Grinding media | Product type GM, hardness profile, ball size, surface, impact test, packing | values `[D-10]` |
| Inspection | Inspection path (→ path rule), inspection types required per stage, sample positions, acceptance criteria references, third-party inspection required | values / rules |
| Logistics | Length (→ length vocabulary), bundle weight, marking, sticker type (→ barcode type), delivery documents | values |
| Packing | Packing type, strapping, binding media, bundle size, labels | values (attribute LOVs) |
| Documents | The ten document types | attachments |

## Annex B — Workflow mail template seeds (P2 content)
| Event | Recipients | Subject template |
|---|---|---|
| QA_PSN_SUBMITTED_R1 | Review-1 pool | `PSN {PSN} Rev {REV} — {CUSTOMER} / {GRADE}: submitted for Review 1 by {CREATOR}` |
| QA_PSN_SUBMITTED_R2 | Review-2 pool | `PSN {PSN} Rev {REV} — {CUSTOMER} / {GRADE}: submitted for Review 2` |
| QA_PSN_SUBMITTED_APPROVAL | Approval pool | `PSN {PSN} Rev {REV} — {CUSTOMER} / {GRADE}: submitted for Approval` |
| QA_PSN_RETURNED | Creator (+ prior stage) | `PSN {PSN} Rev {REV}: returned from {STAGE} by {ACTOR} — {COMMENTS}` |
| QA_PSN_APPROVED | Distribution list (PDF attached) | `PSN {PSN} Rev {REV} approved — {CUSTOMER} / {GRADE}` |
| QA_PSN_CLAIMED | Other pool members | `PSN {PSN} Rev {REV}: taken up by {ACTOR} at {STAGE}` |
| QA_PSN_REVISION_INITIATED | PPC, SMS, Operations | `Revised PSN {PSN} Rev {REV} initiated — align plans and pipeline orders` |
| QA_PSN_INACTIVATED / REACTIVATED | PPC, SMS, QA | `PSN {PSN} marked {STATUS} — no production for {DAYS} days` |
Body templates carry PSN, Rev, Customer, Grade, Creator, Comments and the link; revised-PSN mails prefix "Revised PSN".

## Annex C — PSN report layout (P6 content)
Header block (PSN no., revision, status, customer(s) / TDC references, grade, product type, size, supply condition, rolling route, market, dates, prepared / reviewed / approved by) → one section per segment in sequence with attribute label, value or min / max per tier (chemistry shows Standard / Customer / Applied / Aim), scope column when a value is combination-specific, flags cleared → tests and standards → remarks with print targets → documents list → approval history → revision history. Category downloads print the selected segments only.

## Annex D — Upload sheets (QA import framework)
| Sheet | Key columns | Other columns |
|---|---|---|
| PSN_HEADER | psn_no, revision_no | customer, customer_tdc_no, grade, product_type, shape, form, size_text, supply_condition, rolling_route, input_cast_size, market, execution, htc_code, primary_standard, psn_kind |
| PSN_CUSTOMER_TDC | psn_no, customer, customer_tdc_no, grade, size_min, size_max | customer_tdc_revision, is_primary |
| PSN_CHEMISTRY | psn_no, element, tier, customer_tdc_scope | min, max, target, uom, print_flag |
| PSN_ATTRIBUTE_VALUE | psn_no, attribute_code, customer_tdc_scope, sequence | value_text, value_num, value_min, value_max, value_date, value_bool, lov_value, uom |
| PSN_TEST_STANDARD | psn_no, test | standard, is_required, acceptance_remark |
| FORMULA | formula_code | name, target_element / target_attribute, expression, variables, precision, customer, standard_ref, is_default, applies_to, priority |
| DOCUMENT_TYPE | code | name, applies_to, allowed_formats, restricted_roles, title_required, sequence |
| PSN_UNIT_MATRIX | attribute_or_segment, unit, equipment, surface | department, visibility, display_sequence, is_key, product_type |
| CERTIFICATE_TEMPLATE | code | name, cert_kind, customer, standard, market, isi_marked, layout_code, letterhead_code, default_remarks, print_sections, priority |
| NOTIFICATION_EVENT | event_code | name, module, placeholders |
