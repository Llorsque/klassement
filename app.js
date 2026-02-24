/* ═══════════════════════════════════════════════════════
   KLASSEMENT — NK Sprint & NK Allround
   ─────────────────────────────────────────────────────
   Puntberekening : seconden per 500m, 3 decimalen AFKAPPEN
   Head-to-Head   : spiegel-vergelijking + target-tijden
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
  selectedDistanceKey: null,   // for distance-view
  nextDistKey: null,           // for klassement delta calculation
  resultsRaw: null,
  standings: null,
  h2h: {
    riderAId: null,
    riderBId: null,
    focusDistanceKey: null,
    targetRiderId: null,
  },
  overzichtFilter: "all", // "all" | "pbs" | "podiums" | distance key
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

function fmtPts(p)  { return Number.isFinite(p) ? p.toFixed(3) : "—"; }

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const mm = Math.floor(sec / 60);
  const ss = sec - mm * 60;
  const ssStr = ss.toFixed(2).padStart(5, "0");
  return mm > 0 ? `${mm}:${ssStr}` : ssStr;
}

function fmtTimePrecise(sec) {
  if (!Number.isFinite(sec)) return "—";
  const sign = sec < 0 ? "-" : "+";
  const abs = Math.abs(sec);
  const mm = Math.floor(abs / 60);
  const ss = abs - mm * 60;
  const ssStr = ss.toFixed(2).padStart(5, "0");
  const t = mm > 0 ? `${mm}:${ssStr}` : ssStr;
  return `${sign}${t}`;
}

function esc(str) {
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function getActiveConfig() {
  return MODULE_CONFIG[state.selectedModule].genders[state.selectedGender];
}

// ── SVG icons ──────────────────────────────────────────
const ICON = {
  timer:  '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="9" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 6.5V9l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 2h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  trophy: '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M5 13h6M8 10v3M4 3h8v2a4 4 0 0 1-8 0V3ZM4 4H2.5a1 1 0 0 0-1 1v.5A2.5 2.5 0 0 0 4 8M12 4h1.5a1 1 0 0 1 1 1v.5A2.5 2.5 0 0 1 12 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  versus: '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M4 12V6M8 12V4M12 12V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  dash:   '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>',
};

// ── Live Data: KNSB URL Mapping ────────────────────────
// Maps each module + gender + distance key to a KNSB live results URL.
// NK Sprint  = event 2026_NED_0003
// NK Allround = event 2026_NED_0004
const LIVE_URLS = {
  sprint: {
    eventId: "2026_NED_0003",
    v: {
      d1_500:  { compId: 1 },
      d1_1000: { compId: 3 },
      d2_500:  { compId: 5 },
      d2_1000: { compId: 7 },
    },
    m: {
      d1_500:  { compId: 2 },
      d1_1000: { compId: 4 },
      d2_500:  { compId: 6 },
      d2_1000: { compId: 8 },
    },
  },
  allround: {
    eventId: "2026_NED_0004",
    v: {
      d1_500:  { compId: 1 },
      d1_3000: { compId: 3 },
      d1_1500: { compId: 5 },
      d1_5000: { compId: 7 },
    },
    m: {
      d1_500:   { compId: 2 },
      d1_5000:  { compId: 4 },
      d1_1500:  { compId: 6 },
      d1_10000: { compId: 8 },
    },
  },
};

const API_BASE = "https://liveresults.schaatsen.nl";

// ── Live Data: State ───────────────────────────────────
let dataSource = "mock"; // "live" | "mock"
let pollTimer = null;
const POLL_INTERVAL = 2_000; // 2 seconds
let lastFetchLog = [];

// ── Live Data: Fetch single competition results ────────
// The KNSB site is a SPA. We try multiple API patterns to find the data.
async function fetchCompetitionResults(eventId, compId) {
  const apiPatterns = [
    `${API_BASE}/api/events/${eventId}/competition/${compId}/results`,
    `${API_BASE}/api/events/${eventId}/competitions/${compId}`,
    `${API_BASE}/api/v1/events/${eventId}/competition/${compId}/results`,
    `${API_BASE}/api/v1/events/${eventId}/competitions/${compId}`,
    `${API_BASE}/events/${eventId}/competition/${compId}/results.json`,
  ];

  for (const url of apiPatterns) {
    try {
      const resp = await fetch(url, {
        headers: { "Accept": "application/json" },
        mode: "cors",
      });
      if (!resp.ok) continue;
      const ct = resp.headers.get("content-type") ?? "";
      if (!ct.includes("json")) continue;
      const data = await resp.json();
      lastFetchLog.push({ eventId, compId, url, status: "ok" });
      return data;
    } catch (_) { /* try next */ }
  }

  // Fallback: try fetching the HTML page itself with Accept: json
  try {
    const htmlUrl = `${API_BASE}/events/${eventId}/competition/${compId}/results`;
    const resp = await fetch(htmlUrl, {
      headers: { "Accept": "application/json, text/html" },
      mode: "cors",
    });
    if (resp.ok) {
      const ct = resp.headers.get("content-type") ?? "";
      if (ct.includes("json")) {
        const data = await resp.json();
        lastFetchLog.push({ compId, url: htmlUrl, status: "ok (html endpoint)" });
        return data;
      }
      // Try to find embedded JSON state in HTML (many SPAs embed initial state)
      const html = await resp.text();
      const stateMatch = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/)
        || html.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});/)
        || html.match(/<script[^>]*>.*?("results"|"competitors")[\s\S]*?<\/script>/);
      if (stateMatch?.[1]) {
        try {
          const data = JSON.parse(stateMatch[1]);
          lastFetchLog.push({ compId, url: htmlUrl, status: "ok (embedded state)" });
          return data;
        } catch (_) {}
      }
    }
  } catch (_) {}

  lastFetchLog.push({ compId, status: "failed" });
  return null;
}

