/* NK Sprint & NK Allround | Klassement Tool (Stramien)
 * - Mockdata
 * - Puntberekening: seconden per 500m, 3 decimalen, afkappen (niet afronden)
 * - Head-to-head: benodigde tijd om boven target te komen (met 0,001 punt marge)
 */

const MODULE_CONFIG = {
  sprint: {
    label: "NK Sprint",
    genders: {
      m: {
        label: "Mannen",
        distances: [
          { key: "d1_500", meters: 500, label: "1e 500m", divisor: 1 },
          { key: "d1_1000", meters: 1000, label: "1e 1000m", divisor: 2 },
          { key: "d2_500", meters: 500, label: "2e 500m", divisor: 1 },
          { key: "d2_1000", meters: 1000, label: "2e 1000m", divisor: 2 },
        ],
      },
      v: {
        label: "Vrouwen",
        distances: [
          { key: "d1_500", meters: 500, label: "1e 500m", divisor: 1 },
          { key: "d1_1000", meters: 1000, label: "1e 1000m", divisor: 2 },
          { key: "d2_500", meters: 500, label: "2e 500m", divisor: 1 },
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
          { key: "d1_500", meters: 500, label: "500m", divisor: 1 },
          { key: "d1_1500", meters: 1500, label: "1500m", divisor: 3 },
          { key: "d1_5000", meters: 5000, label: "5000m", divisor: 10 },
          { key: "d1_10000", meters: 10000, label: "10000m", divisor: 20 },
        ],
      },
      v: {
        label: "Vrouwen",
        distances: [
          { key: "d1_500", meters: 500, label: "500m", divisor: 1 },
          { key: "d1_1500", meters: 1500, label: "1500m", divisor: 3 },
          { key: "d1_3000", meters: 3000, label: "3000m", divisor: 6 },
          { key: "d1_5000", meters: 5000, label: "5000m", divisor: 10 },
        ],
      },
    },
  },
};

const state = {
  selectedModule: "sprint",
  selectedGender: "m",
  selectedView: "klassement", // "distance" | "klassement" | "headToHead"
  selectedDistanceKey: null,
  resultsRaw: null,
  standings: null,
  h2h: {
    riderAId: null,
    riderBId: null,
    targetMode: "rank", // "rank" | "rider"
    targetRank: 1,
    targetRiderId: null,
    focusDistanceKey: null,
  },
};

function parseTimeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const s = timeStr.trim();
  if (!s) return null;
  const normalized = s.replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length === 1) {
    const v = Number(parts[0]);
    return Number.isFinite(v) ? v : null;
  }
  if (parts.length === 2) {
    const mm = Number(parts[0]);
    const ss = Number(parts[1]);
    if (!Number.isFinite(mm) || !Number.isFinite(ss)) return null;
    return mm * 60 + ss;
  }
  if (parts.length === 3) {
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    const ss = Number(parts[2]);
    if (![hh, mm, ss].every(Number.isFinite)) return null;
    return hh * 3600 + mm * 60 + ss;
  }
  return null;
}

