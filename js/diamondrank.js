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
  resultCount: document.getElementById("resultCount"),
  dataUpdated: document.getElementById("dataUpdated"),
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
  if (!value) return "Confidence —";
  const text = String(value).toLowerCase().replaceAll("_", " ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} confidence`;
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
  el.headerStatus.textContent = latest
    ? `${state.rows.length} hitters • ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(latest))}`
    : `${state.rows.length} hitters`;
  el.dataUpdated.textContent = latest ? formatDate(latest) : "Update time unavailable";

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
  el.resultCount.textContent = `${state.filtered.length.toLocaleString()} shown`;

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
          <div class="context-meter ${contextToneClass(z)}" role="img" aria-label="${escapeHtml(item.label || item.key || "Trait")}: ${escapeHtml(band)}, context z ${number1(z)}">
            <strong>${escapeHtml(item.label || item.key || "Trait")}</strong>
            <div class="context-track" style="--dot:${position}%">
              <span class="context-mid"></span>
              <span class="context-dot"></span>
            </div>
            <div class="context-scale"><span>−</span><b>${number1(z)}</b><span>+</span></div>
            <small>${escapeHtml(contextRawLabel(item))}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
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
          <span>Pull / Center / Oppo</span>
        </div>
        <svg class="spray-field" viewBox="0 0 300 180" role="img" aria-label="Spray tendency: Pull ${number1(pull)} percent, Center ${number1(center)} percent, Opposite ${number1(oppo)} percent">
          <path class="field-outline" d="M150 164 L34 70 Q150 -6 266 70 Z"></path>
          <path class="field-zone spray-pull" style="fill-opacity:${alpha(pull)}" d="M150 164 L34 70 Q72 28 113 32 Z"></path>
          <path class="field-zone spray-center" style="fill-opacity:${alpha(center)}" d="M150 164 L113 32 Q150 15 187 32 Z"></path>
          <path class="field-zone spray-oppo" style="fill-opacity:${alpha(oppo)}" d="M150 164 L187 32 Q228 28 266 70 Z"></path>
          <path class="infield" d="M150 145 L124 119 L150 93 L176 119 Z"></path>
          <circle class="home-plate-dot" cx="150" cy="157" r="4"></circle>
          <text x="72" y="68" text-anchor="middle">PULL</text>
          <text x="150" y="39" text-anchor="middle">CENTER</text>
          <text x="228" y="68" text-anchor="middle">OPPO</text>
          <text class="spray-pct" x="72" y="87" text-anchor="middle">${number1(pull)}%</text>
          <text class="spray-pct" x="150" y="58" text-anchor="middle">${number1(center)}%</text>
          <text class="spray-pct" x="228" y="87" text-anchor="middle">${number1(oppo)}%</text>
        </svg>
      </div>

      <div class="contact-type-grid">
        ${contactTypeCell("GB", "Ground ball", gb, "ground")}
        ${contactTypeCell("FB", "Fly ball", fb, "fly")}
        ${contactTypeCell("LD", "Line drive", ld, "line")}
      </div>
    </div>
  `;
}

function contactTypeCell(shortLabel, label, value, tone = "") {
  const pct = clamp(value, 0, 100);
  return `
    <div class="contact-type ${escapeHtml(tone)}" role="img" aria-label="${escapeHtml(label)} ${number1(value)} percent">
      <div class="contact-type-head"><strong>${shortLabel}</strong><span>${number1(value)}%</span></div>
      <div class="contact-type-track"><i style="width:${pct}%"></i></div>
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
          <small>Sample</small>
          <strong>${integer(player.swstr_source_pa)} PA</strong>
          <span>${escapeHtml(player.swstr_sample_tier || "—")}</span>
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
    ["Limited", outcomes.limited_mlb, "outcome-limited"],
    ["Depth", outcomes.depth_mlb, "outcome-depth"],
    ["Regular", outcomes.regular_mlb, "outcome-regular"],
    ["Star", outcomes.star_mlb, "outcome-star"]
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

      <details class="outcome-definitions">
        <summary>5-year outcome definitions</summary>
        <div>
          <p><b>No MLB:</b> ${escapeHtml(outcomes.definitions?.no_mlb || "0 MLB PA within five seasons")}</p>
          <p><b>Limited MLB:</b> ${escapeHtml(outcomes.definitions?.limited_mlb || "1–249 MLB PA within five seasons")}</p>
          <p><b>Depth MLB:</b> ${escapeHtml(outcomes.definitions?.depth_mlb || "250–999 MLB PA within five seasons")}</p>
          <p><b>Regular MLB:</b> ${escapeHtml(outcomes.definitions?.regular_mlb || "1,000+ MLB PA below the Star threshold")}</p>
          <p><b>Star MLB:</b> ${escapeHtml(outcomes.definitions?.star_mlb || "1,000+ MLB PA and 10+ WAR within five seasons")}</p>
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
    return `
      <div class="comp-card">
        <div class="comp-topline">
          <span>Match ${index + 1}</span>
        </div>
        <div class="comp-name">${escapeHtml(comp.name || "Historical comp")}</div>
        <div class="comp-meta">${escapeHtml(comp.level || "—")} • ${escapeHtml(comp.season || "—")} • ${escapeHtml(comp.position || comp.position_family || "—")}</div>
        <div class="comp-outcome ${outcomeToneClass(outcome)}">${escapeHtml(outcome)}</div>
      </div>
    `;
  }).join("");
}


