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
          { key: "d1_5000",  meters: 5000,  label: "5000m",   divisor: 10 },
          { key: "d1_1500",  meters: 1500,  label: "1500m",   divisor: 3  },
          { key: "d1_10000", meters: 10000, label: "10.000m", divisor: 20 },
        ],
      },
      v: {
        label: "Vrouwen",
        distances: [
          { key: "d1_500",  meters: 500,  label: "500m",  divisor: 1  },
          { key: "d1_3000", meters: 3000, label: "3000m", divisor: 6  },
          { key: "d1_1500", meters: 1500, label: "1500m", divisor: 3  },
          { key: "d1_5000", meters: 5000, label: "5000m", divisor: 10 },
        ],
      },
    },
  },
};

// ── Final Distance Qualification (Allround only) ──────
// Only 8 skaters qualify for the final distance (5000m vrouwen / 10.000m mannen).
const QUAL_CONFIG = {
  allround: {
    v: {
      qualDist: "d1_3000",   // qualifying distance (2nd skated)
      finalDist: "d1_5000",  // final distance (only 8 ride)
      first3: ["d1_500", "d1_3000", "d1_1500"],
      first2: ["d1_500", "d1_3000"],
    },
    m: {
      qualDist: "d1_5000",
      finalDist: "d1_10000",
      first3: ["d1_500", "d1_5000", "d1_1500"],
      first2: ["d1_500", "d1_5000"],
    },
  },
};

/**
 * Compute who qualifies for the final allround distance.
 * status: "both" (in both top 8) | "dist_swap" (via distance top 8) |
 *         "klass_only" (klass top 8 but not dist → out) | "out"
 */
function computeQualification(athletes, distances, qualCfg, mode) {
  if (!qualCfg || !athletes?.length) return null;

  const distKeys = mode === "after2" ? qualCfg.first2 : qualCfg.first3;
  const qualDistLabel = distances.find(d => d.key === qualCfg.qualDist)?.label ?? "afstand";
  const finalDistLabel = distances.find(d => d.key === qualCfg.finalDist)?.label ?? "afstand";

  // Partial klassement: sum 500m-equivalent points for the chosen distances
  const klassStandings = athletes.map(a => {
    let total = 0, count = 0;
    for (const dk of distKeys) {
      const dist = distances.find(d => d.key === dk);
      if (!dist) continue;
      const sec = a.seconds?.[dk];
      if (Number.isFinite(sec)) {
        total += truncateDecimals(sec / dist.divisor, 3);
        count++;
      }
    }
    return { ...a, partialPts: count === distKeys.length ? truncateDecimals(total, 3) : null, partialCount: count };
  });

  const klassRanked = klassStandings
    .filter(a => a.partialPts !== null)
    .sort((a, b) => a.partialPts - b.partialPts);
  klassRanked.forEach((a, i) => a.klassRank = i + 1);
  const klassTop8 = klassRanked.slice(0, 8);
  const klassTop8Names = new Set(klassTop8.map(a => a.name));

  // Distance top 8 (qualifying distance)
  const distRanked = athletes
    .filter(a => Number.isFinite(a.seconds?.[qualCfg.qualDist]))
    .sort((a, b) => a.seconds[qualCfg.qualDist] - b.seconds[qualCfg.qualDist]);
  distRanked.forEach((a, i) => a.distRank = i + 1);
  const distTop8 = distRanked.slice(0, 8);
  const distTop8Names = new Set(distTop8.map(a => a.name));

  // ── Algorithm ──
  const details = [];

  // In BOTH top 8 → auto-qualified
  const inBoth = klassTop8.filter(a => distTop8Names.has(a.name));
  for (const a of inBoth) {
    details.push({
      name: a.name, athleteId: a.athleteId,
      klassRank: a.klassRank,
      distRank: distRanked.find(x => x.name === a.name)?.distRank ?? null,
      partialPts: a.partialPts,
      distTime: a.times?.[qualCfg.qualDist] ?? "—",
      status: "both", reason: "Beide top 8",
    });
  }

  // Klass top 8 NOT in dist top 8 → open spots
  const klassOnly = klassTop8.filter(a => !distTop8Names.has(a.name));

  // Dist top 8 NOT in klass top 8 → candidates for open spots
  const distOnly = distTop8.filter(a => !klassTop8Names.has(a.name));

  // Fill open spots with dist candidates (in dist rank order)
  const filledFromDist = distOnly.slice(0, klassOnly.length);
  for (const a of filledFromDist) {
    details.push({
      name: a.name, athleteId: a.athleteId,
      klassRank: klassRanked.find(x => x.name === a.name)?.klassRank ?? null,
      distRank: distRanked.find(x => x.name === a.name)?.distRank ?? null,
      partialPts: klassStandings.find(x => x.name === a.name)?.partialPts ?? null,
      distTime: a.times?.[qualCfg.qualDist] ?? "—",
      status: "dist_swap", reason: `Via ${qualDistLabel}`,
    });
  }

  // Klass-only: had spot in klassement but not in dist top 8 → out
  for (const a of klassOnly) {
    details.push({
      name: a.name, athleteId: a.athleteId,
      klassRank: a.klassRank,
      distRank: distRanked.find(x => x.name === a.name)?.distRank ?? null,
      partialPts: a.partialPts,
      distTime: a.times?.[qualCfg.qualDist] ?? "—",
      status: "klass_only", reason: `Niet in top 8 ${qualDistLabel}`,
    });
  }

  // Dist-only who didn't fill a spot
  for (const a of distOnly.slice(klassOnly.length)) {
    details.push({
      name: a.name, athleteId: a.athleteId,
      klassRank: klassRanked.find(x => x.name === a.name)?.klassRank ?? null,
      distRank: distRanked.find(x => x.name === a.name)?.distRank ?? null,
      partialPts: klassStandings.find(x => x.name === a.name)?.partialPts ?? null,
      distTime: a.times?.[qualCfg.qualDist] ?? "—",
      status: "out", reason: "Geen open plek",
    });
  }

  // Sort: qualified first (both → dist_swap), then klass_only, then out
  const order = { both: 0, dist_swap: 1, klass_only: 2, out: 3 };
  details.sort((a, b) => {
    const so = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    if (so !== 0) return so;
    return (a.klassRank ?? 99) - (b.klassRank ?? 99);
  });

  const qualifiedCount = inBoth.length + filledFromDist.length;

  return { details, qualifiedCount, qualDistLabel, finalDistLabel, mode,
    klassTop8Count: klassTop8.length, distTop8Count: distTop8.length,
    klassRanked, distRanked };
}

// ── State ──────────────────────────────────────────────
const state = {
  selectedModule: "allround",
  selectedGender: "v",
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
  overzichtFilter: "all", // "all" | "pbs" | "podiums"
  overzichtSources: { sprint_m: true, sprint_v: false, allround_m: false, allround_v: false },
};

// ── URL Hash State Persistence ───────────────────────
// Format: #module-gender-view[-distKey]
function saveStateToHash() {
  const parts = [state.selectedModule, state.selectedGender, state.selectedView];
  if (state.selectedView === "distance" && state.selectedDistanceKey) {
    parts.push(state.selectedDistanceKey);
  }
  const hash = parts.join("-");
  if (window.location.hash !== `#${hash}`) {
    history.replaceState(null, "", `#${hash}`);
  }
}

function loadStateFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return;
  const parts = hash.split("-");
  // Validate module
  if (parts[0] && MODULE_CONFIG[parts[0]]) {
    state.selectedModule = parts[0];
  }
  // Validate gender
  if (parts[1] && (parts[1] === "v" || parts[1] === "m")) {
    state.selectedGender = parts[1];
  }
  // Validate view
  const validViews = ["klassement", "distance", "headToHead", "overzicht", "kwalificatie"];
  if (parts[2] && validViews.includes(parts[2])) {
    state.selectedView = parts[2];
  }
  // Distance key (for distance view)
  if (parts[3] && state.selectedView === "distance") {
    state.selectedDistanceKey = parts.slice(3).join("-"); // handle keys with dashes
  }
}

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
  // Dutch notation: times over 1 minute use comma as decimal separator
  if (mm > 0) return `${mm}:${ssStr.replace(".", ",")}`;
  return ssStr;
}

function fmtTimePrecise(sec) {
  if (!Number.isFinite(sec)) return "—";
  const sign = sec < 0 ? "-" : "+";
  const abs = Math.abs(sec);
  const mm = Math.floor(abs / 60);
  const ss = abs - mm * 60;
  const ssStr = ss.toFixed(2).padStart(5, "0");
  if (mm > 0) return `${sign}${mm}:${ssStr.replace(".", ",")}`;
  return `${sign}${ssStr}`;
}