function truncateDecimals(value, decimals) {
  if (!Number.isFinite(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.trunc(value * factor) / factor;
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

function getActiveConfig() {
  return MODULE_CONFIG[state.selectedModule].genders[state.selectedGender];
}

// Future: fetch from KNSB when live.
async function fetchKnsbResults() {
  return null;
}

function makeMockResults(moduleKey, genderKey) {
  const cfg = MODULE_CONFIG[moduleKey].genders[genderKey];

  const athletes = [
    { athleteId: "a1", name: genderKey === "m" ? "Rijder A" : "Rijdster A" },
    { athleteId: "a2", name: genderKey === "m" ? "Rijder B" : "Rijdster B" },
    { athleteId: "a3", name: genderKey === "m" ? "Rijder C" : "Rijdster C" },
    { athleteId: "a4", name: genderKey === "m" ? "Rijder D" : "Rijdster D" },
    { athleteId: "a5", name: genderKey === "m" ? "Rijder E" : "Rijdster E" },
    { athleteId: "a6", name: genderKey === "m" ? "Rijder F" : "Rijdster F" },
    { athleteId: "a7", name: genderKey === "m" ? "Rijder G" : "Rijdster G" },
    { athleteId: "a8", name: genderKey === "m" ? "Rijder H" : "Rijdster H" },
  ];

  const presets = {
    sprint_m: [
      ["34.72","1:09.86","34.81","1:10.11"],
      ["34.90","1:10.32","34.77","1:10.58"],
      ["35.10","1:10.20","35.08","1:10.40"],
      ["34.65","1:10.70","34.92","1:10.88"],
      ["35.30","1:11.10","35.40","1:11.33"],
      ["35.55","1:10.95","35.49","1:11.22"],
      ["34.98","1:10.05","35.01","1:10.25"],
      ["36.10","1:12.20","36.05","1:12.10"],
    ],
    sprint_v: [
      ["37.88","1:16.40","37.92","1:16.55"],
      ["38.05","1:16.10","38.20","1:16.45"],
      ["38.40","1:17.05","38.15","1:16.88"],
      ["37.70","1:16.80","37.85","1:16.90"],
      ["39.10","1:18.30","39.05","1:18.15"],
      ["38.55","1:17.45","38.50","1:17.32"],
      ["38.20","1:16.95","38.30","1:17.10"],
      ["40.00","1:19.90","40.10","1:20.10"],
    ],
    allround_m: [
      ["35.10","1:45.80","6:25.10","13:25.20"],
      ["35.40","1:46.10","6:23.90","13:32.00"],
      ["35.00","1:47.30","6:28.20","13:40.50"],
      ["35.90","1:45.40","6:26.10","13:29.80"],
      ["36.10","1:48.00","6:31.40","13:55.00"],
      ["35.60","1:46.50","6:29.90","13:44.30"],
      ["35.20","1:46.80","6:24.80","13:33.10"],
      ["37.20","1:52.00","6:50.00","14:30.00"],
    ],
    allround_v: [
      ["38.30","1:58.60","4:08.10","7:11.20"],
      ["38.55","1:58.20","4:07.40","7:09.90"],
      ["38.10","1:59.80","4:10.80","7:14.30"],
      ["39.00","1:57.90","4:09.20","7:13.10"],
      ["39.50","2:01.40","4:15.40","7:20.70"],
      ["38.80","1:59.10","4:12.50","7:17.80"],
      ["38.40","1:58.90","4:08.90","7:12.40"],
      ["41.00","2:05.00","4:25.00","7:35.00"],
    ],
  };

  const rows = presets[`${moduleKey}_${genderKey}`];

  const athletesWithTimes = athletes.map((a, idx) => {
    const times = {};
    const status = {};
    const row = rows[idx];
    cfg.distances.forEach((dist, i) => {
      times[dist.key] = row[i] ?? null;
      status[dist.key] = times[dist.key] ? "OK" : "DNS";
    });
    return { ...a, meta: { club: "—" }, times, status };
  });

  return { athletes: athletesWithTimes };
}

function computeAthletePoints(athlete, distances) {
  const seconds = {};
  const points = {};
  let total = 0;
  let hasAll = true;

  for (const dist of distances) {
    const t = athlete.times?.[dist.key];
    const st = athlete.status?.[dist.key] ?? (t ? "OK" : "DNS");
    if (st !== "OK") {
      seconds[dist.key] = null;
      points[dist.key] = null;
      hasAll = false;
      continue;
    }
    const sec = parseTimeToSeconds(t);
    if (!Number.isFinite(sec)) {
      seconds[dist.key] = null;
      points[dist.key] = null;
      hasAll = false;
      continue;
    }
    seconds[dist.key] = sec;

    const raw = sec / dist.divisor;
    const p = truncateDecimals(raw, 3); // <- afkappen
    points[dist.key] = p;
    total += p;
  }

  total = truncateDecimals(total, 3);
  return { seconds, points, totalPoints: hasAll ? total : null, hasAll };
}

function computeStandings(resultsRaw, distances) {
  const computed = resultsRaw.athletes.map(a => {
    const c = computeAthletePoints(a, distances);
    return { ...a, ...c };
  });

  const full = computed.filter(x => x.totalPoints !== null).sort((a,b) => a.totalPoints - b.totalPoints);
  const partial = computed.filter(x => x.totalPoints === null);

  full.forEach((x, i) => x.rank = i + 1);
  partial.forEach((x, i) => x.rank = full.length + i + 1);

  return { all: [...full, ...partial], full, partial };
}

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
  if (!athlete || !targetAthlete) return { ok:false, reason:"Selecteer rijder + target." };

  const focusDist = distances.find(d => d.key === focusDistanceKey) ?? distances[0];
  if (!focusDist) return { ok:false, reason:"Geen focusafstand." };

  let current = 0;
  for (const dist of distances) {
    if (dist.key === focusDist.key) continue;
    const p = athlete.points?.[dist.key];
    if (!Number.isFinite(p)) return { ok:false, reason:`Rijder mist geldige punten op ${dist.label}.` };
    current += p;
  }
  current = truncateDecimals(current, 3);

  const targetTotal = targetAthlete.totalPoints;
  if (!Number.isFinite(targetTotal)) return { ok:false, reason:"Target heeft geen geldig totaal." };

  const allowedTotal = truncateDecimals(targetTotal - 0.001, 3);
  const allowedPointsForFocus = allowedTotal - current;

  if (!Number.isFinite(allowedPointsForFocus) || allowedPointsForFocus <= 0) {
    return { ok:false, reason:"Onmogelijk om erboven te komen met huidige tussenstand." };
  }

  const rawMax = allowedPointsForFocus + 0.000999;
  const maxTimeSeconds = rawMax * focusDist.divisor;

  return { ok:true, athlete, targetAthlete, focusDist, currentPointsWithoutFocus: current, allowedTotal, maxTimeSeconds };
}

const el = {
  moduleTabs: document.getElementById("moduleTabs"),
  genderTabs: document.getElementById("genderTabs"),
  viewButtons: document.getElementById("viewButtons"),
  viewTitle: document.getElementById("viewTitle"),
  viewMeta: document.getElementById("viewMeta"),
  contentArea: document.getElementById("contentArea"),

  h2hRiderA: document.getElementById("h2hRiderA"),
  h2hRiderB: document.getElementById("h2hRiderB"),
  h2hTargetMode: document.getElementById("h2hTargetMode"),
  h2hTargetRankWrap: document.getElementById("h2hTargetRankWrap"),
  h2hTargetRank: document.getElementById("h2hTargetRank"),
  h2hTargetRiderWrap: document.getElementById("h2hTargetRiderWrap"),
  h2hTargetRider: document.getElementById("h2hTargetRider"),
  h2hFocusDistance: document.getElementById("h2hFocusDistance"),
  h2hOpen: document.getElementById("h2hOpen"),
};

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderSegmentedActive(container, key, value) {
  [...container.querySelectorAll("button")].forEach(btn => {
    const v = btn.dataset[key];
    btn.classList.toggle("active", v === value);
  });
}

function renderMeta(cfg) {
  const moduleLabel = MODULE_CONFIG[state.selectedModule].label;
  const genderLabel = cfg.label;
  const distances = cfg.distances.map(d => d.label).join(" • ");
  el.viewMeta.textContent = `${moduleLabel} • ${genderLabel} • ${distances}`;
}

function renderViewButtons(distances) {
  el.viewButtons.innerHTML = "";

  distances.forEach(dist => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = dist.label;
    b.onclick = () => {
      state.selectedView = "distance";
      state.selectedDistanceKey = dist.key;
      render();
    };
    if (state.selectedView === "distance" && state.selectedDistanceKey === dist.key) b.classList.add("active");
    el.viewButtons.appendChild(b);
  });

  const k = document.createElement("button");
  k.className = "btn";
  k.textContent = "Klassement";
  k.onclick = () => {
    state.selectedView = "klassement";
    state.selectedDistanceKey = null;
    render();
  };
  if (state.selectedView === "klassement") k.classList.add("active");
  el.viewButtons.appendChild(k);

  const h = document.createElement("button");
  h.className = "btn";
  h.textContent = "Head-to-Head";
  h.onclick = () => {
    state.selectedView = "headToHead";
    render();
  };
  if (state.selectedView === "headToHead") h.classList.add("active");
  el.viewButtons.appendChild(h);
}

function renderSelectOptions(selectEl, options, selectedValue) {
  selectEl.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  }
  if (selectedValue != null) selectEl.value = selectedValue;
}

