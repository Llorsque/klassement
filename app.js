/* ═══════════════════════════════════════════════════════
   KLASSEMENT — NK Sprint & NK Allround
   ─────────────────────────────────────────────────────
   Puntberekening : seconden per 500m, 3 decimalen AFKAPPEN
   Head-to-Head   : benodigde tijd om boven target te komen
   ═══════════════════════════════════════════════════════ */

"use strict";

// ── Configuration ──────────────────────────────────────
const MODULE_CONFIG = {
  sprint: {
    label: "NK Sprint",
    genders: {
      m: {
        label: "Mannen",
        distances: [
          { key: "d1_500",  meters: 500,  label: "1e 500m",  divisor: 1 },
          { key: "d1_1000", meters: 1000, label: "1e 1000m", divisor: 2 },
          { key: "d2_500",  meters: 500,  label: "2e 500m",  divisor: 1 },
          { key: "d2_1000", meters: 1000, label: "2e 1000m", divisor: 2 },
        ],
      },
      v: {
        label: "Vrouwen",
        distances: [
          { key: "d1_500",  meters: 500,  label: "1e 500m",  divisor: 1 },
          { key: "d1_1000", meters: 1000, label: "1e 1000m", divisor: 2 },
          { key: "d2_500",  meters: 500,  label: "2e 500m",  divisor: 1 },
          { key: "d2_1000", meters: 1000, label: "2e 1000m", divisor: 2 },
        ],
      },
    },
  },
  allround: {
    label: "NK Allround",
    genders: {
      m: {
        label: "Mannen",
        distances: [
          { key: "d1_500",   meters: 500,   label: "500m",    divisor: 1  },
          { key: "d1_1500",  meters: 1500,  label: "1500m",   divisor: 3  },
          { key: "d1_5000",  meters: 5000,  label: "5000m",   divisor: 10 },
          { key: "d1_10000", meters: 10000, label: "10.000m", divisor: 20 },
        ],
      },
      v: {
        label: "Vrouwen",
        distances: [
          { key: "d1_500",  meters: 500,  label: "500m",  divisor: 1  },
          { key: "d1_1500", meters: 1500, label: "1500m", divisor: 3  },
          { key: "d1_3000", meters: 3000, label: "3000m", divisor: 6  },
          { key: "d1_5000", meters: 5000, label: "5000m", divisor: 10 },
        ],
      },
    },
  },
};

// ── State ──────────────────────────────────────────────
const state = {
  selectedModule: "sprint",
  selectedGender: "m",
  selectedView: "klassement",
  selectedDistanceKey: null,
  resultsRaw: null,
  standings: null,
  h2h: {
    riderAId: null,
    riderBId: null,
    targetMode: "rank",
    targetRank: 1,
    targetRiderId: null,
    focusDistanceKey: null,
  },
};

