/* ═══════════════════════════════════════════════════════
   NK Sprint & NK Allround | Klassement Tool
   ─────────────────────────────────────────────────────
   - Puntberekening: seconden per 500m, 3 decimalen AFKAPPEN
   - Head-to-Head: benodigde tijd om boven target te komen
   - CSV-export
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
  selectedView: "klassement",    // "distance" | "klassement" | "headToHead"
  selectedDistanceKey: null,
  resultsRaw: null,
  standings: null,
  h2h: {
    riderAId: null,
    riderBId: null,
    targetMode: "rank",          // "rank" | "rider"
    targetRank: 1,
    targetRiderId: null,
    focusDistanceKey: null,
  },
};

// ── Utility: Parsing & Formatting ──────────────────────

/**
 * Parse a time string like "1:09.86" or "34.72" or "13:25,20" to seconds.
 * Accepts both comma and dot as decimal separator.
 */
function parseTimeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const normalized = timeStr.trim().replace(",", ".");
  if (!normalized) return null;

  const parts = normalized.split(":");
  if (parts.length > 3) return null;

  const nums = parts.map(Number);
  if (!nums.every(Number.isFinite)) return null;

  if (parts.length === 1) return nums[0];
  if (parts.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

/**
 * Truncate to N decimals (NOT round). E.g. truncateDecimals(34.7269, 3) => 34.726
 * Uses string manipulation to avoid floating-point rounding errors.
 */
function truncateDecimals(value, decimals) {
  if (!Number.isFinite(value)) return null;
  // Use string-based truncation to avoid float precision issues
  const str = value.toFixed(decimals + 2); // extra precision
  const dotIdx = str.indexOf(".");
  if (dotIdx === -1) return value;
  const truncated = str.slice(0, dotIdx + decimals + 1);
  return Number(truncated);
}

function formatPoints(p) {
  if (!Number.isFinite(p)) return "—";
  return p.toFixed(3);
}

function formatSecondsToTime(sec) {
  if (!Number.isFinite(sec)) return "—";
  const sign = sec < 0 ? "-" : "";
  const abs = Math.abs(sec);
  const mm = Math.floor(abs / 60);
  const ss = abs - mm * 60;
  const ssStr = ss.toFixed(3).padStart(6, "0");
  return mm > 0 ? `${sign}${mm}:${ssStr}` : `${sign}${ssStr}`;
}

function formatDelta(delta) {
  if (!Number.isFinite(delta)) return "—";
  if (delta === 0) return "";
  return `+${delta.toFixed(3)}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getActiveConfig() {
  return MODULE_CONFIG[state.selectedModule].genders[state.selectedGender];
}

// ── Data: KNSB Stub ────────────────────────────────────
async function fetchKnsbResults() {
  // Future: fetch from KNSB live results page.
  // Expected return format:
  //   { athletes: [ { athleteId, name, times: { [distKey]: "1:09.86" }, status: { [distKey]: "OK"|"DNS"|"DNF"|"DQ" }, meta: { club } } ] }
  return null;
}

// ── Data: Mock Results ─────────────────────────────────
function makeMockResults(moduleKey, genderKey) {
  const cfg = MODULE_CONFIG[moduleKey].genders[genderKey];

  const names = {
    m: ["Rijder A", "Rijder B", "Rijder C", "Rijder D", "Rijder E", "Rijder F", "Rijder G", "Rijder H"],
    v: ["Rijdster A", "Rijdster B", "Rijdster C", "Rijdster D", "Rijdster E", "Rijdster F", "Rijdster G", "Rijdster H"],
  };

  const presets = {
    sprint_m: [
      ["34.72", "1:09.86", "34.81", "1:10.11"],
      ["34.90", "1:10.32", "34.77", "1:10.58"],
      ["35.10", "1:10.20", "35.08", "1:10.40"],
      ["34.65", "1:10.70", "34.92", "1:10.88"],
      ["35.30", "1:11.10", "35.40", "1:11.33"],
      ["35.55", "1:10.95", "35.49", "1:11.22"],
      ["34.98", "1:10.05", "35.01", "1:10.25"],
      ["36.10", "1:12.20", "36.05", "1:12.10"],
    ],
    sprint_v: [
      ["37.88", "1:16.40", "37.92", "1:16.55"],
      ["38.05", "1:16.10", "38.20", "1:16.45"],
      ["38.40", "1:17.05", "38.15", "1:16.88"],
      ["37.70", "1:16.80", "37.85", "1:16.90"],
      ["39.10", "1:18.30", "39.05", "1:18.15"],
      ["38.55", "1:17.45", "38.50", "1:17.32"],
      ["38.20", "1:16.95", "38.30", "1:17.10"],
      ["40.00", "1:19.90", "40.10", "1:20.10"],
    ],
    allround_m: [
      ["35.10", "1:45.80", "6:25.10", "13:25.20"],
      ["35.40", "1:46.10", "6:23.90", "13:32.00"],
      ["35.00", "1:47.30", "6:28.20", "13:40.50"],
      ["35.90", "1:45.40", "6:26.10", "13:29.80"],
      ["36.10", "1:48.00", "6:31.40", "13:55.00"],
      ["35.60", "1:46.50", "6:29.90", "13:44.30"],
      ["35.20", "1:46.80", "6:24.80", "13:33.10"],
      ["37.20", "1:52.00", "6:50.00", "14:30.00"],
    ],
    allround_v: [
      ["38.30", "1:58.60", "4:08.10", "7:11.20"],
      ["38.55", "1:58.20", "4:07.40", "7:09.90"],
      ["38.10", "1:59.80", "4:10.80", "7:14.30"],
      ["39.00", "1:57.90", "4:09.20", "7:13.10"],
      ["39.50", "2:01.40", "4:15.40", "7:20.70"],
      ["38.80", "1:59.10", "4:12.50", "7:17.80"],
      ["38.40", "1:58.90", "4:08.90", "7:12.40"],
      ["41.00", "2:05.00", "4:25.00", "7:35.00"],
    ],
  };

  const rows = presets[`${moduleKey}_${genderKey}`];

  const athletes = names[genderKey].map((name, idx) => {
    const times = {};
    const status = {};
    const row = rows[idx];
    cfg.distances.forEach((dist, i) => {
      times[dist.key] = row[i] ?? null;
      status[dist.key] = times[dist.key] ? "OK" : "DNS";
    });
    return { athleteId: `a${idx + 1}`, name, meta: { club: "—" }, times, status };
  });

  return { athletes };
}

// ── Computation: Points ────────────────────────────────
function computeAthletePoints(athlete, distances) {
  const seconds = {};
  const points = {};
  let total = 0;
  let completedCount = 0;

  for (const dist of distances) {
    const rawTime = athlete.times?.[dist.key];
    const st = athlete.status?.[dist.key] ?? (rawTime ? "OK" : "DNS");

    if (st !== "OK") {
      seconds[dist.key] = null;
      points[dist.key] = null;
      continue;
    }

    const sec = parseTimeToSeconds(rawTime);
    if (!Number.isFinite(sec)) {
      seconds[dist.key] = null;
      points[dist.key] = null;
      continue;
    }

    seconds[dist.key] = sec;
    const p = truncateDecimals(sec / dist.divisor, 3);
    points[dist.key] = p;
    total += p;
    completedCount++;
  }

  const hasAll = completedCount === distances.length;
  total = hasAll ? truncateDecimals(total, 3) : null;

  return { seconds, points, totalPoints: total, hasAll, completedCount };
}

// ── Computation: Standings ─────────────────────────────
function computeStandings(resultsRaw, distances) {
  if (!resultsRaw?.athletes?.length) {
    return { all: [], full: [], partial: [] };
  }

  const computed = resultsRaw.athletes.map(a => {
    const c = computeAthletePoints(a, distances);
    return { ...a, ...c };
  });

  const full = computed
    .filter(x => x.totalPoints !== null)
    .sort((a, b) => a.totalPoints - b.totalPoints);

  const partial = computed
    .filter(x => x.totalPoints === null)
    .sort((a, b) => b.completedCount - a.completedCount); // most-complete first

  full.forEach((x, i) => x.rank = i + 1);
  partial.forEach(x => x.rank = null);

  // Compute delta to leader
  const leaderTotal = full[0]?.totalPoints ?? null;
  for (const a of full) {
    a.delta = Number.isFinite(leaderTotal) && Number.isFinite(a.totalPoints)
      ? truncateDecimals(a.totalPoints - leaderTotal, 3)
      : null;
  }
  for (const a of partial) {
    a.delta = null;
  }

  return { all: [...full, ...partial], full, partial };
}

// ── Computation: Head-to-Head ──────────────────────────
function getTargetFromStandings(standings, h2h) {
  if (!standings?.full?.length) return null;
  if (h2h.targetMode === "rider") {
    return standings.full.find(x => x.athleteId === h2h.targetRiderId) ?? null;
  }
  const idx = Math.max(1, Number(h2h.targetRank || 1)) - 1;
  return standings.full[idx] ?? null;
}

function computeNeededTimeToBeatTarget(standings, distances, athleteId, targetAthlete, focusDistanceKey) {
  const athlete = standings.all.find(x => x.athleteId === athleteId);
  if (!athlete || !targetAthlete) {
    return { ok: false, reason: "Selecteer een rijder en een target." };
  }

  const focusDist = distances.find(d => d.key === focusDistanceKey) ?? distances[0];
  if (!focusDist) {
    return { ok: false, reason: "Geen focusafstand beschikbaar." };
  }

  // Sum all points EXCEPT the focus distance
  let currentWithout = 0;
  for (const dist of distances) {
    if (dist.key === focusDist.key) continue;
    const p = athlete.points?.[dist.key];
    if (!Number.isFinite(p)) {
      return { ok: false, reason: `${athlete.name} mist geldige punten op ${dist.label}.` };
    }
    currentWithout += p;
  }
  currentWithout = truncateDecimals(currentWithout, 3);

  const targetTotal = targetAthlete.totalPoints;
  if (!Number.isFinite(targetTotal)) {
    return { ok: false, reason: "Target heeft geen geldig totaal." };
  }

  // To beat the target: athlete total must be < targetTotal
  // After truncation to 3 decimals, we need: truncated total < targetTotal
  // Safe approach: allowed total = targetTotal - 0.001 (strict beat)
  const allowedTotal = truncateDecimals(targetTotal - 0.001, 3);
  const allowedPointsForFocus = truncateDecimals(allowedTotal - currentWithout, 3);

  if (!Number.isFinite(allowedPointsForFocus) || allowedPointsForFocus <= 0) {
    return { ok: false, reason: "Onmogelijk om boven target te komen met de huidige tussenstand." };
  }

  // Max allowed points → convert back to time
  // points = time / divisor  →  time = points * divisor
  // But since points are truncated, we need to add back the truncation margin:
  // The maximum raw time that still truncates to allowedPointsForFocus is:
  //   (allowedPointsForFocus + 0.000999...) * divisor
  const maxTimeSeconds = (allowedPointsForFocus + 0.000999) * focusDist.divisor;

  return {
    ok: true,
    athlete,
    targetAthlete,
    focusDist,
    currentPointsWithoutFocus: currentWithout,
    allowedTotal,
    allowedPointsForFocus,
    maxTimeSeconds,
  };
}

// ── DOM Elements ───────────────────────────────────────
const el = {};
function cacheElements() {
  const ids = [
    "moduleTabs", "genderTabs", "viewButtons", "viewTitle", "viewMeta",
    "contentArea", "h2hRiderA", "h2hRiderB", "h2hTargetMode",
    "h2hTargetRankWrap", "h2hTargetRank", "h2hTargetRiderWrap",
    "h2hTargetRider", "h2hFocusDistance", "h2hOpen", "exportBtn",
  ];
  for (const id of ids) {
    el[id] = document.getElementById(id);
    if (!el[id]) console.warn(`[Klassement] Missing DOM element: #${id}`);
  }
}