// Format a raw time string (from API) with proper Dutch notation
// Preserves original precision. Uses comma for times over 1 minute.
// "38.955" → "38.955", "83.456" → "1:23,456", "4:23.45" → "4:23,45"
function fmtRawTime(timeStr) {
  if (!timeStr || timeStr === "—") return "—";
  const sec = parseTimeToSeconds(timeStr);
  if (!Number.isFinite(sec)) return timeStr;
  // Determine decimal precision from original string
  const lastPart = String(timeStr).split(/[:.]/).pop() ?? "";
  const dotIdx = lastPart.indexOf(".");
  // Decimals in the seconds portion
  const origDecimals = timeStr.includes(".") ? (timeStr.split(".").pop()?.length ?? 2) : 2;
  const decimals = Math.max(2, Math.min(origDecimals, 3));

  const mm = Math.floor(sec / 60);
  const ss = sec - mm * 60;
  const ssStr = ss.toFixed(decimals).padStart(decimals + 3, "0");
  if (mm > 0) return `${mm}:${ssStr.replace(".", ",")}`;
  return ssStr;
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
  qual:   '<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8 1.5l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9.5l-3 1.5.5-3.5L3 5l3.5-.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 12.5l-1 2.5 4-1.5 4 1.5-1-2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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

const API_BASE = "https://live-api.schaatsen.nl";

// ── Participant Registry ──────────────────────────────
// Source: Deelnemerslijst Daikin - NK Sprint 2026 (24-02-2026)
const PARTICIPANTS = {
  sprint: {
    v: [
      { nr: 1,  name: "Suzanne Schulting",       cat: "DSA", qual: "EK Sprint" },
      { nr: 2,  name: "Chloé Hoogendoorn",       cat: "DN3", qual: "EK Sprint" },
      { nr: 3,  name: "Anna Boersma",             cat: "DSA", qual: "OKT" },
      { nr: 4,  name: "Isabel Grevelt",           cat: "DSA", qual: "OKT" },
      { nr: 5,  name: "Naomi Verkerk",            cat: "DSA", qual: "OKT" },
      { nr: 6,  name: "Angel Daleman",            cat: "DA2", qual: "OKT" },
      { nr: 7,  name: "Marrit Fledderus",         cat: "DSA", qual: "WC 25/26" },
      { nr: 8,  name: "Dione Voskamp",            cat: "DSA", qual: "WC 25/26" },
      { nr: 9,  name: "Pien Smit",                cat: "DN3", qual: "UCB" },
      { nr: 10, name: "Pien Hersman",             cat: "DN3", qual: "UCB" },
      { nr: 11, name: "Michelle de Jong",          cat: "DSA", qual: "UCB" },
      { nr: 12, name: "Sylke Kas",                cat: "DSA", qual: "UCB" },
      { nr: 13, name: "Amber Duizendstraal",      cat: "DN4", qual: "UCB" },
      { nr: 14, name: "Henny de Vries",           cat: "DSA", qual: "UCB" },
      { nr: 15, name: "Myrthe de Boer",           cat: "DSA", qual: "UCB" },
      { nr: 16, name: "Lotte Groenen",            cat: "DN2", qual: "UCB" },
      { nr: 17, name: "Elanne de Vries",          cat: "DN1", qual: "UCB" },
      { nr: 18, name: "Jildou Hoekstra",          cat: "DN3", qual: "UCB" },
      { nr: 19, name: "Sofie Bouw",               cat: "DN2", qual: "UCB" },
      { nr: 20, name: "Evy van Zoest",            cat: "DA2", qual: "UCB" },
    ],
    m: [
      { nr: 1,  name: "Merijn Scheperkamp",       cat: "HSA", qual: "EK Sprint" },
      { nr: 2,  name: "Tim Prins",                cat: "HN3", qual: "EK Sprint" },
      { nr: 3,  name: "Arjen Boersma",            cat: "HA2", qual: "UCB" },
      { nr: 4,  name: "Sebas Diniz",              cat: "HSA", qual: "OKT" },
      { nr: 5,  name: "Kayo Vos",                 cat: "HN4", qual: "OKT" },
      { nr: 6,  name: "Tijmen Snel",              cat: "HSA", qual: "OKT" },
      { nr: 7,  name: "Serge Yoro",               cat: "HSA", qual: "OKT" },
      { nr: 8,  name: "Stefan Westenbroek",       cat: "HSA", qual: "WC 25/26" },
      { nr: 9,  name: "Kai Verbij",               cat: "HSB", qual: "WC 25/26" },
      { nr: 10, name: "Wesly Dijs",               cat: "HSA", qual: "WC 25/26" },
      { nr: 11, name: "Janno Botman",             cat: "HSA", qual: "UCB" },
      { nr: 12, name: "Mats Siemons",             cat: "HN4", qual: "UCB" },
      { nr: 13, name: "Niklas Reinders",           cat: "HN2", qual: "UCB" },
      { nr: 14, name: "Sijmen Egberts",           cat: "HN3", qual: "UCB" },
      { nr: 15, name: "Mats van den Bos",         cat: "HN2", qual: "UCB" },
      { nr: 16, name: "Ted Dalrymple",            cat: "HN3", qual: "UCB" },
      { nr: 17, name: "Jelle Plug",               cat: "HN2", qual: "UCB" },
      { nr: 18, name: "Johan Talsma",             cat: "HN2", qual: "UCB" },
      { nr: 19, name: "Pim Stuij",                cat: "HN4", qual: "UCB" },
      { nr: 20, name: "Max Bergsma",              cat: "HN3", qual: "UCB" },
    ],
  },
  allround: {
    v: [
      { nr: 1,  name: "Merel Conijn",              cat: "DSA", qual: "EK Allround" },
      { nr: 2,  name: "Marijke Groenewoud",         cat: "DSA", qual: "EK Allround" },
      { nr: 3,  name: "Jade Groenewoud",            cat: "DN3", qual: "Gruno Bokaal" },
      { nr: 4,  name: "Maud Blokhorst",            cat: "DA1", qual: "Kraantje Lek" },
      { nr: 5,  name: "Evelien Vijn",              cat: "DN4", qual: "Gruno Bokaal" },
      { nr: 6,  name: "Naomi van der Werf",        cat: "DSA", qual: "Gruno Bokaal" },
      { nr: 7,  name: "Nynke Tinga",               cat: "DN1", qual: "Gruno Bokaal" },
      { nr: 8,  name: "Melissa Wijfje",            cat: "DSA", qual: "WC" },
      { nr: 9,  name: "Sanne in 't Hof",           cat: "DSA", qual: "WC" },
      { nr: 10, name: "Kim Talsma",                cat: "DSA", qual: "WC" },
      { nr: 11, name: "Meike Veen",                cat: "DN2", qual: "WC" },
      { nr: 12, name: "Gioya Lancee",              cat: "DSA", qual: "Kraantje Lek" },
      { nr: 13, name: "Hilde Noppert",              cat: "DSA", qual: "Kraantje Lek" },
      { nr: 14, name: "Sanne Westra",              cat: "DN4", qual: "Kraantje Lek" },
      { nr: 15, name: "Rosalie van Vliet",         cat: "DN1", qual: "Kraantje Lek" },
      { nr: 16, name: "Evi de Ruijter",            cat: "DA2", qual: "Kraantje Lek" },
      { nr: 17, name: "Lieke Huizink",             cat: "DA2", qual: "Kraantje Lek" },
      { nr: 18, name: "Tosca Mulder",              cat: "DN3", qual: "Kraantje Lek" },
      { nr: 19, name: "Amy van der Meer",           cat: "DSA", qual: "Kraantje Lek" },
      { nr: 20, name: "Britt Breider",             cat: "DA2", qual: "Kraantje Lek" },
    ],
    m: [
      { nr: 1,  name: "Beau Snellink",             cat: "HSA", qual: "EK Allround" },
      { nr: 2,  name: "Loek van Vilsteren",       cat: "HN3", qual: "Eindhoven Trofee" },
      { nr: 3,  name: "Marcel Bosker",             cat: "HSA", qual: "EK Allround" },
      { nr: 4,  name: "Jasper Krommenhoek",        cat: "HN3", qual: "EK Allround" },
      { nr: 5,  name: "Jur Veenje",                cat: "HSA", qual: "Gruno Bokaal" },
      { nr: 6,  name: "Chris Brommersma",          cat: "HN2", qual: "Gruno Bokaal" },
      { nr: 7,  name: "Michiel de Groot",           cat: "HN2", qual: "Gruno Bokaal" },
      { nr: 8,  name: "Louis Hollaar",             cat: "HSA", qual: "WC" },
      { nr: 9,  name: "Jasper Tinga",              cat: "HN3", qual: "Eindhoven Trofee" },
      { nr: 10, name: "Remco Stam",                cat: "HN3", qual: "Eindhoven Trofee" },
      { nr: 11, name: "Remo Slotegraaf",           cat: "HSA", qual: "Eindhoven Trofee" },
      { nr: 12, name: "Jelle Koeleman",            cat: "HN3", qual: "Eindhoven Trofee" },
      { nr: 13, name: "Yves Vergeer",              cat: "HSA", qual: "Eindhoven Trofee" },
      { nr: 14, name: "Niels van Reeuwijk",        cat: "HN2", qual: "Eindhoven Trofee" },
      { nr: 15, name: "Ties van Seumeren",         cat: "HN2", qual: "Eindhoven Trofee" },
      { nr: 16, name: "Jorrit Bergsma",            cat: "H40", qual: "Aanwijsplek" },
      { nr: 17, name: "Edsger van Felius",         cat: "HA2", qual: "Eindhoven Trofee" },
      { nr: 18, name: "Mathijs van Zwieten",       cat: "HSA", qual: "Eindhoven Trofee" },
      { nr: 19, name: "Hidde Westra",              cat: "HN3", qual: "Eindhoven Trofee" },
      { nr: 20, name: "Pelle Bolsius",             cat: "HA2", qual: "Eindhoven Trofee" },
    ],
  },
};

// Lookup helper: find participant info by name
function findParticipant(name) {
  const n = normalizeName(name);
  for (const [mod, genders] of Object.entries(PARTICIPANTS)) {
    for (const [gen, list] of Object.entries(genders)) {
      const found = list.find(p => normalizeName(p.name) === n);
      if (found) return { ...found, module: mod, gender: gen };
    }
  }
  return null;
}

// ── Startlists (pair order per distance) ──────────────
// Ordered array of names. Index 0,1 = pair 1; 2,3 = pair 2; etc.
// Source: Sportity / KNSB official lotingen, 27-02-2026
const STARTLISTS = {
  // ── NK Allround Vrouwen ──
  allround_v_d1_500: [
    "Sanne in 't Hof", "Lieke Huizink",
    "Maud Blokhorst", "Tosca Mulder",
    "Evelien Vijn", "Naomi van der Werf",
    "Britt Breider", "Evi de Ruijter",
    "Kim Talsma", "Sanne Westra",
    "Hilde Noppert", "Merel Conijn",
    "Rosalie van Vliet", "Nynke Tinga",
    "Jade Groenewoud", "Amy van der Meer",
    "Melissa Wijfje", "Gioya Lancee",
    "Meike Veen", "Marijke Groenewoud",
  ],
  allround_v_d1_3000: [
    "Britt Breider", "Amy van der Meer",
    "Tosca Mulder", "Maud Blokhorst",
    "Nynke Tinga", "Evi de Ruijter",
    "Naomi van der Werf", "Sanne Westra",
    "Rosalie van Vliet", "Hilde Noppert",
    "Lieke Huizink", "Kim Talsma",
    "Jade Groenewoud", "Meike Veen",
    "Gioya Lancee", "Evelien Vijn",
    "Marijke Groenewoud", "Merel Conijn",
    "Melissa Wijfje", "Sanne in 't Hof",
  ],
  // ── NK Allround Mannen ──
  allround_m_d1_500: [
    "Jorrit Bergsma", "Mathijs van Zwieten",
    "Jasper Krommenhoek", "Chris Brommersma",
    "Pelle Bolsius", "Jasper Tinga",
    "Michiel de Groot", "Remco Stam",
    "Remo Slotegraaf", "Beau Snellink",
    "Jelle Koeleman", "Edsger van Felius",
    "Yves Vergeer", "Niels van Reeuwijk",
    "Marcel Bosker", "Louis Hollaar",
    "Loek van Vilsteren", "Ties van Seumeren",
    "Hidde Westra", "Jur Veenje",
  ],
  allround_m_d1_5000: [
    "Loek van Vilsteren", "Edsger van Felius",
    "Mathijs van Zwieten", "Michiel de Groot",
    "Hidde Westra", "Pelle Bolsius",
    "Niels van Reeuwijk", "Ties van Seumeren",
    "Jelle Koeleman", "Jur Veenje",
    "Chris Brommersma", "Louis Hollaar",
    "Yves Vergeer", "Remo Slotegraaf",
    "Beau Snellink", "Jorrit Bergsma",
    "Jasper Tinga", "Jasper Krommenhoek",
    "Marcel Bosker", "Remco Stam",
  ],
  // ── NK Sprint Vrouwen ──
  sprint_v_d1_500: [
    "Evy van Zoest", "Sofie Bouw",
    "Sylke Kas", "Elanne de Vries",
    "Lotte Groenen", "Henny de Vries",
    "Myrthe de Boer", "Jildou Hoekstra",
    "Amber Duizendstraal", "Naomi Verkerk",
    "Michelle de Jong", "Pien Hersman",
    "Chloé Hoogendoorn", "Pien Smit",
    "Isabel Grevelt", "Suzanne Schulting",
    "Anna Boersma", "Angel Daleman",
    "Marrit Fledderus", "Dione Voskamp",
  ],
  sprint_v_d1_1000: [
    "Sofie Bouw", "Jildou Hoekstra",
    "Sylke Kas", "Henny de Vries",
    "Lotte Groenen", "Amber Duizendstraal",
    "Elanne de Vries", "Evy van Zoest",
    "Pien Smit", "Anna Boersma",
    "Michelle de Jong", "Myrthe de Boer",
    "Pien Hersman", "Dione Voskamp",
    "Marrit Fledderus", "Angel Daleman",
    "Naomi Verkerk", "Suzanne Schulting",
    "Isabel Grevelt", "Chloé Hoogendoorn",
  ],
  // ── NK Sprint Mannen ──
  sprint_m_d1_500: [
    "Jelle Plug", "Arjen Boersma",
    "Pim Stuij", "Sijmen Egberts",
    "Niklas Reinders", "Ted Dalrymple",
    "Wesly Dijs", "Max Bergsma",
    "Serge Yoro", "Kai Verbij",
    "Mats Siemons", "Kayo Vos",
    "Tijmen Snel", "Johan Talsma",
    "Tim Prins", "Mats van den Bos",
    "Janno Botman", "Merijn Scheperkamp",
    "Sebas Diniz", "Stefan Westenbroek",
  ],
  sprint_m_d1_1000: [
    "Max Bergsma", "Johan Talsma",
    "Pim Stuij", "Sebas Diniz",
    "Niklas Reinders", "Jelle Plug",
    "Arjen Boersma", "Ted Dalrymple",
    "Sijmen Egberts", "Janno Botman",
    "Mats van den Bos", "Mats Siemons",
    "Stefan Westenbroek", "Kai Verbij",
    "Merijn Scheperkamp", "Wesly Dijs",
    "Tim Prins", "Serge Yoro",
    "Tijmen Snel", "Kayo Vos",
  ],
  // Day 2 startlists (1500m allround, 2e 500/1000 sprint) will be
  // auto-captured from live-api.schaatsen.nl API when available
};

// Get startlist for a specific distance
function getStartlist(moduleKey, genderKey, distKey) {
  return STARTLISTS[`${moduleKey}_${genderKey}_${distKey}`] ?? null;
}

// Get pair number for an athlete in a startlist (1-based)
function getPairNumber(startlist, name) {
  if (!startlist) return null;
  const n = normalizeName(name);
  const idx = startlist.findIndex(s => normalizeName(s) === n);
  if (idx === -1) return null;
  return Math.floor(idx / 2) + 1;
}

// ── Live Data: State ───────────────────────────────────
let dataSource = "waiting"; // "live" | "waiting" | "manual"
let pollTimer = null;
const POLL_INTERVAL = 30_000; // 30 seconds (matches cache TTL)
let lastFetchLog = [];

// ── Manual Times Entry ────────────────────────────────
// Stored as: MANUAL_TIMES[module_gender_distKey][normalizedName] = "1:16.23"
let MANUAL_TIMES = {};
function loadManualTimes() {
  try {
    const raw = localStorage.getItem("klassement_manual_times");
    if (raw) MANUAL_TIMES = JSON.parse(raw);
  } catch (_) { MANUAL_TIMES = {}; }
}
function saveManualTimes() {
  try {
    localStorage.setItem("klassement_manual_times", JSON.stringify(MANUAL_TIMES));
  } catch (_) {}
}
function setManualTime(moduleKey, genderKey, distKey, name, timeStr) {
  const k = `${moduleKey}_${genderKey}_${distKey}`;
  if (!MANUAL_TIMES[k]) MANUAL_TIMES[k] = {};
  const n = normalizeName(name);
  if (timeStr && timeStr.trim() && timeStr.trim() !== "—") {
    MANUAL_TIMES[k][n] = timeStr.trim();
  } else {
    delete MANUAL_TIMES[k][n];
  }
  saveManualTimes();
}
function getManualTime(moduleKey, genderKey, distKey, name) {
  const k = `${moduleKey}_${genderKey}_${distKey}`;
  return MANUAL_TIMES[k]?.[normalizeName(name)] ?? null;
}
function hasAnyManualTimes() {
  return Object.values(MANUAL_TIMES).some(dist => Object.keys(dist).length > 0);
}
// Parse pasted results block: tries to match "name  time" patterns
function parsePastedResults(text) {
  const results = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Match patterns like:
    // "1  Bergsma  37.45" or "Bergsma 37.45" or "1 Jorrit Bergsma 37.45"
    // Time pattern: digits with . or : separators, at least one digit
    const timeMatch = line.match(/(\d{1,2}[:.]\d{2}[:.]\d{2}|\d{1,2}[:.]\d{2,3}|\d{2}[,.]\d{2,3})$/);
    if (!timeMatch) continue;
    const time = timeMatch[1].replace(",", ".");
    // Everything before the time (minus trailing spaces) is the name part
    let namePart = line.slice(0, timeMatch.index).trim();
    // Remove leading rank number if present
    namePart = namePart.replace(/^\d+[\s.)\-]+/, "").trim();
    // Remove pair/lane info like "(W)" or "(R)" or "[1]"
    namePart = namePart.replace(/\s*[\(\[][^)\]]*[\)\]]\s*/g, " ").trim();
    if (namePart.length > 2) {
      results.push({ name: namePart, time });
    }
  }
  return results;
}

