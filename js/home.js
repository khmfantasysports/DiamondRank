import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SOURCES = {
  hitters: {
    label: "hitter",
    url: "https://uxvuehmighuqqejowxoq.supabase.co",
    key: "sb_publishable_mQiGDDJ7o5vbF5RYSnl0-g_tRiJRi06",
    view: "diamondrank_current_hitters_v1",
    countEl: "homeHitterCount",
    updatedEl: "homeHitterUpdated",
    rankingsUrl: "./rankings.html?mode=hitters"
  },
  pitchers: {
    label: "pitcher",
    url: "https://pkgnjhkdqzfrsrjdsjcp.supabase.co",
    key: "sb_publishable__vES8c3cYqijmgHiqBlFZQ_m__qXdrA",
    view: "diamondrank_current_pitchers_v1",
    countEl: "homePitcherCount",
    updatedEl: "homePitcherUpdated",
    rankingsUrl: "./rankings.html?mode=pitchers"
  }
};

const boardData = {
  hitters: [],
  pitchers: []
};

let previewMode = "hitters";

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

function formatShortDate(value) {
  if (!value) return "Current";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Current";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(d);
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

function renderPreview() {
  const list = document.getElementById("homePreviewList");
  const link = document.getElementById("homePreviewLink");
  const source = SOURCES[previewMode];
  const rows = boardData[previewMode];

  for (const button of document.querySelectorAll("[data-preview-mode]")) {
    const active = button.dataset.previewMode === previewMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  }

  if (link) {
    link.href = source.rankingsUrl;
    link.innerHTML = `View full ${source.label} rankings <span>→</span>`;
  }

  if (!list) return;

  if (!rows.length) {
    list.innerHTML = `<div class="home-preview-loading">Preview unavailable.</div>`;
    return;
  }

  list.innerHTML = rows.map((row) => `
    <a class="home-preview-row" href="${source.rankingsUrl}">
      <span class="home-preview-rank">#${escapeHtml(row.overall_rank)}</span>
      <span class="home-preview-player">
        <strong>${escapeHtml(row.full_name)}</strong>
        <small>${escapeHtml(row.current_org || "FA")} · ${escapeHtml(row.current_level || "—")}</small>
      </span>
      <span class="home-preview-score ${scoreToneClass(row.overall_score)}">
        <strong>${number1(row.overall_score)}</strong>
        <small>DiamondScore</small>
      </span>
    </a>
  `).join("");
}

async function loadBoard(mode) {
  const source = SOURCES[mode];
  const client = createClient(source.url, source.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const countNode = document.getElementById(source.countEl);
  const updatedNode = document.getElementById(source.updatedEl);

  try {
    const { data, error, count } = await client
      .from(source.view)
      .select(
        "overall_rank,full_name,current_org,current_level,overall_score,data_updated_at",
        { count: "exact" }
      )
      .order("overall_rank", { ascending: true })
      .limit(5);

    if (error) throw error;

    boardData[mode] = data || [];

    const latest = boardData[mode].reduce((max, row) => {
      const t = row.data_updated_at ? new Date(row.data_updated_at).getTime() : 0;
      return t > max ? t : max;
    }, 0);

    if (countNode) countNode.textContent = Number.isFinite(count) ? count.toLocaleString() : "—";
    if (updatedNode) updatedNode.textContent = latest ? formatShortDate(latest) : "Current";

    if (previewMode === mode) renderPreview();
  } catch (error) {
    console.error(`DiamondRank ${mode} home preview failed`, error);
    if (countNode) countNode.textContent = "—";
    if (updatedNode) updatedNode.textContent = "Unavailable";
    boardData[mode] = [];
    if (previewMode === mode) renderPreview();
  }
}

for (const button of document.querySelectorAll("[data-preview-mode]")) {
  button.addEventListener("click", () => {
    previewMode = button.dataset.previewMode === "pitchers" ? "pitchers" : "hitters";
    renderPreview();
  });
}

await Promise.all([
  loadBoard("hitters"),
  loadBoard("pitchers")
]);

renderPreview();
