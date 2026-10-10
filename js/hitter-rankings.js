import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://uxvuehmighuqqejowxoq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mQiGDDJ7o5vbF5RYSnl0-g_tRiJRi06";
const PUBLIC_VIEW = "diamondrank_current_hitters_v1";
const PAGE_SIZE = 50;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const LIST_FIELDS = [
  "player_id",
  "overall_rank",
  "position_rank",
  "full_name",
  "primary_position",
  "position_family",
  "current_org",
  "current_level",
  "age",
  "overall_score",
  "opportunity_score",
  "fantasy_profile_score",
  "ranking_confidence",
  "data_updated_at"
].join(",");

const state = {
  rows: [],
  filtered: [],
  visible: PAGE_SIZE,
  loading: false
};

const el = {
  headerStatus: document.getElementById("headerStatus"),
  heroCount: document.getElementById("heroCount"),
  heroUpdated: document.getElementById("heroUpdated"),
  resultCount: document.getElementById("resultCount"),
  search: document.getElementById("searchInput"),
  position: document.getElementById("positionFilter"),
  org: document.getElementById("orgFilter"),
  level: document.getElementById("levelFilter"),
  sort: document.getElementById("sortSelect"),
  clear: document.getElementById("clearFilters"),
  toolbar: document.getElementById("leaderboardFilters"),
  filterToggle: document.getElementById("mobileFilterToggle"),
  activeFilterCount: document.getElementById("activeFilterCount"),
  board: document.getElementById("leaderboard"),
  loading: document.getElementById("loadingState"),
  error: document.getElementById("errorState"),
  errorMessage: document.getElementById("errorMessage"),
  retry: document.getElementById("retryButton"),
  more: document.getElementById("loadMoreButton"),
  dialog: document.getElementById("playerDialog"),
  dialogClose: document.getElementById("dialogClose"),
  dialogLoading: document.getElementById("dialogLoading"),
  dialogContent: document.getElementById("dialogContent")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number1(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

function contextNumber2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const normalized = Math.abs(n) < 0.005 ? 0 : n;
  return normalized.toFixed(2);
}

function yearValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "—";
}

function battingRate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(3).replace(/^0/, "") : "—";
}

function percentFromRate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—";
}

function integer(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
}

function formatDate(value) {
  if (!value) return "Update time unavailable";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Update time unavailable";
  return `Updated ${new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(d)}`;
}

function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(d);
}

function positionFamilyLabel(value) {
  const map = {
    C: "Catcher",
    MIDDLE_IF: "Middle IF",
    CORNER_IF: "Corner IF",
    CF: "Center Field",
    CORNER_OF: "Corner OF",
    GENERIC_IF: "Infield",
    GENERIC_OF: "Outfield"
  };
  return map[value] || value || "Other";
}