function renderH2HForm(cfg, standings) {
  const athletes = standings.all.map(a => ({ value: a.athleteId, label: a.name }));
  const distances = cfg.distances.map(d => ({ value: d.key, label: d.label }));

  if (!state.h2h.riderAId) state.h2h.riderAId = athletes[0]?.value ?? null;
  if (!state.h2h.riderBId) state.h2h.riderBId = athletes[1]?.value ?? athletes[0]?.value ?? null;
  if (!state.h2h.focusDistanceKey) state.h2h.focusDistanceKey = distances[0]?.value ?? null;

  renderSelectOptions(el.h2hRiderA, athletes, state.h2h.riderAId);
  renderSelectOptions(el.h2hRiderB, athletes, state.h2h.riderBId);
  renderSelectOptions(el.h2hTargetRider, athletes, state.h2h.targetRiderId ?? athletes[0]?.value ?? null);
  renderSelectOptions(el.h2hFocusDistance, distances, state.h2h.focusDistanceKey);

  const isRank = state.h2h.targetMode === "rank";
  el.h2hTargetRankWrap.classList.toggle("hidden", !isRank);
  el.h2hTargetRiderWrap.classList.toggle("hidden", isRank);

  el.h2hTargetMode.value = state.h2h.targetMode;
  el.h2hTargetRank.value = String(state.h2h.targetRank || 1);
}