// ── Utility ────────────────────────────────────────────
function parseTimeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const s = timeStr.trim().replace(",", ".");
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length > 3) return null;
  const nums = parts.map(Number);
  if (!nums.every(Number.isFinite)) return null;
  if (parts.length === 1) return nums[0];
  if (parts.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

function truncateDecimals(value, decimals) {
  if (!Number.isFinite(value)) return null;
  const str = value.toFixed(decimals + 2);
  const dot = str.indexOf(".");
  if (dot === -1) return value;
  return Number(str.slice(0, dot + decimals + 1));
}

function fmtPts(p) {
  return Number.isFinite(p) ? p.toFixed(3) : "—";
}

function fmtTime(sec) {
  if (!Number.isFinite(sec)) return "—";
  const sign = sec < 0 ? "-" : "";
  const abs = Math.abs(sec);
  const mm = Math.floor(abs / 60);
  const ss = abs - mm * 60;
  const ssStr = ss.toFixed(3).padStart(6, "0");
  return mm > 0 ? `${sign}${mm}:${ssStr}` : `${sign}${ssStr}`;
}

function fmtDelta(d) {
  if (!Number.isFinite(d) || d === 0) return "";
  return `+${d.toFixed(3)}`;
}

function esc(str) {
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function getActiveConfig() {
  return MODULE_CONFIG[state.selectedModule].genders[state.selectedGender];
}

// ── SVG icons (inline) ─────────────────────────────────
const ICON = {
  timer:  '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="9" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 6.5V9l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 2h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  trophy: '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M5 13h6M8 10v3M4 3h8v2a4 4 0 0 1-8 0V3ZM4 4H2.5a1 1 0 0 0-1 1v.5A2.5 2.5 0 0 0 4 8M12 4h1.5a1 1 0 0 1 1 1v.5A2.5 2.5 0 0 1 12 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  versus: '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M4 12V6M8 12V4M12 12V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

// ── Data: KNSB Stub ────────────────────────────────────
async function fetchKnsbResults() { return null; }

// ── Mock Data ──────────────────────────────────────────
function makeMockResults(moduleKey, genderKey) {
  const cfg = MODULE_CONFIG[moduleKey].genders[genderKey];
  const names = {
    m: ["Rijder A","Rijder B","Rijder C","Rijder D","Rijder E","Rijder F","Rijder G","Rijder H"],
    v: ["Rijdster A","Rijdster B","Rijdster C","Rijdster D","Rijdster E","Rijdster F","Rijdster G","Rijdster H"],
  };
  const presets = {
    sprint_m: [["34.72","1:09.86","34.81","1:10.11"],["34.90","1:10.32","34.77","1:10.58"],["35.10","1:10.20","35.08","1:10.40"],["34.65","1:10.70","34.92","1:10.88"],["35.30","1:11.10","35.40","1:11.33"],["35.55","1:10.95","35.49","1:11.22"],["34.98","1:10.05","35.01","1:10.25"],["36.10","1:12.20","36.05","1:12.10"]],
    sprint_v: [["37.88","1:16.40","37.92","1:16.55"],["38.05","1:16.10","38.20","1:16.45"],["38.40","1:17.05","38.15","1:16.88"],["37.70","1:16.80","37.85","1:16.90"],["39.10","1:18.30","39.05","1:18.15"],["38.55","1:17.45","38.50","1:17.32"],["38.20","1:16.95","38.30","1:17.10"],["40.00","1:19.90","40.10","1:20.10"]],
    allround_m: [["35.10","1:45.80","6:25.10","13:25.20"],["35.40","1:46.10","6:23.90","13:32.00"],["35.00","1:47.30","6:28.20","13:40.50"],["35.90","1:45.40","6:26.10","13:29.80"],["36.10","1:48.00","6:31.40","13:55.00"],["35.60","1:46.50","6:29.90","13:44.30"],["35.20","1:46.80","6:24.80","13:33.10"],["37.20","1:52.00","6:50.00","14:30.00"]],
    allround_v: [["38.30","1:58.60","4:08.10","7:11.20"],["38.55","1:58.20","4:07.40","7:09.90"],["38.10","1:59.80","4:10.80","7:14.30"],["39.00","1:57.90","4:09.20","7:13.10"],["39.50","2:01.40","4:15.40","7:20.70"],["38.80","1:59.10","4:12.50","7:17.80"],["38.40","1:58.90","4:08.90","7:12.40"],["41.00","2:05.00","4:25.00","7:35.00"]],
  };
  const rows = presets[`${moduleKey}_${genderKey}`];
  return {
    athletes: names[genderKey].map((name, idx) => {
      const times = {}, status = {};
      cfg.distances.forEach((d, i) => {
        times[d.key] = rows[idx][i] ?? null;
        status[d.key] = times[d.key] ? "OK" : "DNS";
      });
      return { athleteId: `a${idx+1}`, name, meta:{ club:"—" }, times, status };
    }),
  };
}

// ── Computation ────────────────────────────────────────
function computeAthletePoints(athlete, distances) {
  const seconds = {}, points = {};
  let total = 0, count = 0;
  for (const d of distances) {
    const raw = athlete.times?.[d.key];
    const st = athlete.status?.[d.key] ?? (raw ? "OK" : "DNS");
    if (st !== "OK") { seconds[d.key] = null; points[d.key] = null; continue; }
    const sec = parseTimeToSeconds(raw);
    if (!Number.isFinite(sec)) { seconds[d.key] = null; points[d.key] = null; continue; }
    seconds[d.key] = sec;
    const p = truncateDecimals(sec / d.divisor, 3);
    points[d.key] = p;
    total += p;
    count++;
  }
  const hasAll = count === distances.length;
  return { seconds, points, totalPoints: hasAll ? truncateDecimals(total, 3) : null, hasAll, completedCount: count };
}

function computeStandings(resultsRaw, distances) {
  if (!resultsRaw?.athletes?.length) return { all:[], full:[], partial:[] };
  const computed = resultsRaw.athletes.map(a => ({ ...a, ...computeAthletePoints(a, distances) }));
  const full = computed.filter(x => x.totalPoints !== null).sort((a,b) => a.totalPoints - b.totalPoints);
  const partial = computed.filter(x => x.totalPoints === null).sort((a,b) => b.completedCount - a.completedCount);
  full.forEach((x,i) => x.rank = i + 1);
  partial.forEach(x => x.rank = null);
  const leader = full[0]?.totalPoints ?? null;
  for (const a of full) a.delta = Number.isFinite(leader) ? truncateDecimals(a.totalPoints - leader, 3) : null;
  for (const a of partial) a.delta = null;
  return { all:[...full, ...partial], full, partial };
}

function getTargetFromStandings(standings, h2h) {
  if (!standings?.full?.length) return null;
  if (h2h.targetMode === "rider") return standings.full.find(x => x.athleteId === h2h.targetRiderId) ?? null;
  return standings.full[Math.max(0, (Number(h2h.targetRank) || 1) - 1)] ?? null;
}

function computeH2H(standings, distances, athleteId, target, focusKey) {
  const athlete = standings.all.find(x => x.athleteId === athleteId);
  if (!athlete || !target) return { ok:false, reason:"Selecteer een rijder en een target." };
  const focusDist = distances.find(d => d.key === focusKey) ?? distances[0];
  if (!focusDist) return { ok:false, reason:"Geen focusafstand beschikbaar." };

  let cur = 0;
  for (const d of distances) {
    if (d.key === focusDist.key) continue;
    const p = athlete.points?.[d.key];
    if (!Number.isFinite(p)) return { ok:false, reason:`${athlete.name} mist geldige punten op ${d.label}.` };
    cur += p;
  }
  cur = truncateDecimals(cur, 3);

  const targetTotal = target.totalPoints;
  if (!Number.isFinite(targetTotal)) return { ok:false, reason:"Target heeft geen geldig totaal." };

  const allowed = truncateDecimals(targetTotal - 0.001, 3);
  const allowedFocus = truncateDecimals(allowed - cur, 3);
  if (!Number.isFinite(allowedFocus) || allowedFocus <= 0) return { ok:false, reason:"Onmogelijk om boven het target te komen met de huidige tussenstand." };

  const maxTime = (allowedFocus + 0.000999) * focusDist.divisor;
  return { ok:true, athlete, targetAthlete:target, focusDist, currentWithout:cur, allowedTotal:allowed, allowedFocus, maxTime };
}

// ── DOM Cache ──────────────────────────────────────────
const el = {};
function cacheEls() {
  ["moduleTabs","genderTabs","viewButtons","viewTitle","viewMeta","contentArea",
   "h2hRiderA","h2hRiderB","h2hTargetMode","h2hTargetRankWrap","h2hTargetRank",
   "h2hTargetRiderWrap","h2hTargetRider","h2hFocusDistance","h2hOpen","exportBtn","toast"
  ].forEach(id => { el[id] = document.getElementById(id); });
}

// ── Render Helpers ─────────────────────────────────────
function setActive(container, key, value) {
  if (!container) return;
  container.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset[key] === value));
}

function fillSelect(sel, opts, val) {
  if (!sel) return;
  sel.innerHTML = opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
  if (val != null) sel.value = val;
}

function rankHtml(r) {
  if (r >= 1 && r <= 3) return `<span class="rank rank--${r}">${r}</span>`;
  return `<span class="rank">${r ?? "—"}</span>`;
}

function stHtml(s) {
  const c = s === "OK" ? "ok" : s === "DQ" ? "dq" : "dns";
  return `<span class="st st--${c}">${esc(s)}</span>`;
}

function podCls(r) { return r >= 1 && r <= 3 ? `podium-${r}` : ""; }

// ── Render: View Buttons ───────────────────────────────
function renderViewButtons(distances) {
  if (!el.viewButtons) return;
  el.viewButtons.innerHTML = "";

  distances.forEach(d => {
    const b = document.createElement("button");
    b.className = "view-btn";
    b.innerHTML = `<span class="view-btn__icon">${ICON.timer}</span>${esc(d.label)}`;
    b.onclick = () => { state.selectedView = "distance"; state.selectedDistanceKey = d.key; render(); };
    if (state.selectedView === "distance" && state.selectedDistanceKey === d.key) b.classList.add("active");
    el.viewButtons.appendChild(b);
  });

  const k = document.createElement("button");
  k.className = "view-btn";
  k.innerHTML = `<span class="view-btn__icon">${ICON.trophy}</span>Klassement`;
  k.onclick = () => { state.selectedView = "klassement"; state.selectedDistanceKey = null; render(); };
  if (state.selectedView === "klassement") k.classList.add("active");
  el.viewButtons.appendChild(k);

  const h = document.createElement("button");
  h.className = "view-btn";
  h.innerHTML = `<span class="view-btn__icon">${ICON.versus}</span>Head-to-Head`;
  h.onclick = () => { state.selectedView = "headToHead"; render(); };
  if (state.selectedView === "headToHead") h.classList.add("active");
  el.viewButtons.appendChild(h);
}

// ── Render: H2H Form ──────────────────────────────────
function renderH2HForm(cfg, standings) {
  const ath = standings.all.map(a => ({ value:a.athleteId, label:`${a.name}${a.rank ? ` (#${a.rank})` : ""}` }));
  const dis = cfg.distances.map(d => ({ value:d.key, label:d.label }));

  if (!state.h2h.riderAId) state.h2h.riderAId = ath[0]?.value ?? null;
  if (!state.h2h.riderBId) state.h2h.riderBId = ath[1]?.value ?? ath[0]?.value ?? null;
  if (!state.h2h.focusDistanceKey) state.h2h.focusDistanceKey = dis[0]?.value ?? null;

  fillSelect(el.h2hRiderA, ath, state.h2h.riderAId);
  fillSelect(el.h2hRiderB, ath, state.h2h.riderBId);
  fillSelect(el.h2hTargetRider, ath, state.h2h.targetRiderId ?? ath[0]?.value ?? null);
  fillSelect(el.h2hFocusDistance, dis, state.h2h.focusDistanceKey);

  const isRank = state.h2h.targetMode === "rank";
  el.h2hTargetRankWrap?.classList.toggle("hidden", !isRank);
  el.h2hTargetRiderWrap?.classList.toggle("hidden", isRank);
  if (el.h2hTargetMode) el.h2hTargetMode.value = state.h2h.targetMode;
  if (el.h2hTargetRank) el.h2hTargetRank.value = String(state.h2h.targetRank || 1);
}

// ── Render: Meta ───────────────────────────────────────
function renderMeta(cfg) {
  const m = MODULE_CONFIG[state.selectedModule].label;
  const g = cfg.label;
  const d = cfg.distances.map(x => x.label).join("  ·  ");
  if (el.viewMeta) el.viewMeta.textContent = `${m} — ${g} — ${d}`;
}

// ── Render: Distance View ──────────────────────────────
function renderDistanceView(dist, standings) {
  const rows = standings.all
    .map(a => ({ name:a.name, time:a.times?.[dist.key]??"—", sec:a.seconds?.[dist.key]??null, pts:a.points?.[dist.key]??null, st:a.status?.[dist.key]??"—" }))
    .sort((a,b) => { if ((a.st==="OK")!==(b.st==="OK")) return a.st==="OK"?-1:1; if (!Number.isFinite(a.sec)||!Number.isFinite(b.sec)) return 0; return a.sec-b.sec; });

  const fast = rows[0]?.sec ?? null;
  rows.forEach(r => r.delta = Number.isFinite(r.sec) && Number.isFinite(fast) ? r.sec - fast : null);

  el.viewTitle.textContent = dist.label;
  el.contentArea.className = "stage__body stage__body--enter";
  el.contentArea.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>#</th><th>Naam</th><th>Tijd</th><th>Delta</th><th>Punten</th><th>Status</th></tr></thead>
        <tbody>${rows.map((r,i) => {
          const rk = i+1;
          return `<tr class="${podCls(rk)}">
            <td>${rankHtml(rk)}</td>
            <td><span class="athlete-name">${esc(r.name)}</span></td>
            <td class="mono">${esc(r.time)}</td>
            <td>${r.delta===0?`<span class="delta delta--leader">Snelst</span>`:Number.isFinite(r.delta)?`<span class="delta">+${r.delta.toFixed(2)}s</span>`:""}</td>
            <td class="mono">${fmtPts(r.pts)}</td>
            <td>${stHtml(r.st)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
}

// ── Render: Klassement View ────────────────────────────
function renderStandingsView(distances, standings) {
  el.viewTitle.textContent = "Klassement";
  el.contentArea.className = "stage__body stage__body--enter";

  const hdr = distances.map(d => `<th>${esc(d.label)}</th>`).join("");
  const body = standings.all.map(a => {
    const cells = distances.map(d => `<td class="mono">${fmtPts(a.points?.[d.key])}</td>`).join("");
    return `<tr class="${podCls(a.rank)}">
      <td>${rankHtml(a.rank)}</td>
      <td><span class="athlete-name">${esc(a.name)}</span></td>
      ${cells}
      <td class="mono mono--bold">${fmtPts(a.totalPoints)}</td>
      <td>${a.delta===0?`<span class="delta delta--leader">Leader</span>`:a.delta?`<span class="delta">${fmtDelta(a.delta)}</span>`:""}</td>
    </tr>`;
  }).join("");

  el.contentArea.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>#</th><th>Naam</th>${hdr}<th>Totaal</th><th>Delta</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="info-box info-box--default">
      <strong>Regel:</strong> punten per afstand = (tijd in sec) ÷ (meters ÷ 500), <strong>afgekapt op 3 decimalen</strong>. Laagste totaal = eerste in het klassement.
    </div>`;
}

// ── Render: Head-to-Head View ──────────────────────────
function renderHeadToHeadView(distances, standings) {
  el.viewTitle.textContent = "Head-to-Head";
  el.contentArea.className = "stage__body stage__body--enter";

  const { h2h } = state;
  const rA = standings.all.find(x => x.athleteId === h2h.riderAId);
  const rB = standings.all.find(x => x.athleteId === h2h.riderBId);

  // Comparison table
  let cmpHtml = "";
  if (rA && rB) {
    const rows = distances.map(d => {
      const pA = rA.points?.[d.key], pB = rB.points?.[d.key];
      const tA = rA.times?.[d.key]??"—", tB = rB.times?.[d.key]??"—";
      let cA="", cB="";
      if (Number.isFinite(pA) && Number.isFinite(pB)) {
        if (pA < pB) { cA="win"; cB="lose"; } else if (pB < pA) { cB="win"; cA="lose"; }
      }
      const diff = (Number.isFinite(pA) && Number.isFinite(pB)) ? truncateDecimals(pA-pB, 3) : null;
      return `<tr>
        <td><strong>${esc(d.label)}</strong></td>
        <td class="mono ${cA}">${esc(tA)}</td><td class="mono ${cA}">${fmtPts(pA)}</td>
        <td class="mono ${cB}">${esc(tB)}</td><td class="mono ${cB}">${fmtPts(pB)}</td>
        <td class="mono">${Number.isFinite(diff)? (diff>0?"+":"")+diff.toFixed(3) : "—"}</td>
      </tr>`;
    }).join("");

    const tA = rA.totalPoints, tB = rB.totalPoints;
    let tcA="", tcB="";
    if (Number.isFinite(tA) && Number.isFinite(tB)) { if (tA<tB){tcA="win";tcB="lose";}else if(tB<tA){tcB="win";tcA="lose";} }
    const tDiff = (Number.isFinite(tA)&&Number.isFinite(tB)) ? truncateDecimals(tA-tB,3) : null;

    cmpHtml = `
    <div class="h2h-section">
      <div class="h2h-section__title">Vergelijking per afstand</div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Afstand</th><th colspan="2">${esc(rA.name)} #${rA.rank??"—"}</th><th colspan="2">${esc(rB.name)} #${rB.rank??"—"}</th><th>Δ (A−B)</th></tr>
            <tr><th></th><th>Tijd</th><th>Pnt</th><th>Tijd</th><th>Pnt</th><th></th></tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td><strong>Totaal</strong></td>
              <td></td><td class="mono mono--bold ${tcA}">${fmtPts(tA)}</td>
              <td></td><td class="mono mono--bold ${tcB}">${fmtPts(tB)}</td>
              <td class="mono mono--bold">${Number.isFinite(tDiff)? (tDiff>0?"+":"")+tDiff.toFixed(3) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  // Target calculation
  const target = getTargetFromStandings(standings, h2h);
  const calc = computeH2H(standings, distances, h2h.riderAId, target, h2h.focusDistanceKey);

  let calcHtml = "";
  if (!calc.ok) {
    calcHtml = `<div class="info-box info-box--error"><strong>Niet beschikbaar:</strong> ${esc(calc.reason)}</div>`;
  } else {
    calcHtml = `
    <div class="h2h-section">
      <div class="h2h-section__title">Target berekening</div>
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-card__label">Target totaal (punten)</div>
          <div class="kpi-card__value">${fmtPts(calc.targetAthlete.totalPoints)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__label">Punten zonder ${esc(calc.focusDist.label)}</div>
          <div class="kpi-card__value">${fmtPts(calc.currentWithout)}</div>
        </div>
        <div class="kpi-card kpi-card--highlight">
          <div class="kpi-card__label">Max. tijd op ${esc(calc.focusDist.label)}</div>
          <div class="kpi-card__value">${fmtTime(calc.maxTime)}</div>
        </div>
      </div>
      <div class="info-box info-box--default">
        <strong>Berekening:</strong> punten worden afgekapt op 3 decimalen met een marge van <code>0.001</code> punt om strikt beter te zijn dan het target.
      </div>
    </div>`;
  }

  el.contentArea.innerHTML = cmpHtml + calcHtml;
}

// ── CSV Export ─────────────────────────────────────────
function exportCSV() {
  const cfg = getActiveConfig();
  const { standings } = state;
  if (!standings?.all?.length) return;

  const hdr = ["Positie","Naam",...cfg.distances.map(d=>`Pnt ${d.label}`),"Totaal","Delta"];
  const rows = standings.all.map(a => [
    a.rank??"",
    a.name,
    ...cfg.distances.map(d => { const p=a.points?.[d.key]; return Number.isFinite(p)?p.toFixed(3):""; }),
    Number.isFinite(a.totalPoints)?a.totalPoints.toFixed(3):"",
    Number.isFinite(a.delta)?`+${a.delta.toFixed(3)}`:""
  ]);

  const csv = [hdr,...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `klassement_${state.selectedModule}_${state.selectedGender}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV geëxporteerd");
}

function showToast(msg) {
  const t = el.toast;
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2500);
}

// ── Event Binding ──────────────────────────────────────
function bindEvents() {
  el.moduleTabs?.addEventListener("click", e => {
    const btn = e.target.closest("button[data-module]");
    if (!btn || btn.dataset.module === state.selectedModule) return;
    state.selectedModule = btn.dataset.module;
    resetViewState();
    loadAndRender();
  });

  el.genderTabs?.addEventListener("click", e => {
    const btn = e.target.closest("button[data-gender]");
    if (!btn || btn.dataset.gender === state.selectedGender) return;
    state.selectedGender = btn.dataset.gender;
    resetViewState();
    loadAndRender();
  });

  el.h2hRiderA?.addEventListener("change", () => { state.h2h.riderAId = el.h2hRiderA.value||null; render(); });
  el.h2hRiderB?.addEventListener("change", () => { state.h2h.riderBId = el.h2hRiderB.value||null; render(); });
  el.h2hTargetMode?.addEventListener("change", () => { state.h2h.targetMode = el.h2hTargetMode.value; render(); });
  el.h2hTargetRank?.addEventListener("input", () => { const v=Number(el.h2hTargetRank.value); state.h2h.targetRank = (Number.isFinite(v)&&v>=1)?Math.floor(v):1; render(); });
  el.h2hTargetRider?.addEventListener("change", () => { state.h2h.targetRiderId = el.h2hTargetRider.value||null; render(); });
  el.h2hFocusDistance?.addEventListener("change", () => { state.h2h.focusDistanceKey = el.h2hFocusDistance.value||null; render(); });
  el.h2hOpen?.addEventListener("click", e => { e.preventDefault(); state.selectedView="headToHead"; render(); });
  el.exportBtn?.addEventListener("click", exportCSV);
}

function resetViewState() {
  state.selectedView = "klassement";
  state.selectedDistanceKey = null;
  state.h2h.riderAId = null;
  state.h2h.riderBId = null;
  state.h2h.focusDistanceKey = getActiveConfig().distances[0]?.key ?? null;
}

// ── Main ───────────────────────────────────────────────
function loadData() {
  state.resultsRaw = makeMockResults(state.selectedModule, state.selectedGender);
  state.standings = computeStandings(state.resultsRaw, getActiveConfig().distances);
}

function render() {
  const cfg = getActiveConfig();
  setActive(el.moduleTabs, "module", state.selectedModule);
  setActive(el.genderTabs, "gender", state.selectedGender);
  renderMeta(cfg);
  renderViewButtons(cfg.distances);
  if (state.selectedView === "distance" && !state.selectedDistanceKey) state.selectedDistanceKey = cfg.distances[0]?.key ?? null;
  renderH2HForm(cfg, state.standings);

  if (state.selectedView === "distance") {
    const d = cfg.distances.find(x => x.key === state.selectedDistanceKey) ?? cfg.distances[0];
    return renderDistanceView(d, state.standings);
  }
  if (state.selectedView === "headToHead") return renderHeadToHeadView(cfg.distances, state.standings);
  return renderStandingsView(cfg.distances, state.standings);
}

function loadAndRender() { loadData(); render(); }

function boot() {
  cacheEls();
  bindEvents();
  loadAndRender();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
