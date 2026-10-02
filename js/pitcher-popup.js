const PROFILE_VIEW = "diamondrank_current_pitcher_profiles_v1";

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

function number2(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function integer(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
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

function confidenceLabel(value) {
  if (!value) return "Confidence —";
  const text = String(value).toLowerCase().replaceAll("_", " ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} confidence`;
}

function scoreRing(label, value, size = "trait") {
  const meter = Math.max(0, Math.min(99.9, Number(value) || 0));
  return `
    <div class="pitcher-score-ring-card ${size} ${scoreToneClass(value)}">
      <div class="pitcher-score-ring" style="--meter:${meter}">
        <strong>${number1(value)}</strong>
      </div>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function statCell(label, value) {
  return `
    <div>
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value ?? "—")}</strong>
    </div>
  `;
}

function contextMeter(label, value, rawLabel = "") {
  const pct = Math.max(0, Math.min(99.9, Number(value) || 0));
  return `
    <div class="pitcher-context-meter ${scoreToneClass(value)}">
      <div class="pitcher-context-head">
        <strong>${escapeHtml(label)}</strong>
        <span>${number1(value)}</span>
      </div>
      <div class="pitcher-context-track" style="--pct:${pct}%"><i></i></div>
      <small>${escapeHtml(rawLabel)}</small>
    </div>
  `;
}

function outcomeTone(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("impact") || key.includes("top end") || key.includes("high leverage") || key.includes("mid rotation")) return "outcome-impact";
  if (key.includes("role") || key.includes("back end") || key.includes("middle reliever")) return "outcome-role";
  if (key.includes("depth")) return "outcome-depth";
  if (key.includes("limited")) return "outcome-limited";
  if (key.includes("no mlb")) return "outcome-none";
  return "outcome-neutral";
}

function comparableCards(player) {
  const comps = Array.isArray(player.top_comparables) ? player.top_comparables : [];
  if (!comps.length) return `<div class="pitcher-empty">No historical comparables available.</div>`;

  return comps.map((comp) => `
    <article class="pitcher-comp-card">
      <div class="pitcher-comp-top">
        <span>Match ${integer(comp.rank)} · ${number1(comp.match_pct)}%</span>
      </div>
      <strong class="pitcher-comp-name">${escapeHtml(comp.name || "Historical comp")}</strong>
      <div class="pitcher-comp-season">${escapeHtml(comp.anchor_season || "—")}</div>
      <div class="pitcher-comp-role ${outcomeTone(comp.historical_role)}">${escapeHtml(comp.historical_role || "—")}</div>
      <div class="pitcher-comp-stats">
        <span><small>IP</small><b>${number1(comp.mlb_ip_5y)}</b></span>
        <span><small>WAR</small><b>${number2(comp.war_5y)}</b></span>
        <span><small>GS</small><b>${integer(comp.starts_5y)}</b></span>
      </div>
    </article>
  `).join("");
}

function fiveYearPanel(player) {
  const o = player.five_year_outcomes || {};
  const buckets = Array.isArray(o.outcome_buckets) ? o.outcome_buckets : [];
  if (!buckets.length) return "";

  const toneForKey = (key) => {
    const k = String(key || "").toUpperCase();
    if (k === "NO_MLB") return "outcome-none";
    if (k === "LIMITED_MLB") return "outcome-limited";
    if (k === "MLB_DEPTH") return "outcome-depth";
    if (k === "MLB_ROLE") return "outcome-role";
    if (k === "IMPACT_MLB") return "outcome-impact";
    return "outcome-neutral";
  };

  return `
    <div class="pitcher-five-year-panel">
      <div class="pitcher-five-year-head">
        <strong>5-Year MLB Outcomes</strong>
        <span>All ${integer(o.comp_count)} comparables</span>
      </div>

      <div class="pitcher-outcome-segments">
        ${buckets.map((b) => `<i class="${toneForKey(b.key)}" style="width:${Math.max(0, Math.min(100, Number(b.pct) || 0))}%"></i>`).join("")}
      </div>

      <div class="pitcher-outcome-legend">
        ${buckets.map((b) => `
          <div class="${toneForKey(b.key)}">
            <span></span>
            <small>${escapeHtml(b.label)}</small>
            <strong>${number1(b.pct)}%</strong>
          </div>
        `).join("")}
      </div>

      <div class="pitcher-outcome-medians">
        ${statCell("Median MLB IP", number1(o.median_mlb_ip_5y))}
        ${statCell("Median WAR", number2(o.median_war_5y))}
        ${statCell("Median Starts", number1(o.median_starts_5y))}
      </div>

      <p class="pitcher-outcome-note">${escapeHtml(o.qualification_note || "")}</p>
    </div>
  `;
}

function readingGuide() {
  const items = [
    ["DiamondScore", "Overall DiamondRank score for the current pitcher board."],
    ["Opportunity", "Historical-comparable opportunity signal from the 30 closest eligible pitcher profiles."],
    ["Fantasy Profile", "Fantasy-minded underlying pitching profile built from miss bats, command, run prevention, contact management and workload."],
    ["Current Evidence", "The season and level selected by the pitcher evidence rules. Raw rates are displayed from that evidence season."],
    ["Context Profile", "Percentile-style comparisons against the pitcher's age and level context. Higher values mean more of the named trait."],
    ["Comparables", "The six closest historical matches. Match % is profile similarity, not a probability of the same career result."],
    ["5-Year Outcomes", "Observed MLB outcomes across all 30 historical comparables during the five seasons after their anchor season."]
  ];

  return items.map(([label, text]) => `
    <details class="pitcher-method-card">
      <summary>${escapeHtml(label)}</summary>
      <p>${escapeHtml(text)}</p>
    </details>
  `).join("");
}

function renderProfile(player, dialogContent, dialogLoading) {
  const e = player.current_evidence || {};
  const f = player.fantasy_skill_profile || {};
  const c = player.context_profile || {};

  dialogContent.innerHTML = `
    <div class="pitcher-profile-head">
      <h2 id="dialogPlayerName">${escapeHtml(player.full_name)}</h2>

      <div class="pitcher-rank-score-strip">
        <div class="pitcher-rank-card">
          <small>DiamondRank</small>
          <strong>#${integer(player.overall_rank)}</strong>
          <span>Overall</span>
        </div>
        <div class="pitcher-rank-card">
          <small>Position Rank</small>
          <strong>#${integer(player.position_rank)}</strong>
          <span>Pitcher</span>
        </div>
        <div class="pitcher-diamondscore-card ${scoreToneClass(player.overall_score)}">
          <small>DiamondScore</small>
          <div class="pitcher-diamondscore-ring" style="--meter:${Math.max(0, Math.min(99.9, Number(player.overall_score) || 0))}">
            <strong>${number1(player.overall_score)}</strong>
          </div>
        </div>
      </div>

      <div class="pitcher-meta">
        <span>P</span>
        <span>${escapeHtml(player.current_org || "FA")}</span>
        <span>${escapeHtml(player.current_level || "—")}</span>
        <span>Age ${number1(player.age)}</span>
        <span class="emphasis">${escapeHtml(confidenceLabel(player.ranking_confidence))}</span>
      </div>
      ${player.confidence_reason ? `<p class="pitcher-confidence-note">${escapeHtml(player.confidence_reason)}</p>` : ""}
    </div>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title"><h3>Core scores</h3></div>
      <div class="pitcher-core-grid">
        ${scoreRing("Opportunity", player.opportunity_score, "core")}
        ${scoreRing("Fantasy profile", player.fantasy_profile_score, "core")}
      </div>
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>Fantasy skill profile</h3>
        <span>Current evidence</span>
      </div>
      <div class="pitcher-trait-grid">
        ${scoreRing("Miss Bats", f.miss_bats)}
        ${scoreRing("Command", f.command)}
        ${scoreRing("Run Prevention", f.run_prevention)}
        ${scoreRing("Contact Management", f.contact_management)}
        ${scoreRing("Workload", f.workload)}
      </div>
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>Current evidence</h3>
        <span>${escapeHtml(e.source || "—")}</span>
      </div>
      <div class="pitcher-evidence-grid">
        ${statCell("Season", integer(e.season))}
        ${statCell("Level", e.level || player.current_level || "—")}
        ${statCell("IP", number1(e.ip))}
        ${statCell("Age", number1(e.age ?? player.age))}
      </div>
      <div class="pitcher-stat-grid">
        ${statCell("K%", `${number1(e.k_pct)}%`)}
        ${statCell("BB%", `${number1(e.bb_pct)}%`)}
        ${statCell("K-BB%", `${number1(e.k_minus_bb_pct)}%`)}
        ${statCell("ERA", number2(e.era))}
        ${statCell("WHIP", number2(e.whip))}
        ${statCell("xFIP", number2(e.xfip))}
      </div>
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>Context profile</h3>
        <span>Age + level context</span>
      </div>
      <div class="pitcher-context-grid">
        ${contextMeter("K-BB", c.kbb_percentile, `${number1(e.k_minus_bb_pct)}%`)}
        ${contextMeter("xFIP", c.xfip_percentile, number2(e.xfip))}
        ${contextMeter("HR Suppression", c.hr_suppression_percentile, "Peer context")}
        ${contextMeter("Strike%", c.strike_percentile, `${number1(e.strike_pct)}%`)}
        ${contextMeter("GB%", c.gb_percentile, `${number1(e.gb_pct)}%`)}
      </div>
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>Swing & miss</h3>
        <span>Evidence season</span>
      </div>
      <div class="pitcher-swstr-card ${scoreToneClass(f.miss_bats)}">
        <div>
          <small>SwStr%</small>
          <strong>${number1(e.swstr_pct)}%</strong>
        </div>
        <div>
          <small>Miss Bats Score</small>
          <strong>${number1(f.miss_bats)}</strong>
        </div>
        <div>
          <small>Batters Faced</small>
          <strong>${integer(e.tbf)}</strong>
        </div>
      </div>
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>Historical comparables</h3>
        <span>Top 6 matches</span>
      </div>
      <div class="pitcher-comps">${comparableCards(player)}</div>
      ${fiveYearPanel(player)}
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>How to read DiamondRank</h3>
        <span>Tap a topic</span>
      </div>
      <div class="pitcher-method-grid">${readingGuide()}</div>
    </section>
  `;

  dialogLoading.hidden = true;
  dialogContent.hidden = false;
}

export function createPitcherPopup({ supabase }) {
  const dialog = document.getElementById("playerDialog");
  const closeButton = document.getElementById("dialogClose");
  const dialogLoading = document.getElementById("dialogLoading");
  const dialogContent = document.getElementById("dialogContent");

  async function open(playerId) {
    dialogContent.innerHTML = "";
    dialogContent.hidden = true;
    dialogLoading.hidden = false;
    dialogLoading.textContent = "Loading pitcher profile…";

    if (!dialog.open) dialog.showModal();

    const { data, error } = await supabase
      .from(PROFILE_VIEW)
      .select("*")
      .eq("player_id", playerId)
      .single();

    if (error || !data) {
      dialogLoading.textContent = error?.message || "Couldn’t load this pitcher.";
      return;
    }

    renderProfile(data, dialogContent, dialogLoading);
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  closeButton.addEventListener("click", close);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener("close", () => {
    dialogContent.innerHTML = "";
    dialogContent.hidden = true;
    dialogLoading.hidden = false;
    dialogLoading.textContent = "Loading pitcher profile…";
  });

  return { open, close };
}