function renderDistanceView(dist, standings) {
  const rows = standings.all
    .map(a => {
      const sec = a.seconds?.[dist.key];
      const time = a.times?.[dist.key] ?? "—";
      const p = a.points?.[dist.key];
      return { name: a.name, time, sec, points: p, status: a.status?.[dist.key] ?? "—" };
    })
    .sort((a,b) => {
      const ao = a.status === "OK";
      const bo = b.status === "OK";
      if (ao !== bo) return ao ? -1 : 1;
      if (!Number.isFinite(a.sec) || !Number.isFinite(b.sec)) return 0;
      return a.sec - b.sec;
    });

  el.viewTitle.textContent = dist.label;
  el.contentArea.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Naam</th>
          <th>Tijd</th>
          <th>Punten</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r,i)=>`
          <tr>
            <td>${i+1}</td>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td>${escapeHtml(r.time)}</td>
            <td>${Number.isFinite(r.points) ? formatPoints(r.points) : "—"}</td>
            <td>${escapeHtml(r.status)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderStandingsView(distances, standings) {
  el.viewTitle.textContent = "Klassement";

  const headers = distances.map(d => `<th>${escapeHtml(d.label)}</th>`).join("");
  const body = standings.all.map(a => {
    const cells = distances.map(d => {
      const p = a.points?.[d.key];
      return `<td>${Number.isFinite(p) ? formatPoints(p) : "—"}</td>`;
    }).join("");

    const total = a.totalPoints;
    return `
      <tr>
        <td>${a.rank ?? "—"}</td>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        ${cells}
        <td><strong>${Number.isFinite(total) ? formatPoints(total) : "—"}</strong></td>
      </tr>
    `;
  }).join("");

  el.contentArea.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Naam</th>
          ${headers}
          <th>Totaal</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="note">
      <strong>Regel:</strong> punten per afstand = (tijd in seconden) / (meters/500), met <strong>3 decimalen afkappen</strong>.
      De laagste totaalscore leidt het klassement.
    </div>
  `;
}