// ── Live Data: Parse KNSB response ─────────────────────
// Attempts to normalize various possible JSON structures into our format.
// Returns array of { name, time, status } or null.
function parseKnsbResponse(data) {
  if (!data) return null;

  // Pattern 1: { results: [ { name/skater, time/result, ... } ] }
  let results = data.results ?? data.Results ?? data.competitors ?? data.Competitors
    ?? data.data?.results ?? data.data?.competitors ?? null;

  // Pattern 2: data is the array itself
  if (Array.isArray(data)) results = data;

  // Pattern 3: wrapped in competition object
  if (!results && data.competition) {
    results = data.competition.results ?? data.competition.competitors;
  }

  if (!Array.isArray(results) || results.length === 0) return null;

  return results.map((r, idx) => {
    // Try various field names
    const name = r.name ?? r.Name ?? r.skaterName ?? r.skater?.name
      ?? r.fullName ?? r.FullName ?? r.displayName ?? `Skater ${idx + 1}`;

    const time = r.time ?? r.Time ?? r.result ?? r.Result ?? r.finishTime
      ?? r.finish ?? r.Finish ?? r.raceTime ?? null;

    const statusRaw = r.status ?? r.Status ?? r.raceStatus ?? "OK";
    let status = "OK";
    if (typeof statusRaw === "string") {
      const s = statusRaw.toUpperCase();
      if (s.includes("DNS")) status = "DNS";
      else if (s.includes("DNF")) status = "DNF";
      else if (s.includes("DQ") || s.includes("DSQ")) status = "DQ";
    }
    if (!time && status === "OK") status = "DNS";

    const skaterId = r.id ?? r.Id ?? r.skaterId ?? r.skater?.id ?? r.participantId ?? `live_${idx}`;

    // PB (personal best / persoonlijk record) detection
    const pb = !!(r.pb ?? r.PB ?? r.personalBest ?? r.PersonalBest
      ?? r.isPB ?? r.isPb ?? r.pr ?? r.PR ?? r.isPersonalRecord
      ?? r.personalRecord ?? r.seasonBest ?? r.SB);

    return { skaterId: String(skaterId), name: String(name), time: time ? String(time) : null, status, pb };
  });
}

// ── Live Data: Fetch all distances for a module+gender ─
async function fetchLiveResults(moduleKey, genderKey) {
  const moduleUrls = LIVE_URLS[moduleKey];
  const eventId = moduleUrls?.eventId;
  const urlMap = moduleUrls?.[genderKey];
  if (!eventId || !urlMap || Object.keys(urlMap).length === 0) return null;

  const cfg = MODULE_CONFIG[moduleKey].genders[genderKey];
  lastFetchLog = [];
  let anySuccess = false;

  // Fetch all competition results in parallel
  const fetches = cfg.distances.map(async (dist) => {
    const entry = urlMap[dist.key];
    if (!entry) return { key: dist.key, results: null };
    const data = await fetchCompetitionResults(eventId, entry.compId);
    const parsed = parseKnsbResponse(data);
    if (parsed) anySuccess = true;
    return { key: dist.key, results: parsed };
  });

  const allResults = await Promise.all(fetches);
  if (!anySuccess) return null;

  // Merge: build athlete map across all distances
  const athleteMap = new Map(); // keyed by name (normalized)
  const normalize = (n) => n.trim().toLowerCase();

  for (const { key, results } of allResults) {
    if (!results) continue;
    for (const r of results) {
      const nk = normalize(r.name);
      if (!athleteMap.has(nk)) {
        athleteMap.set(nk, {
          athleteId: r.skaterId,
          name: r.name,
          meta: { club: "—" },
          times: {},
          status: {},
          pb: {},
        });
      }
      const athlete = athleteMap.get(nk);
      athlete.times[key] = r.time;
      athlete.status[key] = r.status;
      athlete.pb[key] = r.pb || false;
    }
  }

  // Fill missing distances as DNS
  for (const [, ath] of athleteMap) {
    if (!ath.pb) ath.pb = {};
    for (const d of cfg.distances) {
      if (!ath.times[d.key]) ath.times[d.key] = null;
      if (!ath.status[d.key]) ath.status[d.key] = "DNS";
      if (!ath.pb[d.key]) ath.pb[d.key] = false;
    }
  }

  return { athletes: [...athleteMap.values()] };
}

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
  // PB mock: some athletes get PBs on specific distances for demo
  const pbPresets = {
    sprint_m:    [[true,false,false,false],[false,true,false,false],[false,false,true,false],[true,true,false,false],[false,false,false,false],[false,false,false,true],[true,false,true,false],[false,false,false,false]],
    sprint_v:    [[false,true,false,false],[true,false,false,true],[false,false,false,false],[false,false,true,false],[false,false,false,false],[true,false,false,false],[false,true,false,false],[false,false,false,false]],
    allround_m:  [[true,false,false,false],[false,false,true,false],[false,true,false,false],[false,false,false,true],[false,false,false,false],[true,false,false,false],[false,false,true,false],[false,false,false,false]],
    allround_v:  [[false,false,true,false],[true,false,false,false],[false,true,false,false],[false,false,false,false],[false,false,false,false],[false,false,true,false],[true,false,false,true],[false,false,false,false]],
  };
  const pbRows = pbPresets[`${moduleKey}_${genderKey}`];
  return {
    athletes: names[genderKey].map((name, idx) => {
      const times = {}, status = {}, pb = {};
      cfg.distances.forEach((d, i) => {
        times[d.key] = rows[idx][i] ?? null;
        status[d.key] = times[d.key] ? "OK" : "DNS";
        pb[d.key] = pbRows?.[idx]?.[i] ?? false;
      });
      return { athleteId: `a${idx+1}`, name, meta:{ club:"—" }, times, status, pb };
    }),
  };
}