// ── Rendering Helpers ──────────────────────────────────
function renderSegmentedActive(container, dataKey, value) {
  if (!container) return;
  for (const btn of container.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset[dataKey] === value);
  }
}

function renderSelectOptions(selectEl, options, selectedValue) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  }
  if (selectedValue != null) selectEl.value = selectedValue;
}

function renderMeta(cfg) {
  const moduleLabel = MODULE_CONFIG[state.selectedModule].label;
  const genderLabel = cfg.label;
  const distances = cfg.distances.map(d => d.label).join(" · ");
  el.viewMeta.textContent = `${moduleLabel} — ${genderLabel} — ${distances}`;
}

function rankBadgeHtml(rank) {
  if (rank >= 1 && rank <= 3) {
    return `<span class="rank-badge rank-badge--${rank}">${rank}</span>`;
  }
  return `<span style="display:inline-block;width:26px;text-align:center;font-weight:700;font-size:13px;color:var(--muted)">${rank ?? "—"}</span>`;
}

function statusBadgeHtml(status) {
  const cls = status === "OK" ? "status--ok" : "status--dns";
  return `<span class="status ${cls}">${escapeHtml(status)}</span>`;
}

function podiumClass(rank) {
  if (rank >= 1 && rank <= 3) return `podium-${rank}`;
  return "";
}