function renderHeadToHeadView(distances, standings) {
  el.viewTitle.textContent = "Head-to-Head";

  const h2h = state.h2h;
  const target = getTargetFromStandings(standings, h2h);

  const calc = computeNeededTimeToBeatTarget(standings, distances, h2h.riderAId, target, h2h.focusDistanceKey);

  let summaryHtml = "";
  if (!calc.ok) {
    summaryHtml = `<div class="note"><strong>Niet klaar:</strong> ${escapeHtml(calc.reason)}</div>`;
  } else {
    summaryHtml = `
      <div class="kpi">
        <div class="box">
          <div class="label">Target totaal (punten)</div>
          <div class="value">${formatPoints(calc.targetAthlete.totalPoints)}</div>
        </div>
        <div class="box">
          <div class="label">Jouw punten zonder ${escapeHtml(calc.focusDist.label)}</div>
          <div class="value">${formatPoints(calc.currentPointsWithoutFocus)}</div>
        </div>
        <div class="box">
          <div class="label">Max. tijd op ${escapeHtml(calc.focusDist.label)}</div>
          <div class="value">${formatSecondsToTime(calc.maxTimeSeconds)}</div>
        </div>
      </div>

      <div class="note">
        <strong>Technisch:</strong> afkappen op 3 decimalen + marge van <code>0.001</code> punt om “strikt beter” te zijn.
      </div>
    `;
  }

  const riderA = standings.all.find(x => x.athleteId === h2h.riderAId);
  const riderB = standings.all.find(x => x.athleteId === h2h.riderBId);

  el.contentArea.innerHTML = `
    <div class="note">
      <strong>Vergelijking:</strong>
      ${riderA ? `<strong>${escapeHtml(riderA.name)}</strong> (#${riderA.rank ?? "—"}, ${riderA.totalPoints ? formatPoints(riderA.totalPoints) : "—"} p)` : "—"}
      vs
      ${riderB ? `<strong>${escapeHtml(riderB.name)}</strong> (#${riderB.rank ?? "—"}, ${riderB.totalPoints ? formatPoints(riderB.totalPoints) : "—"} p)` : "—"}
    </div>
    ${summaryHtml}
  `;
}

function bindHeaderEvents() {
  el.moduleTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-module]");
    if (!btn) return;
    const moduleKey = btn.dataset.module;
    if (moduleKey === state.selectedModule) return;
    state.selectedModule = moduleKey;
    state.selectedView = "klassement";
    state.selectedDistanceKey = null;

    const cfg = getActiveConfig();
    state.h2h.focusDistanceKey = cfg.distances[0]?.key ?? null;

    loadDataAndCompute();
    render();
  });

  el.genderTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-gender]");
    if (!btn) return;
    const genderKey = btn.dataset.gender;
    if (genderKey === state.selectedGender) return;
    state.selectedGender = genderKey;
    state.selectedView = "klassement";
    state.selectedDistanceKey = null;

    const cfg = getActiveConfig();
    state.h2h.focusDistanceKey = cfg.distances[0]?.key ?? null;

    loadDataAndCompute();
    render();
  });
}

function bindH2HEvents() {
  el.h2hRiderA.addEventListener("change", () => { state.h2h.riderAId = el.h2hRiderA.value || null; render(); });
  el.h2hRiderB.addEventListener("change", () => { state.h2h.riderBId = el.h2hRiderB.value || null; render(); });
  el.h2hTargetMode.addEventListener("change", () => { state.h2h.targetMode = el.h2hTargetMode.value; render(); });
  el.h2hTargetRank.addEventListener("input", () => { state.h2h.targetRank = Number(el.h2hTargetRank.value || 1); render(); });
  el.h2hTargetRider.addEventListener("change", () => { state.h2h.targetRiderId = el.h2hTargetRider.value || null; render(); });
  el.h2hFocusDistance.addEventListener("change", () => { state.h2h.focusDistanceKey = el.h2hFocusDistance.value || null; render(); });
  el.h2hOpen.addEventListener("click", (e) => { e.preventDefault(); state.selectedView = "headToHead"; render(); });
}

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
  bindHeaderEvents();
  bindH2HEvents();
  loadDataAndCompute();
  render();
}

boot();