function explanationDetails(player) {
  const exp = player.plain_language_explanations || {};
  const items = [
    ["Overall score", exp.overall],
    ["Opportunity", exp.opportunity],
    ["Fantasy Profile", exp.fantasy_profile],
    ["Historical comparables", exp.comparables],
    ["Comparable selection", exp.comparable_selection],
    ["Swing & miss", exp.swstr],
    ["Score scale", exp.score_scale]
  ].filter(([, value]) => value);

  return items.map(([label, text]) => `
    <details>
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
      <div class="profile-kicker">#${integer(player.overall_rank)} overall • ${escapeHtml(positionRankLabel)}</div>
      <div class="profile-title">
        <h2 id="dialogPlayerName">${escapeHtml(player.full_name)}</h2>
        <div class="profile-score ${scoreToneClass(player.overall_score)}"><strong>${number1(player.overall_score)}</strong><span>DiamondRank</span></div>
      </div>
      <div class="profile-meta compact-meta">
        <span class="chip">${escapeHtml(player.primary_position || player.position_family || "—")}</span>
        <span class="chip">${escapeHtml(player.current_org || "FA")}</span>
        <span class="chip">${escapeHtml(player.current_level || "—")}</span>
        <span class="chip">Age ${number1(player.age)}</span>
        <span class="chip emphasis">${escapeHtml(confidenceLabel(player.ranking_confidence))}</span>
      </div>
      ${player.sample_size_warning ? `<div class="warning compact-warning">${escapeHtml(player.sample_size_warning)}</div>` : ""}
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
      <div class="section-title-row"><h3>Current evidence</h3><span>${escapeHtml(evidence.sample_tier || "—")} sample</span></div>
      <div class="evidence-grid">
        <div><small>Season</small><strong>${escapeHtml(evidence.season || "—")}</strong></div>
        <div><small>Level</small><strong>${escapeHtml(evidence.level || player.current_level || "—")}</strong></div>
        <div><small>PA</small><strong>${integer(evidence.pa)}</strong></div>
        <div><small>Age</small><strong>${number1(evidence.age ?? player.age)}</strong></div>
      </div>
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
        ${player.comparable_context?.match_quality?.label
          ? `<span class="match-quality ${matchQualityToneClass(player.comparable_context?.match_quality?.key)}">${escapeHtml(player.comparable_context.match_quality.label)}</span>`
          : `<span>Closest refined-position matches</span>`}
      </div>
      <div class="comps">${compCards(player)}</div>
      ${fiveYearOutcomePanel(player)}
    </section>

    <section class="profile-section compact-section">
      <div class="section-title-row"><h3>What the scores mean</h3><span>Methodology</span></div>
      <div class="explanation-list">${explanationDetails(player)}</div>
    </section>
  `;

  el.dialogLoading.hidden = true;
  el.dialogContent.hidden = false;
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
for (const control of [el.position, el.org, el.level, el.sort]) {
  control.addEventListener("change", () => {
    state.visible = PAGE_SIZE;
    applyFilters();
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
el.dialogClose.addEventListener("click", () => el.dialog.close());
el.dialog.addEventListener("click", (event) => {
  if (event.target === el.dialog) el.dialog.close();
});
el.dialog.addEventListener("close", () => {
  el.dialogContent.innerHTML = "";
  el.dialogContent.hidden = true;
  el.dialogLoading.hidden = false;
});

loadRankings();