function confidenceLabel(value) {
  if (!value) return "Evidence confidence · —";
  const text = String(value).toLowerCase().replaceAll("_", " ");
  const label = `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  return `Evidence confidence · ${label}`;
}

function sampleTierLabel(value) {
  const text = String(value || "—").toLowerCase().replaceAll("_", " ");
  return text === "—" ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function setLoading(on) {
  state.loading = on;
  el.loading.hidden = !on;
  if (on) {
    el.error.hidden = true;
    el.board.innerHTML = "";
    el.more.hidden = true;
  }
}

function setError(message) {
  setLoading(false);
  el.error.hidden = false;
  el.errorMessage.textContent = message || "Please retry.";
  el.headerStatus.textContent = "Rankings unavailable";
}

function populateSelect(select, values, labeler = (v) => v) {
  const current = select.value;
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  select.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
  for (const value of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labeler(value);
    select.append(option);
  }
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

async function loadRankings() {
  setLoading(true);
  el.error.hidden = true;

  const { data, error } = await supabase
    .from(PUBLIC_VIEW)
    .select(LIST_FIELDS)
    .order("overall_rank", { ascending: true });

  if (error) {
    setError(error.message);
    return;
  }

  state.rows = data || [];
  state.visible = PAGE_SIZE;

  populateSelect(el.position, state.rows.map((r) => r.position_family), positionFamilyLabel);
  populateSelect(el.org, state.rows.map((r) => r.current_org));
  populateSelect(el.level, state.rows.map((r) => r.current_level));

  const latest = state.rows.reduce((max, row) => {
    const t = row.data_updated_at ? new Date(row.data_updated_at).getTime() : 0;
    return t > max ? t : max;
  }, 0);

  el.heroCount.textContent = state.rows.length.toLocaleString();
  el.heroUpdated.textContent = latest ? formatShortDate(latest) : "—";
  el.headerStatus.textContent = "Current hitter board";

  setLoading(false);
  applyFilters();
}

function activeFilterCount() {
  return [el.position.value, el.org.value, el.level.value].filter(Boolean).length;
}

function updateFilterToggle() {
  if (!el.filterToggle || !el.activeFilterCount) return;
  const count = activeFilterCount();
  el.activeFilterCount.textContent = String(count);
  el.activeFilterCount.hidden = count === 0;
  el.filterToggle.classList.toggle("has-active-filters", count > 0);
}

function applyFilters() {
  updateFilterToggle();
  const q = el.search.value.trim().toLowerCase();
  const pos = el.position.value;
  const org = el.org.value;
  const level = el.level.value;
  const sort = el.sort.value;

  const filtered = state.rows.filter((row) => {
    if (pos && row.position_family !== pos) return false;
    if (org && row.current_org !== org) return false;
    if (level && row.current_level !== level) return false;
    if (!q) return true;

    const haystack = [
      row.full_name,
      row.current_org,
      row.primary_position,
      row.position_family,
      row.current_level
    ].join(" ").toLowerCase();

    return haystack.includes(q);
  });

  filtered.sort((a, b) => {
    if (sort === "opportunity") {
      return Number(b.opportunity_score) - Number(a.opportunity_score) || a.overall_rank - b.overall_rank;
    }
    if (sort === "fantasy") {
      return Number(b.fantasy_profile_score) - Number(a.fantasy_profile_score) || a.overall_rank - b.overall_rank;
    }
    return a.overall_rank - b.overall_rank;
  });

  state.filtered = filtered;
  state.visible = Math.min(state.visible, Math.max(PAGE_SIZE, filtered.length));
  renderBoard();
}

function renderBoard() {
  const visibleRows = state.filtered.slice(0, state.visible);
  el.resultCount.textContent = state.filtered.length.toLocaleString();

  if (!visibleRows.length) {
    el.board.innerHTML = `<div class="state-card"><strong>No hitters match these filters.</strong></div>`;
    el.more.hidden = true;
    return;
  }

  el.board.innerHTML = visibleRows.map((row) => `
    <button class="player-row" type="button" data-player-id="${escapeHtml(row.player_id)}" aria-label="Open ${escapeHtml(row.full_name)} details">
      <div class="rank-box"><small>#</small><span class="rank-number">${integer(row.overall_rank)}</span></div>
      <div class="player-main">
        <div class="player-name">${escapeHtml(row.full_name)}</div>
        <div class="player-meta">
          <span>${escapeHtml(row.primary_position || row.position_family || "—")}</span>
          <span>${escapeHtml(row.current_org || "FA")}</span>
          <span>${escapeHtml(row.current_level || "—")}</span>
          <span class="age-meta">Age ${number1(row.age)}</span>
          <span class="confidence">${escapeHtml(confidenceLabel(row.ranking_confidence))}</span>
        </div>
      </div>
      <div class="score-cell primary ${scoreToneClass(row.overall_score)}"><strong>${number1(row.overall_score)}</strong><span>Overall</span></div>
      <div class="score-cell opportunity ${scoreToneClass(row.opportunity_score)}"><strong>${number1(row.opportunity_score)}</strong><span>Opportunity</span></div>
      <div class="score-cell fantasy ${scoreToneClass(row.fantasy_profile_score)}"><strong>${number1(row.fantasy_profile_score)}</strong><span>Fantasy</span></div>
      <div class="row-chevron" aria-hidden="true">›</div>
    </button>
  `).join("");

  el.more.hidden = state.visible >= state.filtered.length;
}

function clamp(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

function scoreToneClass(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return "tone-neutral";
  if (score >= 85) return "tone-emerald";
  if (score >= 75) return "tone-lime";
  if (score >= 65) return "tone-gold";
  if (score >= 50) return "tone-orange";
  return "tone-red";
}

function contextToneClass(value) {
  const z = Number(value);
  if (!Number.isFinite(z)) return "tone-neutral";
  if (z >= 1.0) return "tone-emerald";
  if (z >= 0.35) return "tone-lime";
  if (z > -0.35) return "tone-gold";
  if (z > -1.0) return "tone-orange";
  return "tone-red";
}

function scoreRing(label, value, size = "small") {
  const score = clamp(value, 0, 99.9);
  return `
    <div class="score-ring-card ${size} ${scoreToneClass(value)}">
      <div class="score-ring" style="--meter:${score}" role="img" aria-label="${escapeHtml(label)} ${number1(value)} out of 99.9">
        <div class="score-ring-center">
          <strong>${number1(value)}</strong>
        </div>
      </div>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function fantasyTraitMeters(player) {
  const traits = [
    ["Production", player.production_score],
    ["Power", player.power_score],
    ["Contact", player.contact_score],
    ["Discipline", player.discipline_score],
    ["Speed", player.speed_score]
  ];

  return `
    <div class="trait-meter-grid">
      ${traits.map(([label, value]) => scoreRing(label, value, "trait")).join("")}
    </div>
  `;
}

function contextPosition(z) {
  const value = Number(z);
  if (!Number.isFinite(value)) return 50;
  return clamp(50 + (value * 18), 5, 95);
}

function contextRawLabel(item) {
  const key = String(item?.key || "").toUpperCase();
  const raw = Number(item?.raw_value);

  if (!Number.isFinite(raw)) return "—";
  if (key === "PRODUCTION") return `wRC+ ${raw.toFixed(1)}`;
  if (key === "POWER") return `ISO ${raw.toFixed(3).replace(/^0/, "")}`;
  if (key === "CONTACT") return `K% ${raw.toFixed(1)}`;
  if (key === "DISCIPLINE") return `BB% ${raw.toFixed(1)}`;
  if (key === "SPEED") return `Spd ${raw.toFixed(2)}`;
  return String(item.raw_value);
}

function contextMeters(player) {
  const dims = Array.isArray(player.hitting_shape?.profile_dimensions)
    ? player.hitting_shape.profile_dimensions
    : [];

  if (!dims.length) {
    return `<div class="compact-empty">No context-relative hitting profile is available.</div>`;
  }

  return `
    <div class="context-meter-grid">
      ${dims.map((item) => {
        const z = Number(item.z);
        const position = contextPosition(z);
        const band = item.band_label || "Context comparison";
        return `
          <div class="context-meter ${contextToneClass(z)}" role="img" aria-label="${escapeHtml(item.label || item.key || "Trait")}: ${escapeHtml(band)}, context z ${contextNumber2(z)}">
            <strong>${escapeHtml(item.label || item.key || "Trait")}</strong>
            <div class="context-track" style="--dot:${position}%">
              <span class="context-mid"></span>
              <span class="context-dot"></span>
            </div>
            <div class="context-scale"><span>−</span><b>${contextNumber2(z)}</b><span>+</span></div>
            <small>${escapeHtml(contextRawLabel(item))}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function battedBallContextLabel(z, label) {
  const value = Number(z);
  const name = String(label || "Rate");
  if (!Number.isFinite(value)) return "Context unavailable";
  if (value >= 1.0) return `Much more ${name.toLowerCase()} than context`;
  if (value >= 0.35) return `More ${name.toLowerCase()} than context`;
  if (value > -0.35) return `Typical ${name.toLowerCase()} mix`;
  if (value > -1.0) return `Less ${name.toLowerCase()} than context`;
  return `Much less ${name.toLowerCase()} than context`;
}

function battedBallContextPosition(z) {
  const value = Number(z);
  if (!Number.isFinite(value)) return 50;
  return clamp(50 + (value * 20), 5, 95);
}

function sprayProfile(player) {
  const items = Array.isArray(player.hitting_shape?.batted_ball_shape)
    ? player.hitting_shape.batted_ball_shape
    : [];

  if (!items.length) return "";

  const byKey = Object.fromEntries(items.map((item) => [String(item.key || "").toUpperCase(), item]));
  const pull = Number(byKey.PULL?.pct);
  const center = Number(byKey.CENTER?.pct);
  const oppo = Number(byKey.OPPO?.pct);
  const gb = Number(byKey.GB?.pct);
  const fb = Number(byKey.FB?.pct);
  const ld = Number(byKey.LD?.pct);

  const alpha = (value) => {
    if (!Number.isFinite(value)) return 0.12;
    return Math.min(0.82, 0.16 + (value / 100) * 1.25);
  };

  return `
    <div class="spray-layout">
      <div class="spray-card">
        <div class="spray-title">
          <strong>Spray tendency</strong>
          <span>Where contact is going</span>
        </div>
        <svg class="spray-field" viewBox="0 0 300 180" role="img" aria-label="Spray tendency: Pull ${number1(pull)} percent, Center ${number1(center)} percent, Opposite ${number1(oppo)} percent">
          <path class="field-outline" d="M150 164 L34 70 Q150 -6 266 70 Z"></path>
          <path class="field-zone spray-pull" style="fill-opacity:${alpha(pull)}" d="M150 164 L34 70 Q72 28 113 32 Z"></path>
          <path class="field-zone spray-center" style="fill-opacity:${alpha(center)}" d="M150 164 L113 32 Q150 15 187 32 Z"></path>
          <path class="field-zone spray-oppo" style="fill-opacity:${alpha(oppo)}" d="M150 164 L187 32 Q228 28 266 70 Z"></path>
          <path class="infield" d="M150 145 L124 119 L150 93 L176 119 Z"></path>
          <circle class="home-plate-dot" cx="150" cy="157" r="4"></circle>
          <text x="94" y="74" text-anchor="middle">PULL</text>
          <text x="150" y="42" text-anchor="middle">CENTER</text>
          <text x="206" y="74" text-anchor="middle">OPPO</text>
          <text class="spray-pct" x="94" y="93" text-anchor="middle">${number1(pull)}%</text>
          <text class="spray-pct" x="150" y="61" text-anchor="middle">${number1(center)}%</text>
          <text class="spray-pct" x="206" y="93" text-anchor="middle">${number1(oppo)}%</text>
        </svg>
      </div>

      <div class="contact-type-grid">
        ${contactTypeCell("GB", "Ground ball", gb, byKey.GB?.z, "ground")}
        ${contactTypeCell("FB", "Fly ball", fb, byKey.FB?.z, "fly")}
        ${contactTypeCell("LD", "Line drive", ld, byKey.LD?.z, "line")}
      </div>
    </div>
  `;
}

function contactTypeCell(shortLabel, label, value, z, tone = "") {
  const position = battedBallContextPosition(z);
  const contextLabel = battedBallContextLabel(z, label);

  return `
    <div class="contact-type ${escapeHtml(tone)}" role="img"
      aria-label="${escapeHtml(label)} ${number1(value)} percent. ${escapeHtml(contextLabel)}">
      <div class="contact-type-head">
        <strong>${shortLabel}</strong>
        <span>${number1(value)}%</span>
      </div>

      <div class="bb-context-track" style="--bb-dot:${position}%">
        <span class="bb-context-mid"></span>
        <i></i>
      </div>

      <div class="bb-context-scale">
        <span>Less</span>
        <span>More</span>
      </div>

      <small class="bb-context-label">${escapeHtml(contextLabel)}</small>
    </div>
  `;
}

function compactSwStr(player) {
  const percentile = clamp(player.swstr_contact_percentile, 0, 99.9);
  const tone = scoreToneClass(percentile);

  return `
    <div class="swing-miss-card ${tone}">
      <div class="swing-miss-head">
        <div>
          <small>Bat-to-ball percentile</small>
          <strong>${number1(player.swstr_contact_percentile)}</strong>
        </div>
        <span>${escapeHtml(player.swstr_shape_label || "—")}</span>
      </div>

      <div class="batball-meter" style="--batball:${percentile}%">
        <i></i>
      </div>
      <div class="batball-scale">
        <span>More swing & miss</span>
        <span>More contact</span>
      </div>

      <div class="swing-miss-facts">
        <div>
          <small>Swinging-strike rate</small>
          <strong>${percentFromRate(player.swstr_pct)}</strong>
          <span>Lower is better</span>
        </div>
        <div>
          <small>Sample depth</small>
          <strong>${integer(player.swstr_source_pa)} PA</strong>
          <span>${escapeHtml(sampleTierLabel(player.swstr_sample_tier))} coverage</span>
        </div>
      </div>

      <p class="swing-miss-explainer">
        ${percentFromRate(player.swstr_pct)} of pitches resulted in a swing-and-miss. The percentile shows how that bat-to-ball result compares with the current context.
      </p>
    </div>
  `;
}

function outcomeToneClass(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("star")) return "outcome-star";
  if (key.includes("regular")) return "outcome-regular";
  if (key.includes("depth")) return "outcome-depth";
  if (key.includes("limited")) return "outcome-limited";
  if (key.includes("no mlb")) return "outcome-none";
  return "outcome-neutral";
}

function matchQualityToneClass(key) {
  const value = String(key || "").toUpperCase();
  if (value === "TIGHT") return "quality-tight";
  if (value === "STRONG") return "quality-strong";
  if (value === "SOLID") return "quality-solid";
  if (value === "BROAD") return "quality-broad";
  if (value === "LOOSE") return "quality-loose";
  return "quality-neutral";
}

function fiveYearOutcomePanel(player) {
  const context = player.comparable_context || {};
  const outcomes = context.five_year_outcomes || {};
  const pool = Number(context.comparison_pool_size) || 0;

  if (!pool) return "";

  const buckets = [
    ["No MLB", outcomes.no_mlb, "outcome-none"],
    ["Limited MLB", outcomes.limited_mlb, "outcome-limited"],
    ["Depth MLB", outcomes.depth_mlb, "outcome-depth"],
    ["Regular MLB", outcomes.regular_mlb, "outcome-regular"],
    ["Star MLB", outcomes.star_mlb, "outcome-star"]
  ];

  const segmentLabel = buckets
    .map(([label, value]) => `${label} ${number1(value?.pct)}%`)
    .join(", ");

  return `
    <div class="five-year-panel">
      <div class="five-year-head">
        <div>
          <strong>5-Year MLB Outcomes</strong>
          <span>All ${integer(pool)} refined comparables</span>
        </div>
      </div>

      <div class="outcome-segments" role="img" aria-label="${escapeHtml(segmentLabel)}">
        ${buckets.map(([, value, tone]) => `
          <i class="${tone}" style="width:${clamp(value?.pct, 0, 100)}%"></i>
        `).join("")}
      </div>

      <div class="outcome-legend">
        ${buckets.map(([label, value, tone]) => `
          <div class="${tone}">
            <span></span>
            <small>${escapeHtml(label)}</small>
            <strong>${number1(value?.pct)}%</strong>
          </div>
        `).join("")}
      </div>

      <div class="outcome-medians">
        <div>
          <small>Median MLB PA</small>
          <strong>${integer(outcomes.median_mlb_pa)}</strong>
        </div>
        <div>
          <small>Median WAR</small>
          <strong>${number1(outcomes.median_mlb_war)}</strong>
        </div>
        <div>
          <small>Median wRC+</small>
          <strong>${integer(outcomes.median_mlb_wrc_plus)}</strong>
        </div>
      </div>

      <div class="outcome-sample-note">
        ${Number(outcomes.meaningful_mlb_sample_count) > 0
          ? `WAR & wRC+ use comps with 250+ MLB PA · n=${integer(outcomes.meaningful_mlb_sample_count)}`
          : `No comps reached 250+ MLB PA; WAR & wRC+ are unavailable.`}
      </div>

      <details class="outcome-definitions">
        <summary>5-year outcome definitions</summary>
        <div>
          <p><b>No MLB:</b> ${escapeHtml(outcomes.definitions?.no_mlb || "0 MLB PA within five seasons")}</p>
          <p><b>Limited MLB:</b> ${escapeHtml(outcomes.definitions?.limited_mlb || "1–249 MLB PA within five seasons")}</p>
          <p><b>Depth MLB:</b> ${escapeHtml(outcomes.definitions?.depth_mlb || "250–999 MLB PA within five seasons")}</p>
          <p><b>Regular MLB:</b> ${escapeHtml(outcomes.definitions?.regular_mlb || "1,000+ MLB PA below the Star threshold")}</p>
          <p><b>Star MLB:</b> ${escapeHtml(outcomes.definitions?.star_mlb || "1,000+ MLB PA and 10+ WAR within five seasons")}</p>
          <p><b>Median WAR:</b> ${escapeHtml(outcomes.definitions?.median_mlb_war || "Uses comps with a meaningful MLB sample")}</p>
          <p><b>Median wRC+:</b> ${escapeHtml(outcomes.definitions?.median_wrc_plus || "Uses comps with a meaningful MLB sample")}</p>
        </div>
      </details>
    </div>
  `;
}

function compCards(player) {
  const comps = Array.isArray(player.top_comparables) ? player.top_comparables : [];
  if (!comps.length) return `<div class="compact-empty">No comparables available.</div>`;

  return comps.map((comp, index) => {
    const outcome = comp.five_year_outcome || "—";
    const matchPct = Number(comp.match_pct);
    const matchLabel = Number.isFinite(matchPct)
      ? `Match ${index + 1} · ${Math.round(matchPct)}%`
      : `Match ${index + 1}`;

    const mlbPa = Number(comp.five_year_mlb_pa);
    const mlbWar = Number(comp.five_year_mlb_war);
    const mlbWrcPlus = Number(comp.five_year_mlb_wrc_plus);

    return `
      <div class="comp-card">
        <div class="comp-topline">
          <span>${matchLabel}</span>
        </div>

        <div class="comp-name">${escapeHtml(comp.name || "Historical comp")}</div>
        <div class="comp-meta">${escapeHtml(comp.level || "—")} • ${escapeHtml(comp.season || "—")} • ${escapeHtml(comp.position || comp.position_family || "—")}</div>

        <div class="comp-mlb-stats" aria-label="Five-year MLB results">
          <div>
            <small>5Y PA</small>
            <strong>${Number.isFinite(mlbPa) ? integer(mlbPa) : "—"}</strong>
          </div>
          <div>
            <small>WAR</small>
            <strong>${Number.isFinite(mlbWar) ? number1(mlbWar) : "—"}</strong>
          </div>
          <div>
            <small>wRC+</small>
            <strong>${Number.isFinite(mlbWrcPlus) ? integer(mlbWrcPlus) : "—"}</strong>
          </div>
        </div>

        <div class="comp-outcome ${outcomeToneClass(outcome)}">${escapeHtml(outcome)}</div>
      </div>
    `;
  }).join("");
}

function signed1(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const rounded = n.toFixed(2);
  return n > 0 ? `+${rounded}` : rounded;
}

function signedPoint1(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const rounded = n.toFixed(1);
  return n > 0 ? `+${rounded}` : rounded;
}

function zToPercentile(value) {
  const z = Number(value);
  if (!Number.isFinite(z)) return null;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + (0.3275911 * x));
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const erf = sign * (
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
    t *
    Math.exp(-(x * x))
  );

  return clamp(50 * (1 + erf), 0.1, 99.9);
}

