# Request register — Roll Management design → MES PC

**Direction:** the Roll Management design (`ROLL-Data-Model.md`) is **Quality-owned** under assumption D-06 (it extends the QA Roll Shop of the QA Data-Model §15 and lands as §32 there). Three things need the production-confirmation application (`Bluemingo_MES`) and are raised here. No Allocator item. Same rules as the other registers (append, one item = one ask, permanent ids, raise before the migration). Drafted 2026-09-15.

**Statuses:** `DRAFT` → `OPEN` · `NEEDS_INFO` · `ACCEPTED` · `IN_PROGRESS` · `DONE` · `REJECTED`

---

## MES PC items

### ROLL-R-01 — Numeric usage counters and the assignment reference on the secondary-equipment life-tick; tooling type seeds
**Date:** 2026-09-15 · **From:** Roll design §2, §4, §5 · **Status:** DRAFT
**Ask:** `mes_secondary_equipment_usage` + `tonnage_t numeric(12,3)`, `hours numeric(10,1)`, `pieces int`, `cobbles int` (Y), `assignment_id bigint` (Y — the Quality roll assignment), `stand_equipment_id bigint` (Y) beside the existing `life_limit_used` (keep it; make the life-tick read the type's `life_basis` to add tonnage, hours or pieces to `life_limit_consumed`); the reversal mirror likewise; seeds for `secondary_equipment_type` GUIDE / CHOCK / HOUSING (ROLL exists); `mes_secondary_equipment_instance` + `roll_shop_ref varchar(50)` (Y — the Quality register code, informational).
**Why:** F11.2-02/03, 14 additional point (housing and chock life in rolling hours / tonnage) — the built life-tick becomes the single usage counter; the Quality register sums it per assignment, item and groove.
**Affects:** PC pipeline steps 5–7 (life-tick), Secondary Equipment master and instance screens.

### ROLL-R-02 — The assembly of the stand on the confirmation card and on the usage rows
**Date:** 2026-09-15 · **From:** §4 R-ROLL-06 · **Status:** DRAFT
**Ask:** the confirmation card's Secondary Equipment section pre-selects the instances of the ACTIVE Quality roll assignment of the stand (`mes_qc_roll_assignment` / `mes_qc_roll_assembly_item` → `instance_id`) instead of a free pick, shows the assembly number and groove, and stamps `assignment_id` on the usage rows; a stand without an active assignment warns (BLOCK when the unit's configuration says so); the Operations pulpit shows the same assembly.
**Why:** F11.2-01, MO-002 — usage is attributed to the assembly and campaign in use, automatically.
**Affects:** Production Confirmation (secondary-equipment card), pulpit screen (OPS-R-01).

### ROLL-R-03 — Rolling-block release event for roll requirements; pass-schedule code on the setup sheet
**Date:** 2026-09-15 · **From:** §6 R-ROLL-08; Process Control design §7 · **Status:** DRAFT
**Ask:** on rolling-block release (PPC-R-11) raise the event PPC_BLOCK_RELEASED with mill, block, size, grade series, planned start and the ordered stand list, so the Quality roll shop creates `mes_qc_roll_requirement` rows; `mes_setup_sheet.pass_schedule_code` (PC-R-06) references `mes_qc_pass_schedule.schedule_code` (data link, no FK across schemas); the Rolling Sequence screen shows the requirement readiness per block (READY / SHORT chip from `v_qc_roll_requirement_board`).
**Why:** ROL-007, ROL-008 — roll preparation starts from the sequence with the lead time, not by hand.
**Affects:** campaign / rolling schedule release service, Rolling Sequence screen, setup sheets.

---

## Quality module (designed in the QA Data-Model §32 — the mirror of the Roll design)
Register extension, pass profiles and grooves, pass schedules, assemblies and assignments, planning and requirements, events (welding, machining, re-grooving), maintenance calendar and thresholds, documents and analysis views — all `mes_qc_` tables; the Roll Shop screen family joins the Quality module's menu.