// ── Data Loading ───────────────────────────────────────
async function loadData() {
  const m = state.selectedModule;
  const g = state.selectedGender;

  // Try live first
  const liveData = await fetchLiveResults(m, g);
  if (liveData && liveData.athletes.length > 0) {
    state.resultsRaw = liveData;
    dataSource = "live";
    console.log("[Klassement] Live data loaded", lastFetchLog);
  } else {
    // Fallback to mock
    state.resultsRaw = makeMockResults(m, g);
    dataSource = "mock";
    if (lastFetchLog.length > 0) {
      console.log("[Klassement] Live fetch attempted but failed, using mock data", lastFetchLog);
    }
  }
  state.standings = computeStandings(state.resultsRaw, getActiveConfig().distances);
  updateStatusBadge();
}

function updateStatusBadge() {
  const badge = document.getElementById("dataStatus");
  if (!badge) return;
  if (dataSource === "live") {
    badge.innerHTML = '<span class="status-badge__pulse status-badge__pulse--live"></span>Live';
    badge.classList.add("status-badge--live");
    badge.classList.remove("status-badge--mock");
  } else {
    badge.innerHTML = '<span class="status-badge__pulse"></span>Mockdata';
    badge.classList.remove("status-badge--live");
    badge.classList.add("status-badge--mock");
  }
}

// ── Auto-Polling ───────────────────────────────────────
let polling = false;
function startPolling() {
  stopPolling();
  polling = true;
  (async function tick() {
    if (!polling) return;
    await loadData();
    render();
    if (polling) pollTimer = setTimeout(tick, POLL_INTERVAL);
  })();
}

function stopPolling() {
  polling = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
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
  for (const a of full) a.pointsDelta = Number.isFinite(leader) ? truncateDecimals(a.totalPoints - leader, 3) : null;
  for (const a of partial) a.pointsDelta = null;

  const all = [...full, ...partial];

  // Compute per-distance rankings (sorted by time, fastest = 1)
  const distRanks = {};
  for (const d of distances) {
    const withTimes = all
      .filter(a => Number.isFinite(a.seconds?.[d.key]))
      .sort((a, b) => a.seconds[d.key] - b.seconds[d.key]);
    withTimes.forEach((a, i) => {
      if (!distRanks[a.athleteId]) distRanks[a.athleteId] = {};
      distRanks[a.athleteId][d.key] = i + 1;
    });
  }
  // Attach to each athlete
  for (const a of all) {
    a.distRanks = distRanks[a.athleteId] ?? {};
  }

  return { all, full, partial };
}

/**
 * Compute the maximum time an athlete can skate on focusDist
 * to beat (strictly less than) the target's total points.
 * Returns the max time in seconds, or null if impossible.
 */
function computeMaxTimeForTarget(athlete, distances, focusDist, targetTotal) {
  if (!athlete || !Number.isFinite(targetTotal) || !focusDist) return null;

  // Sum all points EXCEPT the focus distance
  let without = 0;
  for (const d of distances) {
    if (d.key === focusDist.key) continue;
    const p = athlete.points?.[d.key];
    if (!Number.isFinite(p)) return null; // missing data
    without += p;
  }
  without = truncateDecimals(without, 3);

  // To beat target: need total < targetTotal
  // allowed total = targetTotal - 0.001
  const allowed = truncateDecimals(targetTotal - 0.001, 3);
  const allowedPts = truncateDecimals(allowed - without, 3);
  if (!Number.isFinite(allowedPts) || allowedPts <= 0) return null;

  // Convert back: max time = (allowedPts + truncation margin) * divisor
  return (allowedPts + 0.000999) * focusDist.divisor;
}

// ── DOM ────────────────────────────────────────────────
const el = {};
function cacheEls() {
  ["moduleTabs","genderTabs","viewButtons","viewTitle","viewMeta","contentArea",
   "h2hRiderA","h2hRiderB","h2hFocusDistance","h2hTargetRider","h2hOpen",
   "exportBtn","toast"
  ].forEach(id => { el[id] = document.getElementById(id); });
}

// ── Render helpers ─────────────────────────────────────
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

function distRankHtml(pos) {
  if (!Number.isFinite(pos)) return "";
  if (pos === 1) return ' <span class="dist-medal dist-medal--gold">🥇</span>';
  if (pos === 2) return ' <span class="dist-medal dist-medal--silver">🥈</span>';
  if (pos === 3) return ' <span class="dist-medal dist-medal--bronze">🥉</span>';
  return ` <span class="dist-pos">(${pos})</span>`;
}

function pbBadge(isPb) {
  return isPb ? ' <span class="pb-badge">PB</span>' : "";
}

