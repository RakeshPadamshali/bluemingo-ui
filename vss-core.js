/* Vardhman Special Steels demo — shared helpers over window.VSS (from vss-data.js).
   Times are integer MINUTES from baseDate midnight (2026-07-01). "As of" = mid-plan
   so orders show a realistic spread across stages.
   vssPlan() is the ORDER-LEVEL forward scheduler: orders are sequenced by delivery date at
   the plant's planning grain (RDD week; descending size within the week = rolling-cycle
   rule), booked on real machines along their route at the sheet's capacities (rolling mill:
   size-wise Bdgt Prdty/Day, 90% yield, 2 h/day non-productive, Roll-Set changeover types),
   open billet stock is used before casting. Route: billet -> rolling -> NDT -> stacking yard -> heat treatment ->
   peeling / drawing -> dispatch (the black bar is annealed first, then peeled or ground to final size and surface).
   The furnaces and the peeling lines are loaded GAPLESSLY: once a machine starts, the next order goes on as the
   previous one comes off with only the equipment's own setup between, and the campaign start is held back to the
   latest moment that keeps the whole run gapless. Boxes are filled to 18 MT from orders of the same anneal type whose
   bar is ready within eight days, only as many furnaces are lit as the book needs, and peeling work fills one line
   before opening another while that line can still make the order's date. */
