# Request register — Customer Quality / PSN design → MES PC and the Allocator

**Direction:** the PSN design (`CQ-PSN-Data-Model.md`) raises here what must change *inside* MES PC (`Bluemingo_MES`) or the Allocator. Same rules as `Requests-MDM.md` and the `Requests-From-QA.md` channel: append, never rewrite · one item = one ask · ids permanent · raise before the migration. Drafted 2026-09-15, ready to file as QA-0nn once JSW/Bluemingo confirm the design.

**Statuses:** `DRAFT` → `OPEN` · `NEEDS_INFO` · `ACCEPTED` · `IN_PROGRESS` · `DONE` · `REJECTED`

---

### CQ-R-01 — Resolve the PSN of the material at the confirmation, inspection and testing resolution points; populate `mes_order_line_items.tdc_no`
**Date:** 2026-09-15 · **From:** PSN design §11, R-CQ-21 · **Status:** DRAFT
**Ask:** (a) the production-confirmation screen resolves the batch's PSN (`mes_tdc_input.tdc_id` via the order line's `tdc_no`, or the lot's allocation) and passes `tdcId` to `/api/pc/screen-config`, `/api/pc/process-parameters` and `/api/samples/applicable` so the QA unit view (`v_qc_psn_unit_view`) and the PSN-scoped process parameters (MDM §3.7) can be shown per unit; (b) populate `mes_order_line_items.tdc_no` on the order feed — it is NULL on every row today, which stops the built TDC resolution chain at hop 3 (QA dev note §26.1); (c) stamp `last_production_at` on the PSN by calling the QA hook on confirmation (or let QA read confirmations — QA's preference: QA reads).
**Why:** BRD F1.7-01/02, RPT-006, row 46 — the customer specification must reach Operations, Testing and Inspection per heat / batch without hard copy; the screens exist, only the PSN key is missing.
**Affects:** production confirmation screen-config / process-parameter / applicable-sample services; order import.

### CQ-R-02 — Order-line revision pin
**Date:** 2026-09-15 · **From:** §9.3, R-CQ-19 · **Status:** DRAFT
**Ask:** `mes_order_line_items` + `tdc_id bigint` (Y) + `psn_revision_no int` (Y) — the PSN revision governing the line, set on order acceptance (current revision) and changeable by PPC when a revision impact decision says so; expose it on the Orders screen.
**Why:** WFL-004…006 — existing orders may keep the old revision while new orders follow the revised PSN; certificates print the governing revision.
**Affects:** orders import / screen; QA revision impact and CoA read it.

### CQ-R-03 — Development PSN and the development production category
**Date:** 2026-09-15 · **From:** §8.3 · **Status:** DRAFT `[assumption — D-14]`
**Ask:** PPC / production read `mes_tdc_input.psn_kind`: DEVELOPMENT PSNs are excluded from the order book and campaign pipeline and are usable only under the development production category (the dummy / size-setting production mode pattern), tracked separately in reporting.
**Why:** BRD PDR-001/002 — trial grade runs without a live sales order.
**Affects:** order book, campaign planning, production confirmation category (PPC and Operations passes).

### CQ-R-04 — Planner and order book respect the PSN lifecycle
**Date:** 2026-09-15 · **From:** §8.2, R-CQ-15 · **Status:** DRAFT
**Ask:** the Allocator's TDC mirror (`TDC_Input` / `Customer_TDC` / `TDC_Order`) and the MES order book treat `status` INACTIVE / OBSOLETE / BLOCKED / STOPPED as not attachable to new orders (material in process continues); the sync carries `status`, `psn_no`, `revision_no`, `is_current`, `psn_kind`.
**Why:** PSN-018 / F1.5-01 — an inactive PSN must not be planned against until QA reactivates it.
**Affects:** MES → Allocator TDC sync; order acceptance.