// ── Live Data: Fetch single competition results ────────
// API: live-api.schaatsen.nl — the actual JSON backend behind liveresults.schaatsen.nl
// Aggressive cache: 30s TTL to avoid CORS proxy rate limiting
const _fetchCache = {}; // key → { data, ts }
const FETCH_CACHE_TTL = 30_000; // 30 seconds

async function fetchCompetitionResults(eventId, compId) {
  const cacheKey = `${eventId}_${compId}`;
  const cached = _fetchCache[cacheKey];
  if (cached && Date.now() - cached.ts < FETCH_CACHE_TTL) {
    lastFetchLog.push({ compId, status: "ok (cached)" });
    return cached.data;
  }

  const url = `${API_BASE}/events/${eventId}/competitions/${compId}/results/?inSeconds=1`;

  // 1. Try direct fetch first (works if no CORS restriction)
  try {
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    if (resp.ok) {
      const data = await resp.json();
      _fetchCache[cacheKey] = { data, ts: Date.now() };
      lastFetchLog.push({ compId, status: "ok (direct)" });
      return data;
    }
  } catch (_) {}

  // 2. CORS proxy fallback — try multiple proxies sequentially
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const resp = await fetch(proxyUrl);
      if (!resp.ok) continue;
      const text = await resp.text();
      if (!text || text.length < 10) continue;
      try {
        const data = JSON.parse(text);
        _fetchCache[cacheKey] = { data, ts: Date.now() };
        lastFetchLog.push({ compId, status: "ok (proxied)" });
        return data;
      } catch (_) { continue; }
    } catch (_) { continue; }
  }

  lastFetchLog.push({ compId, status: "failed" });
  return null;
}

