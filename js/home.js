import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SOURCES = {
  hitters: {
    url: "https://uxvuehmighuqqejowxoq.supabase.co",
    key: "sb_publishable_mQiGDDJ7o5vbF5RYSnl0-g_tRiJRi06",
    view: "diamondrank_current_hitters_v1",
    countEl: "homeHitterCount",
    updatedEl: "homeHitterUpdated",
    previewEl: "homeHitterPreview",
    rankingsUrl: "./rankings.html?mode=hitters"
  },
  pitchers: {
    url: "https://pkgnjhkdqzfrsrjdsjcp.supabase.co",
    key: "sb_publishable__vES8c3cYqijmgHiqBlFZQ_m__qXdrA",
    view: "diamondrank_current_pitchers_v1",
    countEl: "homePitcherCount",
    updatedEl: "homePitcherUpdated",
    previewEl: "homePitcherPreview",
    rankingsUrl: "./rankings.html?mode=pitchers"
  }
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

function formatShortDate(value) {
  if (!value) return "Update unavailable";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Update unavailable";
  return `Updated ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(d)}`;
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

function renderPreview(rows, rankingsUrl) {
  if (!rows.length) {
    return `<div class="home-preview-loading">No current rankings available.</div>`;
  }

  return rows.map((row) => `
    <a class="home-preview-row" href="${rankingsUrl}">
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

async function loadBoard(source) {
  const client = createClient(source.url, source.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const countNode = document.getElementById(source.countEl);
  const updatedNode = document.getElementById(source.updatedEl);
  const previewNode = document.getElementById(source.previewEl);

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

    const rows = data || [];
    const latest = rows.reduce((max, row) => {
      const time = row.data_updated_at ? new Date(row.data_updated_at).getTime() : 0;
      return time > max ? time : max;
    }, 0);

    if (countNode) countNode.textContent = Number.isFinite(count) ? count.toLocaleString() : "—";
    if (updatedNode) updatedNode.textContent = latest ? formatShortDate(latest) : "Current board";
    if (previewNode) previewNode.innerHTML = renderPreview(rows, source.rankingsUrl);
  } catch (error) {
    console.error("DiamondRank home preview failed", error);
    if (countNode) countNode.textContent = "—";
    if (updatedNode) updatedNode.textContent = "Board unavailable";
    if (previewNode) {
      previewNode.innerHTML = `
        <div class="home-preview-error">
          Couldn’t load this preview.
          <a href="${source.rankingsUrl}">Open rankings →</a>
        </div>
      `;
    }
  }
}

await Promise.all([
  loadBoard(SOURCES.hitters),
  loadBoard(SOURCES.pitchers)
]);