function developmentTrendFromDelta(delta) {
  const value = Number(delta);
  if (!Number.isFinite(value)) return "—";
  if (value < -0.75) return "Down";
  if (value < -0.25) return "Slightly Down";
  if (value < 0.25) return "Stable";
  if (value < 0.75) return "Slightly Up";
  return "Up";
}

function developmentTrendTone(trend) {
  const value = String(trend || "").toLowerCase();
  if (value.includes("up")) return "dev-up";
  if (value.includes("down")) return "dev-down";
  if (value.includes("stable")) return "dev-stable";
  return "dev-neutral";
}

function developmentArrow(trend) {
  const value = String(trend || "").toLowerCase();
  if (value.includes("up")) return "↑";
  if (value.includes("down")) return "↓";
  if (value.includes("stable")) return "→";
  return "•";
}

function annualDevelopmentSeries(stages) {
  const rows = Array.isArray(stages) ? stages : [];
  const traits = [
    "production_z", "power_z", "contact_z", "discipline_z", "speed_z",
    "wrc_plus", "iso", "k_pct", "bb_pct", "speed_score"
  ];
  const bySeason = new Map();

  rows.forEach((row) => {
    const season = Number(row?.season);
    const pa = Number(row?.pa);
    if (!Number.isFinite(season) || !Number.isFinite(pa) || pa <= 0) return;

    if (!bySeason.has(season)) {
      bySeason.set(season, {
        season,
        pa: 0,
        levels: [],
        sums: Object.fromEntries(traits.map((key) => [key, 0])),
        weights: Object.fromEntries(traits.map((key) => [key, 0]))
      });
    }

    const bucket = bySeason.get(season);
    bucket.pa += pa;
    if (row?.level && !bucket.levels.includes(row.level)) bucket.levels.push(row.level);

    traits.forEach((key) => {
      const value = Number(row?.[key]);
      if (!Number.isFinite(value)) return;
      bucket.sums[key] += value * pa;
      bucket.weights[key] += pa;
    });
  });

  return [...bySeason.values()]
    .sort((a, b) => a.season - b.season)
    .map((bucket) => {
      const annual = {
        season: bucket.season,
        pa: bucket.pa,
        levels: bucket.levels
      };
      traits.forEach((key) => {
        annual[key] = bucket.weights[key] > 0
          ? bucket.sums[key] / bucket.weights[key]
          : null;
      });
      return annual;
    });
}