// Pre-fetch ALL comps for an event (both genders) in one go
// This avoids rate limiting when switching between genders
async function prefetchEvent(eventId) {
  const now = Date.now();
  // Check how many we're missing
  const missing = [];
  for (let c = 1; c <= 8; c++) {
    const cached = _fetchCache[`${eventId}_${c}`];
    if (!cached || (now - cached.ts >= FETCH_CACHE_TTL)) missing.push(c);
  }
  if (missing.length === 0) return;

  console.log(`[Klassement] Pre-fetching ${missing.length} comps for ${eventId}: [${missing.join(",")}]`);
  const failed = [];
  for (const c of missing) {
    await fetchCompetitionResults(eventId, c);
    if (!_fetchCache[`${eventId}_${c}`]?.data) failed.push(c);
    // 500ms delay between requests to stay under proxy rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Retry failed comps once (different proxy might work after cooldown)
  if (failed.length > 0) {
    console.log(`[Klassement] Retrying ${failed.length} failed comps: [${failed.join(",")}]`);
    await new Promise(r => setTimeout(r, 1000)); // extra pause
    for (const c of failed) {
      await fetchCompetitionResults(eventId, c);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const ok = [1,2,3,4,5,6,7,8].filter(c => _fetchCache[`${eventId}_${c}`]?.data).length;
  console.log(`[Klassement] Pre-fetch done: ${ok}/8 comps in cache`);
}

// Also fetch personal bests for PB detection
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
    // KNSB API: name is nested in competitor.skater.firstName + lastName
    const skater = r.competitor?.skater ?? r.skater ?? null;
    let name;
    if (skater?.firstName && skater?.lastName) {
      name = `${skater.firstName} ${skater.lastName}`;
    } else if (skater?.name) {
      name = skater.name;
    } else {
      name = r.name ?? r.Name ?? r.skaterName ?? r.fullName ?? r.FullName
        ?? r.displayName ?? `Skater ${idx + 1}`;
    }

    const time = r.time ?? r.Time ?? r.result ?? r.Result ?? r.finishTime
      ?? r.finish ?? r.Finish ?? r.raceTime ?? null;

    // KNSB API uses numeric status: 0 = OK, others = DNS/DNF/DQ
    const statusRaw = r.status ?? r.Status ?? r.raceStatus ?? 0;
    let status = "OK";
    if (typeof statusRaw === "number") {
      // 0 = finished OK, 1 = DNS, 2 = DNF, 3 = DQ (KNSB convention)
      if (statusRaw === 1) status = "DNS";
      else if (statusRaw === 2) status = "DNF";
      else if (statusRaw === 3) status = "DQ";
      else if (statusRaw !== 0 && !time) status = "DNS";
    } else if (typeof statusRaw === "string") {
      const s = statusRaw.toUpperCase();
      if (s.includes("DNS")) status = "DNS";
      else if (s.includes("DNF")) status = "DNF";
      else if (s.includes("DQ") || s.includes("DSQ")) status = "DQ";
    }
    if (!time && status === "OK") status = "DNS";

    const skaterId = r.id ?? r.Id ?? skater?.id ?? r.participantId ?? `live_${idx}`;

    // PB detection — check medal field (KNSB uses "PB" in medal or remarks)
    let pb = false;
    const pbField = r.pb ?? r.PB ?? r.personalBest ?? r.PersonalBest
      ?? r.isPB ?? r.isPb ?? r.pr ?? r.PR ?? r.isPersonalRecord
      ?? r.personalRecord ?? r.seasonBest ?? r.SB ?? null;
    if (pbField === true || pbField === 1) pb = true;
    else if (typeof pbField === "string" && pbField.length > 0) pb = true;
    // Check medal field for PB indicator
    if (!pb && r.medal) {
      if (typeof r.medal === "string" && /PB|PR/i.test(r.medal)) pb = true;
    }
    // Check remarks/tags/notes fields
    if (!pb) {
      const remarks = String(r.remarks ?? r.Remarks ?? r.note ?? r.notes
        ?? r.tags ?? r.tag ?? r.label ?? r.labels ?? r.annotation ?? "");
      if (/\bPB\b|\bPR\b|\bpersonal\s*(best|record)\b/i.test(remarks)) pb = true;
    }

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

  // Fetch from cache (prefetchEvent should have loaded everything)
  const allResults = [];
  for (const dist of cfg.distances) {
    const entry = urlMap[dist.key];
    if (!entry) { allResults.push({ key: dist.key, results: null }); continue; }
    const data = await fetchCompetitionResults(eventId, entry.compId);
    const parsed = parseKnsbResponse(data);
    if (parsed && parsed.length > 0) anySuccess = true;
    allResults.push({ key: dist.key, results: parsed });
    console.log(`[Klassement] ${moduleKey}/${genderKey} Comp ${entry.compId} → ${dist.key}: ${parsed ? parsed.length + " results" : "NO DATA"}`);
  }
  if (!anySuccess) return null;

  // Capture startlist order from API (API returns names in startlist/pair order)
  for (const { key, results } of allResults) {
    if (!results || results.length === 0) continue;
    const slKey = `${moduleKey}_${genderKey}_${key}`;
    // Only set if we don't already have a hardcoded startlist, or API has data
    if (!STARTLISTS[slKey]) {
      STARTLISTS[slKey] = results.map(r => r.name);
    }
  }

  // Merge: build athlete map across all distances
  const athleteMap = new Map(); // keyed by name (normalized)
  const normalize = normalizeName;

  for (const { key, results } of allResults) {
    if (!results) continue;
    for (const r of results) {
      const nk = normalize(r.name);
      if (!athleteMap.has(nk)) {
        // Try to find participant info from registry
        const pInfo = findParticipant(r.name);
        athleteMap.set(nk, {
          athleteId: r.skaterId,
          name: r.name,
          meta: {
            club: pInfo?.cat ?? "—",
            qual: pInfo?.qual ?? "—",
            nr: pInfo?.nr ?? null,
          },
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

// ── Participant Baseline (no times — waiting for live data) ─
function makeParticipantBaseline(moduleKey, genderKey) {
  const cfg = MODULE_CONFIG[moduleKey].genders[genderKey];
  const participants = PARTICIPANTS[moduleKey]?.[genderKey] ?? [];

  if (participants.length === 0) {
    return { athletes: [] };
  }

  return {
    athletes: participants.map((p, idx) => {
      const times = {}, status = {}, pb = {};
      cfg.distances.forEach(d => {
        times[d.key] = null;
        status[d.key] = "DNS";
        pb[d.key] = false;
      });

      return {
        athleteId: `${moduleKey}_${genderKey}_${idx + 1}`,
        name: p.name,
        meta: {
          club: p.cat,
          qual: p.qual,
          nr: p.nr,
        },
        times, status, pb,
      };
    }),
  };
}

// ── Results cache (for cross-module Overzicht) ──────────
const resultsCache = {}; // key: "sprint_m" etc → { raw, standings }

// ── Data Loading ───────────────────────────────────────
// Robust name normalization — handles apostrophe variants, extra spaces, accents
function normalizeName(n) {
  return n
    .trim()
    .toLowerCase()
    // Normalize all apostrophe/quote variants to standard '
    .replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4\u2032\u02BC\u02BB\u2060']/g, "'")
    // Normalize dashes
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    // Remove accents/diacritics
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Simple Levenshtein distance for fuzzy name matching debug
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1]!==b[j-1]?1:0));
  return d[m][n];
}

async function loadData() {
  const m = state.selectedModule;
  const g = state.selectedGender;
  const cfg = getActiveConfig();

  // 1. Start with participant baseline (all names, no times)
  const baseline = makeParticipantBaseline(m, g);
  const normalize = normalizeName;

  // 2. Pre-fetch ALL comps for this event (both genders) to avoid rate limiting on switch
  const eventId = LIVE_URLS[m]?.eventId;
  if (eventId) {
    await prefetchEvent(eventId);
  }

  // 3. Now fetch live data for current gender (should all hit cache)
  const liveData = await fetchLiveResults(m, g);

  if (liveData && liveData.athletes.length > 0) {
    // 3. Merge live data onto participant baseline
    const liveMap = new Map();
    for (const la of liveData.athletes) {
      liveMap.set(normalize(la.name), la);
    }

    console.log(`[Klassement] Live athletes: ${liveData.athletes.length}, unique normalized: ${liveMap.size}`);
    console.log(`[Klassement] Baseline athletes: ${baseline.athletes.length}`);

    // Update baseline athletes with live times
    let mergedCount = 0;
    for (const ba of baseline.athletes) {
      const baNorm = normalize(ba.name);
      let live = liveMap.get(baNorm);

      // Fuzzy match: if exact name doesn't match, try close matches
      if (!live) {
        let bestDist = 999, bestKey = null;
        for (const [nk, la] of liveMap) {
          const d = levenshtein(baNorm, nk);
          // Also try matching last name only
          const baLast = ba.name.split(" ").slice(-1)[0].toLowerCase();
          const laLast = la.name.split(" ").slice(-1)[0].toLowerCase();
          const lastNameMatch = baLast === laLast && baLast.length >= 3;

          if ((d <= 2 || lastNameMatch) && d < bestDist) {
            bestDist = d;
            bestKey = nk;
          }
        }
        if (bestKey) {
          live = liveMap.get(bestKey);
          console.log(`[Klassement] Fuzzy match: "${ba.name}" [${baNorm}] ↔ "${live.name}" [${bestKey}] (dist ${bestDist})`);
          liveMap.delete(bestKey);
        } else {
          console.warn(`[Klassement] ❌ NO MATCH for "${ba.name}" [${baNorm}]`);
          // Show all remaining live map keys for debugging
          if (liveMap.size < 10) {
            console.log(`  Remaining in liveMap:`, [...liveMap.keys()]);
          }
        }
      } else {
        liveMap.delete(baNorm);
      }

      if (live) {
        let athleteMerged = 0;
        for (const d of cfg.distances) {
          if (live.times?.[d.key]) {
            ba.times[d.key] = live.times[d.key];
            ba.status[d.key] = live.status?.[d.key] ?? "OK";
            ba.pb[d.key] = live.pb?.[d.key] ?? false;
            mergedCount++;
            athleteMerged++;
          }
        }
      }
    }

    // Any live athletes NOT in participant list? Log with details for debugging
    if (liveMap.size > 0) {
      console.warn("[Klassement] ⚠️ Live athletes NOT in participant list (ignored):",
        [...liveMap.values()].map(a => `"${a.name}"`).join(", "));
      // Show closest matches to help debug
      for (const [nk, la] of liveMap) {
        const closest = baseline.athletes
          .map(ba => ({ name: ba.name, dist: levenshtein(nk, normalize(ba.name)) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);
        console.log(`  "${la.name}" → closest: ${closest.map(c => `"${c.name}" (dist ${c.dist})`).join(", ")}`);
      }
    }

    dataSource = "live";
    console.log(`[Klassement] ✅ Live data merged: ${mergedCount} results from ${liveData.athletes.length} athletes`);
    // Log match details
    const matched = baseline.athletes.filter(ba => cfg.distances.some(d => ba.times[d.key]));
    const unmatched = baseline.athletes.filter(ba => !cfg.distances.some(d => ba.times[d.key]));
    if (unmatched.length > 0) {
      console.warn(`[Klassement] ⚠️ ${unmatched.length} deelnemers zonder live data:`, unmatched.map(a => a.name));
    }
  } else {
    dataSource = "waiting";
    // Log what happened
    const failed = lastFetchLog.filter(l => l.status === "failed").length;
    const ok = lastFetchLog.filter(l => l.status?.startsWith("ok")).length;
    if (lastFetchLog.length > 0) {
      console.log(`[Klassement] ⏳ Polling: ${ok} OK, ${failed} failed of ${lastFetchLog.length} endpoints`, lastFetchLog);
    }
  }

  state.resultsRaw = baseline;

  // 4. Merge manual times (overrides live data — user is source of truth)
  let manualCount = 0;
  for (const ba of baseline.athletes) {
    const n = normalize(ba.name);
    for (const d of cfg.distances) {
      const mt = getManualTime(m, g, d.key, ba.name);
      if (mt) {
        ba.times[d.key] = mt;
        ba.status[d.key] = "OK";
        manualCount++;
      }
    }
  }
  if (manualCount > 0) {
    dataSource = "manual";
    console.log(`[Klassement] ✏️ Manual times applied: ${manualCount}`);
  }

  state.standings = computeStandings(state.resultsRaw, cfg.distances);
  resultsCache[`${m}_${g}`] = { raw: state.resultsRaw, standings: state.standings };
  updateStatusBadge();
}

function updateStatusBadge() {
  const badge = document.getElementById("dataStatus");
  if (!badge) return;
  if (dataSource === "live") {
    badge.innerHTML = '<span class="status-badge__pulse status-badge__pulse--live"></span>Live';
    badge.classList.add("status-badge--live");
    badge.classList.remove("status-badge--mock", "status-badge--manual");
  } else if (dataSource === "manual") {
    badge.innerHTML = '<span class="status-badge__pulse status-badge__pulse--manual"></span>Handmatig';
    badge.classList.add("status-badge--manual");
    badge.classList.remove("status-badge--live", "status-badge--mock");
  } else {
    badge.innerHTML = '<span class="status-badge__pulse"></span>Wachten op data';
    badge.classList.remove("status-badge--live", "status-badge--manual");
    badge.classList.add("status-badge--mock");
  }
}

// ── Auto-Polling ───────────────────────────────────────
let polling = false;
function startPolling() {
  stopPolling();
  polling = true;
  async function tick() {
    if (!polling) return;
    await loadData();
    render();
    if (polling) pollTimer = setTimeout(tick, POLL_INTERVAL);
  }
  // Delay first poll tick (loadAndRender already did one fetch)
  pollTimer = setTimeout(tick, POLL_INTERVAL);
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

  // Sort ALL athletes: primary = most distances completed (desc), secondary = lowest points (asc)
  computed.sort((a, b) => {
    if (a.completedCount !== b.completedCount) return b.completedCount - a.completedCount;
    // Same number of distances: sort by total points (or partial sum)
    const aPts = a.totalPoints ?? sumPartialPoints(a, distances);
    const bPts = b.totalPoints ?? sumPartialPoints(b, distances);
    if (aPts === null && bPts === null) return 0;
    if (aPts === null) return 1;
    if (bPts === null) return -1;
    return aPts - bPts;
  });

  // Assign ranks: athletes with same completedCount share a ranking group
  // Only athletes who have skated at least 1 distance get a rank
  let rank = 1;
  for (let i = 0; i < computed.length; i++) {
    if (computed[i].completedCount === 0) {
      computed[i].rank = null;
    } else {
      computed[i].rank = rank++;
    }
  }

  // Compute deltas: leader = rank 1
  const leader = computed[0]?.totalPoints ?? sumPartialPoints(computed[0], distances);
  for (const a of computed) {
    const pts = a.totalPoints ?? sumPartialPoints(a, distances);
    if (Number.isFinite(leader) && Number.isFinite(pts) && a.completedCount > 0) {
      a.pointsDelta = truncateDecimals(pts - leader, 3);
    } else {
      a.pointsDelta = null;
    }
  }

  const full = computed.filter(x => x.totalPoints !== null);
  const partial = computed.filter(x => x.totalPoints === null);
  const all = computed;

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
  for (const a of all) {
    a.distRanks = distRanks[a.athleteId] ?? {};
  }

  return { all, full, partial };
}

// Sum available points for partial klassement (not all distances completed)
function sumPartialPoints(athlete, distances) {
  if (!athlete) return null;
  let sum = 0, count = 0;
  for (const d of distances) {
    const p = athlete.points?.[d.key];
    if (Number.isFinite(p)) { sum += p; count++; }
  }
  return count > 0 ? truncateDecimals(sum, 3) : null;
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
   "exportBtn","toast","athletePopup","popupClose","popupContent"
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

// ── Athlete Popup ─────────────────────────────────────
function openAthletePopup(athleteName) {
  // Find athlete in current standings
  const cfg = getActiveConfig();
  const standings = state.standings;
  if (!standings?.all?.length) return;

  const athlete = standings.all.find(a => a.name === athleteName);
  if (!athlete) return;

  const distances = cfg.distances;
  const participant = findParticipant(athleteName);

  // Count PBs
  let pbCount = 0;
  for (const d of distances) {
    if (athlete.pb?.[d.key]) pbCount++;
  }

  // Distances actually skated (have a time)
  const skated = distances.filter(d => athlete.times?.[d.key] && athlete.status?.[d.key] === "OK");

  // ── Build popup HTML ──
  let html = "";

  // Header
  html += `<div class="popup-header">
    <div class="popup-header__name">${esc(athlete.name)}</div>
    <div class="popup-header__meta">`;
  if (participant) {
    html += `<span class="popup-tag popup-tag--cat">${esc(participant.cat)}</span>`;
    html += `<span class="popup-tag popup-tag--qual">${esc(participant.qual)}</span>`;
  } else if (athlete.meta?.club && athlete.meta.club !== "—") {
    html += `<span class="popup-tag popup-tag--cat">${esc(athlete.meta.club)}</span>`;
    if (athlete.meta.qual && athlete.meta.qual !== "—") {
      html += `<span class="popup-tag popup-tag--qual">${esc(athlete.meta.qual)}</span>`;
    }
  }
  html += `</div></div>`;

  // KPI row
  const rankText = athlete.rank ? `#${athlete.rank}` : "—";
  const ptsText = Number.isFinite(athlete.totalPoints) ? fmtPts(athlete.totalPoints) : "—";
  const pbPct = skated.length > 0 ? ((pbCount / skated.length) * 100).toFixed(0) : "0";
  html += `<div class="popup-kpis">
    <div class="popup-kpi">
      <div class="popup-kpi__label">Klassement</div>
      <div class="popup-kpi__value">${rankText}</div>
    </div>
    <div class="popup-kpi">
      <div class="popup-kpi__label">Punten</div>
      <div class="popup-kpi__value mono">${ptsText}</div>
    </div>
    <div class="popup-kpi popup-kpi--pb">
      <div class="popup-kpi__label">PB's</div>
      <div class="popup-kpi__value">${pbCount} <span class="popup-kpi__pct">${pbPct}%</span></div>
      <div class="popup-kpi__sub">${pbCount} van ${skated.length} ritten</div>
    </div>
    <div class="popup-kpi">
      <div class="popup-kpi__label">Gereden</div>
      <div class="popup-kpi__value">${skated.length} / ${distances.length}</div>
    </div>
  </div>`;

  // Results table (only skated distances)
  if (skated.length > 0) {
    // Find leader per distance for delta
    const leaderTimes = {};
    for (const d of distances) {
      const best = standings.all
        .filter(a => Number.isFinite(a.seconds?.[d.key]))
        .sort((a, b) => a.seconds[d.key] - b.seconds[d.key])[0];
      leaderTimes[d.key] = best?.seconds?.[d.key] ?? null;
    }

    html += `<div class="popup-section-label">Resultaten</div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Afstand</th><th>Tijd</th><th>Positie</th><th>Verschil</th></tr></thead>
        <tbody>${skated.map(d => {
          const time = athlete.times[d.key];
          const sec = athlete.seconds?.[d.key];
          const pos = athlete.distRanks?.[d.key];
          const isPb = athlete.pb?.[d.key] ?? false;
          const leader = leaderTimes[d.key];
          const delta = Number.isFinite(sec) && Number.isFinite(leader) ? sec - leader : null;

          return `<tr class="${pos && pos <= 3 ? podCls(pos) : ""}">
            <td class="dist-col">${esc(d.label)}</td>
            <td class="mono">${fmtRawTime(time)}${pbBadge(isPb)}</td>
            <td>${pos ? rankHtml(pos) : "—"}</td>
            <td>${delta === 0 ? '<span class="delta delta--leader">Snelst</span>' : Number.isFinite(delta) ? `<span class="delta">+${fmtTimePrecise(delta).slice(1)}</span>` : ""}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>`;
  }

  // Not yet skated distances
  const notSkated = distances.filter(d => !skated.includes(d));
  if (notSkated.length > 0) {
    html += `<div class="popup-section-label" style="margin-top:14px">Nog te rijden</div>
      <div class="popup-upcoming">${notSkated.map(d => 
        `<span class="popup-upcoming__item">${esc(d.label)}</span>`
      ).join("")}</div>`;
  }

  // Qualification info
  if (participant) {
    html += `<div class="popup-qual-bar">
      <span class="popup-qual-bar__label">Kwalificatie</span>
      <span class="popup-qual-bar__value">${esc(participant.qual)}</span>
    </div>`;
  }

  el.popupContent.innerHTML = html;
  el.athletePopup.hidden = false;
  document.body.classList.add("popup-open");
}

function closeAthletePopup() {
  if (el.athletePopup) {
    el.athletePopup.hidden = true;
    document.body.classList.remove("popup-open");
  }
}

function initPopupHandlers() {
  // Close button
  el.popupClose?.addEventListener("click", closeAthletePopup);

  // Click overlay background to close
  el.athletePopup?.addEventListener("click", (e) => {
    if (e.target === el.athletePopup) closeAthletePopup();
  });

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAthletePopup();
  });

  // Event delegation: click any .athlete-name in contentArea
  document.addEventListener("click", (e) => {
    const nameEl = e.target.closest(".athlete-name");
    if (nameEl) {
      e.preventDefault();
      const name = nameEl.textContent.trim();
      if (name && name !== "—") openAthletePopup(name);
    }
  });
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
  o.onclick = () => {
    state.selectedView = "overzicht";
    // Auto-enable current module+gender in source toggles
    const k = `${state.selectedModule}_${state.selectedGender}`;
    if (!Object.values(state.overzichtSources).some(v => v)) {
      state.overzichtSources[k] = true;
    }
    render();
  };
  if (state.selectedView === "overzicht") o.classList.add("active");
  el.viewButtons.appendChild(o);

  // Kwalificatie button: always visible (shows allround qualification for both genders)
  const q = document.createElement("button");
  q.className = "view-btn";
  q.innerHTML = `<span class="view-btn__icon">${ICON.qual}</span>Kwalificatie`;
  q.onclick = () => { state.selectedView = "kwalificatie"; render(); };
  if (state.selectedView === "kwalificatie") q.classList.add("active");
  el.viewButtons.appendChild(q);
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
  el.viewTitle.textContent = dist.label;
  el.contentArea.className = "stage__body stage__body--enter";

  const cfg = getActiveConfig();
  const startlist = getStartlist(state.selectedModule, state.selectedGender, dist.key);

  // Split athletes: those with results vs those without
  const withTime = [];
  const withoutTime = [];

  for (const a of standings.all) {
    const t = a.times?.[dist.key];
    const sec = a.seconds?.[dist.key];
    const st = a.status?.[dist.key] ?? "DNS";
    const isPb = a.pb?.[dist.key] ?? false;

    if (t && st === "OK" && Number.isFinite(sec)) {
      withTime.push({ name: a.name, time: t, sec, st, isPb });
    } else {
      withoutTime.push({ name: a.name, time: "—", sec: null, st, isPb: false });
    }
  }

  // Sort finished by time (fastest first)
  withTime.sort((a, b) => a.sec - b.sec);

  const fast = withTime[0]?.sec ?? null;
  withTime.forEach((r, i) => {
    r.rank = i + 1;
    r.timeDelta = Number.isFinite(r.sec) && Number.isFinite(fast) ? r.sec - fast : null;
  });

  const hasResults = withTime.length > 0;

  // Sort unfinished by startlist pair order (if available), otherwise keep original order
  if (startlist) {
    const orderMap = new Map();
    startlist.forEach((name, idx) => orderMap.set(normalizeName(name), idx));
    withoutTime.sort((a, b) => {
      const oa = orderMap.get(normalizeName(a.name)) ?? 999;
      const ob = orderMap.get(normalizeName(b.name)) ?? 999;
      return oa - ob;
    });
  }

  // Build table rows
  let rowsHtml = "";

  // 1. Finished athletes (with ranking)
  for (const r of withTime) {
    const deltaStr = r.timeDelta === 0
      ? '<span class="delta delta--leader">Snelst</span>'
      : Number.isFinite(r.timeDelta)
        ? `<span class="delta">${fmtTimePrecise(r.timeDelta)}</span>`
        : "";

    rowsHtml += `<tr class="${podCls(r.rank)}">
      <td>${rankHtml(r.rank)}</td>
      <td><span class="athlete-name">${esc(r.name)}</span></td>
      <td class="mono">${fmtRawTime(r.time)}${pbBadge(r.isPb)}</td>
      <td>${deltaStr}</td>
    </tr>`;
  }

  // 2. Separator if there are both finished and unfinished
  if (hasResults && withoutTime.length > 0) {
    rowsHtml += `<tr class="table-sep"><td colspan="4"><span class="table-sep__label">Nog te rijden</span></td></tr>`;
  }

  // 3. Unfinished athletes (with pair numbers from startlist)
  for (const r of withoutTime) {
    const pair = getPairNumber(startlist, r.name);
    const pairHtml = pair !== null
      ? `<span class="pair-nr">${pair}</span>`
      : `<span class="pair-nr pair-nr--none">—</span>`;

    rowsHtml += `<tr class="row--pending">
      <td>${pairHtml}</td>
      <td><span class="athlete-name">${esc(r.name)}</span></td>
      <td class="mono">—</td>
      <td></td>
    </tr>`;
  }

  // Header label for # column
  const colLabel = hasResults ? "#" : "Rit";

  // Build compact klassement sidebar
  const sidebarHtml = buildCompactKlassement(cfg.distances, standings);

  el.contentArea.innerHTML = `
    <div class="dist-split">
      <div class="dist-split__main">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>${colLabel}</th><th>Naam</th><th>Tijd</th><th>Verschil</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
      <div class="dist-split__sidebar">
        ${sidebarHtml}
      </div>
    </div>`;
}

// ── Compact Klassement Sidebar ────────────────────────
// Shows: rank, name, total points, delta as time on next distance
function buildCompactKlassement(distances, standings) {
  // Determine next distance to skate:
  // = first distance (in skating order) where nobody has a result yet
  let nextDist = null;
  for (const d of distances) {
    const anyResult = standings.all.some(a =>
      a.times?.[d.key] && a.status?.[d.key] === "OK"
    );
    if (!anyResult) { nextDist = d; break; }
  }
  // If all distances completed, use last distance
  if (!nextDist) nextDist = distances[distances.length - 1];

  const leader = standings.full[0]?.totalPoints ?? null;

  // Ranked athletes (have at least partial points)
  const ranked = standings.all
    .filter(a => a.completedCount > 0)
    .sort((a, b) => {
      // Full klassement first, then partial
      if (a.totalPoints !== null && b.totalPoints !== null) return a.totalPoints - b.totalPoints;
      if (a.totalPoints !== null) return -1;
      if (b.totalPoints !== null) return 1;
      // Both partial: sum whatever points they have
      const sumA = Object.values(a.points ?? {}).filter(Number.isFinite).reduce((s, v) => s + v, 0);
      const sumB = Object.values(b.points ?? {}).filter(Number.isFinite).reduce((s, v) => s + v, 0);
      return sumA - sumB;
    });

  // If no one has skated yet, show placeholder
  if (ranked.length === 0) {
    return `
      <div class="klass-sidebar">
        <div class="klass-sidebar__header">
          <span class="klass-sidebar__title">Live Klassement</span>
        </div>
        <div class="klass-sidebar__empty">Nog geen resultaten</div>
      </div>`;
  }

  // Determine partial sum for ranking when not all distances done
  const getPartialSum = (a) => {
    if (a.totalPoints !== null) return a.totalPoints;
    return Object.values(a.points ?? {}).filter(Number.isFinite).reduce((s, v) => s + v, 0);
  };

  const partialLeader = ranked.length > 0 ? getPartialSum(ranked[0]) : null;

  let rows = "";
  ranked.forEach((a, i) => {
    const rk = i + 1;
    const pts = getPartialSum(a);
    const ptsStr = Number.isFinite(pts) ? pts.toFixed(3) : "—";

    // Delta: convert point deficit → time on next distance
    let deltaStr = "";
    if (rk === 1) {
      deltaStr = '<span class="delta delta--leader">Leader</span>';
    } else if (Number.isFinite(pts) && Number.isFinite(partialLeader) && nextDist) {
      const deficit = pts - partialLeader;
      const timeBehind = deficit * nextDist.divisor;
      deltaStr = `<span class="delta">${fmtTimePrecise(timeBehind)}</span>`;
    }

    rows += `<tr>
      <td class="klass-sidebar__rank">${rk}</td>
      <td><span class="athlete-name klass-sidebar__name">${esc(a.name)}</span></td>
      <td class="mono klass-sidebar__pts">${ptsStr}</td>
      <td class="klass-sidebar__delta">${deltaStr}</td>
    </tr>`;
  });

  // Count completed distances
  const completedCount = distances.filter(d =>
    standings.all.some(a => a.times?.[d.key] && a.status?.[d.key] === "OK")
  ).length;

  const statusLabel = completedCount === distances.length
    ? "Definitief"
    : `Na ${completedCount}/${distances.length} afstanden`;

  return `
    <div class="klass-sidebar">
      <div class="klass-sidebar__header">
        <span class="klass-sidebar__title">Live Klassement</span>
        <span class="klass-sidebar__status">${esc(statusLabel)}</span>
      </div>
      <div class="klass-sidebar__sub">Achterstand op ${esc(nextDist.label)}</div>
      <div class="table-wrap">
        <table class="table table--compact">
          <thead><tr>
            <th>#</th><th>Naam</th><th>Pnt</th><th>Δ ${esc(nextDist.label)}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
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
      return `<td class="mono">${fmtRawTime(t)}${distRankHtml(pos)}</td>`;
    }).join("");

    // Delta: convert points deficit → time on the selected next distance
    let deltaHtml = "";
    if (a.pointsDelta === 0) {
      deltaHtml = '<span class="delta delta--leader">Leader</span>';
    } else if (Number.isFinite(a.pointsDelta) && nextDist) {
      const timeBehind = a.pointsDelta * nextDist.divisor;
      deltaHtml = `<span class="delta">${fmtTimePrecise(timeBehind)}</span>`;
    }

    // Points: show total or partial sum
    const pts = a.totalPoints ?? sumPartialPoints(a, distances);
    const ptsStr = Number.isFinite(pts) ? pts.toFixed(3) : "—";
    const ptsDim = a.totalPoints === null && a.completedCount > 0 ? ' style="opacity:.5"' : "";

    return `<tr class="${podCls(a.rank)}">
      <td>${rankHtml(a.rank)}</td>
      <td><span class="athlete-name">${esc(a.name)}</span></td>
      ${cells}
      <td class="mono mono--bold"${ptsDim}>${ptsStr}</td>
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
      ${dataSource === "live" ? "<br><strong>Databron:</strong> live-api.schaatsen.nl — automatisch bijgewerkt elke 2 sec." : "<br><strong>Databron:</strong> Wachten op live data van live-api.schaatsen.nl."}
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
        <div class="mirror-cell ${clsA}">${fmtRawTime(tA)}</div>
        <div class="mirror-center">
          <span class="mirror-center__dist">${esc(d.label)}</span>
          ${diffHtml}
        </div>
        <div class="mirror-cell mirror-cell--right ${clsB}">${fmtRawTime(tB)}</div>
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
// Gathers data from selected source combinations (Sprint/Allround × M/V)
function gatherOverzichtData() {
  const sources = state.overzichtSources;
  const entries = [];

  for (const [key, enabled] of Object.entries(sources)) {
    if (!enabled) continue;
    const [mod, gen] = key.split("_");
    const cfg = MODULE_CONFIG[mod]?.genders?.[gen];
    if (!cfg) continue;

    // Use cache if available, otherwise generate participant baseline
    let st;
    if (resultsCache[key]) {
      st = resultsCache[key].standings;
    } else {
      const raw = makeParticipantBaseline(mod, gen);
      st = computeStandings(raw, cfg.distances);
      resultsCache[key] = { raw, standings: st };
    }

    entries.push({
      moduleKey: mod, genderKey: gen,
      label: `${MODULE_CONFIG[mod].label} ${cfg.label}`,
      shortLabel: `${mod === "sprint" ? "Spr" : "AR"} ${gen === "m" ? "M" : "V"}`,
      distances: cfg.distances, standings: st,
    });
  }
  return entries;
}

function renderOverzichtView() {
  el.viewTitle.textContent = "Overzicht";
  el.contentArea.className = "stage__body stage__body--enter";

  const filter = state.overzichtFilter;
  const sources = state.overzichtSources;

  // ── Source toggles ─────────────────────────────────
  const sourceOptions = [
    { key: "sprint_m", label: "Sprint Mannen" },
    { key: "sprint_v", label: "Sprint Vrouwen" },
    { key: "allround_m", label: "Allround Mannen" },
    { key: "allround_v", label: "Allround Vrouwen" },
  ];

  const activeSrcLabels = sourceOptions.filter(s => sources[s.key]).map(s => s.label);
  if (el.viewMeta) el.viewMeta.textContent = activeSrcLabels.length > 0 ? activeSrcLabels.join("  ·  ") : "Geen bronnen geselecteerd";

  const srcBar = `<div class="dash-section">
    <div class="section-label">Bronnen</div>
    <div class="dash-filters">${sourceOptions.map(s =>
      `<button class="chip${sources[s.key] ? " chip--on" : ""}" data-source="${esc(s.key)}">${esc(s.label)}</button>`
    ).join("")}</div>
  </div>`;

  // ── Gather all data ────────────────────────────────
  const entries = gatherOverzichtData();

  if (entries.length === 0) {
    el.contentArea.innerHTML = srcBar + `<div class="info-box info-box--default">Selecteer minimaal één bron hierboven.</div>`;
    bindOverzichtEvents();
    return;
  }

  // ── Compute combined stats ─────────────────────────
  // Top 3 per distance (per source)
  const allTop3 = [];
  const allPbs = [];
  const podiumCounts = {};
  let totalAthletes = 0, totalCompleted = 0;

  for (const e of entries) {
    totalAthletes += e.standings.all.length;
    totalCompleted += e.standings.full.length;

    for (const d of e.distances) {
      const sorted = e.standings.all
        .filter(a => Number.isFinite(a.seconds?.[d.key]))
        .sort((a, b) => a.seconds[d.key] - b.seconds[d.key]);
      const top = sorted.slice(0, 3);
      const fast = sorted[0]?.seconds?.[d.key] ?? null;
      allTop3.push({
        source: e.label, dist: d, athletes: top, fast,
        allSorted: sorted,
      });

      // Podium counts
      top.forEach((a, i) => {
        const id = `${a.name}_${e.label}`;
        if (!podiumCounts[id]) podiumCounts[id] = { name: a.name, source: e.label, gold: 0, silver: 0, bronze: 0, total: 0 };
        if (i === 0) podiumCounts[id].gold++;
        if (i === 1) podiumCounts[id].silver++;
        if (i === 2) podiumCounts[id].bronze++;
        podiumCounts[id].total++;
      });

      // PBs
      for (const a of e.standings.all) {
        if (a.pb?.[d.key]) {
          allPbs.push({ name: a.name, source: e.label, distLabel: d.label, time: a.times?.[d.key] ?? "—" });
        }
      }
    }
  }

  const podiumRanking = Object.values(podiumCounts).sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  // PB count per athlete
  const pbPerAthlete = {};
  for (const p of allPbs) pbPerAthlete[p.name] = (pbPerAthlete[p.name] || 0) + 1;

  // Total individual race results (athlete × distance combos actually skated)
  let totalRaces = 0;
  for (const e of entries) {
    for (const a of e.standings.all) {
      for (const d of e.distances) {
        if (a.times?.[d.key] && a.status?.[d.key] === "OK") totalRaces++;
      }
    }
  }

  const pbPctRaces = totalRaces > 0 ? ((allPbs.length / totalRaces) * 100).toFixed(1) : "0.0";
  const pbSkaterCount = Object.keys(pbPerAthlete).length;
  const pbPctSkaters = totalAthletes > 0 ? ((pbSkaterCount / totalAthletes) * 100).toFixed(0) : "0";

  const showSource = entries.length > 1; // show source column when multiple sources

  // ── Filter bar ─────────────────────────────────────
  const filters = [
    { key: "all", label: "Alles" },
    { key: "pbs", label: `PB's (${allPbs.length})` },
    { key: "podiums", label: "Podiums" },
  ];

  const filterBar = `<div class="dash-section">
    <div class="section-label">Weergave</div>
    <div class="dash-filters">${filters.map(f =>
      `<button class="chip${filter === f.key ? " chip--on" : ""}" data-filter="${esc(f.key)}">${esc(f.label)}</button>`
    ).join("")}</div>
  </div>`;

  // ── KPI cards ──────────────────────────────────────
  const kpis = `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-card__label">Deelnemers</div><div class="kpi-card__value">${totalAthletes}</div></div>
    <div class="kpi-card"><div class="kpi-card__label">Individuele ritten</div><div class="kpi-card__value">${totalRaces}</div></div>
    <div class="kpi-card kpi-card--pb"><div class="kpi-card__label">Persoonlijke records</div><div class="kpi-card__value">${allPbs.length}<span class="kpi-card__pct">${pbPctRaces}%</span></div><div class="kpi-card__sub">${pbSkaterCount} van ${totalAthletes} rijders (${pbPctSkaters}%)</div></div>
    <div class="kpi-card"><div class="kpi-card__label">Volledig klassement</div><div class="kpi-card__value">${totalCompleted}</div></div>
  </div>`;

  // ── Tables ─────────────────────────────────────────
  let content = "";

  // TOP 3 PER DISTANCE
  if (filter === "all" || filter === "podiums") {
    const srcCol = showSource ? "<th>Bron</th>" : "";
    let rows = "";
    const medals = ["🥇","🥈","🥉"];
    for (const t of allTop3) {
      if (t.athletes.length === 0) continue;
      t.athletes.forEach((a, i) => {
        const sec = a.seconds?.[t.dist.key];
        const delta = Number.isFinite(sec) && Number.isFinite(t.fast) ? sec - t.fast : null;
        const isPb = a.pb?.[t.dist.key] ?? false;
        const groupCls = i === 0 ? " group-first" : "";
        rows += `<tr class="${podCls(i+1)}${groupCls}">
          <td class="dist-col">${i === 0 ? esc(t.dist.label) : ""}</td>
          ${showSource ? `<td>${i === 0 ? `<span class="source-tag">${esc(t.source)}</span>` : ""}</td>` : ""}
          <td>${medals[i]}</td>
          <td><span class="athlete-name">${esc(a.name)}</span></td>
          <td class="mono">${fmtRawTime(a.times?.[t.dist.key])}${pbBadge(isPb)}</td>
          <td>${delta === 0 ? "" : Number.isFinite(delta) ? `<span class="delta">+${fmtTimePrecise(delta)}</span>` : ""}</td>
        </tr>`;
      });
    }
    content += `<div class="section-label" style="margin-top:20px">Top 3 per afstand</div>
      <div class="table-wrap"><table class="table table--grouped">
        <thead><tr><th>Afstand</th>${srcCol}<th></th><th>Naam</th><th>Tijd</th><th>Verschil</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  // MEDAILLESPIEGEL
  if ((filter === "all" || filter === "podiums") && podiumRanking.length > 0) {
    const srcCol = showSource ? "<th>Bron</th>" : "";
    content += `<div class="section-label" style="margin-top:24px">Medaillespiegel</div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Naam</th>${srcCol}<th>🥇</th><th>🥈</th><th>🥉</th><th>Totaal</th></tr></thead>
        <tbody>${podiumRanking.map(p => `<tr>
          <td><span class="athlete-name">${esc(p.name)}</span></td>
          ${showSource ? `<td><span class="source-tag">${esc(p.source)}</span></td>` : ""}
          <td class="mono">${p.gold || "—"}</td>
          <td class="mono">${p.silver || "—"}</td>
          <td class="mono">${p.bronze || "—"}</td>
          <td class="mono mono--bold">${p.total}</td>
        </tr>`).join("")}</tbody>
      </table></div>`;
  }

  // PBs TABLE
  if (filter === "all" || filter === "pbs") {
    if (allPbs.length === 0) {
      content += `<div class="section-label" style="margin-top:24px">Persoonlijke records</div>
        <div class="info-box info-box--default">Geen persoonlijke records genoteerd.</div>`;
    } else {
      const srcCol = showSource ? "<th>Bron</th>" : "";
      content += `<div class="section-label" style="margin-top:24px">Persoonlijke records</div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Naam</th>${srcCol}<th>Afstand</th><th>Tijd</th><th></th></tr></thead>
          <tbody>${allPbs.map(p => `<tr>
            <td><span class="athlete-name">${esc(p.name)}</span></td>
            ${showSource ? `<td><span class="source-tag">${esc(p.source)}</span></td>` : ""}
            <td>${esc(p.distLabel)}</td>
            <td class="mono">${fmtRawTime(p.time)}</td>
            <td><span class="pb-badge">PB</span></td>
          </tr>`).join("")}</tbody>
        </table></div>`;
    }
  }

  // PB LEADERBOARD (athletes ranked by PB count, with percentage)
  if ((filter === "all" || filter === "pbs") && Object.keys(pbPerAthlete).length > 0) {
    // Count races per athlete (for percentage)
    const racesPerAthlete = {};
    for (const e of entries) {
      for (const a of e.standings.all) {
        for (const d of e.distances) {
          if (a.times?.[d.key] && a.status?.[d.key] === "OK") {
            racesPerAthlete[a.name] = (racesPerAthlete[a.name] || 0) + 1;
          }
        }
      }
    }
    const sorted = Object.entries(pbPerAthlete).sort((a, b) => b[1] - a[1]);
    content += `<div class="section-label" style="margin-top:24px">PB ranglijst</div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>#</th><th>Naam</th><th>PB's</th><th>Ritten</th><th>%</th></tr></thead>
        <tbody>${sorted.map(([name, count], i) => {
          const races = racesPerAthlete[name] || 0;
          const pct = races > 0 ? ((count / races) * 100).toFixed(0) : "0";
          return `<tr>
          <td>${rankHtml(i + 1)}</td>
          <td><span class="athlete-name">${esc(name)}</span></td>
          <td class="mono mono--bold">${count}</td>
          <td class="mono">${races}</td>
          <td class="mono"><span class="pct-badge">${pct}%</span></td>
        </tr>`;
        }).join("")}</tbody>
      </table></div>`;
  }

  el.contentArea.innerHTML = srcBar + filterBar + kpis + content;
  bindOverzichtEvents();
}

function bindOverzichtEvents() {
  // Source toggles
  el.contentArea.querySelectorAll("[data-source]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.source;
      state.overzichtSources[key] = !state.overzichtSources[key];
      render();
    });
  });
  // Filter buttons
  el.contentArea.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.overzichtFilter = btn.dataset.filter;
      render();
    });
  });
}

// ── Render: Kwalificatie (Allround final distance) ────
function renderKwalificatieView() {
  el.viewTitle.textContent = "Kwalificatie slotafstand";
  el.contentArea.className = "stage__body stage__body--enter";

  let html = "";

  // Render for both genders
  const genders = [
    { key: "v", label: "Vrouwen" },
    { key: "m", label: "Mannen" },
  ];

  for (const g of genders) {
    const cfg = MODULE_CONFIG.allround.genders[g.key];
    const qualCfg = QUAL_CONFIG.allround[g.key];
    if (!cfg || !qualCfg) continue;

    // Get standings (from cache or generate)
    const cacheKey = `allround_${g.key}`;
    let standings;
    if (resultsCache[cacheKey]) {
      standings = resultsCache[cacheKey].standings;
    } else {
      const raw = makeParticipantBaseline("allround", g.key);
      standings = computeStandings(raw, cfg.distances);
      resultsCache[cacheKey] = { raw, standings };
    }

    // Determine mode: check how many distances have results
    const completedDists = qualCfg.first3.filter(dk =>
      standings.all.some(a => Number.isFinite(a.seconds?.[dk]))
    );
    let mode, modeLabel;
    if (completedDists.length >= 3) {
      mode = "after3"; modeLabel = "Definitief (na 3 afstanden)";
    } else {
      mode = "after2"; modeLabel = "Voorlopig (schaduwklassement)";
    }

    const qual = computeQualification(standings.all, cfg.distances, qualCfg, mode);
    if (!qual) continue;

    const finalDist = cfg.distances.find(d => d.key === qualCfg.finalDist);
    const qualDist = cfg.distances.find(d => d.key === qualCfg.qualDist);

    html += `<div class="qual-block">
      <div class="qual-block__header">
        <span class="qual-block__title">${esc(g.label)}</span>
        <span class="qual-block__subtitle">Kwalificatie ${esc(finalDist?.label ?? "")} — ${esc(modeLabel)}</span>
      </div>`;

    // Info box explaining the rule
    html += `<div class="info-box info-box--default" style="margin-bottom:16px">
      Top 8 van zowel het klassement (na ${mode === "after3" ? "3" : "2"} afstanden) als de ${esc(qualDist?.label ?? "")} kwalificeren.
      Open plekken worden aangevuld vanuit het ${esc(qualDist?.label ?? "")}-klassement.
    </div>`;

    // Main qualification table
    const qualifiedDetails = qual.details.filter(d => d.status === "both" || d.status === "dist_swap");
    const notQualified = qual.details.filter(d => d.status === "klass_only" || d.status === "out");

    html += `<div class="section-label">Gekwalificeerd (${qualifiedDetails.length}/8)</div>
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th>#</th><th>Naam</th><th>Status</th>
          <th>Klass. positie</th><th>${esc(qualDist?.label ?? "Afstand")} positie</th>
          <th>${esc(qualDist?.label ?? "Afstand")} tijd</th>
          <th>Punten</th>
        </tr></thead>
        <tbody>${qualifiedDetails.map((d, i) => `<tr class="${d.status === "both" ? "qual-row--both" : "qual-row--swap"}">
          <td>${rankHtml(i + 1)}</td>
          <td><span class="athlete-name">${esc(d.name)}</span></td>
          <td><span class="qual-status qual-status--${esc(d.status)}">${esc(d.reason)}</span></td>
          <td class="mono">${d.klassRank ?? "—"}</td>
          <td class="mono">${d.distRank ?? "—"}</td>
          <td class="mono">${esc(d.distTime)}</td>
          <td class="mono">${Number.isFinite(d.partialPts) ? d.partialPts.toFixed(3) : "—"}</td>
        </tr>`).join("")}</tbody>
      </table></div>`;

    // Not qualified table
    if (notQualified.length > 0) {
      html += `<div class="section-label" style="margin-top:20px">Niet gekwalificeerd</div>
        <div class="table-wrap"><table class="table">
          <thead><tr>
            <th>Naam</th><th>Reden</th>
            <th>Klass. positie</th><th>${esc(qualDist?.label ?? "Afstand")} positie</th>
            <th>${esc(qualDist?.label ?? "Afstand")} tijd</th>
            <th>Punten</th>
          </tr></thead>
          <tbody>${notQualified.map(d => `<tr class="qual-row--out">
            <td><span class="athlete-name">${esc(d.name)}</span></td>
            <td><span class="qual-status qual-status--${esc(d.status)}">${esc(d.reason)}</span></td>
            <td class="mono">${d.klassRank ?? "—"}</td>
            <td class="mono">${d.distRank ?? "—"}</td>
            <td class="mono">${esc(d.distTime)}</td>
            <td class="mono">${Number.isFinite(d.partialPts) ? d.partialPts.toFixed(3) : "—"}</td>
          </tr>`).join("")}</tbody>
        </table></div>`;
    }

    html += `</div>`; // close qual-block
  }

  if (el.viewMeta) el.viewMeta.textContent = "NK Allround — Vrouwen & Mannen";
  el.contentArea.innerHTML = html;
}

// ── Manual Entry Modal ────────────────────────────────
let entryModalDist = null; // current distance key being edited
let entryModalMode = "fields"; // "fields" | "paste"

function openEntryModal(distKey) {
  const cfg = getActiveConfig();
  const dist = distKey ? cfg.distances.find(d => d.key === distKey) : cfg.distances[0];
  if (!dist) return;
  entryModalDist = dist.key;
  entryModalMode = "fields";
  renderEntryModal();
  document.getElementById("entryModal").hidden = false;
}

function closeEntryModal() {
  document.getElementById("entryModal").hidden = true;
}

function renderEntryModal() {
  const modal = document.getElementById("entryModalContent");
  if (!modal) return;
  const m = state.selectedModule;
  const g = state.selectedGender;
  const cfg = getActiveConfig();
  const dist = cfg.distances.find(d => d.key === entryModalDist) ?? cfg.distances[0];
  const participants = PARTICIPANTS[m]?.[g] ?? [];
  const startlist = getStartlist(m, g, dist.key);

  // Sort by startlist order if available
  let ordered = [...participants];
  if (startlist) {
    const orderMap = new Map();
    startlist.forEach((name, idx) => orderMap.set(normalizeName(name), idx));
    ordered.sort((a, b) => {
      const oa = orderMap.get(normalizeName(a.name)) ?? 999;
      const ob = orderMap.get(normalizeName(b.name)) ?? 999;
      return oa - ob;
    });
  }

  // Distance tabs
  const distTabs = cfg.distances.map(d => {
    const hasData = (MANUAL_TIMES[`${m}_${g}_${d.key}`] && Object.keys(MANUAL_TIMES[`${m}_${g}_${d.key}`]).length > 0);
    const active = d.key === entryModalDist ? "entry-tab--active" : "";
    const dot = hasData ? '<span class="entry-tab__dot"></span>' : "";
    return `<button class="entry-tab ${active}" data-dist="${d.key}">${dot}${esc(d.label)}</button>`;
  }).join("");

  // Mode tabs
  const fieldsActive = entryModalMode === "fields" ? "entry-mode--active" : "";
  const pasteActive = entryModalMode === "paste" ? "entry-mode--active" : "";

  let bodyHtml = "";

  if (entryModalMode === "fields") {
    // Per-athlete time fields
    const rows = ordered.map((p, idx) => {
      const pair = getPairNumber(startlist, p.name);
      const pairLabel = pair !== null ? `Rit ${pair}` : "";
      const current = getManualTime(m, g, dist.key, p.name) ?? "";
      return `<div class="entry-row">
        <span class="entry-row__pair">${esc(pairLabel)}</span>
        <span class="entry-row__name">${esc(p.name)}</span>
        <input class="entry-row__input" type="text" placeholder="0:00.00" value="${esc(current)}"
               data-athlete="${esc(p.name)}" data-idx="${idx}" />
      </div>`;
    }).join("");

    bodyHtml = `<div class="entry-fields">${rows}</div>`;
  } else {
    // Paste mode
    bodyHtml = `<div class="entry-paste">
      <p class="entry-paste__hint">Plak de resultaten van live-api.schaatsen.nl hieronder.<br>
      Formaat: <code>Naam  Tijd</code> per regel (bijv. <code>Jorrit Bergsma  37.45</code>)</p>
      <textarea class="entry-paste__area" id="entryPasteArea" rows="12"
        placeholder="1  Jorrit Bergsma  37.45&#10;2  Marcel Bosker  37.89&#10;..."></textarea>
      <button class="cta cta--small" id="entryPasteApply">
        Verwerk &amp; sla op
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;
  }

  // Count entered times
  const dk = `${m}_${g}_${dist.key}`;
  const enteredCount = MANUAL_TIMES[dk] ? Object.keys(MANUAL_TIMES[dk]).length : 0;
  const totalAthletes = participants.length;

  modal.innerHTML = `
    <div class="entry-header">
      <div>
        <div class="entry-header__title">⚡ Tijd invoeren</div>
        <div class="entry-header__sub">${esc(MODULE_CONFIG[m].label)} — ${esc(cfg.label)} — ${esc(dist.label)}</div>
      </div>
      <span class="entry-header__count">${enteredCount}/${totalAthletes}</span>
    </div>
    <div class="entry-tabs">${distTabs}</div>
    <div class="entry-modes">
      <button class="entry-mode ${fieldsActive}" data-mode="fields">Per rijder</button>
      <button class="entry-mode ${pasteActive}" data-mode="paste">Plak resultaten</button>
    </div>
    ${bodyHtml}
    <div class="entry-footer">
      <button class="entry-clear" id="entryClear">Wis deze afstand</button>
      <button class="cta" id="entryClose">Sluiten</button>
    </div>`;

  // Bind events
  modal.querySelectorAll(".entry-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      entryModalDist = btn.dataset.dist;
      renderEntryModal();
    });
  });
  modal.querySelectorAll(".entry-mode").forEach(btn => {
    btn.addEventListener("click", () => {
      entryModalMode = btn.dataset.mode;
      renderEntryModal();
    });
  });
  modal.querySelector("#entryClose")?.addEventListener("click", () => {
    closeEntryModal();
    loadData().then(() => render());
  });
  modal.querySelector("#entryClear")?.addEventListener("click", () => {
    const dk = `${m}_${g}_${entryModalDist}`;
    MANUAL_TIMES[dk] = {};
    saveManualTimes();
    renderEntryModal();
    showToast("Tijden gewist voor " + (cfg.distances.find(d => d.key === entryModalDist)?.label ?? ""));
  });

  // Field mode: bind input events
  if (entryModalMode === "fields") {
    const inputs = modal.querySelectorAll(".entry-row__input");
    inputs.forEach(inp => {
      // Save on blur or Enter
      const save = () => {
        const name = inp.dataset.athlete;
        const val = inp.value.trim();
        setManualTime(m, g, entryModalDist, name, val);
        // Update count display
        const dk = `${m}_${g}_${entryModalDist}`;
        const ct = MANUAL_TIMES[dk] ? Object.keys(MANUAL_TIMES[dk]).length : 0;
        const countEl = modal.querySelector(".entry-header__count");
        if (countEl) countEl.textContent = `${ct}/${totalAthletes}`;
        // Update dot on distance tab
        const tab = modal.querySelector(`.entry-tab[data-dist="${entryModalDist}"]`);
        if (tab && ct > 0 && !tab.querySelector(".entry-tab__dot")) {
          tab.insertAdjacentHTML("afterbegin", '<span class="entry-tab__dot"></span>');
        }
      };
      inp.addEventListener("blur", save);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          save();
          // Focus next input
          const idx = parseInt(inp.dataset.idx);
          const next = modal.querySelector(`.entry-row__input[data-idx="${idx + 1}"]`);
          if (next) next.focus();
          e.preventDefault();
        }
      });
    });
    // Auto-focus first empty input
    const firstEmpty = [...inputs].find(i => !i.value);
    if (firstEmpty) setTimeout(() => firstEmpty.focus(), 100);
  }

  // Paste mode: bind apply
  if (entryModalMode === "paste") {
    modal.querySelector("#entryPasteApply")?.addEventListener("click", () => {
      const text = document.getElementById("entryPasteArea")?.value ?? "";
      const parsed = parsePastedResults(text);
      if (parsed.length === 0) {
        showToast("Geen tijden gevonden in de tekst");
        return;
      }
      // Match parsed names to participants using fuzzy matching
      const normalize = normalizeName;
      const pMap = new Map();
      participants.forEach(p => pMap.set(normalize(p.name), p.name));

      let matched = 0;
      for (const r of parsed) {
        // Try exact match first
        let matchedName = pMap.get(normalize(r.name));
        // Try partial match (last name only)
        if (!matchedName) {
          const rLast = r.name.split(/\s+/).pop()?.toLowerCase();
          for (const [nk, nv] of pMap) {
            if (nk.endsWith(rLast) || nk.includes(rLast)) {
              matchedName = nv;
              break;
            }
          }
        }
        if (matchedName) {
          setManualTime(m, g, entryModalDist, matchedName, r.time);
          matched++;
        }
      }
      showToast(`${matched} van ${parsed.length} tijden verwerkt`);
      renderEntryModal();
    });
  }
}