// ── Render: View Buttons ───────────────────────────────
function renderViewButtons(distances) {
  if (!el.viewButtons) return;
  el.viewButtons.innerHTML = "";

  for (const dist of distances) {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = dist.label;
    b.onclick = () => {
      state.selectedView = "distance";
      state.selectedDistanceKey = dist.key;
      render();
    };
    if (state.selectedView === "distance" && state.selectedDistanceKey === dist.key) {
      b.classList.add("active");
    }
    el.viewButtons.appendChild(b);
  }

  const kBtn = document.createElement("button");
  kBtn.className = "btn";
  kBtn.textContent = "Klassement";
  kBtn.onclick = () => { state.selectedView = "klassement"; state.selectedDistanceKey = null; render(); };
  if (state.selectedView === "klassement") kBtn.classList.add("active");
  el.viewButtons.appendChild(kBtn);

  const hBtn = document.createElement("button");
  hBtn.className = "btn";
  hBtn.textContent = "Head-to-Head";
  hBtn.onclick = () => { state.selectedView = "headToHead"; render(); };
  if (state.selectedView === "headToHead") hBtn.classList.add("active");
  el.viewButtons.appendChild(hBtn);
}

// ── Render: H2H Form ──────────────────────────────────
function renderH2HForm(cfg, standings) {
  const athletes = standings.all.map(a => ({ value: a.athleteId, label: `${a.name}${a.rank ? ` (#${a.rank})` : ""}` }));
  const distances = cfg.distances.map(d => ({ value: d.key, label: d.label }));

  if (!state.h2h.riderAId) state.h2h.riderAId = athletes[0]?.value ?? null;
  if (!state.h2h.riderBId) state.h2h.riderBId = athletes[1]?.value ?? athletes[0]?.value ?? null;
  if (!state.h2h.focusDistanceKey) state.h2h.focusDistanceKey = distances[0]?.value ?? null;

  renderSelectOptions(el.h2hRiderA, athletes, state.h2h.riderAId);
  renderSelectOptions(el.h2hRiderB, athletes, state.h2h.riderBId);
  renderSelectOptions(el.h2hTargetRider, athletes, state.h2h.targetRiderId ?? athletes[0]?.value ?? null);
  renderSelectOptions(el.h2hFocusDistance, distances, state.h2h.focusDistanceKey);

  const isRank = state.h2h.targetMode === "rank";
  el.h2hTargetRankWrap?.classList.toggle("hidden", !isRank);
  el.h2hTargetRiderWrap?.classList.toggle("hidden", isRank);

  if (el.h2hTargetMode) el.h2hTargetMode.value = state.h2h.targetMode;
  if (el.h2hTargetRank) el.h2hTargetRank.value = String(state.h2h.targetRank || 1);
}

// ── Render: Distance View ──────────────────────────────
function renderDistanceView(dist, standings) {
  const rows = standings.all
    .map(a => ({
      name: a.name,
      time: a.times?.[dist.key] ?? "—",
      sec: a.seconds?.[dist.key] ?? null,
      points: a.points?.[dist.key] ?? null,
      status: a.status?.[dist.key] ?? "—",
    }))
    .sort((a, b) => {
      if ((a.status === "OK") !== (b.status === "OK")) return a.status === "OK" ? -1 : 1;
      if (!Number.isFinite(a.sec) || !Number.isFinite(b.sec)) return 0;
      return a.sec - b.sec;
    });

  // Calculate deltas to fastest
  const fastest = rows[0]?.sec ?? null;
  rows.forEach(r => {
    r.delta = Number.isFinite(r.sec) && Number.isFinite(fastest) ? r.sec - fastest : null;
  });

  el.viewTitle.textContent = dist.label;
  el.contentArea.className = "card__body card__body--enter";
  el.contentArea.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Naam</th>
            <th>Tijd</th>
            <th>Delta</th>
            <th>Punten</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => {
            const rank = i + 1;
            return `
              <tr class="${podiumClass(rank)}">
                <td>${rankBadgeHtml(rank)}</td>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td class="num">${escapeHtml(r.time)}</td>
                <td class="delta ${r.delta === 0 ? 'delta--leader' : ''}">${r.delta === 0 ? "—" : (Number.isFinite(r.delta) ? `+${r.delta.toFixed(2)}` : "—")}</td>
                <td class="num">${Number.isFinite(r.points) ? formatPoints(r.points) : "—"}</td>
                <td>${statusBadgeHtml(r.status)}</td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ── Render: Klassement View ────────────────────────────
function renderStandingsView(distances, standings) {
  el.viewTitle.textContent = "Klassement";
  el.contentArea.className = "card__body card__body--enter";

  const headers = distances.map(d => `<th>${escapeHtml(d.label)}</th>`).join("");
  const body = standings.all.map(a => {
    const cells = distances.map(d => {
      const p = a.points?.[d.key];
      return `<td class="num">${Number.isFinite(p) ? formatPoints(p) : "—"}</td>`;
    }).join("");

    const total = a.totalPoints;
    const rank = a.rank;

    return `
      <tr class="${podiumClass(rank)}">
        <td>${rankBadgeHtml(rank)}</td>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        ${cells}
        <td class="num num--total">${Number.isFinite(total) ? formatPoints(total) : "—"}</td>
        <td class="delta ${a.delta === 0 ? 'delta--leader' : ''}">${a.delta === 0 ? "—" : formatDelta(a.delta)}</td>
      </tr>`;
  }).join("");

  el.contentArea.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Naam</th>
            ${headers}
            <th>Totaal</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="note">
      <strong>Regel:</strong> punten per afstand = (tijd in sec) ÷ (meters ÷ 500), <strong>afgekapt op 3 decimalen</strong>.
      Laagste totaalscore = eerste in het klassement.
    </div>
  `;
}

// ── Render: Head-to-Head View ──────────────────────────
function renderHeadToHeadView(distances, standings) {
  el.viewTitle.textContent = "Head-to-Head";
  el.contentArea.className = "card__body card__body--enter";

  const { h2h } = state;
  const riderA = standings.all.find(x => x.athleteId === h2h.riderAId);
  const riderB = standings.all.find(x => x.athleteId === h2h.riderBId);

  // Build comparison table
  let comparisonHtml = "";
  if (riderA && riderB) {
    const compRows = distances.map(d => {
      const pA = riderA.points?.[d.key];
      const pB = riderB.points?.[d.key];
      const tA = riderA.times?.[d.key] ?? "—";
      const tB = riderB.times?.[d.key] ?? "—";

      let clsA = "", clsB = "";
      if (Number.isFinite(pA) && Number.isFinite(pB)) {
        if (pA < pB) { clsA = "better"; clsB = "worse"; }
        else if (pB < pA) { clsB = "better"; clsA = "worse"; }
      }

      return `
        <tr>
          <td><strong>${escapeHtml(d.label)}</strong></td>
          <td class="num ${clsA}">${escapeHtml(tA)}</td>
          <td class="num ${clsA}">${Number.isFinite(pA) ? formatPoints(pA) : "—"}</td>
          <td class="num ${clsB}">${escapeHtml(tB)}</td>
          <td class="num ${clsB}">${Number.isFinite(pB) ? formatPoints(pB) : "—"}</td>
          <td class="num">${Number.isFinite(pA) && Number.isFinite(pB) ? formatPoints(truncateDecimals(pA - pB, 3)) : "—"}</td>
        </tr>`;
    }).join("");

    const totA = riderA.totalPoints;
    const totB = riderB.totalPoints;
    let totClsA = "", totClsB = "";
    if (Number.isFinite(totA) && Number.isFinite(totB)) {
      if (totA < totB) { totClsA = "better"; totClsB = "worse"; }
      else if (totB < totA) { totClsB = "better"; totClsA = "worse"; }
    }

    comparisonHtml = `
      <div class="h2h-compare">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Afstand</th>
                <th colspan="2">${escapeHtml(riderA.name)} (#${riderA.rank ?? "—"})</th>
                <th colspan="2">${escapeHtml(riderB.name)} (#${riderB.rank ?? "—"})</th>
                <th>Verschil</th>
              </tr>
              <tr>
                <th></th>
                <th>Tijd</th>
                <th>Pnt</th>
                <th>Tijd</th>
                <th>Pnt</th>
                <th>A − B</th>
              </tr>
            </thead>
            <tbody>
              ${compRows}
              <tr style="font-weight:700;border-top:2px solid var(--border)">
                <td><strong>Totaal</strong></td>
                <td></td>
                <td class="num num--total ${totClsA}">${Number.isFinite(totA) ? formatPoints(totA) : "—"}</td>
                <td></td>
                <td class="num num--total ${totClsB}">${Number.isFinite(totB) ? formatPoints(totB) : "—"}</td>
                <td class="num num--total">${Number.isFinite(totA) && Number.isFinite(totB) ? formatPoints(truncateDecimals(totA - totB, 3)) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // Target calculation
  const target = getTargetFromStandings(standings, h2h);
  const calc = computeNeededTimeToBeatTarget(standings, distances, h2h.riderAId, target, h2h.focusDistanceKey);

  let summaryHtml = "";
  if (!calc.ok) {
    summaryHtml = `<div class="note note--error"><strong>Niet beschikbaar:</strong> ${escapeHtml(calc.reason)}</div>`;
  } else {
    summaryHtml = `
      <div class="kpi">
        <div class="box">
          <div class="label">Target totaal</div>
          <div class="value">${formatPoints(calc.targetAthlete.totalPoints)}</div>
        </div>
        <div class="box">
          <div class="label">Punten zonder ${escapeHtml(calc.focusDist.label)}</div>
          <div class="value">${formatPoints(calc.currentPointsWithoutFocus)}</div>
        </div>
        <div class="box box--highlight">
          <div class="label">Max. tijd op ${escapeHtml(calc.focusDist.label)}</div>
          <div class="value">${formatSecondsToTime(calc.maxTimeSeconds)}</div>
        </div>
      </div>
      <div class="note">
        <strong>Berekening:</strong> punten worden afgekapt op 3 decimalen. Er wordt een marge van
        <code>0.001</code> punt gehanteerd om "strikt beter" te zijn dan het target.
      </div>`;
  }

  el.contentArea.innerHTML = `${comparisonHtml}${summaryHtml}`;
}

// ── CSV Export ─────────────────────────────────────────
function exportCSV() {
  const cfg = getActiveConfig();
  const { standings } = state;
  if (!standings?.all?.length) return;

  const moduleLabel = MODULE_CONFIG[state.selectedModule].label;
  const genderLabel = cfg.label;

  const headers = ["Positie", "Naam", ...cfg.distances.map(d => `Pnt ${d.label}`), "Totaal", "Delta"];
  const rows = standings.all.map(a => {
    const cells = cfg.distances.map(d => {
      const p = a.points?.[d.key];
      return Number.isFinite(p) ? p.toFixed(3) : "";
    });
    return [
      a.rank ?? "",
      a.name,
      ...cells,
      Number.isFinite(a.totalPoints) ? a.totalPoints.toFixed(3) : "",
      Number.isFinite(a.delta) ? `+${a.delta.toFixed(3)}` : "",
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const bom = "\uFEFF"; // BOM for Excel UTF-8 compatibility
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `klassement_${state.selectedModule}_${state.selectedGender}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast("CSV geëxporteerd!");
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

// ── Events ─────────────────────────────────────────────
function bindHeaderEvents() {
  el.moduleTabs?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-module]");
    if (!btn || btn.dataset.module === state.selectedModule) return;

    state.selectedModule = btn.dataset.module;
    state.selectedView = "klassement";
    state.selectedDistanceKey = null;
    state.h2h.focusDistanceKey = getActiveConfig().distances[0]?.key ?? null;
    state.h2h.riderAId = null;
    state.h2h.riderBId = null;

    loadDataAndCompute();
    render();
  });

  el.genderTabs?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-gender]");
    if (!btn || btn.dataset.gender === state.selectedGender) return;

    state.selectedGender = btn.dataset.gender;
    state.selectedView = "klassement";
    state.selectedDistanceKey = null;
    state.h2h.focusDistanceKey = getActiveConfig().distances[0]?.key ?? null;
    state.h2h.riderAId = null;
    state.h2h.riderBId = null;

    loadDataAndCompute();
    render();
  });
}

function bindH2HEvents() {
  el.h2hRiderA?.addEventListener("change", () => { state.h2h.riderAId = el.h2hRiderA.value || null; render(); });
  el.h2hRiderB?.addEventListener("change", () => { state.h2h.riderBId = el.h2hRiderB.value || null; render(); });
  el.h2hTargetMode?.addEventListener("change", () => { state.h2h.targetMode = el.h2hTargetMode.value; render(); });
  el.h2hTargetRank?.addEventListener("input", () => {
    const v = Number(el.h2hTargetRank.value);
    state.h2h.targetRank = Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
    render();
  });
  el.h2hTargetRider?.addEventListener("change", () => { state.h2h.targetRiderId = el.h2hTargetRider.value || null; render(); });
  el.h2hFocusDistance?.addEventListener("change", () => { state.h2h.focusDistanceKey = el.h2hFocusDistance.value || null; render(); });
  el.h2hOpen?.addEventListener("click", (e) => { e.preventDefault(); state.selectedView = "headToHead"; render(); });
}

function bindExportEvent() {
  el.exportBtn?.addEventListener("click", exportCSV);
}

// ── Main Render & Boot ─────────────────────────────────
function loadDataAndCompute() {
  state.resultsRaw = makeMockResults(state.selectedModule, state.selectedGender);
  const cfg = getActiveConfig();
  state.standings = computeStandings(state.resultsRaw, cfg.distances);
}

function render() {
  const cfg = getActiveConfig();

  renderSegmentedActive(el.moduleTabs, "module", state.selectedModule);
  renderSegmentedActive(el.genderTabs, "gender", state.selectedGender);
  renderMeta(cfg);
  renderViewButtons(cfg.distances);

  if (state.selectedView === "distance" && !state.selectedDistanceKey) {
    state.selectedDistanceKey = cfg.distances[0]?.key ?? null;
  }

  renderH2HForm(cfg, state.standings);

  if (state.selectedView === "distance") {
    const dist = cfg.distances.find(d => d.key === state.selectedDistanceKey) ?? cfg.distances[0];
    return renderDistanceView(dist, state.standings);
  }
  if (state.selectedView === "headToHead") {
    return renderHeadToHeadView(cfg.distances, state.standings);
  }
  return renderStandingsView(cfg.distances, state.standings);
}

function boot() {
  cacheElements();
  bindHeaderEvents();
  bindH2HEvents();
  bindExportEvent();
  loadDataAndCompute();
  render();
}

// Wait for DOM if needed
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
