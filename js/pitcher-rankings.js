import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { createPitcherPopup } from "./pitcher-popup.js?v=32";

const SUPABASE_URL = "https://pkgnjhkdqzfrsrjdsjcp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__vES8c3cYqijmgHiqBlFZQ_m__qXdrA";
const PUBLIC_VIEW = "diamondrank_current_pitchers_v1";
const PAGE_SIZE = 50;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const pitcherPopup = createPitcherPopup({ supabase });

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
  more: document.getElementById("loadMoreButton")
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

function integer(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
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

function confidenceLabel(value) {
  if (!value) return "Confidence —";
  const text = String(value).toLowerCase().replaceAll("_", " ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} confidence`;
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
  el.headerStatus.textContent = "Pitcher rankings unavailable";
}

function populateSelect(select, values) {
  const current = select.value;
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  select.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
  for (const value of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === current)) select.value = current;
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

  populateSelect(el.org, state.rows.map((row) => row.current_org));
  populateSelect(el.level, state.rows.map((row) => row.current_level));

  const latest = state.rows.reduce((max, row) => {
    const t = row.data_updated_at ? new Date(row.data_updated_at).getTime() : 0;
    return t > max ? t : max;
  }, 0);

  el.heroCount.textContent = state.rows.length.toLocaleString();
  el.heroUpdated.textContent = latest ? formatShortDate(latest) : "—";
  el.headerStatus.textContent = "Current pitcher board";

  setLoading(false);
  applyFilters();
}

function activeFilterCount() {
  return [el.org.value, el.level.value].filter(Boolean).length;
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
  const org = el.org.value;
  const level = el.level.value;
  const sort = el.sort.value;

  const filtered = state.rows.filter((row) => {
    if (org && row.current_org !== org) return false;
    if (level && row.current_level !== level) return false;
    if (!q) return true;

    const haystack = [
      row.full_name,
      row.current_org,
      row.current_level,
      row.primary_position,
      row.position_family
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
    el.board.innerHTML = `<div class="state-card"><strong>No pitchers match these filters.</strong></div>`;
    el.more.hidden = true;
    return;
  }

  el.board.innerHTML = visibleRows.map((row) => `
    <button class="player-row pitcher-row" type="button" data-player-id="${escapeHtml(row.player_id)}" aria-label="Open ${escapeHtml(row.full_name)} pitcher profile">
      <div class="rank-box"><small>#</small><span class="rank-number">${integer(row.overall_rank)}</span></div>
      <div class="player-main">
        <div class="player-name">${escapeHtml(row.full_name)}</div>
        <div class="player-meta">
          <span class="pitcher-role-label">P</span>
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

for (const control of [el.org, el.level]) {
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
  if (row) pitcherPopup.open(row.dataset.playerId);
});

loadRankings();