// ── Debug Panel ───────────────────────────────────────
async function openDebugPanel() {
  const panel = document.getElementById("debugPanel");
  const content = document.getElementById("debugContent");
  if (!panel || !content) return;
  panel.hidden = false;

  content.innerHTML = '<div style="color:#F6AD55">⏳ Fetching all comps...</div>';

  // Use prefetchEvent to get all data (reuses cache)
  const eventId = "2026_NED_0004";
  await prefetchEvent(eventId);

  const compData = {};
  for (let c = 1; c <= 8; c++) {
    const cached = _fetchCache[`${eventId}_${c}`];
    compData[c] = cached?.data ?? null;
  }

  let html = '<div style="margin-bottom:8px;font-size:14px;font-weight:700;color:#fff">🔍 Debug — Comp Mapping + Name Match</div>';
  html += `<div style="margin-bottom:4px;color:var(--text-dim)">DataSource: <b style="color:#fff">${esc(dataSource)}</b> | Standings: <b style="color:#fff">${(state.standings?.all??[]).length} athletes, ${(state.standings?.all??[]).filter(a=>a.completedCount>0).length} met tijden</b></div>`;

  // Cache status
  const now = Date.now();
  const cacheStatus = [1,2,3,4,5,6,7,8].map(c => {
    const cached = _fetchCache[`${eventId}_${c}`];
    if (!cached) return `<span style="color:#FC8181">C${c}:❌</span>`;
    const age = Math.round((now - cached.ts) / 1000);
    const hasData = Array.isArray(cached.data) && cached.data.length > 0;
    return `<span style="color:${hasData ? '#68D391' : '#F6AD55'}">C${c}:${hasData ? cached.data.length : 0} (${age}s)</span>`;
  }).join(" ");
  html += `<div style="margin-bottom:8px;font-size:10px;font-family:var(--font-mono);color:var(--text-dim)">Cache: ${cacheStatus}</div>`;

  // Per-distance merge status for current module+gender
  const curCfg = getActiveConfig();
  const curEventId = LIVE_URLS[state.selectedModule]?.eventId ?? eventId;
  const curUrls = LIVE_URLS[state.selectedModule]?.[state.selectedGender] ?? {};
  const mergeStatus = curCfg.distances.map(d => {
    const entry = curUrls[d.key];
    if (!entry) return `<span style="color:#FC8181">${d.label}: no mapping</span>`;
    const cached = _fetchCache[`${curEventId}_${entry.compId}`];
    const parsed = cached?.data ? parseKnsbResponse(cached.data) : null;
    const count = parsed ? parsed.length : 0;
    const icon = count > 0 ? "✅" : "❌";
    return `<span style="color:${count > 0 ? '#68D391' : '#FC8181'}">${d.label}→C${entry.compId}: ${count} ${icon}</span>`;
  }).join(" | ");
  html += `<div style="margin-bottom:8px;font-size:11px;color:var(--text-dim)"><b style="color:#fff">${state.selectedModule} ${state.selectedGender}:</b> ${mergeStatus}</div>`;
  html += `<div style="margin-bottom:12px"><button id="debugForceRefresh" style="padding:4px 12px;background:#F6AD55;color:#000;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">🔄 Force Refresh (clear cache)</button></div>`;

  // Parse each and show names + auto-detect gender
  const vNames = new Set(PARTICIPANTS.allround.v.map(p => normalizeName(p.name)));
  const mNames = new Set(PARTICIPANTS.allround.m.map(p => normalizeName(p.name)));

  html += '<div style="margin:8px 0 4px;font-weight:700;color:var(--accent);border-top:1px solid var(--border);padding-top:8px">NK Allround — Comp ID Auto-Detect</div>';

  const autoMap = {}; // compId → { gender, names[] }

  for (let c = 1; c <= 8; c++) {
    const parsed = parseKnsbResponse(compData[c]);
    const names = parsed ? parsed.map(r => r.name) : [];
    const namesSample = names.slice(0, 4).join(", ");

    // Match against participant lists
    let vMatch = 0, mMatch = 0;
    for (const n of names) {
      if (vNames.has(normalizeName(n))) vMatch++;
      if (mNames.has(normalizeName(n))) mMatch++;
    }

    // Auto-detect gender
    let detectedGender = "?";
    if (vMatch > mMatch && vMatch >= 5) detectedGender = "♀";
    else if (mMatch > vMatch && mMatch >= 5) detectedGender = "♂";
    else if (names.length === 0) detectedGender = "leeg";
    autoMap[c] = { gender: detectedGender, vMatch, mMatch, names, parsed };

    // Current mapping
    let curMapping = "—";
    for (const [gk, gd] of Object.entries(LIVE_URLS.allround)) {
      if (gk === "eventId") continue;
      for (const [dk, dd] of Object.entries(gd)) {
        if (dd.compId === c) {
          const dist = MODULE_CONFIG.allround?.genders[gk]?.distances.find(d => d.key === dk);
          curMapping = `${gk === "v" ? "♀" : "♂"} ${dist?.label ?? dk}`;
        }
      }
    }

    const matchOk = (detectedGender === "♀" && curMapping.startsWith("♀")) ||
                    (detectedGender === "♂" && curMapping.startsWith("♂")) ||
                    detectedGender === "leeg";
    const icon = detectedGender === "leeg" ? "⏸️" : matchOk ? "✅" : "❌ FOUT";
    const color = detectedGender === "leeg" ? "var(--text-dim)" : matchOk ? "#68D391" : "#FC8181";

    html += `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <div style="color:${color}"><b>Comp ${c}</b> — Mapping: ${esc(curMapping)} — Detect: ${detectedGender} (♀${vMatch} ♂${mMatch}) ${icon}</div>
      <div style="color:var(--text-dim);font-size:10px">${names.length} results: ${esc(namesSample)}${names.length > 4 ? ", ..." : ""}</div>
    </div>`;
  }

  // Name matching detail for current module
  const m = state.selectedModule, g = state.selectedGender;
  const cfg = getActiveConfig();
  const partList = PARTICIPANTS[m]?.[g] ?? [];
  const partNames = new Set(partList.map(p => normalizeName(p.name)));

  html += `<div style="margin:16px 0 6px;font-weight:700;color:var(--accent);border-top:1px solid var(--border);padding-top:8px">Name Match: ${esc(m)} ${esc(g)} (${partList.length} deelnemers)</div>`;

  // Get all API names for current module+gender comps
  const urlMap = LIVE_URLS[m]?.[g] ?? {};
  const apiNames = new Map(); // normalized → original
  for (const [dk, dd] of Object.entries(urlMap)) {
    const parsed = parseKnsbResponse(compData[dd.compId]);
    if (!parsed) continue;
    for (const r of parsed) {
      const nk = normalizeName(r.name);
      if (!apiNames.has(nk)) apiNames.set(nk, { name: r.name, dists: [] });
      apiNames.get(nk).dists.push(dk);
    }
  }

  // Show matches and mismatches
  let matchCount = 0;
  const unmatched = [];
  for (const p of partList) {
    const nk = normalizeName(p.name);
    if (apiNames.has(nk)) {
      matchCount++;
    } else {
      unmatched.push(p.name);
    }
  }

  // API names NOT in our list
  const apiOnly = [];
  for (const [nk, info] of apiNames) {
    if (!partNames.has(nk)) apiOnly.push(info.name);
  }

  html += `<div style="color:${matchCount === partList.length ? "#68D391" : "#FC8181"}">Match: ${matchCount}/${partList.length}</div>`;

  if (unmatched.length > 0) {
    html += `<div style="margin:4px 0;color:#FC8181;font-size:12px"><b>Deelnemers NIET in API:</b></div>`;
    for (const n of unmatched) {
      html += `<div style="color:#FC8181;font-size:11px;padding:1px 0">• ${esc(n)}</div>`;
    }
  }
  if (apiOnly.length > 0) {
    html += `<div style="margin:4px 0;color:#F6AD55;font-size:12px"><b>API namen NIET in deelnemerslijst:</b></div>`;
    for (const n of apiOnly) {
      html += `<div style="color:#F6AD55;font-size:11px;padding:1px 0">• ${esc(n)}</div>`;
    }
  }

  // Suggest fix button
  const wrongComps = Object.entries(autoMap).filter(([c, d]) =>
    d.gender !== "leeg" && d.gender !== "?"
  );
  if (wrongComps.some(([c, d]) => {
    let cur = "";
    for (const [gk, gd] of Object.entries(LIVE_URLS.allround)) {
      if (gk === "eventId") continue;
      for (const [, dd] of Object.entries(gd)) {
        if (dd.compId === Number(c)) cur = gk === "v" ? "♀" : "♂";
      }
    }
    return (d.gender === "♀" && cur !== "♀") || (d.gender === "♂" && cur !== "♂");
  })) {
    html += `<div style="margin:12px 0;padding:10px;background:rgba(252,129,129,.15);border:1px solid rgba(252,129,129,.3);border-radius:8px;color:#FC8181">
      <b>⚠️ Comp ID mapping is fout!</b> Gender mismatch gedetecteerd. Klik om automatisch te fixen:
      <button id="debugAutoFix" style="margin-top:6px;display:block;padding:6px 16px;background:#F6AD55;color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer">🔧 Auto-fix mapping</button>
    </div>`;
  }

  content.innerHTML = html;

  // Force refresh handler
  document.getElementById("debugForceRefresh")?.addEventListener("click", async () => {
    // Clear all caches
    for (const k of Object.keys(_fetchCache)) delete _fetchCache[k];
    console.log("[Klassement] Cache cleared, refetching...");
    await loadAndRender();
    // Re-open debug panel to show updated state
    openDebugPanel();
  });

  // Auto-fix handler
  document.getElementById("debugAutoFix")?.addEventListener("click", () => {
    // Rebuild LIVE_URLS based on auto-detected genders
    // Group comps by gender
    const vComps = [], mComps = [];
    for (const [c, d] of Object.entries(autoMap)) {
      if (d.gender === "♀") vComps.push({ compId: Number(c), count: d.names.length, parsed: d.parsed });
      if (d.gender === "♂") mComps.push({ compId: Number(c), count: d.names.length, parsed: d.parsed });
    }

    // Sort by comp ID to maintain order
    vComps.sort((a, b) => a.compId - b.compId);
    mComps.sort((a, b) => a.compId - b.compId);

    // Allround vrouwen distances in order: 500, 3000, 1500, 5000
    const vDists = ["d1_500", "d1_3000", "d1_1500", "d1_5000"];
    const mDists = ["d1_500", "d1_5000", "d1_1500", "d1_10000"];

    console.log("[Klassement] Auto-fix: vrouwen comps:", vComps.map(c => c.compId));
    console.log("[Klassement] Auto-fix: mannen comps:", mComps.map(c => c.compId));

    // Assign in order
    for (let i = 0; i < Math.min(vComps.length, vDists.length); i++) {
      LIVE_URLS.allround.v[vDists[i]] = { compId: vComps[i].compId };
    }
    for (let i = 0; i < Math.min(mComps.length, mDists.length); i++) {
      LIVE_URLS.allround.m[mDists[i]] = { compId: mComps[i].compId };
    }

    console.log("[Klassement] New LIVE_URLS.allround:", JSON.stringify(LIVE_URLS.allround));
    showToast("Mapping gefixt! Data wordt herladen...");

    // Reload data
    loadData().then(() => {
      render();
      openDebugPanel(); // Refresh debug panel
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

  // Debug panel
  document.getElementById("debugBtn")?.addEventListener("click", openDebugPanel);
  document.getElementById("debugClose")?.addEventListener("click", () => {
    document.getElementById("debugPanel").hidden = true;
  });
  document.getElementById("debugPanel")?.addEventListener("click", (e) => {
    if (e.target.id === "debugPanel") document.getElementById("debugPanel").hidden = true;
  });

  // Manual Entry modal
  document.getElementById("openEntryBtn")?.addEventListener("click", () => {
    openEntryModal(state.selectedDistanceKey ?? null);
  });
  document.getElementById("entryModalClose")?.addEventListener("click", () => {
    closeEntryModal();
    loadData().then(() => render());
  });
  document.getElementById("entryModal")?.addEventListener("click", (e) => {
    if (e.target.id === "entryModal") {
      closeEntryModal();
      loadData().then(() => render());
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("entryModal")?.hidden) {
      closeEntryModal();
      loadData().then(() => render());
    }
  });
}

function resetViewState() {
  // Keep kwalificatie view when switching module/gender (it's standalone)
  if (state.selectedView !== "kwalificatie") {
    state.selectedView = "klassement";
  }
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
  saveStateToHash();
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
  if (state.selectedView === "overzicht") return renderOverzichtView();
  if (state.selectedView === "kwalificatie") return renderKwalificatieView();
  return renderStandingsView(cfg.distances, state.standings);
}

async function loadAndRender() {
  await loadData();
  render();
  startPolling();
}

async function boot() {
  cacheEls();
  loadStateFromHash();
  bindEvents();
  initPopupHandlers();
  loadManualTimes();
  await loadAndRender();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot());
else boot();
