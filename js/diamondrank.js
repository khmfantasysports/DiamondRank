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
  el.headerStatus.textContent = latest ? `${state.rows.length} hitters • ${formatDate(latest)}` : `${state.rows.length} hitters`;
  el.dataUpdated.textContent = latest ? formatDate(latest) : "Update time unavailable";

  setLoading(false);
  applyFilters();
}

function applyFilters() {
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
      <div class="score-cell primary"><strong>${number1(row.overall_score)}</strong><span>Overall</span></div>
      <div class="score-cell opportunity"><strong>${number1(row.opportunity_score)}</strong><span>Opportunity</span></div>
      <div class="score-cell fantasy"><strong>${number1(row.fantasy_profile_score)}</strong><span>Fantasy</span></div>
      <div class="row-chevron" aria-hidden="true">›</div>
    </button>
  `).join("");

  el.more.hidden = state.visible >= state.filtered.length;
}

function metricCard(label, value, explanation = "") {
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${number1(value)}</strong>
      ${explanation ? `<p>${escapeHtml(explanation)}</p>` : ""}
    </div>
  `;
}

function metricCardText(label, value, explanation = "") {
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value ?? "—")}</strong>
      ${explanation ? `<p>${escapeHtml(explanation)}</p>` : ""}
    </div>
  `;
}

function traitRows(player) {
  const traits = [
    ["Production", player.production_score],
    ["Power", player.power_score],
    ["Contact", player.contact_score],
    ["Discipline", player.discipline_score],
    ["Speed", player.speed_score]
  ];

  return traits.map(([label, value]) => {
    const score = Math.max(0, Math.min(99.9, Number(value) || 0));
    return `
      <div class="trait-row">
        <div class="trait-label">${label}</div>
        <div class="trait-track"><div class="trait-fill" style="width:${score}%"></div></div>
        <div class="trait-value">${number1(value)}</div>
      </div>
    `;
  }).join("");
}

function shapeCards(player) {
  const dims = Array.isArray(player.hitting_shape?.profile_dimensions)
    ? player.hitting_shape.profile_dimensions
    : [];

  if (!dims.length) return `<div class="shape-card"><p>No hitting-shape dimensions available.</p></div>`;

  return dims.map((item) => `
    <div class="shape-card">
      <div class="topline">
        <strong>${escapeHtml(item.label || item.key || "Trait")}</strong>
        <em>${escapeHtml(item.band_label || "")}</em>
      </div>
      <p>Raw: ${item.raw_value ?? "—"}${item.z == null ? "" : ` • Context z ${number1(item.z)}`}</p>
    </div>
  `).join("");
}

function battedBallSummary(player) {
  const items = Array.isArray(player.hitting_shape?.batted_ball_shape)
    ? player.hitting_shape.batted_ball_shape
    : [];

  if (!items.length) return "";
  return `<div class="profile-meta">${items.map((item) => `<span class="chip">${escapeHtml(item.label || item.key)} ${item.pct == null ? "—" : `${number1(item.pct)}%`}</span>`).join("")}</div>`;
}

function standoutSummary(player) {
  const standout = Array.isArray(player.hitting_shape?.standout_traits)
    ? player.hitting_shape.standout_traits
    : [];
  const watchout = Array.isArray(player.hitting_shape?.watchout_traits)
    ? player.hitting_shape.watchout_traits
    : [];

  const pills = [
    ...standout.map((x) => `<span class="chip emphasis">Standout: ${escapeHtml(x.label || x.key)}</span>`),
    ...watchout.map((x) => `<span class="chip">Watch: ${escapeHtml(x.label || x.key)}</span>`)
  ];

  return pills.length ? `<div class="profile-meta">${pills.join("")}</div>` : "";
}

function compCards(player) {
  const comps = Array.isArray(player.top_comparables) ? player.top_comparables : [];
  if (!comps.length) return `<div class="comp-card"><div class="comp-name">No comparables available.</div></div>`;

  return comps.map((comp, index) => `
    <div class="comp-card">
      <div class="comp-rank">MATCH ${index + 1}</div>
      <div class="comp-name">${escapeHtml(comp.name || "Historical comp")}</div>
      <div class="comp-meta">${escapeHtml(comp.level || "—")} • ${escapeHtml(comp.season || "—")} • ${escapeHtml(comp.position || comp.position_family || "—")}</div>
      <div class="comp-score"><strong>${number1(comp.match_score)}</strong><span>Match score</span></div>
    </div>
  `).join("");
}

function explanationDetails(player) {
  const exp = player.plain_language_explanations || {};
  const items = [
    ["Overall score", exp.overall],
    ["Opportunity", exp.opportunity],
    ["Fantasy Profile", exp.fantasy_profile],
    ["Historical comparables", exp.comparables],
    ["Comparable selection", exp.comparable_selection],
    ["SwStr evidence", exp.swstr],
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
  const exp = player.plain_language_explanations || {};
  const positionRankLabel = `${positionFamilyLabel(player.position_family)} #${integer(player.position_rank)}`;

  el.dialogContent.innerHTML = `
    <div class="profile-head">
      <div class="profile-kicker">#${integer(player.overall_rank)} overall • ${escapeHtml(positionRankLabel)}</div>
      <div class="profile-title">
        <h2 id="dialogPlayerName">${escapeHtml(player.full_name)}</h2>
        <div class="profile-score"><strong>${number1(player.overall_score)}</strong><span>DiamondRank</span></div>
      </div>
      <div class="profile-meta">
        <span class="chip">${escapeHtml(player.primary_position || player.position_family || "—")}</span>
        <span class="chip">${escapeHtml(player.current_org || "FA")}</span>
        <span class="chip">${escapeHtml(player.current_level || "—")}</span>
        <span class="chip">Age ${number1(player.age)}</span>
        <span class="chip emphasis">${escapeHtml(confidenceLabel(player.ranking_confidence))}</span>
      </div>
      ${player.sample_size_warning ? `<div class="warning">${escapeHtml(player.sample_size_warning)}</div>` : ""}
    </div>

    <section class="profile-section">
      <div class="section-title-row"><h3>Core scores</h3><span>0.0–99.9 relative scale</span></div>
      <div class="score-grid">
        ${metricCard("Opportunity", player.opportunity_score, exp.opportunity)}
        ${metricCard("Fantasy Profile", player.fantasy_profile_score, exp.fantasy_profile)}
      </div>
    </section>

    <section class="profile-section">
      <div class="section-title-row"><h3>Fantasy skill profile</h3><span>Age- and level-adjusted</span></div>
      <div class="trait-list">${traitRows(player)}</div>
    </section>

    <section class="profile-section">
      <div class="section-title-row"><h3>Current evidence</h3><span>${escapeHtml(evidence.sample_tier || "—")} sample</span></div>
      <div class="profile-meta">
        <span class="chip">Season ${escapeHtml(evidence.season || "—")}</span>
        <span class="chip">${escapeHtml(evidence.level || player.current_level || "—")}</span>
        <span class="chip">${integer(evidence.pa)} PA</span>
        <span class="chip">Age ${number1(evidence.age ?? player.age)}</span>
      </div>
    </section>

    <section class="profile-section">
      <div class="section-title-row"><h3>Hitting shape</h3><span>Context-relative evidence</span></div>
      ${standoutSummary(player)}
      <div class="shape-grid" style="margin-top:10px">${shapeCards(player)}</div>
      ${battedBallSummary(player)}
    </section>

    <section class="profile-section">
      <div class="section-title-row"><h3>SwStr evidence</h3><span>Supporting evidence only</span></div>
      <div class="swstr-grid">
        ${metricCardText("Raw SwStr", percentFromRate(player.swstr_pct))}
        ${metricCard("Contact percentile", player.swstr_contact_percentile)}
        <div class="metric-card"><span>Shape label</span><strong style="font-size:18px">${escapeHtml(player.swstr_shape_label || "—")}</strong><p>${integer(player.swstr_source_pa)} PA • ${escapeHtml(player.swstr_sample_tier || "—")}</p></div>
      </div>
      ${player.swstr_sample_warning ? `<div class="warning">${escapeHtml(player.swstr_sample_warning)}</div>` : ""}
      ${exp.swstr ? `<p style="margin:10px 1px 0;color:var(--muted);font-size:11px;line-height:1.55">${escapeHtml(exp.swstr)}</p>` : ""}
    </section>

    <section class="profile-section">
      <div class="section-title-row"><h3>Historical comparables</h3><span>Top 3 refined-position matches</span></div>
      <div class="comps">${compCards(player)}</div>
    </section>

    <section class="profile-section">
      <div class="section-title-row"><h3>What the scores mean</h3><span>Methodology notes</span></div>
      <div class="explanation-list">${explanationDetails(player)}</div>
    </section>
  `;

  el.dialogLoading.hidden = true;
  el.dialogContent.hidden = false;
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