(function () {
  var V = window.VSS;
  var BASE = new Date(V.meta.baseDate + 'T00:00:00');
  var AS_OF_MIN = 5 * 1440;                     // 2026-07-06
  V.meta.asOf = '2026-07-06';
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  window.VSS_BASE = BASE;
  window.VSS_ASOF_MIN = AS_OF_MIN;
  function vssDateAt(min) { return new Date(BASE.getTime() + min * 60000); }
  window.vssDateAt = vssDateAt;
  window.vssClock = function (min) { var d = vssDateAt(min); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  window.vssDayLabel = function (min) { var d = vssDateAt(min); return { wd: WD[d.getDay()], dm: d.getDate() + ' ' + MO[d.getMonth()] }; };
  function vssStamp(min) { var d = vssDateAt(min); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()] + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  window.vssStamp = vssStamp;
  function vssDateMin(min) { if (min == null) return '—'; var d = vssDateAt(min); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()]; }
  window.vssDateMin = vssDateMin;
  window.vssFmtDate = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()];
  };
  window.vssMinFromISO = function (iso) { if (!iso) return null; var d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? null : Math.round((d - BASE) / 60000); };

  var PAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
  function vssColor(i) { return PAL[((i % PAL.length) + PAL.length) % PAL.length]; }
  window.vssColor = vssColor;
  window.VSS_PAL = PAL;

  // SAP material types as the plant names them: ZBLB = Black Bar (as-rolled), ZBRB = Bright Bar (peeled or drawn)
  var MAT_LABEL = { ZBLB: 'Black Bar', ZBRB: 'Bright Bar' };
  window.vssMatLabel = function (mt) { return MAT_LABEL[mt] || mt || '—'; };
  window.VSS_MAT_LABEL = MAT_LABEL;

  var STAGES = ['Billet', 'Rolled', 'NDT', 'Stacking', 'Heat Treat', 'Bright Bar', 'Dispatch'];
  window.VSS_STAGES = STAGES;
  function isBright(sc) { return /^[PD]/.test(sc || ''); }
  function isAnneal(sc) { return ['RXA', 'PGS', 'PXS', 'PGA'].indexOf(sc || '') >= 0; }
  function hash(str) { var h = 0, i; str = str || ''; for (i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function sizeNum(s) { var m = /([\d.]+)/.exec(String(s || '')); return m ? parseFloat(m[1]) : 40; }
  window.vssSizeNum = sizeNum;
  // Mill yield (finish ÷ input) measured from the sheet's 30 real rolling cycles — billets an order needs = bar qty ÷ yield
  var inQ0 = 0, finQ0 = 0; V.rolling.forEach(function (c) { inQ0 += c.inputQty || 0; finQ0 += c.finishQty || 0; });
  var ROLL_YIELD = inQ0 > 0 ? finQ0 / inQ0 : 0.9;
  window.VSS_ROLL_YIELD = ROLL_YIELD;

  // ---- static derived fields per order ----
  function vssDerive() {
    if (V._derived) return V;
    var sizeMap = {};
    V.rolling.forEach(function (c) { if (c.sizeR && !(c.sizeR in sizeMap)) sizeMap[c.sizeR] = c; });
    V.orders.forEach(function (o, i) {
      o._i = i;
      o.pdCount = o.matType === 'ZBLB' ? 2 : 3;                              // Black Bar = 2 PDs, Bright Bar = 3 PDs
      // open stock first, then cast the rest: billets the order needs (input basis), what the sheet's Billet Stock covers, the rest
      var need = (o.qty || 0) / ROLL_YIELD, stk = o.billetStock || 0;
      o.billetNeed = Math.round(need * 10) / 10;
      o.stockUsed = Math.round(Math.min(stk, need) * 10) / 10;                 // drawn from existing stock at the mill
      o.topUp = Math.round(Math.max(0, need - stk) * 10) / 10;                 // still to cast
      o.stockSurplus = Math.round(Math.max(0, stk - need) * 10) / 10;          // stays in stock
      o.allocStatus = stk <= 0 ? 'To-cast' : o.topUp > 0.05 ? 'Stock + top-up' : 'Stock-allocated';
      o.jobWork = (hash(o.so) % 16 === 0);
      o.ndt = (o.inspection || '').toUpperCase() === 'NDT';                  // real inspection route
      var pre = (/^[A-Za-z]+/.exec(o.so || '') || [''])[0].toUpperCase();
      o.orderType = /SA$/.test(pre) ? 'Sample' : /^EX/.test(pre) ? 'Export' : 'Domestic';
      o.rddMin = o.rdd ? Math.round((new Date(o.rdd + 'T00:00:00') - BASE) / 60000) : null;
      o.stackingFIFO = (o.rddMin != null && o.rddMin < AS_OF_MIN) ? 'Urgent' : 'Normal';
      var c = sizeMap[o.rolledSize] || null;                                 // informational: current rolling cycle token
      o.token = c ? c.token : null; o.cycle = c ? c.cyclePhase : null; o.tentRollISO = c ? c.startISO : null;
    });
    V._derived = true;
    return V;
  }
  window.vssDerive = vssDerive;

  // ---- ORDER-LEVEL FORWARD SCHEDULER ----
  function vssPlan() {
    if (V._plan) return V._plan;
    vssDerive();
    var buf = 45, free = {}, lastKey = {}, bookings = [];
    // Bright-bar lines from config: size range + supply conditions + MT/hr
    var bb = V.bbsCfg.lines.map(function (l, i) {
      var r = /([\d.]+)\s*-\s*([\d.]+)/.exec(l.range || ''), draw = /Draw/i.test(l.machine), hrs = draw ? 16 : 24;
      return { name: draw ? 'Drawing DL' : 'Peeling PL-' + (i + 1), min: r ? +r[1] : 0, max: r ? +r[2] : 999,
               conds: (l.process || '').split(/[,\s]+/).filter(Boolean), rateHr: (l.capDay || 20) / hrs, draw: draw,
               setupMin: Math.round((l.changeover != null ? l.changeover : 1) * 60) };
    });
    var furn = []; for (var f = 1; f <= V.htCfg.furnaces; f++) furn.push('Furnace F' + f);
    function ndtProd(sz) { return sz < 26 ? 2.43 : sz < 36 ? 4.5 : sz < 51 ? 7.91 : sz < 66 ? 11.92 : 15.32; }
    function ndtRange(sz) { return sz < 26 ? 1 : sz < 36 ? 2 : sz < 51 ? 3 : sz < 66 ? 4 : 5; }
    function htMin(cond) { var t = V.htCfg.types.filter(function (x) { return x.cond === cond; })[0]; return ((t ? t.cycleHr : 40) + (t ? t.coolHr : 12)) * 60; }
    // ---- Rolling-mill capacity, straight from the sheet (Rolling Plan + Roll Set) ----
    // Bdgt Prdty/Day is SIZE-WISE (968; 605 for 23-29 mm; 550 for 58 mm), quoted on INPUT tonnage over 22 productive
    // hours. The sheet's own cycle stamps spread it over the 24 h clock (2 h/day non-productive), i.e.
    // duration = input MT x 24 / budget; finish = 90% of input (yield measured from the 30 real cycles).
    var rollBdgt = {}; V.rolling.forEach(function (c) { if (c.budgetPrdty) rollBdgt[c.size] = c.budgetPrdty; });
    var ROLL_HRS = (V.rolling[0] && V.rolling[0].prodHours) || 22;
    function rollBudget(sz) { return rollBdgt[sz] || (sz >= 23 && sz <= 29 ? 605 : 968); }
    function rollRunMin(q, sz) { return (q / ROLL_YIELD) * 24 / rollBudget(sz) * 60; }
    // Roll Set: 8 size-mix feeders -> changeover by TYPE: size-to-size within a feeder 25 min, feeder-to-feeder 1.5 h,
    // BDM (input billet section 160/200) change 4 h. Sizes 39.5-46.69 mm have no feeder row in the sheet -> nearest feeder.
    var RC = V.rollset.changeover || { bdmHr: 4, feederHr: 1.5, sizeMin: 25 };
    var feeders = V.rollset.feeders.map(function (f) { var r = /([\d.]+)\s*-\s*([\d.]+)/.exec(f.range || ''); return { no: f.no, min: r ? +r[1] : 0, max: r ? +r[2] : 999, billet: f.billet }; });
    function feederOf(sz) {
      var i, best = null, bd = 1e9;
      for (i = 0; i < feeders.length; i++) if (sz >= feeders[i].min && sz <= feeders[i].max) return feeders[i];
      feeders.forEach(function (f) { var d = sz < f.min ? f.min - sz : sz - f.max; if (d < bd) { bd = d; best = f; } });
      return best;
    }
    // Sequence: delivery-date priority at the plant's planning grain — RDD WEEK (Mon-Sun; overdue orders form one
    // urgent block), then DESCENDING SIZE within the week (rolling-cycle rule). Each size becomes one run, so the mill
    // pays one changeover per size / feeder / billet-section switch instead of one per order.
    function rddWeek(o) { if (o.rddMin == null) return 1e9; if (o.rddMin < 0) return -1; return Math.floor((o.rddMin + 2 * 1440) / 10080); }   // BASE is Wed 1 Jul: +2 d aligns weeks to Mon 29 Jun
    var seqOrders = V.orders.slice().sort(function (a, b) {
      var wa = rddWeek(a), wb = rddWeek(b); if (wa !== wb) return wa - wb;
      var d = sizeNum(b.rolledSize) - sizeNum(a.rolledSize); if (d) return d;
      return a.so < b.so ? -1 : 1;
    });
    // ---- Pass 1: caster -> rolling -> NDT -> stacking, order by order in the delivery sequence ----
    var SC = {};                                                            // per-order scheduling state
    function mkBook(o, S) {
      return function (machine, stage, dur, contend, q) {
        var s = contend === false ? S.t : Math.max(S.t, free[machine] || 0), e = s + Math.max(Math.round(dur), 10);
        if (contend !== false) free[machine] = e;
        bookings.push({ machine: machine, stage: stage, so: o.so, oi: o._i, customer: o.customer, grade: o.grade, size: o.rolledSize, cond: o.supplyCond, qty: q != null ? q : (o.qty || 0), start: s, end: e });
        if (S.first === null) S.first = s; S.last = Math.max(S.last, e); S.t = e + buf; S.route.push(stage); S.ends[stage] = e; return e;
      };
    }
    seqOrders.forEach(function (o, seq) {
      var qty = o.qty || 0, S = SC[o._i] = { t: 0, first: null, last: 0, route: [], ends: {} }, book = mkBook(o, S);
      o.planSeq = seq + 1;
      // open stock first, then cast the rest — billet MT to cast = the full need (no stock) or just the top-up (stock short of need)
      var castQ = o.allocStatus === 'To-cast' ? o.billetNeed : o.topUp;
      if (castQ > 0) book('Caster (SMS)', 'Billet', castQ / 36 * 60, undefined, castQ);
      // Rolling: changeover by type vs the previous run on the mill, then run time at the size's budget productivity
      var sz = sizeNum(o.rolledSize), fd = feederOf(sz), pv = lastKey['Rolling Mill'];
      var chgType = !pv ? '' : pv.billet !== fd.billet ? 'BDM' : pv.no !== fd.no ? 'Feeder' : pv.size !== sz ? 'Size' : '';
      var chg = chgType === 'BDM' ? RC.bdmHr * 60 : chgType === 'Feeder' ? RC.feederHr * 60 : chgType === 'Size' ? RC.sizeMin : 0;
      lastKey['Rolling Mill'] = { size: sz, no: fd.no, billet: fd.billet };
      o.rollChangeover = chg; o.rollChgType = chgType; o.rollFeeder = fd.no; o.rollBudget = rollBudget(sz);
      o.rollRunMin = Math.round(rollRunMin(qty, sz));
      book('Rolling Mill', 'Rolled', chg + o.rollRunMin);
      // NDT before the stacking yard wherever it applies: black bar is tested straight off the mill, then stacked (CFD) for the next stage
      if (o.ndt) { var c2 = (lastKey['NDT Line'] && lastKey['NDT Line'] !== ndtRange(sz)) ? 60 : 0; lastKey['NDT Line'] = ndtRange(sz); book('NDT Line', 'NDT', c2 + qty / ndtProd(sz) * 60); }
      book('Stacking Yard', 'Stacking', 180, false);
    });

    // ---- GAPLESS LOADING, used by the furnaces and the peeling lines ----
    // Once a machine starts it never stands still: the next order goes on as the previous one comes off, with only the
    // equipment's own setup in between. To make that possible the campaign START is held back to the latest moment that
    // still keeps every order on time for its own slot — schedule the run from the earliest bar first, and the start is
    // max over the run of (bar ready - work queued ahead of it). Nothing is squeezed; the machine simply waits once, at
    // the beginning, instead of stopping between orders.
    var cont = {};
    function runGapless(machine, jobs, setupMin, emit) {
      if (!jobs.length) { cont[machine] = { machine: machine, jobs: 0, busyMin: 0, setupMin: 0, idleMin: 0, util: 0, firstMin: null, lastMin: null, holdMin: 0 }; return; }
      var seq = jobs.slice().sort(function (x, y) { return x.ready - y.ready || x.rdd - y.rdd; });
      var cum = 0, before = [], T = 0;
      seq.forEach(function (j) { before.push(cum); T = Math.max(T, j.ready - cum); cum += j.dur + setupMin; });
      var busy = 0, setups = 0, first = null, last = null;
      seq.forEach(function (j, i) {
        var st = T + before[i], en = st + j.dur;
        if (first === null) first = st; last = en; busy += j.dur; if (i) setups += setupMin;
        emit(j, st, en);
      });
      cont[machine] = { machine: machine, jobs: seq.length, busyMin: busy, setupMin: setups, idleMin: 0,
                        util: (last - first) ? Math.round(busy / (last - first) * 100) : 0,
                        firstMin: first, lastMin: last, holdMin: Math.max(0, T - seq[0].ready) };
    }

    // ---- Pass 2: heat treatment — anneal the black bar before it is peeled ----
    // A charge takes orders of the SAME anneal type (same cycle) whose bar is ready inside HT_WINDOW (8 days) of each
    // other, up to the 18 MT box, so the plant never fires an 85 h cycle for a part load. The lit furnaces then run
    // back to back; the 12 h cooling / changeover is already inside the cycle, so there is no gap to add between boxes.
    var HT_WINDOW = 8 * 1440;
    function htType(c) { var x = V.htCfg.types.filter(function (y) { return y.cond === c; })[0]; return x ? x.type : 'Normal Annealing'; }
    var htPool = {};
    seqOrders.forEach(function (o) {
      if (!isAnneal(o.supplyCond)) return;
      var ty = htType(o.supplyCond);
      (htPool[ty] = htPool[ty] || []).push({ o: o, rem: o.qty || 0, ready: SC[o._i].t, rdd: o.rddMin == null ? 1e9 : o.rddMin, cyc: htMin(o.supplyCond) });
    });
    var charges = [], chgSeq = 0;
    Object.keys(htPool).forEach(function (ty) {
      var pool = htPool[ty].slice().sort(function (x, y) { return x.ready - y.ready || x.rdd - y.rdd; });
      while (pool.some(function (j) { return j.rem > 0.01; })) {
        var open = pool.filter(function (j) { return j.rem > 0.01; }), seed = open[0];
        var c = { id: 'CH' + (++chgSeq), type: ty, cyc: seed.cyc, qty: 0, ready: seed.ready, rdd: seed.rdd, parts: [] };
        open.forEach(function (j) {
          if (c.qty >= V.htCfg.furnaceMT - 0.01 || j.rem <= 0.01) return;
          if (j.ready > seed.ready + HT_WINDOW) return;                       // outside the window: it waits for its own box
          var ready2 = Math.max(c.ready, j.ready), rdd2 = Math.min(c.rdd, j.rdd), cyc2 = Math.max(c.cyc, j.cyc);
          // only refuse a partner when waiting for it would turn a box that was going to make its date into a late one
          if (c.parts.length && ready2 > c.ready && (c.ready + c.cyc <= c.rdd) && (ready2 + cyc2 > c.rdd)) return;
          var take = Math.min(V.htCfg.furnaceMT - c.qty, j.rem); j.rem -= take; c.qty += take;
          c.parts.push({ o: j.o, qty: take }); c.ready = ready2; c.rdd = rdd2; c.cyc = cyc2;
        });
        charges.push(c);
      }
    });
    charges.sort(function (x, y) { return x.ready - y.ready || x.rdd - y.rdd; });
    // How many furnaces the annealing book needs: total cycle hours over the span the boxes arrive in. The plan lights
    // that many and runs them gaplessly; the rest stay cold. Boxes go round the lit furnaces in bar-ready order, so each
    // furnace gets an evenly spread queue and none of them has to wait mid-campaign.
    var cycSum = 0, rdyMin = null, rdyMax = null, cycMax = 0;
    charges.forEach(function (c) { cycSum += c.cyc; cycMax = Math.max(cycMax, c.cyc);
      rdyMin = rdyMin === null ? c.ready : Math.min(rdyMin, c.ready); rdyMax = rdyMax === null ? c.ready : Math.max(rdyMax, c.ready); });
    var htSpan = Math.max((rdyMax - rdyMin) + cycMax, cycMax);
    var htNeed = Math.max(1, Math.min(furn.length, Math.ceil(cycSum / Math.max(htSpan, 1))));
    var lit = furn.slice(0, htNeed), fJobs = {};
    lit.forEach(function (f) { fJobs[f] = []; });
    charges.forEach(function (c, i) { var fm = lit[i % lit.length]; c.machine = fm; fJobs[fm].push({ c: c, ready: c.ready, dur: c.cyc, rdd: c.rdd }); });
    var htEnds = {};
    lit.forEach(function (f) {
      runGapless(f, fJobs[f], 0, function (j, st, en) {                       // cooling / changeover is inside the cycle
        var c = j.c; c.start = st; c.end = en; free[f] = en;
        c.parts.forEach(function (pt) {
          var o = pt.o;
          bookings.push({ machine: f, stage: 'Heat Treat', so: o.so, oi: o._i, customer: o.customer, grade: o.grade, size: o.rolledSize, cond: o.supplyCond,
                          qty: pt.qty, start: st, end: en, chargeId: c.id, chargeQty: Math.round(c.qty * 10) / 10, chargeType: c.type, chargeOrders: c.parts.length });
          htEnds[o._i] = Math.max(htEnds[o._i] || 0, en);
        });
      });
      cont[f].lit = true;
    });
    furn.slice(htNeed).forEach(function (f) { cont[f] = { machine: f, jobs: 0, busyMin: 0, setupMin: 0, idleMin: 0, util: 0, firstMin: null, lastMin: null, holdMin: 0, lit: false }; });
    Object.keys(htEnds).forEach(function (oi) {
      var S = SC[oi]; if (!S) return;
      S.route.push('Heat Treat'); S.ends['Heat Treat'] = htEnds[oi]; S.last = Math.max(S.last, htEnds[oi]); S.t = htEnds[oi] + buf;
    });

    // ---- Pass 3: peeling / drawing — the last operation before dispatch, also loaded gaplessly ----
    var bbAssigned = {}, bbJobs = {}, bbEnd = {};
    var rdyLo = null, rdyHi = null;
    seqOrders.forEach(function (o) { if (!isBright(o.supplyCond)) return; var r = SC[o._i].t;      // after annealing where it applies
      rdyLo = rdyLo === null ? r : Math.min(rdyLo, r); rdyHi = rdyHi === null ? r : Math.max(rdyHi, r); });
    var bbSpan = Math.max((rdyHi || 0) - (rdyLo || 0), 1440);
    function durOn(o, l) { return Math.max(Math.round((o.qty || 0) / l.rateHr * 60), 10); }
    function pickLineFor(o) {
      var sz = sizeNum(o.peelSize || o.rolledSize), c = o.supplyCond;
      var cand = bb.filter(function (l) { return l.conds.indexOf(c) >= 0 && sz >= l.min && sz <= l.max; });
      if (!cand.length) cand = bb.filter(function (l) { return l.conds.indexOf(c) >= 0; });
      if (!cand.length) cand = bb.filter(function (l) { return /^D/.test(c) ? l.draw : !l.draw; });
      if (!cand.length) cand = bb;
      // Fill a line before opening another, so the lines in use carry the book and the rest stay free — but only while
      // that line can still finish this order by its delivery date, judged on the line's real projected finish.
      var rdy = SC[o._i].t, due = o.rddMin == null ? 1e15 : o.rddMin;
      var ok = cand.filter(function (l) {
        var est = Math.max(rdy, bbEnd[l.name] || 0) + durOn(o, l) + l.setupMin;
        return (bbAssigned[l.name] || 0) + durOn(o, l) <= bbSpan && est <= due;
      });
      if (ok.length) { ok.sort(function (x, y) { return (bbAssigned[y.name] || 0) - (bbAssigned[x.name] || 0) || y.rateHr - x.rateHr; }); return ok[0]; }
      cand.sort(function (x, y) { return (bbAssigned[x.name] || 0) - (bbAssigned[y.name] || 0); });
      return cand[0];
    }
    seqOrders.forEach(function (o) {
      if (!isBright(o.supplyCond)) return;
      var L = pickLineFor(o), dur = durOn(o, L);
      bbAssigned[L.name] = (bbAssigned[L.name] || 0) + dur + L.setupMin; o.bbLine = L.name;
      bbEnd[L.name] = Math.max(SC[o._i].t, bbEnd[L.name] || 0) + dur + L.setupMin;
      (bbJobs[L.name] = bbJobs[L.name] || []).push({ o: o, ready: SC[o._i].t, dur: dur, rdd: o.rddMin == null ? 1e9 : o.rddMin });
    });
    bb.forEach(function (L) {
      runGapless(L.name, bbJobs[L.name] || [], L.setupMin, function (j, st, en) {
        var o = j.o, S = SC[o._i];
        bookings.push({ machine: L.name, stage: 'Bright Bar', so: o.so, oi: o._i, customer: o.customer, grade: o.grade, size: o.rolledSize, cond: o.supplyCond, qty: o.qty || 0, start: st, end: en });
        S.route.push('Bright Bar'); S.ends['Bright Bar'] = en; S.last = Math.max(S.last, en); S.t = en + buf;
        if (S.first === null) S.first = st;
      });
    });

    // ---- Pass 4: dispatch, stage position and the delivery-date verdict ----
    seqOrders.forEach(function (o) {
      var S = SC[o._i];
      S.route.push('Dispatch'); S.ends['Dispatch'] = S.last + 60;
      o.route = S.route; o.stageEnds = S.ends; o.planStartMin = S.first; o.planEndMin = S.last; o.expDispMin = S.last + 60;
      var idx = 0; S.route.forEach(function (stg) { if (S.ends[stg] != null && S.ends[stg] <= AS_OF_MIN) idx++; });
      o.stageIndex = idx; o.stageNow = idx >= S.route.length ? 'Dispatched' : S.route[idx];
      o.late = (o.rddMin != null && o.rddMin < AS_OF_MIN && idx < S.route.length) ? 'Overdue'
             : (o.rddMin != null && o.expDispMin > o.rddMin) ? 'At risk' : 'On track';
    });
    // ---- machine occupancy: THE one basis every page reports equipment time from --------------------------------
    // A heat-treatment box holds several orders and is listed once per order, but it occupies the furnace once, so
    // occupancy counts a CHARGE once (mins, slots, first, last). Tonnage and the booking count are not deduped: the
    // box really carries every order's MT, and the Bookings list really has one row per order.
    var load = {}, horizon = 0;
    bookings.forEach(function (b, i) {
      var L = load[b.machine] = load[b.machine] || { machine: b.machine, mins: 0, mt: 0, n: 0, orders: {}, slots: {},
                                                     firstMin: null, lastMin: 0, pool: b.machine === 'Stacking Yard' };
      L.mt += b.qty; L.n++; L.orders[b.so] = 1;
      L.firstMin = L.firstMin === null ? b.start : Math.min(L.firstMin, b.start);
      L.lastMin = Math.max(L.lastMin, b.end);
      var k = b.chargeId != null ? 'c' + b.chargeId : 'b' + i;
      if (!L.slots[k]) { L.slots[k] = 1; L.mins += b.end - b.start; }
      horizon = Math.max(horizon, b.end);
    });
    Object.keys(load).forEach(function (k) {
      var L = load[k];
      L.orderCount = Object.keys(L.orders).length;
      L.slotCount = Object.keys(L.slots).length;
      L.spanMin = Math.max(L.lastMin - L.firstMin, 0);
      // Utilisation is only meaningful for single-capacity equipment; a holding yard has concurrent dwell.
      L.util = L.pool ? null : (L.spanMin ? Math.min(1, L.mins / L.spanMin) : 0);
      L.hours = L.mins / 60;
    });
    var machines = ['Caster (SMS)', 'Rolling Mill', 'NDT Line'].concat(bb.map(function (l) { return l.name; }))
      .concat(furn.slice().sort(function (a, b) { return a < b ? -1 : 1; }));   // F1..F6 in lane order (furn itself is kept least-loaded-sorted)
    var rchg = { Size: 0, Feeder: 0, BDM: 0, mins: 0 };
    seqOrders.forEach(function (o) { if (o.rollChgType) { rchg[o.rollChgType]++; rchg.mins += o.rollChangeover; } });
    V._plan = { orders: seqOrders, bookings: bookings, load: load, occ: load, horizonMin: horizon, machines: machines, yard: 'Stacking Yard',
                charges: charges, continuity: cont,
                roll: { yield: ROLL_YIELD, prodHours: ROLL_HRS, budgets: rollBdgt, rc: RC, chg: rchg } };
    return V._plan;
  }
  window.vssPlan = vssPlan;
  // The plan horizon in whole days, rounded ONCE here. Pages used to mix toFixed(0) (63) with Math.ceil (64) and
  // printed two different horizons for the same plan; vssHorizonDays() is now the only answer, and vssPlanDays()
  // is the number of whole days the plan has to be paged over, which can be one more.
  window.vssHorizonDays = function () { return Math.round(vssPlan().horizonMin / 1440); };
  window.vssPlanDays = function () { return Math.ceil(vssPlan().horizonMin / 1440); };

  // ---- INVENTORY CONSUMPTION: every draw a stage makes on a stock / WIP pool, in time order ----
  // Pools: 'Billet stock' (EXISTING — the order book's Billet Stock column, i.e. opening yard stock), 'Cast billets' (made by
  // the caster in this plan), then the WIP each transforming stage produces: 'Rolled bar' -> 'Tested bar' (NDT) -> 'Annealed bar'
  // (heat treatment) -> 'Bright bar' (peeling / drawing). A stage draws the pool its route arrives with; Dispatch draws the finished pool. Status vs the as-of
  // date: Consumed (draw already happened) / On hand (material exists, next stage not yet run) / Planned (not yet produced).
  window.vssInventory = function () {
    if (V._inv) return V._inv;
    var P = vssPlan(), B = window.vssBilletBuckets(), events = [];
    var MADE = { 'Rolled': 'Rolled bar', 'NDT': 'Tested bar', 'Heat Treat': 'Annealed bar', 'Bright Bar': 'Bright bar' };
    var POOLS = ['Billet stock', 'Cast billets', 'Rolled bar', 'Tested bar', 'Annealed bar', 'Bright bar'];
    var STG = ['Rolled', 'NDT', 'Heat Treat', 'Bright Bar', 'Dispatch'];
    var byOrder = {}; P.bookings.forEach(function (b) { (byOrder[b.oi] = byOrder[b.oi] || []).push(b); });
    function ev(o, b, pool, existing, qty, madeAt) {
      return { min: b.start, stage: b.stage, machine: b.machine, so: o.so, oi: o._i, customer: o.customer, grade: o.grade, size: o.rolledSize,
               cond: o.supplyCond, rdd: o.rdd, rddMin: o.rddMin, late: o.late, pool: pool, existing: !!existing, qty: Math.round(qty * 10) / 10, madeAt: madeAt };
    }
    P.orders.forEach(function (o) {
      var bk = (byOrder[o._i] || []).slice().sort(function (a, b) { return a.start - b.start; });
      var rolled = bk.filter(function (b) { return b.stage === 'Rolled'; })[0]; if (!rolled) return;
      var cast = bk.filter(function (b) { return b.stage === 'Billet'; })[0];
      if (o.stockUsed > 0) events.push(ev(o, rolled, 'Billet stock', true, o.stockUsed, 0));
      if (cast && cast.qty > 0) events.push(ev(o, rolled, 'Cast billets', false, cast.qty, cast.end));
      var pool = 'Rolled bar', madeAt = rolled.end;
      ['NDT', 'Heat Treat', 'Bright Bar'].forEach(function (st) {
        var bs = bk.filter(function (b) { return b.stage === st; }); if (!bs.length) return;
        bs.forEach(function (b) { events.push(ev(o, b, pool, false, b.qty, madeAt)); });
        pool = MADE[st]; madeAt = Math.max.apply(null, bs.map(function (b) { return b.end; }));
      });
      events.push(ev(o, { start: o.expDispMin, stage: 'Dispatch', machine: 'Dispatch' }, pool, false, o.qty || 0, madeAt));
    });
    events.sort(function (a, b) { return a.min - b.min || a.oi - b.oi; });
    var bal = B.allocated;
    events.forEach(function (e) {
      if (e.pool === 'Billet stock') { bal -= e.qty; e.balance = Math.round(bal * 10) / 10; }
      e.status = e.min <= AS_OF_MIN ? 'Consumed' : (e.madeAt != null && e.madeAt <= AS_OF_MIN) ? 'On hand' : 'Planned';
    });
    function agg() { return { mt: 0, n: 0, orders: {}, soFar: 0, onHand: 0, planned: 0, first: null, last: null }; }
    function add(a, e) {
      a.mt += e.qty; a.n++; a.orders[e.oi] = 1; a[e.status === 'Consumed' ? 'soFar' : e.status === 'On hand' ? 'onHand' : 'planned'] += e.qty;
      a.first = a.first == null ? e.min : Math.min(a.first, e.min); a.last = a.last == null ? e.min : Math.max(a.last, e.min);
    }
    var pools = {}, cells = {};
    events.forEach(function (e) { add(pools[e.pool] = pools[e.pool] || agg(), e); var c = cells[e.stage] = cells[e.stage] || {}; add(c[e.pool] = c[e.pool] || agg(), e); });
    // weekly run-down of the existing billet stock (Mon-Sun weeks from Mon 29 Jun; BASE = Wed 1 Jul)
    var wk0 = -2 * 1440, weeks = [], nW = Math.max(1, Math.ceil((P.horizonMin - wk0) / 10080));
    for (var w = 0; w < nW; w++) weeks.push({ idx: w + 1, start: wk0 + w * 10080, end: wk0 + (w + 1) * 10080, consumed: 0, done: 0, n: 0, opening: 0, closing: 0 });
    events.forEach(function (e) { if (e.pool !== 'Billet stock') return; var wk = weeks[Math.floor((e.min - wk0) / 10080)]; if (!wk) return; wk.consumed += e.qty; wk.n++; if (e.status === 'Consumed') wk.done += e.qty; });
    while (weeks.length > 1 && weeks[weeks.length - 1].consumed === 0) weeks.pop();
    var run = B.allocated; weeks.forEach(function (wk) { wk.opening = run; run -= wk.consumed; wk.closing = run; });
    var topUpN = 0, topUpMT = 0, surplus = 0, stockOrders = 0, fullN = 0;
    V.orders.forEach(function (o) { if ((o.billetStock || 0) > 0) { stockOrders++; surplus += o.stockSurplus; if (o.topUp > 0.05) { topUpN++; topUpMT += o.topUp; } else fullN++; } });
    V._inv = { events: events, pools: pools, cells: cells, poolOrder: POOLS, stageOrder: STG, weeks: weeks, buckets: B,
               opening: B.allocated + B.unallocated + B.notOkay, allocated: B.allocated, stockOrders: stockOrders, fullCover: fullN,
               surplus: Math.round(surplus), topUp: { n: topUpN, mt: Math.round(topUpMT) }, idle: Math.round(surplus + B.unallocated + B.notOkay) };
    return V._inv;
  };

  // Gantt feed from the plan: lanes = machines, bars = order bookings coloured per order.
  window.vssSchedule = function () {
    var P = vssPlan(), colorOf = {};
    P.orders.forEach(function (o, i) { colorOf[o.so] = vssColor(i); });
    var seenCh = {};
    var bars = P.bookings.filter(function (b) {
      if (b.machine === P.yard) return false;
      if (!b.chargeId) return true;
      if (seenCh[b.chargeId]) return false;                                  // a furnace charge shared by several orders draws one bar
      seenCh[b.chargeId] = 1; return true;
    }).map(function (b) {
      var q = b.chargeId ? b.chargeQty : b.qty, who = b.chargeId && b.chargeOrders > 1 ? b.so + ' +' + (b.chargeOrders - 1) + ' more' : b.so;
      return { unit: b.machine, start: b.start, dur: b.end - b.start, cls: colorOf[b.so], so: b.so,
               tip: who + ' · ' + b.customer + ' · ' + b.stage + ' · ' + q.toFixed(1) + ' MT · ' + vssStamp(b.start) + ' → ' + vssStamp(b.end) };
    });
    return { units: P.machines, bars: bars, colorOf: colorOf };
  };

  // ---- STAGE REPORT: the ONE basis shared by the Dashboard flow strip and every process page ----
  // bookings of a plan stage: tonnage routed through it (whole order book), done so far (end <= as-of), running, planned;
  // per machine and per day. Stage names: 'Billet' | 'Rolled' | 'NDT' | 'Bright Bar' | 'Heat Treat'.
  window.vssStageReport = function (stage) {
    var P = vssPlan(), sch = window.vssSchedule(), AS = AS_OF_MIN;
    var bk = P.bookings.filter(function (b) { return b.stage === stage; }).slice().sort(function (a, b) { return a.start - b.start || (a.machine < b.machine ? -1 : 1); });
    var r = { stage: stage, bookings: bk, orders: 0, lines: 0, mt: 0, doneMT: 0, runningMT: 0, plannedMT: 0, doneN: 0, runningN: 0, plannedN: 0, hours: 0, first: null, last: null, byMachine: [], byDay: [], colorOf: sch.colorOf };
    var so = {}, oi = {}, mach = {}, days = {}, slot = {};
    // Machine time is deduped by charge, exactly as P.occ does it: a heat-treatment box is listed once per order
    // but occupies the furnace once. Tonnage and the job count are not deduped - the box carries every order's MT.
    bk.forEach(function (b, bi) {
      var st = b.end <= AS ? 'Done' : b.start <= AS ? 'Running' : 'Planned'; b.status = st;
      var sk = b.machine + (b.chargeId != null ? '|c' + b.chargeId : '|b' + bi), fresh = !slot[sk];
      if (fresh) slot[sk] = 1;
      so[b.so] = 1; oi[b.oi] = 1; r.mt += b.qty; if (fresh) r.hours += (b.end - b.start) / 60;
      if (st === 'Done') { r.doneMT += b.qty; r.doneN++; } else if (st === 'Running') { r.runningMT += b.qty; r.runningN++; } else { r.plannedMT += b.qty; r.plannedN++; }
      r.first = r.first == null ? b.start : Math.min(r.first, b.start); r.last = r.last == null ? b.end : Math.max(r.last, b.end);
      var m = mach[b.machine] = mach[b.machine] || { machine: b.machine, n: 0, mt: 0, hours: 0, first: b.start, last: b.end, doneMT: 0, orders: {} };
      m.n++; m.mt += b.qty; if (fresh) { m.hours += (b.end - b.start) / 60; m.slots = (m.slots || 0) + 1; }
      m.first = Math.min(m.first, b.start); m.last = Math.max(m.last, b.end); m.orders[b.so] = 1; if (st === 'Done') m.doneMT += b.qty;
      var d = Math.floor(b.start / 1440), dd = days[d] = days[d] || { day: d, start: d * 1440, mt: 0, n: 0, sizes: {}, orders: {} };
      dd.mt += b.qty; dd.n++; dd.sizes[b.size] = 1; dd.orders[b.so] = 1;
    });
    r.orders = Object.keys(so).length; r.lines = Object.keys(oi).length; r.slots = Object.keys(slot).length;
    r.byMachine = Object.keys(mach).sort().map(function (k) { var m = mach[k]; m.span = Math.max(m.last - m.first, 1); m.util = Math.min(1, m.hours * 60 / m.span); m.orderCount = Object.keys(m.orders).length; return m; });
    r.byDay = Object.keys(days).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { var d = days[k]; d.sizeChanges = Object.keys(d.sizes).length; d.orderCount = Object.keys(d.orders).length; return d; });
    return r;
  };
  // shared renderers for the process pages: bookings table + per-machine gantt (colour per order, same as the Master Gantt)
  window.vssBookingTable = function (el, bk, opts) {
    opts = opts || {};
    var cols = ['#', 'Start', 'End', 'Machine', 'Sales order', 'Customer', 'Grade · size · cond', 'MT', 'Status'], badge = { Done: 'b-green', Running: 'b-blue', Planned: 'b-grey' };
    el.innerHTML = '<thead><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + bk.slice(0, opts.cap || 500).map(function (b, i) {
      return '<tr><td class="mono hint">' + (i + 1) + '</td><td class="mono">' + vssStamp(b.start) + '</td><td class="mono">' + vssStamp(b.end) + '</td><td class="strong">' + b.machine + '</td><td class="mono">' + b.so + '</td><td>' + b.customer + '</td><td>' + b.grade + ' <span class="hint">' + b.size + ' · ' + b.cond + '</span></td><td class="mono right-al strong">' + b.qty.toFixed(1) + '</td><td><span class="badge ' + (badge[b.status] || 'b-grey') + '">' + b.status + '</span></td></tr>';
    }).join('') + '</tbody>';
    return Math.min(bk.length, opts.cap || 500);
  };
  window.vssStageGantt = function (el, rep, opts) {
    opts = opts || {};
    var units = rep.byMachine.map(function (m) { return m.machine; });
    var startMin = opts.startMin != null ? opts.startMin : Math.floor(rep.first / 1440) * 1440;
    var bars = rep.bookings.map(function (b) { return { unit: b.machine, start: b.start, dur: b.end - b.start, cls: rep.colorOf[b.so] || '#888', tip: b.so + ' · ' + b.customer + ' · ' + b.grade + ' ' + b.size + ' ' + b.cond + ' · ' + b.qty.toFixed(1) + ' MT · ' + vssStamp(b.start) + ' → ' + vssStamp(b.end) + ' · ' + b.status }; });
    return window.vssRenderGantt(el, units, bars, { laneTitle: opts.laneTitle || 'Machine', startMin: startMin, endMin: opts.endMin != null ? opts.endMin : undefined, laneW: opts.laneW || 150, batchTag: opts.batchTag });
  };
  // 14-day window around the as-of date (default view on process pages) or the full plan
  window.vssWindow = function (mode) {
    var d = Math.floor(AS_OF_MIN / 1440);
    if (mode === 'full') return { startMin: null, endMin: null };
    if (mode === 'day') return { startMin: d * 1440, endMin: (d + 1) * 1440 };          // the as-of day, midnight to midnight
    if (mode === 'day3') return { startMin: d * 1440, endMin: (d + 3) * 1440 };
    return { startMin: (d - 3) * 1440, endMin: (d + 11) * 1440 };
  };

  window.vssBilletBuckets = function () {
    vssDerive();
    var alloc = 0, un = 0, nok = 0;
    V.orders.forEach(function (o) {
      var q = o.billetStock || 0;
      if (q > 0) { alloc += q; if (hash(o.so) % 23 === 0) un += Math.round(q * 0.3 * 10) / 10; if (hash(o.so) % 37 === 0) nok += Math.round(q * 0.2 * 10) / 10; }
    });
    return { allocated: Math.round(alloc), unallocated: Math.round(un), notOkay: Math.round(nok) };
  };

  window.vssMOQGap = function () {
    vssDerive();
    return V.casting.map(function (h) {
      var moq = V.smsCfg.moq[h.supplyCond] || 0, q = h.ihQty || 0;
      return Object.assign({}, h, { moq: moq, gap: moq > 0 ? Math.max(0, moq - q) : 0, moqOk: moq === 0 || q >= moq });
    });
  };

  // APS-style multi-day gantt renderer. bars: [{unit,start,dur,cls,tip}]. opts: laneW, startMin, endMin, laneTitle, batchTag.
  window.vssRenderGantt = function (el, units, bars, opts) {
    opts = opts || {};
    var laneW = opts.laneW || 172;
    var byUnit = {}; units.forEach(function (u) { byUnit[u] = []; });
    var endMax = 0, startMin = opts.startMin != null ? opts.startMin : 0;
    bars.forEach(function (b) { if (byUnit[b.unit]) { byUnit[b.unit].push(b); endMax = Math.max(endMax, b.start + b.dur); } });
    var total = opts.endMin != null ? opts.endMin : Math.ceil((endMax + 60) / 1440) * 1440;
    var span = Math.max(1440, total - startMin);
    var gW = el.clientWidth || 1400;
    var px = Math.max(0.008, Math.min(1.2, (gW - laneW - 40) / span));   // low floor so a 60-90 day plan fits in one view
    var trackW = span * px;
    function X(m) { return (m - startMin) * px; }
    var step = span > 20 * 1440 ? 1440 : 360;                     // long horizons: day lines only
    function grid() {
      var h = '', m;
      for (m = Math.ceil(startMin / step) * step; m <= total; m += step) { var day = (m % 1440 === 0); h += '<div class="g-grid' + (day ? ' day' : '') + '" style="left:' + X(m) + 'px"></div>'; }
      return h;
    }
    var mids = [], mm;
    for (mm = Math.ceil((startMin + 1) / 1440) * 1440; mm < total; mm += 1440) mids.push(mm);
    var bounds = [startMin].concat(mids).concat([total]);
    var labelEvery = Math.max(1, Math.ceil(bounds.length / 16));
    var head = '';
    for (var k = 0; k < bounds.length - 1; k++) { if (k % labelEvery) continue; var c = (bounds[k] + bounds[k + 1]) / 2, di = vssDayLabel(bounds[k]); head += '<div class="g-day" style="left:' + X(c) + 'px">' + di.wd + '<span class="dm">' + di.dm + '</span></div>'; }
    var laneStyle = 'width:' + laneW + 'px';
    var html = '<div class="g-row head"><div class="g-lane head-lane" style="' + laneStyle + '">' + (opts.laneTitle || 'Machine') + '</div><div class="g-track" style="min-width:' + trackW + 'px">' + grid() + head + '</div></div>';
    units.forEach(function (u) {
      var segs = byUnit[u], t = grid(), isB = opts.batchTag && /Furnace/.test(u);
      segs.forEach(function (s) {
        if (s.start >= total || s.start + s.dur <= startMin) return;
        var st = Math.max(s.start, startMin), d = Math.min(s.start + s.dur, total) - st;
        t += '<div class="g-bar" style="left:' + X(st) + 'px;width:' + Math.max(d * px, 2) + 'px;background:' + s.cls + '" title="' + (s.tip || '').replace(/"/g, '&quot;') + '"></div>';
      });
      html += '<div class="g-row"><div class="g-lane" style="' + laneStyle + '">' + u + (isB ? '<span class="eqp-b">' + opts.batchTag + '</span>' : '') + '</div><div class="g-track" style="min-width:' + trackW + 'px">' + t + '</div></div>';
    });
    el.innerHTML = html;
    return { px: px, total: total, startMin: startMin };
  };

  // Demand planning (o9-B): next 4 weeks = MTO already-scheduled (by planned rolling week) + MTS forecast.
  window.vssForecast = function () {
    vssPlan();
    var weeks = [], w;
    for (w = 0; w < 4; w++) weeks.push({ idx: w + 1, start: vssDateAt(w * 7 * 1440), end: vssDateAt((w + 1) * 7 * 1440), s: w * 7 * 1440, e: (w + 1) * 7 * 1440, mto: 0, mts: 0, byCat: {} });
    V.orders.forEach(function (o) {
      var m = o.stageEnds && o.stageEnds['Rolled'] != null ? o.stageEnds['Rolled'] : null; if (m == null) return;
      for (var i = 0; i < 4; i++) if (m >= weeks[i].s && m < weeks[i].e) { weeks[i].mto += (o.qty || 0); weeks[i].byCat[o.category] = (weeks[i].byCat[o.category] || 0) + (o.qty || 0); break; }
    });
    var MTS = [
      { sku: 'MTS-C40-40R', grade: 'C40', cat: 'CS', size: '40R', base: 130 },
      { sku: 'MTS-20MC5-20R', grade: '20MnCr5', cat: 'CRMN', size: '20R', base: 95 },
      { sku: 'MTS-8620-30R', grade: 'SAE8620H', cat: 'NICRMO', size: '30R', base: 80 },
      { sku: 'MTS-16MC5-25R', grade: '16MnCr5', cat: 'CRMN', size: '25R', base: 70 },
      { sku: 'MTS-C45-50R', grade: 'C45', cat: 'CS', size: '50R', base: 110 },
      { sku: 'MTS-SCM420-34R', grade: 'SCM420', cat: 'CRMO', size: '34R', base: 60 },
      { sku: 'MTS-42CM4-56R', grade: '42CrMo4', cat: 'CRMO', size: '56R', base: 90 },
      { sku: 'MTS-EN19-45R', grade: 'EN19', cat: 'CRMO', size: '45R', base: 75 }
    ];
    MTS.forEach(function (m, i) { m.w = []; for (var k = 0; k < 4; k++) { var q = Math.round(m.base * (0.8 + ((i * 7 + k * 17) % 40) / 100)); m.w.push(q); weeks[k].mts += q; weeks[k].byCat[m.cat] = (weeks[k].byCat[m.cat] || 0) + q; } });
    weeks.forEach(function (wk) { wk.mto = Math.round(wk.mto); wk.total = wk.mto + wk.mts; });
    return { weeks: weeks, mts: MTS };
  };

  // MTS buffer (o9-A2 "no SKU stock-out"): per stock SKU, opening stock vs weekly demand ->
  // cover in weeks, projected stock W1-W4 (no replenishment), replenishment need, stock-out alarm.
  window.vssMTSCover = function () {
    var F = vssForecast(), LEAD = 2;                      // weeks of cover needed (rolling -> dispatch lead time)
    var FAC = [4.6, 0.7, 2.6, 1.4, 5.2, 3.1, 0.9, 4.3];   // seeded opening stock (x avg weekly demand) -> mix of OK / Replenish / Stock-out; swap for real stock
    return F.mts.map(function (m, i) {
      var tot = m.w.reduce(function (a, b) { return a + b; }, 0), avg = tot / 4;
      var opening = Math.round(avg * FAC[i % FAC.length]);
      var proj = [], s = opening, outWeek = null;
      m.w.forEach(function (q, k) { s -= q; proj.push(Math.round(s)); if (s < 0 && outWeek == null) outWeek = k + 1; });
      var cover = avg ? opening / avg : 99;
      var status = (outWeek != null && outWeek <= LEAD) ? 'Stock-out' : (outWeek != null || cover < LEAD) ? 'Replenish' : 'OK';
      var replenish = Math.max(0, Math.round(tot + avg - opening));   // produce over W1-W4 to end with 1 week safety
      return { sku: m.sku, grade: m.grade, cat: m.cat, size: m.size, w: m.w, opening: opening, avg: Math.round(avg), cover: cover,
               proj: proj, outWeek: outWeek, status: status, replenish: replenish, produceBy: outWeek != null ? 'W' + Math.max(1, outWeek - 1) : (cover < LEAD ? 'W1' : '—'), lead: LEAD };
    });
  };

  // ---- Excel export ------------------------------------------------------------------------------------------
  // A real .xlsx written in the browser with NO library. An xlsx is a zip of XML parts, and a zip whose entries are
  // "stored" (uncompressed) is perfectly valid — so all this needs is CRC-32 and the two header layouts. That keeps
  // the demo dependency-free and offline, and Excel opens the file without the format warning an HTML table renamed
  // .xls would raise. Dates are written as real date serials with a number format so they sort and filter as dates.
  //   vssXlsx([{ name, cols:[{t,w,type}], rows:[[v,...]] }], 'file.xlsx')
  //   col type: undefined|'text' · 'num' (1 dp) · 'int' · 'date' · 'datetime'   — pass Date objects for the last two
  var CRCT = (function () {
    var t = new Int32Array(256), n, c, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c; }
    return t;
  })();
  function crc32(u8) { var c = -1, i; for (i = 0; i < u8.length; i++) c = (c >>> 8) ^ CRCT[(c ^ u8[i]) & 0xFF]; return (c ^ -1) >>> 0; }

  function zipStore(files) {
    var te = new TextEncoder(), body = [], cdir = [], off = 0, d = new Date(),
        tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
        dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var nm = te.encode(f.name), data = f.data, crc = crc32(data);
      var lh = new Uint8Array(30 + nm.length), v = new DataView(lh.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(10, tm, true); v.setUint16(12, dt, true);
      v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true);
      v.setUint16(26, nm.length, true); lh.set(nm, 30);
      var ch = new Uint8Array(46 + nm.length), w = new DataView(ch.buffer);
      w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true);
      w.setUint16(12, tm, true); w.setUint16(14, dt, true); w.setUint32(16, crc, true);
      w.setUint32(20, data.length, true); w.setUint32(24, data.length, true);
      w.setUint16(28, nm.length, true); w.setUint32(42, off, true); ch.set(nm, 46);
      body.push(lh, data); cdir.push(ch); off += lh.length + data.length;
    });
    var cdLen = cdir.reduce(function (a, x) { return a + x.length; }, 0);
    var eo = new Uint8Array(22), e = new DataView(eo.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdLen, true); e.setUint32(16, off, true);
    var all = body.concat(cdir, [eo]), out = new Uint8Array(all.reduce(function (a, x) { return a + x.length; }, 0)), p = 0;
    all.forEach(function (x) { out.set(x, p); p += x.length; });
    return out;
  }

  function xesc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ''); }
  function colRef(n) { var r = '', m; n++; while (n > 0) { m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = (n - m - 1) / 26; } return r; }
  // Excel's epoch is 1899-12-30; 25569 is that to 1970-01-01. Built from LOCAL components so a timezone never shifts a shift.
  function xlDate(d) {
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 25569 +
           (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  }
  var XF = { text: 0, num: 4, int: 5, date: 2, datetime: 3 };   // cellXfs indexes in the styles part below

  function sheetXml(sh) {
    var cols = sh.cols, nr = sh.rows.length + 1;
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + colRef(cols.length - 1) + nr + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/><cols>';
    cols.forEach(function (c, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.w || 14) + '" customWidth="1"/>'; });
    x += '</cols><sheetData><row r="1" ht="22" customHeight="1">';
    cols.forEach(function (c, i) { x += '<c r="' + colRef(i) + '1" s="1" t="inlineStr"><is><t>' + xesc(c.t) + '</t></is></c>'; });
    x += '</row>';
    sh.rows.forEach(function (row, ri) {
      x += '<row r="' + (ri + 2) + '">';
      row.forEach(function (v, ci) {
        if (v == null || v === '') return;
        var type = cols[ci] && cols[ci].type || 'text', ref = colRef(ci) + (ri + 2), st = XF[type] || 0;
        if (type === 'date' || type === 'datetime') { if (!(v instanceof Date) || isNaN(v)) return; x += '<c r="' + ref + '" s="' + st + '"><v>' + xlDate(v) + '</v></c>'; }
        else if (type === 'num' || type === 'int') { if (!isFinite(v)) return; x += '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>'; }
        else x += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xesc(v) + '</t></is></c>';
      });
      x += '</row>';
    });
    x += '</sheetData>';
    if (sh.rows.length) x += '<autoFilter ref="A1:' + colRef(cols.length - 1) + nr + '"/>';
    return x + '</worksheet>';
  }

  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="3"><numFmt numFmtId="164" formatCode="dd-mmm-yyyy"/><numFmt numFmtId="165" formatCode="dd-mmm-yyyy\\ hh:mm"/><numFmt numFmtId="166" formatCode="0.0"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF12233B"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="6">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  window.vssXlsxBytes = function (sheets) {
    var te = new TextEncoder(), REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var files = [];
    function add(name, str) { files.push({ name: name, data: te.encode(str) }); }
    add('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (sh, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
      '</Types>');
    add('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    add('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="' + REL + '"><sheets>' +
      sheets.map(function (sh, i) { return '<sheet name="' + xesc((sh.name || ('Sheet' + (i + 1))).slice(0, 31).replace(/[\\\/\?\*\[\]:]/g, ' ')) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') +
      '</sheets></workbook>');
    add('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (sh, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + REL + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="' + REL + '/styles" Target="styles.xml"/></Relationships>');
    add('xl/styles.xml', STYLES);
    sheets.forEach(function (sh, i) { add('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(sh)); });
    return zipStore(files);
  };

  window.vssXlsx = function (sheets, filename) {
    var blob = new Blob([window.vssXlsxBytes(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename || 'export.xlsx'; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    return blob.size;
  };

  vssPlan();   // run the scheduler once at load so every page sees start/end, stages and bookings
})();