function developmentSummaryFromAnnual(annual) {
  if (!Array.isArray(annual) || annual.length < 2) {
    return {
      label: "Baseline only",
      tone: "dev-summary-limited",
      detail: "A second qualified season is needed before a year-to-year trend is shown."
    };
  }

  const previous = annual[annual.length - 2];
  const latest = annual[annual.length - 1];
  const keys = ["production_z", "power_z", "contact_z", "discipline_z", "speed_z"];

  const deltas = keys.map((key) => Number(latest[key]) - Number(previous[key]));
  const trends = deltas.map(developmentTrendFromDelta);

  const positive = trends.filter((x) => String(x).toLowerCase().includes("up")).length;
  const negative = trends.filter((x) => String(x).toLowerCase().includes("down")).length;
  const stable = trends.filter((x) => String(x).toLowerCase().includes("stable")).length;

  let label = "Mixed";
  let tone = "dev-summary-mixed";

  if (positive >= 3 && negative <= 1) {
    label = "Improving";
    tone = "dev-summary-up";
  } else if (negative >= 3 && positive <= 1) {
    label = "Cooling";
    tone = "dev-summary-down";
  } else if (stable >= 3 && positive <= 1 && negative <= 2) {
    label = "Mostly stable";
    tone = "dev-summary-stable";
  } else if (positive > negative + 1) {
    label = "Trending up";
    tone = "dev-summary-up";
  } else if (negative > positive + 1) {
    label = "Trending down";
    tone = "dev-summary-down";
  }

  return {
    label,
    tone,
    detail: `${positive} improving · ${stable} stable · ${negative} declining`,
    previousSeason: previous.season,
    latestSeason: latest.season
  };
}