// ── Render: Meta ───────────────────────────────────────
function renderMeta(cfg) {
  const m = MODULE_CONFIG[state.selectedModule].label;
  const g = cfg.label;
  const d = cfg.distances.map(x => x.label).join("  ·  ");
  if (el.viewMeta) el.viewMeta.textContent = `${m} — ${g} — ${d}`;
}

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

  const o = document.createElement("button");
  o.className = "view-btn";
  o.innerHTML = `<span class="view-btn__icon">${ICON.dash}</span>Overzicht`;
  o.onclick = () => { state.selectedView = "overzicht"; render(); };
  if (state.selectedView === "overzicht") o.classList.add("active");
  el.viewButtons.appendChild(o);
}

// ── Render: H2H Sidebar Form ───────────────────────────
function renderH2HForm(cfg, standings) {
  const ath = standings.all.map(a => ({
    value: a.athleteId,
    label: `${a.name}${a.rank ? ` (#${a.rank})` : ""}`,
  }));
  const dis = cfg.distances.map(d => ({ value: d.key, label: d.label }));

  if (!state.h2h.riderAId) state.h2h.riderAId = ath[0]?.value ?? null;
  if (!state.h2h.riderBId) state.h2h.riderBId = ath[1]?.value ?? ath[0]?.value ?? null;
  if (!state.h2h.focusDistanceKey) state.h2h.focusDistanceKey = dis[dis.length - 1]?.value ?? null;
  if (!state.h2h.targetRiderId) state.h2h.targetRiderId = ath[0]?.value ?? null;

  fillSelect(el.h2hRiderA, ath, state.h2h.riderAId);
  fillSelect(el.h2hRiderB, ath, state.h2h.riderBId);
  fillSelect(el.h2hFocusDistance, dis, state.h2h.focusDistanceKey);
  fillSelect(el.h2hTargetRider, ath, state.h2h.targetRiderId);
}

// ── Render: Distance View ──────────────────────────────
function renderDistanceView(dist, standings) {
  const rows = standings.all
    .map(a => ({
      name: a.name,
      time: a.times?.[dist.key] ?? "—",
      sec: a.seconds?.[dist.key] ?? null,
      pts: a.points?.[dist.key] ?? null,
      st: a.status?.[dist.key] ?? "—",
      isPb: a.pb?.[dist.key] ?? false,
    }))
    .sort((a, b) => {
      if ((a.st === "OK") !== (b.st === "OK")) return a.st === "OK" ? -1 : 1;
      if (!Number.isFinite(a.sec) || !Number.isFinite(b.sec)) return 0;
      return a.sec - b.sec;
    });

  const fast = rows[0]?.sec ?? null;
  rows.forEach(r => {
    r.timeDelta = Number.isFinite(r.sec) && Number.isFinite(fast) ? r.sec - fast : null;
  });

  el.viewTitle.textContent = dist.label;
  el.contentArea.className = "stage__body stage__body--enter";
  el.contentArea.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>#</th><th>Naam</th><th>Tijd</th><th>Achterstand</th><th>Status</th></tr></thead>
        <tbody>${rows.map((r, i) => {
          const rk = i + 1;
          const deltaStr = r.timeDelta === 0
            ? '<span class="delta delta--leader">Snelst</span>'
            : Number.isFinite(r.timeDelta)
              ? `<span class="delta">${fmtTimePrecise(r.timeDelta)}</span>`
              : "";
          return `<tr class="${podCls(rk)}">
            <td>${rankHtml(rk)}</td>
            <td><span class="athlete-name">${esc(r.name)}</span></td>
            <td class="mono">${esc(r.time)}${pbBadge(r.isPb)}</td>
            <td>${deltaStr}</td>
            <td>${stHtml(r.st)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
}

// ── Render: Klassement View ────────────────────────────
// Shows: rank, name, actual TIMES per distance, total POINTS, time-delta on "next distance"
function renderStandingsView(distances, standings) {
  el.viewTitle.textContent = "Klassement";
  el.contentArea.className = "stage__body stage__body--enter";

  // Ensure nextDistKey is valid
  if (!state.nextDistKey || !distances.find(d => d.key === state.nextDistKey)) {
    state.nextDistKey = distances[distances.length - 1]?.key ?? null;
  }
  const nextDist = distances.find(d => d.key === state.nextDistKey);

  // Build next-distance selector
  const distOptions = distances.map(d =>
    `<option value="${esc(d.key)}" ${d.key === state.nextDistKey ? "selected" : ""}>${esc(d.label)}</option>`
  ).join("");

  // Table headers: actual time per distance
  const hdr = distances.map(d => `<th>${esc(d.label)}</th>`).join("");

  const body = standings.all.map(a => {
    // Show actual race times + position on that distance
    const cells = distances.map(d => {
      const t = a.times?.[d.key];
      const pos = a.distRanks?.[d.key];
      if (!t) return `<td class="mono">—</td>`;
      return `<td class="mono">${esc(t)}${distRankHtml(pos)}</td>`;
    }).join("");

    // Delta: convert points deficit → time on the selected next distance
    let deltaHtml = "";
    if (a.pointsDelta === 0) {
      deltaHtml = '<span class="delta delta--leader">Leader</span>';
    } else if (Number.isFinite(a.pointsDelta) && nextDist) {
      const timeBehind = a.pointsDelta * nextDist.divisor;
      deltaHtml = `<span class="delta">${fmtTimePrecise(timeBehind)}</span>`;
    }

    return `<tr class="${podCls(a.rank)}">
      <td>${rankHtml(a.rank)}</td>
      <td><span class="athlete-name">${esc(a.name)}</span></td>
      ${cells}
      <td class="mono mono--bold">${fmtPts(a.totalPoints)}</td>
      <td>${deltaHtml}</td>
    </tr>`;
  }).join("");

  el.contentArea.innerHTML = `
    <div class="inline-controls">
      <span class="inline-controls__label">Achterstand berekend op:</span>
      <div class="select-wrap">
        <select id="nextDistSelect">${distOptions}</select>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>#</th><th>Naam</th>${hdr}<th>Punten</th><th>Achterstand</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="info-box info-box--default">
      <strong>Leeswijzer:</strong> De tijden zijn de werkelijke wedstrijdtijden.
      Punten = tijd ÷ (meters ÷ 500), afgekapt op 3 decimalen. Laagste totaal = leider.
      Achterstand toont hoeveel seconden je sneller moet rijden op de gekozen afstand om de leider in te halen.
      ${dataSource === "live" ? "<br><strong>Databron:</strong> liveresults.schaatsen.nl — automatisch bijgewerkt elke 2 sec." : "<br><strong>Databron:</strong> Mockdata (geen live verbinding beschikbaar)."}
    </div>`;

  // Bind inline distance picker
  document.getElementById("nextDistSelect")?.addEventListener("change", (e) => {
    state.nextDistKey = e.target.value;
    render();
  });
}

// ── Render: Head-to-Head View ──────────────────────────
function renderHeadToHeadView(distances, standings) {
  el.viewTitle.textContent = "Head-to-Head";
  el.contentArea.className = "stage__body stage__body--enter";

  const { h2h } = state;
  const rA = standings.all.find(x => x.athleteId === h2h.riderAId);
  const rB = standings.all.find(x => x.athleteId === h2h.riderBId);
  const focusDist = distances.find(d => d.key === h2h.focusDistanceKey) ?? distances[distances.length - 1];

  let html = "";

  // ── 1) Mirror comparison table ──────────────────────
  if (rA && rB) {
    const mirrorRows = distances.map(d => {
      const secA = rA.seconds?.[d.key];
      const secB = rB.seconds?.[d.key];
      const tA = rA.times?.[d.key] ?? "—";
      const tB = rB.times?.[d.key] ?? "—";

      let clsA = "", clsB = "";
      if (Number.isFinite(secA) && Number.isFinite(secB)) {
        if (secA < secB) { clsA = "mirror-cell--win"; clsB = "mirror-cell--lose"; }
        else if (secB < secA) { clsB = "mirror-cell--win"; clsA = "mirror-cell--lose"; }
      }

      // Time difference
      let diffHtml = "";
      if (Number.isFinite(secA) && Number.isFinite(secB)) {
        const diff = secA - secB; // negative = A faster
        const absDiff = Math.abs(diff).toFixed(2);
        if (diff < 0) {
          diffHtml = `<span class="mirror-center__diff mirror-center__diff--neg">◀ ${absDiff}s</span>`;
        } else if (diff > 0) {
          diffHtml = `<span class="mirror-center__diff mirror-center__diff--pos">${absDiff}s ▶</span>`;
        } else {
          diffHtml = `<span class="mirror-center__diff">gelijk</span>`;
        }
      }

      return `<div class="mirror-row">
        <div class="mirror-cell ${clsA}">${esc(tA)}</div>
        <div class="mirror-center">
          <span class="mirror-center__dist">${esc(d.label)}</span>
          ${diffHtml}
        </div>
        <div class="mirror-cell mirror-cell--right ${clsB}">${esc(tB)}</div>
      </div>`;
    }).join("");

    // Totals row
    const totA = rA.totalPoints;
    const totB = rB.totalPoints;
    let totClsA = "", totClsB = "";
    if (Number.isFinite(totA) && Number.isFinite(totB)) {
      if (totA < totB) { totClsA = "mirror-cell--win"; totClsB = "mirror-cell--lose"; }
      else if (totB < totA) { totClsB = "mirror-cell--win"; totClsA = "mirror-cell--lose"; }
    }
    let totDiffHtml = "";
    if (Number.isFinite(totA) && Number.isFinite(totB)) {
      const d = truncateDecimals(totA - totB, 3);
      if (d < 0) totDiffHtml = `<span class="mirror-center__diff mirror-center__diff--neg">◀ ${Math.abs(d).toFixed(3)}</span>`;
      else if (d > 0) totDiffHtml = `<span class="mirror-center__diff mirror-center__diff--pos">${d.toFixed(3)} ▶</span>`;
      else totDiffHtml = `<span class="mirror-center__diff">gelijk</span>`;
    }

    html += `
    <div class="section-label">Vergelijking</div>
    <div class="mirror-wrap">
      <div class="mirror-header">
        <div class="mirror-header__rider">
          ${esc(rA.name)}
          <div class="mirror-header__rank">#${rA.rank ?? "—"} · ${fmtPts(rA.totalPoints)} pnt</div>
        </div>
        <div class="mirror-header__vs">VS</div>
        <div class="mirror-header__rider mirror-header__rider--right">
          ${esc(rB.name)}
          <div class="mirror-header__rank">#${rB.rank ?? "—"} · ${fmtPts(rB.totalPoints)} pnt</div>
        </div>
      </div>
      ${mirrorRows}
      <div class="mirror-row mirror-row--total">
        <div class="mirror-cell mirror-cell--total ${totClsA}">${fmtPts(totA)} pnt</div>
        <div class="mirror-center">
          <span class="mirror-center__dist">Totaal</span>
          ${totDiffHtml}
        </div>
        <div class="mirror-cell mirror-cell--right mirror-cell--total ${totClsB}">${fmtPts(totB)} pnt</div>
      </div>
    </div>`;
  }

  // ── 2) Target time calculations — side by side for both riders ──
  if (rA && rB && focusDist) {
    const leader = standings.full[0] ?? null;
    const targetAthlete = standings.all.find(x => x.athleteId === h2h.targetRiderId) ?? null;

    // Helper: build the two stacked KPI cards for one rider
    function buildRiderKPIs(rider) {
      if (!rider) return "";

      // Time to beat the leader
      const alreadyLeader = rider.rank === 1;
      const timeForLeader = (!alreadyLeader && leader)
        ? computeMaxTimeForTarget(rider, distances, focusDist, leader.totalPoints)
        : null;

      // Time to beat the target rider
      const isTarget = rider.athleteId === targetAthlete?.athleteId;
      const alreadyBetter = targetAthlete && rider.rank != null && targetAthlete.rank != null && rider.rank < targetAthlete.rank;
      const timeForTarget = (!isTarget && !alreadyBetter && targetAthlete)
        ? computeMaxTimeForTarget(rider, distances, focusDist, targetAthlete.totalPoints)
        : null;

      const leaderCard = `
        <div class="kpi-card kpi-card--gold">
          <div class="kpi-card__label">Tijd om ${leader ? esc(leader.name) : "leider"} te verslaan</div>
          <div class="kpi-card__value">${alreadyLeader ? "Is leider" : (timeForLeader != null ? fmtTime(timeForLeader) : "—")}</div>
          <div class="kpi-card__sub">${alreadyLeader ? `Staat op #1 met ${fmtPts(rider.totalPoints)} pnt` : (leader ? `#1 · ${fmtPts(leader.totalPoints)} pnt` : "")}</div>
        </div>`;

      let targetCard = "";
      if (targetAthlete) {
        targetCard = `
          <div class="kpi-card kpi-card--accent">
            <div class="kpi-card__label">Tijd om ${esc(targetAthlete.name)} te verslaan</div>
            <div class="kpi-card__value">${isTarget ? "Is zelf target" : (alreadyBetter ? `Staat al #${rider.rank}` : (timeForTarget != null ? fmtTime(timeForTarget) : "—"))}</div>
            <div class="kpi-card__sub">${isTarget ? "" : (alreadyBetter ? `Al beter dan #${targetAthlete.rank}` : `#${targetAthlete.rank ?? "—"} · ${fmtPts(targetAthlete.totalPoints)} pnt`)}</div>
          </div>`;
      }

      return leaderCard + targetCard;
    }

    html += `
    <div class="section-label" style="margin-top:24px">Benodigde tijd op ${esc(focusDist.label)}</div>
    <div class="h2h-kpi-columns">
      <div class="h2h-kpi-col">
        <div class="h2h-kpi-col__name">${esc(rA.name)} <span class="h2h-kpi-col__rank">#${rA.rank ?? "—"}</span></div>
        ${buildRiderKPIs(rA)}
      </div>
      <div class="h2h-kpi-col">
        <div class="h2h-kpi-col__name">${esc(rB.name)} <span class="h2h-kpi-col__rank">#${rB.rank ?? "—"}</span></div>
        ${buildRiderKPIs(rB)}
      </div>
    </div>`;
  }

  if (!html) {
    html = `<div class="info-box info-box--default">Selecteer twee rijders in het zijpaneel om te vergelijken.</div>`;
  }

  el.contentArea.innerHTML = html;
}

// ── Render: Overzicht Dashboard ────────────────────────
function renderOverzichtView(distances, standings) {
  el.viewTitle.textContent = "Overzicht";
  el.contentArea.className = "stage__body stage__body--enter";

  const filter = state.overzichtFilter;

  // ── Compute stats ──────────────────────────────────
  // PBs
  const allPbs = [];
  for (const a of standings.all) {
    for (const d of distances) {
      if (a.pb?.[d.key]) {
        allPbs.push({
          name: a.name,
          rank: a.rank,
          distKey: d.key,
          distLabel: d.label,
          time: a.times?.[d.key] ?? "—",
          sec: a.seconds?.[d.key] ?? null,
        });
      }
    }
  }

  // PBs per distance
  const pbsByDist = {};
  for (const d of distances) pbsByDist[d.key] = { label: d.label, pbs: [] };
  for (const pb of allPbs) {
    if (pbsByDist[pb.distKey]) pbsByDist[pb.distKey].pbs.push(pb);
  }

  // Top 3 per distance
  const top3PerDist = distances.map(d => {
    const sorted = standings.all
      .filter(a => Number.isFinite(a.seconds?.[d.key]))
      .sort((a, b) => a.seconds[d.key] - b.seconds[d.key])
      .slice(0, 3);
    return { dist: d, athletes: sorted };
  });

  // Podium counts per athlete (across all distances)
  const podiumCounts = {};
  for (const { dist, athletes } of top3PerDist) {
    athletes.forEach((a, i) => {
      if (!podiumCounts[a.athleteId]) podiumCounts[a.athleteId] = { name: a.name, gold: 0, silver: 0, bronze: 0, total: 0 };
      if (i === 0) podiumCounts[a.athleteId].gold++;
      if (i === 1) podiumCounts[a.athleteId].silver++;
      if (i === 2) podiumCounts[a.athleteId].bronze++;
      podiumCounts[a.athleteId].total++;
    });
  }
  const podiumRanking = Object.values(podiumCounts).sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  // Athletes with PBs count
  const pbCountPerAthlete = {};
  for (const pb of allPbs) {
    pbCountPerAthlete[pb.name] = (pbCountPerAthlete[pb.name] || 0) + 1;
  }

  // ── Filter bar ─────────────────────────────────────
  const filters = [
    { key: "all", label: "Alles" },
    { key: "pbs", label: `PB's (${allPbs.length})` },
    { key: "podiums", label: "Podiums" },
    ...distances.map(d => ({ key: d.key, label: d.label })),
  ];

  const filterBar = `<div class="dash-filters">${
    filters.map(f =>
      `<button class="dash-filter${filter === f.key ? " dash-filter--active" : ""}" data-filter="${esc(f.key)}">${esc(f.label)}</button>`
    ).join("")
  }</div>`;

  // ── KPI cards row ──────────────────────────────────
  const totalAthletes = standings.all.length;
  const completedAll = standings.full.length;
  const totalPbs = allPbs.length;

  const kpis = `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-card__label">Deelnemers</div><div class="kpi-card__value">${totalAthletes}</div></div>
    <div class="kpi-card"><div class="kpi-card__label">Volledig klassement</div><div class="kpi-card__value">${completedAll}</div></div>
    <div class="kpi-card kpi-card--pb"><div class="kpi-card__label">Persoonlijke records</div><div class="kpi-card__value">${totalPbs}</div><div class="kpi-card__sub">${Object.keys(pbCountPerAthlete).length} rijders</div></div>
    <div class="kpi-card"><div class="kpi-card__label">Afstanden</div><div class="kpi-card__value">${distances.length}</div></div>
  </div>`;

  // ── Content per filter ─────────────────────────────
  let content = "";

  if (filter === "all" || filter === "podiums") {
    // Top 3 podium cards per distance
    content += `<div class="section-label">Top 3 per afstand</div><div class="dash-podium-grid">`;
    for (const { dist, athletes } of top3PerDist) {
      content += `<div class="dash-podium-card">
        <div class="dash-podium-card__title">${esc(dist.label)}</div>
        <div class="dash-podium-card__list">${
          athletes.length === 0 ? '<div class="dash-podium-card__empty">Geen resultaten</div>' :
          athletes.map((a, i) => {
            const medals = ["🥇","🥈","🥉"];
            const isPb = a.pb?.[dist.key] ?? false;
            return `<div class="dash-podium-item">
              <span class="dash-podium-item__medal">${medals[i]}</span>
              <span class="dash-podium-item__name">${esc(a.name)}</span>
              <span class="dash-podium-item__time mono">${esc(a.times?.[dist.key] ?? "—")}${pbBadge(isPb)}</span>
            </div>`;
          }).join("")
        }</div>
      </div>`;
    }
    content += `</div>`;
  }

  if (filter === "all" || filter === "podiums") {
    // Medaille spiegel
    if (podiumRanking.length > 0) {
      content += `<div class="section-label" style="margin-top:24px">Medaillespiegel</div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Naam</th><th>🥇</th><th>🥈</th><th>🥉</th><th>Totaal</th></tr></thead>
          <tbody>${podiumRanking.map(p => `<tr>
            <td><span class="athlete-name">${esc(p.name)}</span></td>
            <td class="mono">${p.gold || "—"}</td>
            <td class="mono">${p.silver || "—"}</td>
            <td class="mono">${p.bronze || "—"}</td>
            <td class="mono mono--bold">${p.total}</td>
          </tr>`).join("")}</tbody>
        </table></div>`;
    }
  }

  if (filter === "all" || filter === "pbs") {
    // PB overview
    content += `<div class="section-label" style="margin-top:24px">Persoonlijke records</div>`;
    if (allPbs.length === 0) {
      content += `<div class="info-box info-box--default">Geen persoonlijke records genoteerd.</div>`;
    } else {
      // PBs grouped by distance
      for (const d of distances) {
        const dPbs = pbsByDist[d.key]?.pbs ?? [];
        if (dPbs.length === 0) continue;
        content += `<div class="dash-pb-dist">${esc(d.label)} <span class="dash-pb-count">${dPbs.length} PB${dPbs.length !== 1 ? "'s" : ""}</span></div>`;
        content += `<div class="dash-pb-chips">${
          dPbs.map(p => `<div class="dash-pb-chip">
            <span class="dash-pb-chip__name">${esc(p.name)}</span>
            <span class="dash-pb-chip__time mono">${esc(p.time)}</span>
            <span class="pb-badge">PB</span>
          </div>`).join("")
        }</div>`;
      }
    }
  }

  // Single distance filter
  const singleDist = distances.find(d => d.key === filter);
  if (singleDist) {
    const dPbs = pbsByDist[singleDist.key]?.pbs ?? [];
    const top3 = top3PerDist.find(t => t.dist.key === singleDist.key);

    content += `<div class="section-label">Top 3 — ${esc(singleDist.label)}</div>`;
    if (top3 && top3.athletes.length > 0) {
      const medals = ["🥇","🥈","🥉"];
      content += `<div class="dash-podium-grid"><div class="dash-podium-card dash-podium-card--wide">
        <div class="dash-podium-card__list">${
          top3.athletes.map((a, i) => {
            const isPb = a.pb?.[singleDist.key] ?? false;
            return `<div class="dash-podium-item">
              <span class="dash-podium-item__medal">${medals[i]}</span>
              <span class="dash-podium-item__name">${esc(a.name)}</span>
              <span class="dash-podium-item__time mono">${esc(a.times?.[singleDist.key] ?? "—")}${pbBadge(isPb)}</span>
            </div>`;
          }).join("")
        }</div>
      </div></div>`;
    }

    if (dPbs.length > 0) {
      content += `<div class="section-label" style="margin-top:20px">PB's op ${esc(singleDist.label)}</div>
        <div class="dash-pb-chips">${dPbs.map(p => `<div class="dash-pb-chip">
          <span class="dash-pb-chip__name">${esc(p.name)}</span>
          <span class="dash-pb-chip__time mono">${esc(p.time)}</span>
          <span class="pb-badge">PB</span>
        </div>`).join("")}</div>`;
    }

    // Full results for this distance
    const allForDist = standings.all
      .filter(a => Number.isFinite(a.seconds?.[singleDist.key]))
      .sort((a, b) => a.seconds[singleDist.key] - b.seconds[singleDist.key]);
    if (allForDist.length > 0) {
      const fast = allForDist[0]?.seconds?.[singleDist.key];
      content += `<div class="section-label" style="margin-top:20px">Alle resultaten — ${esc(singleDist.label)}</div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>#</th><th>Naam</th><th>Tijd</th><th>Achterstand</th></tr></thead>
          <tbody>${allForDist.map((a, i) => {
            const sec = a.seconds[singleDist.key];
            const delta = sec - fast;
            const isPb = a.pb?.[singleDist.key] ?? false;
            return `<tr class="${podCls(i+1)}">
              <td>${rankHtml(i+1)}</td>
              <td><span class="athlete-name">${esc(a.name)}</span></td>
              <td class="mono">${esc(a.times?.[singleDist.key] ?? "—")}${pbBadge(isPb)}</td>
              <td>${delta===0?'<span class="delta delta--leader">Snelst</span>':`<span class="delta">${fmtTimePrecise(delta)}</span>`}</td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>`;
    }
  }

  el.contentArea.innerHTML = filterBar + kpis + content;

  // Bind filter buttons
  el.contentArea.querySelectorAll(".dash-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      state.overzichtFilter = btn.dataset.filter;
      render();
    });
  });
}

// ── CSV Export ─────────────────────────────────────────
function exportCSV() {
  const cfg = getActiveConfig();
  const { standings } = state;
  if (!standings?.all?.length) return;

  const hdr = ["Positie","Naam",...cfg.distances.map(d=>d.label),"Punten"];
  const rows = standings.all.map(a => [
    a.rank ?? "",
    a.name,
    ...cfg.distances.map(d => a.times?.[d.key] ?? ""),
    Number.isFinite(a.totalPoints) ? a.totalPoints.toFixed(3) : "",
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

// ── Events ─────────────────────────────────────────────
function bindEvents() {
  el.moduleTabs?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-module]");
    if (!btn || btn.dataset.module === state.selectedModule) return;
    state.selectedModule = btn.dataset.module;
    resetViewState();
    await loadAndRender();
  });

  el.genderTabs?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-gender]");
    if (!btn || btn.dataset.gender === state.selectedGender) return;
    state.selectedGender = btn.dataset.gender;
    resetViewState();
    await loadAndRender();
  });

  el.h2hRiderA?.addEventListener("change", () => { state.h2h.riderAId = el.h2hRiderA.value || null; render(); });
  el.h2hRiderB?.addEventListener("change", () => { state.h2h.riderBId = el.h2hRiderB.value || null; render(); });
  el.h2hFocusDistance?.addEventListener("change", () => { state.h2h.focusDistanceKey = el.h2hFocusDistance.value || null; render(); });
  el.h2hTargetRider?.addEventListener("change", () => { state.h2h.targetRiderId = el.h2hTargetRider.value || null; render(); });
  el.h2hOpen?.addEventListener("click", e => { e.preventDefault(); state.selectedView = "headToHead"; render(); });
  el.exportBtn?.addEventListener("click", exportCSV);
}

function resetViewState() {
  state.selectedView = "klassement";
  state.selectedDistanceKey = null;
  state.nextDistKey = null;
  state.h2h.riderAId = null;
  state.h2h.riderBId = null;
  state.h2h.targetRiderId = null;
  const cfg = getActiveConfig();
  state.h2h.focusDistanceKey = cfg.distances[cfg.distances.length - 1]?.key ?? null;
}

// ── Main ───────────────────────────────────────────────
// loadData is now defined above in the Live Data section (async)

function render() {
  const cfg = getActiveConfig();
  setActive(el.moduleTabs, "module", state.selectedModule);
  setActive(el.genderTabs, "gender", state.selectedGender);
  renderMeta(cfg);
  renderViewButtons(cfg.distances);
  if (state.selectedView === "distance" && !state.selectedDistanceKey) {
    state.selectedDistanceKey = cfg.distances[0]?.key ?? null;
  }
  renderH2HForm(cfg, state.standings);

  if (state.selectedView === "distance") {
    const d = cfg.distances.find(x => x.key === state.selectedDistanceKey) ?? cfg.distances[0];
    return renderDistanceView(d, state.standings);
  }
  if (state.selectedView === "headToHead") return renderHeadToHeadView(cfg.distances, state.standings);
  if (state.selectedView === "overzicht") return renderOverzichtView(cfg.distances, state.standings);
  return renderStandingsView(cfg.distances, state.standings);
}

async function loadAndRender() {
  await loadData();
  render();
  startPolling();
}

async function boot() {
  cacheEls();
  bindEvents();
  await loadAndRender();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot());
else boot();