function publicDevelopmentTrend(summary) {
  const label = String(summary?.label || "").toLowerCase();

  if (label === "improving" || label === "trending up") {
    return { label: "Trending Up", tone: "trend-up", icon: "↑" };
  }
  if (label === "cooling" || label === "trending down") {
    return { label: "Trending Down", tone: "trend-down", icon: "↓" };
  }
  if (label === "mostly stable") {
    return { label: "Stable", tone: "trend-stable", icon: "→" };
  }
  if (label === "baseline only") {
    return { label: "Baseline", tone: "trend-baseline", icon: "•" };
  }
  return { label: "Mixed", tone: "trend-mixed", icon: "↕" };
}

function traitTrendTag(trend) {
  const value = String(trend || "").toLowerCase();
  if (value.includes("up")) return { label: "Up", tone: "trend-up", icon: "↑" };
  if (value.includes("down")) return { label: "Down", tone: "trend-down", icon: "↓" };
  if (value.includes("stable")) return { label: "Stable", tone: "trend-stable", icon: "→" };
  return { label: "Mixed", tone: "trend-mixed", icon: "↕" };
}

function developmentSparkline(rows, key) {
  const values = (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({
      index,
      value: Number(row?.[key])
    }))
    .filter((point) => Number.isFinite(point.value));

  if (!values.length) return `<div class="dev-sparkline-empty">—</div>`;

  const width = 100;
  const height = 34;
  const left = 4;
  const right = 96;
  const top = 4;
  const bottom = 30;
  const usableWidth = right - left;
  const usableHeight = bottom - top;

  const x = (i) =>
    values.length === 1
      ? 50
      : left + (i / (values.length - 1)) * usableWidth;

  const y = (value) => {
    const clamped = clamp(value, -3, 3);
    return top + ((3 - clamped) / 6) * usableHeight;
  };

  const points = values
    .map((point, i) => `${x(i).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(" ");

  const last = values[values.length - 1];
  const lastX = x(values.length - 1).toFixed(1);
  const lastY = y(last.value).toFixed(1);
  const zeroY = y(0).toFixed(1);

  return `
    <svg class="dev-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <line class="dev-sparkline-zero" x1="${left}" x2="${right}" y1="${zeroY}" y2="${zeroY}"></line>
      <polyline points="${points}"></polyline>
      <circle cx="${lastX}" cy="${lastY}" r="2.8"></circle>
    </svg>
  `;
}

function hitterDevelopmentTraitCards(annual) {
  const rows = Array.isArray(annual) ? annual : [];
  const latest = rows.length ? rows[rows.length - 1] : null;
  const previous = rows.length >= 2 ? rows[rows.length - 2] : null;
  const traits = [
    ["Production", "production_z"],
    ["Power", "power_z"],
    ["Contact", "contact_z"],
    ["Discipline", "discipline_z"],
    ["Speed", "speed_z"]
  ];

  if (!latest) return "";

  return `
    <div class="development-trait-grid">
      ${traits.map(([label, key]) => {
        const currentPercentile = zToPercentile(latest[key]);
        const previousPercentile = previous ? zToPercentile(previous[key]) : null;
        const deltaZ = previous
          ? Number(latest[key]) - Number(previous[key])
          : null;
        const deltaPoints =
          Number.isFinite(currentPercentile) && Number.isFinite(previousPercentile)
            ? currentPercentile - previousPercentile
            : null;
        const trend = previous ? developmentTrendFromDelta(deltaZ) : "Baseline";
        const tag = previous
          ? traitTrendTag(trend)
          : { label: "Baseline", tone: "trend-baseline", icon: "•" };

        return `
          <div class="development-trait development-percentile-card ${scoreToneClass(currentPercentile)}">
            <small>${escapeHtml(label)}</small>
            ${developmentSparkline(rows, key)}
            <strong class="development-current-percentile">${number1(currentPercentile)}</strong>
            <span class="development-current-label">percentile</span>
            <span class="trend-tag trait-trend-tag ${tag.tone}">
              <b>${tag.icon}</b> ${escapeHtml(tag.label)}
            </span>
            <span class="development-delta">${previous ? `${signedPoint1(deltaPoints)} pts` : "Baseline"}</span>
            <span class="development-delta-label">${previous ? "year over year" : "first qualified season"}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function signedValueToneClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "signed-neutral";
  if (n <= -0.75) return "signed-red";
  if (n < 0) return "signed-orange";
  if (n === 0) return "signed-gold";
  if (n < 0.25) return "signed-lime";
  return "signed-green";
}

function mlbWrcToneClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "mlb-tone-neutral";
  if (n >= 120) return "mlb-tone-emerald";
  if (n >= 100) return "mlb-tone-lime";
  if (n >= 85) return "mlb-tone-gold";
  if (n >= 70) return "mlb-tone-orange";
  return "mlb-tone-red";
}

function mlbTransitionCompact(player) {
  const mlb = player.mlb_transition;
  if (!mlb?.has_mlb_evidence) return "";

  return `
    <div class="mlb-transition-block">
      <div class="mlb-transition-head">
        <div>
          <small>MLB TRANSITION</small>
          <strong>${yearValue(mlb.season)} · ${escapeHtml(mlb.team || player.current_org || "MLB")}</strong>
        </div>
        <span class="mlb-sample-tag">${escapeHtml(mlb.sample_label || "MLB Sample")}</span>
      </div>

      <div class="current-stat-grid mlb-current-stat-grid">
        <div><small>PA</small><strong>${integer(mlb.pa)}</strong></div>
        <div><small>AVG</small><strong>${battingRate(mlb.avg)}</strong></div>
        <div><small>OBP</small><strong>${battingRate(mlb.obp)}</strong></div>
        <div><small>SLG</small><strong>${battingRate(mlb.slg)}</strong></div>
        <div class="${mlbWrcToneClass(mlb.wrc_plus)}"><small>wRC+</small><strong class="mlb-wrc-value">${number1(mlb.wrc_plus)}</strong></div>
        <div><small>K%</small><strong>${percentFromRate(mlb.k_pct)}</strong></div>
      </div>

      <div class="current-stat-grid mlb-current-stat-grid mlb-current-stat-grid-secondary">
        <div><small>G</small><strong>${integer(mlb.games)}</strong></div>
        <div><small>BB%</small><strong>${percentFromRate(mlb.bb_pct)}</strong></div>
        <div><small>HR</small><strong>${integer(mlb.hr)}</strong></div>
        <div><small>RBI</small><strong>${integer(mlb.rbi)}</strong></div>
        <div><small>SB</small><strong>${integer(mlb.sb)}</strong></div>
        <div><small>WAR</small><strong class="${signedValueToneClass(mlb.war)}">${Number.isFinite(Number(mlb.war)) ? Number(mlb.war).toFixed(2) : "—"}</strong></div>
      </div>

      <p>MLB evidence is shown separately from the minor-league development trend.</p>
    </div>
  `;
}

function mlbTransitionDetails(player) {
  const mlb = player.mlb_transition;
  if (!mlb?.has_mlb_evidence) return "";

  return `
    <section class="development-detail-section mlb-detail-section">
      <div class="development-detail-heading">
        <div>
          <h4>MLB transition</h4>
          <span>${escapeHtml(mlb.sample_label || "MLB Sample")}</span>
        </div>
        <small>Transition evidence</small>
      </div>

      <article class="development-season-detail mlb-season-detail">
        <div class="development-season-detail-head">
          <div>
            <strong>${yearValue(mlb.season)}</strong>
            <span>MLB · ${escapeHtml(mlb.team || player.current_org || "MLB")}</span>
          </div>
          <b>${integer(mlb.pa)} PA</b>
        </div>

        <div class="development-raw-stat-grid mlb-season-stat-grid">
          <div><small>wRC+</small><strong class="${mlbWrcToneClass(mlb.wrc_plus)} mlb-wrc-value">${number1(mlb.wrc_plus)}</strong></div>
          <div><small>AVG</small><strong>${battingRate(mlb.avg)}</strong></div>
          <div><small>OBP</small><strong>${battingRate(mlb.obp)}</strong></div>
          <div><small>SLG</small><strong>${battingRate(mlb.slg)}</strong></div>
          <div><small>K%</small><strong>${percentFromRate(mlb.k_pct)}</strong></div>
        </div>

        <div class="development-z-grid mlb-season-stat-grid">
          <div><small>BB%</small><strong>${percentFromRate(mlb.bb_pct)}</strong></div>
          <div><small>HR</small><strong>${integer(mlb.hr)}</strong></div>
          <div><small>RBI</small><strong>${integer(mlb.rbi)}</strong></div>
          <div><small>SB</small><strong>${integer(mlb.sb)}</strong></div>
          <div><small>WAR</small><strong class="${signedValueToneClass(mlb.war)}">${Number.isFinite(Number(mlb.war)) ? Number(mlb.war).toFixed(2) : "—"}</strong></div>
        </div>
      </article>

      <div class="mlb-career-line">
        <span>Career MLB</span>
        <strong>${integer(mlb.career_games)} G · ${integer(mlb.career_pa)} PA · ${integer(mlb.career_ab)} AB</strong>
      </div>

      <p class="mlb-detail-note">
        MLB performance is displayed as transition evidence and is not blended into the minor-league year-over-year trend.
      </p>
    </section>
  `;
}

function developmentPanel(player) {
  const context = player.development_context || {};
  const stages = Array.isArray(context.stage_timeline) ? context.stage_timeline : [];
  const annual = annualDevelopmentSeries(stages);

  if (!stages.length || !annual.length) {
    return `
      <div class="development-empty">
        <strong>Limited history</strong>
        <span>No qualified minor-league development stage yet.</span>
      </div>
      ${mlbTransitionCompact(player)}
    `;
  }

  const latest = annual[annual.length - 1];
  const previous = annual.length >= 2 ? annual[annual.length - 2] : null;
  const summary = developmentSummaryFromAnnual(annual);
  const overallTrend = publicDevelopmentTrend(summary);
  const trendNote = overallTrend.label === "Trending Down"
    ? `Trend measures recent direction, not current strength. This player can still rank #${integer(player.overall_rank)} because DiamondScore compares the current profile with the prospect pool.`
    : "";

  return `
    <div class="development-overview development-overview-compact">
      <div class="development-trend-row">
        <span class="trend-label">Trend</span>
        <span class="trend-tag ${overallTrend.tone}">
          <b>${overallTrend.icon}</b> ${escapeHtml(overallTrend.label)}
        </span>
        <span class="development-summary-detail">${escapeHtml(summary.detail)}</span>
      </div>

      ${trendNote ? `<div class="development-rank-note">${escapeHtml(trendNote)}</div>` : ""}

      <p class="development-read-key">Large number = current percentile · ± pts = change from prior qualified season</p>

      <div class="development-year-row">
        <strong>${previous ? `${yearValue(previous.season)} → ${yearValue(latest.season)}` : yearValue(latest.season)}</strong>
        <span>${previous ? "PA-weighted season comparison" : "Current qualified baseline"}</span>
      </div>

      ${hitterDevelopmentTraitCards(annual)}
      ${mlbTransitionCompact(player)}

      <button class="development-open-button" type="button" data-development-open>
        View development details
        <span aria-hidden="true">›</span>
      </button>
    </div>
  `;
}

function annualStatValue(key, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (key === "iso") return n.toFixed(3).replace(/^0/, "");
  if (key === "k_pct" || key === "bb_pct") return `${n.toFixed(1)}%`;
  if (key === "speed_score") return n.toFixed(2);
  if (key === "wrc_plus") return n.toFixed(1);
  return n.toFixed(2);
}

function developmentDetailMarkup(player) {
  const context = player.development_context || {};
  const stages = Array.isArray(context.stage_timeline) ? context.stage_timeline : [];
  const annual = annualDevelopmentSeries(stages);
  const traits = [
    ["Production", "production_z"],
    ["Power", "power_z"],
    ["Contact", "contact_z"],
    ["Discipline", "discipline_z"],
    ["Speed", "speed_z"]
  ];

  const previous = annual.length >= 2 ? annual[annual.length - 2] : null;
  const latest = annual.length ? annual[annual.length - 1] : null;

  return `
    <div class="development-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="developmentDetailTitle">
      <div class="development-detail-sticky">
        <div>
          <small>DEVELOPMENT HISTORY</small>
          <h3 id="developmentDetailTitle">${escapeHtml(player.full_name)}</h3>
        </div>
        <button class="development-detail-close" type="button" data-development-close aria-label="Close development details">×</button>
      </div>

      <div class="development-detail-body">
        <section class="development-detail-section">
          <div class="development-detail-heading">
            <div>
              <h4>Trait percentiles & change</h4>
              <span>${previous && latest ? `${yearValue(previous.season)} → ${yearValue(latest.season)}` : latest ? `${yearValue(latest.season)} baseline` : "Baseline unavailable"}</span>
            </div>
            <small>Age + level adjusted</small>
          </div>

          ${latest ? hitterDevelopmentTraitCards(annual) : `
            <div class="development-detail-empty">
              No qualified minor-league season is available for a trait baseline.
            </div>
          `}
        </section>

        ${mlbTransitionDetails(player)}

        <section class="development-detail-section">
          <div class="development-detail-heading">
            <div>
              <h4>Minor-league season profiles</h4>
              <span>${annual.length} qualified seasons</span>
            </div>
            <small>PA-weighted within season</small>
          </div>

          <div class="development-season-detail-list">
            ${annual.map((season, index) => `
              <article class="development-season-detail ${index === annual.length - 1 ? "current" : ""}">
                <div class="development-season-detail-head">
                  <div>
                    <strong>${yearValue(season.season)}</strong>
                    <span>${escapeHtml((season.levels || []).join(" / ") || "—")}</span>
                  </div>
                  <b>${integer(season.pa)} PA</b>
                </div>

                <div class="development-raw-stat-grid">
                  <div><small>wRC+</small><strong>${annualStatValue("wrc_plus", season.wrc_plus)}</strong></div>
                  <div><small>ISO</small><strong>${annualStatValue("iso", season.iso)}</strong></div>
                  <div><small>K%</small><strong>${annualStatValue("k_pct", season.k_pct)}</strong></div>
                  <div><small>BB%</small><strong>${annualStatValue("bb_pct", season.bb_pct)}</strong></div>
                  <div><small>Spd</small><strong>${annualStatValue("speed_score", season.speed_score)}</strong></div>
                </div>

                <div class="development-z-grid">
                  ${traits.map(([label, key]) => {
                    const percentile = zToPercentile(season[key]);
                    return `
                      <div class="${scoreToneClass(percentile)}">
                        <small>${escapeHtml(label)}</small>
                        <strong>${number1(percentile)}</strong>
                        <span>percentile</span>
                      </div>
                    `;
                  }).join("")}
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="development-detail-section">
          <div class="development-detail-heading">
            <div>
              <h4>Minor-league level progression</h4>
              <span>${integer(context.qualified_stage_count)} qualified stages</span>
            </div>
            <small>Individual stops</small>
          </div>

          <div class="development-stage-table-wrap">
            <table class="development-stage-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Level</th>
                  <th>Age</th>
                  <th>PA</th>
                  <th>wRC+</th>
                  <th>ISO</th>
                  <th>K%</th>
                  <th>BB%</th>
                  <th>Spd</th>
                </tr>
              </thead>
              <tbody>
                ${stages.map((stage) => `
                  <tr>
                    <td>${yearValue(stage.season)}</td>
                    <td>${escapeHtml(stage.level || "—")}</td>
                    <td>${number1(stage.age)}</td>
                    <td>${integer(stage.pa)}</td>
                    <td>${annualStatValue("wrc_plus", stage.wrc_plus)}</td>
                    <td>${annualStatValue("iso", stage.iso)}</td>
                    <td>${annualStatValue("k_pct", stage.k_pct)}</td>
                    <td>${annualStatValue("bb_pct", stage.bb_pct)}</td>
                    <td>${annualStatValue("speed_score", stage.speed_score)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;
}

function openDevelopmentDetails(player) {
  closeDevelopmentDetails();

  const overlay = document.createElement("div");
  overlay.className = "development-detail-overlay";
  overlay.dataset.developmentOverlay = "true";
  overlay.innerHTML = developmentDetailMarkup(player);

  // The player profile is a native modal <dialog>, which lives in the
  // browser top layer. Keep Development Details inside that same dialog
  // so iOS Safari cannot render it behind the active modal.
  el.dialog.appendChild(overlay);
  el.dialog.classList.add("development-detail-active");

  const closeButton = overlay.querySelector("[data-development-close]");
  closeButton?.focus();

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-development-close]")) {
      closeDevelopmentDetails();
    }
  });
}

function closeDevelopmentDetails() {
  el.dialog?.querySelector("[data-development-overlay]")?.remove();
  el.dialog?.classList.remove("development-detail-active");
}

function explanationDetails(player) {
  const compCount = Number(player.comparable_context?.displayed_comparables) || 6;

  const items = [
    ["DiamondScore", "The overall 0–99.9 fantasy prospect score used to rank the player against the current DiamondRank hitter pool. Higher is stronger. It is a comparative score, not a probability or career forecast."],
    ["Opportunity", "How favorable the player’s current historical path looks compared with similar prospects at comparable ages and levels. Higher is stronger historical path evidence. It is not MLB readiness and not a probability of reaching MLB."],
    ["Fantasy Profile", "The player’s current fantasy-relevant skill strength across Production, Power, Contact, Discipline and Speed after adjusting for age and level. The five meters describe the shape of the current profile, not projected future stat totals."],
    ["Evidence Confidence", "The High, Moderate or Low pill describes how much supporting evidence is available for the overall profile, including current and prior-season coverage. It is not a player-risk meter, upside grade or chance of success. Lower evidence confidence means the ranking can move more as additional data arrives."],
    ["Current Evidence", "The raw season, level, age, playing time and familiar batting stats behind the current profile. “Sample depth” describes the amount of current-season playing-time evidence; it is not a performance grade or risk score."],
    ["Development", "Each trait card shows the player’s current age-and-level-adjusted percentile, then the change in percentile points from the previous qualified season. Higher percentiles mean stronger relative traits; +/− pts show movement, not raw-stat change. “Baseline” means there is no earlier qualified season to compare."],
    ["Context Profile", "The centered meters compare current traits with the player’s age-and-level context. Left is below context, the middle is near context and right is above context. The marker and color show relative strength, not future projection."],
    ["Batted-Ball Shape", "The field shows where contact is going, while GB, FB and LD cards show the batted-ball mix versus peers. Direction and batted-ball mix describe style and context; they are not automatically good or bad."],
    ["Swing & Miss", "The bat-to-ball percentile shows how the player’s swing-and-miss result compares with the current context; higher percentile means stronger bat-to-ball performance. Raw SwStr% shows the actual miss rate, where lower is better. Sample depth tells you how much pitch evidence supports the reading."],
    ["Comparables", `The ${compCount} closest historical player profiles. Match % measures statistical similarity, not career probability. Each card also shows that comp’s MLB PA, WAR and wRC+ over the five seasons after the matched minor-league season, plus the resulting MLB outcome tier.`],
    ["5-Year Outcomes", "The outcome bar summarizes what the broader comparable group did in MLB over the next five seasons. These are historical reference outcomes for the neighborhood, not personalized probabilities for the current player."],
    ["Score Colors", "Warm colors indicate weaker relative scores and greener colors indicate stronger relative scores on DiamondRank’s comparative scales. Color describes relative strength; it does not indicate safety, risk or certainty."]
  ];

  return items.map(([label, text]) => `
    <details class="method-card">
      <summary>${escapeHtml(label)}</summary>
      <p>${escapeHtml(text)}</p>
    </details>
  `).join("");
}
async function openPlayer(playerId) {
  el.dialogContent.innerHTML = "";
  el.dialogContent.hidden = true;
  el.dialogLoading.hidden = false;
  el.dialogLoading.textContent = "Loading player profile…";

  if (!el.dialog.open) el.dialog.showModal();

  const { data, error } = await supabase
    .from(PUBLIC_VIEW)
    .select("*")
    .eq("player_id", playerId)
    .single();

  if (error || !data) {
    el.dialogLoading.textContent = error?.message || "Couldn’t load this player.";
    return;
  }

  renderPlayer(data);
}

function renderPlayer(player) {
  const evidence = player.current_evidence || {};
  const positionRankLabel = `${positionFamilyLabel(player.position_family)} #${integer(player.position_rank)}`;

  el.dialogContent.innerHTML = `
    <div class="profile-head">
      <div class="player-name-row">
        <h2 id="dialogPlayerName">${escapeHtml(player.full_name)}</h2>
      </div>

      <div class="rank-score-strip">
        <div class="rank-summary-card">
          <small>DiamondRank</small>
          <strong>#${integer(player.overall_rank)}</strong>
          <span>Overall</span>
        </div>

        <div class="rank-summary-card">
          <small>Position Rank</small>
          <strong>#${integer(player.position_rank)}</strong>
          <span>${escapeHtml(positionFamilyLabel(player.position_family))}</span>
        </div>

        <div class="diamondscore-card ${scoreToneClass(player.overall_score)}">
          <small>DiamondScore</small>
          <div class="diamondscore-ring" style="--meter:${clamp(player.overall_score, 0, 99.9)}">
            <strong>${number1(player.overall_score)}</strong>
          </div>
        </div>
      </div>

      <div class="profile-meta compact-meta">
        <span class="chip">${escapeHtml(player.primary_position || player.position_family || "—")}</span>
        <span class="chip">${escapeHtml(player.current_org || "FA")}</span>
        <span class="chip">${escapeHtml(player.current_level || "—")}</span>
        <span class="chip">Age ${number1(player.age)}</span>
        <span class="chip emphasis">${escapeHtml(confidenceLabel(player.ranking_confidence))}</span>
      </div>
      <p class="profile-confidence-explainer">Evidence confidence reflects supporting data depth, not player risk or upside.</p>
      ${player.sample_size_warning ? `<div class="warning compact-warning"><strong>Evidence note:</strong> ${escapeHtml(player.sample_size_warning)}</div>` : ""}
    </div>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>Core scores</h3></div>
      <div class="core-ring-grid">
        ${scoreRing("Opportunity", player.opportunity_score, "core")}
        ${scoreRing("Fantasy profile", player.fantasy_profile_score, "core")}
      </div>
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>Fantasy skill profile</h3><span>Age + level adjusted</span></div>
      ${fantasyTraitMeters(player)}
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>Current evidence</h3><span>Sample depth · ${escapeHtml(sampleTierLabel(evidence.sample_tier))}</span></div>
      <div class="evidence-grid">
        <div><small>Season</small><strong>${escapeHtml(evidence.season || "—")}</strong></div>
        <div><small>Level</small><strong>${escapeHtml(evidence.level || player.current_level || "—")}</strong></div>
        <div><small>PA</small><strong>${integer(evidence.pa)}</strong></div>
        <div><small>Age</small><strong>${number1(evidence.age ?? player.age)}</strong></div>
      </div>
      <div class="current-stat-grid">
        <div><small>AVG</small><strong>${battingRate(evidence.avg)}</strong></div>
        <div><small>OBP</small><strong>${battingRate(evidence.obp)}</strong></div>
        <div><small>SLG</small><strong>${battingRate(evidence.slg)}</strong></div>
        <div><small>HR</small><strong>${integer(evidence.hr)}</strong></div>
        <div><small>RBI</small><strong>${integer(evidence.rbi)}</strong></div>
        <div><small>SB</small><strong>${integer(evidence.sb)}</strong></div>
      </div>
    </section>

    <section class="profile-section compact-section development-section">
      <div class="section-title-row">
        <h3>Development</h3>
        <span>${integer(player.development_context?.qualified_season_count)} qualified seasons</span>
      </div>
      ${developmentPanel(player)}
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>Context profile</h3><span>Left = below • right = above</span></div>
      ${contextMeters(player)}
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>Batted-ball shape</h3><span>Current evidence</span></div>
      ${sprayProfile(player)}
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>Swing & miss</h3><span>Bat-to-ball evidence</span></div>
      ${compactSwStr(player)}
      ${player.swstr_sample_warning ? `<div class="warning compact-warning">${escapeHtml(player.swstr_sample_warning)}</div>` : ""}
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row comparables-title-row">
        <h3>Historical comparables</h3>
        <span>Closest refined-position matches</span>
      </div>
      <div class="comps">${compCards(player)}</div>
      ${fiveYearOutcomePanel(player)}
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>How to read DiamondRank</h3><span>Tap a topic</span></div>
      <div class="explanation-list methodology-grid">${explanationDetails(player)}</div>
    </section>
  `;

  el.dialogLoading.hidden = true;
  el.dialogContent.hidden = false;

  el.dialogContent
    .querySelector("[data-development-open]")
    ?.addEventListener("click", () => openDevelopmentDetails(player));
}

if (el.filterToggle && el.toolbar) {
  el.filterToggle.addEventListener("click", () => {
    const open = el.toolbar.classList.toggle("filters-open");
    el.filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

el.search.addEventListener("input", () => {
  state.visible = PAGE_SIZE;
  applyFilters();
});
el.sort.addEventListener("change", () => {
  state.visible = PAGE_SIZE;
  applyFilters();
});

for (const control of [el.position, el.org, el.level]) {
  control.addEventListener("change", () => {
    state.visible = PAGE_SIZE;
    applyFilters();

    if (window.matchMedia("(max-width: 640px)").matches && el.toolbar) {
      el.toolbar.classList.remove("filters-open");
      el.filterToggle?.setAttribute("aria-expanded", "false");
    }
  });
}
el.clear.addEventListener("click", () => {
  el.search.value = "";
  el.position.value = "";
  el.org.value = "";
  el.level.value = "";
  el.sort.value = "rank";
  if (el.toolbar) el.toolbar.classList.remove("filters-open");
  if (el.filterToggle) el.filterToggle.setAttribute("aria-expanded", "false");
  state.visible = PAGE_SIZE;
  applyFilters();
});
el.more.addEventListener("click", () => {
  state.visible += PAGE_SIZE;
  renderBoard();
});
el.retry.addEventListener("click", loadRankings);
el.board.addEventListener("click", (event) => {
  const row = event.target.closest("[data-player-id]");
  if (row) openPlayer(row.dataset.playerId);
});
el.dialogClose.addEventListener("click", () => { closeDevelopmentDetails(); el.dialog.close(); });
el.dialog.addEventListener("click", (event) => {
  if (event.target === el.dialog) { closeDevelopmentDetails(); el.dialog.close(); }
});
el.dialog.addEventListener("close", () => {
  closeDevelopmentDetails();
  el.dialogContent.innerHTML = "";
  el.dialogContent.hidden = true;
  el.dialogLoading.hidden = false;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector("[data-development-overlay]")) {
    event.preventDefault();
    closeDevelopmentDetails();
  }
});

loadRankings();
