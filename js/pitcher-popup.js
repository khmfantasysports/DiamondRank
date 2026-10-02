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

function yearValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "—";
}

function qualifiedSeasonLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const count = Math.round(n);
  return `${count} qualified season${count === 1 ? "" : "s"}`;
}

function evidenceSourceLabel(value) {
  const key = String(value || "").toUpperCase();
  if (key === "CURRENT_MILB_40_PLUS") return "Current MiLB · 40+ IP";
  if (key === "PRIOR_MILB_40_PLUS") return "Prior MiLB · 40+ IP";
  if (key === "CURRENT_MILB_SMALL_SAMPLE") return "Current MiLB · Small sample";
  return String(value || "—").replaceAll("_", " ");
}

function signed1(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 0.05) return "0.0";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
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
  const n = Number(value);
  if (!Number.isFinite(n)) return "tone-neutral";
  if (n >= 75) return "tone-emerald";
  if (n >= 60) return "tone-lime";
  if (n >= 40) return "tone-gold";
  if (n >= 25) return "tone-orange";
  return "tone-red";
}

function deltaToneClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "delta-neutral";
  if (n >= 5) return "delta-up-strong";
  if (n >= 1.5) return "delta-up";
  if (n <= -5) return "delta-down-strong";
  if (n <= -1.5) return "delta-down";
  return "delta-neutral";
}

function signedToneClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "signed-neutral";
  if (n < -0.5) return "signed-red";
  if (n < 0) return "signed-orange";
  if (n === 0) return "signed-gold";
  if (n < 1.5) return "signed-lime";
  return "signed-green";
}

function mlbKbbToneClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "tone-neutral";
  if (n >= 25) return "tone-emerald";
  if (n >= 18) return "tone-lime";
  if (n >= 12) return "tone-gold";
  if (n >= 6) return "tone-orange";
  return "tone-red";
}

function confidenceLabel(value) {
  if (!value) return "Confidence —";
  const text = String(value).toLowerCase().replaceAll("_", " ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} confidence`;
}

function scoreRing(label, value, size = "trait") {
  const meter = clamp(value, 0, 99.9);
  return `
    <div class="pitcher-score-ring-card ${size} ${scoreToneClass(value)}">
      <div class="pitcher-score-ring" style="--meter:${meter}">
        <strong>${number1(value)}</strong>
      </div>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function statCell(label, value, toneClass = "") {
  return `
    <div class="${escapeHtml(toneClass)}">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value ?? "—")}</strong>
    </div>
  `;
}

function contextMeter(label, percentile, rawLabel = "") {
  const value = Number(percentile);
  if (!Number.isFinite(value)) return "";
  const position = clamp(value, 5, 95);
  return `
    <div class="context-meter ${contextToneClass(value)}"
      role="img"
      aria-label="${escapeHtml(label)}: ${number1(value)} percentile context">
      <strong>${escapeHtml(label)}</strong>
      <div class="context-track" style="--dot:${position}%">
        <span class="context-mid"></span>
        <span class="context-dot"></span>
      </div>
      <div class="context-scale">
        <span>−</span>
        <b>${integer(value)} pct</b>
        <span>+</span>
      </div>
      <small>${escapeHtml(rawLabel)}</small>
    </div>
  `;
}

function contextMeters(player) {
  const c = player.context_profile || {};
  const e = player.current_evidence || {};
  const items = [
    ["K-BB", c.kbb_percentile, `${number1(e.k_minus_bb_pct)}%`],
    ["xFIP", c.xfip_percentile, number2(e.xfip)],
    ["HR Suppression", c.hr_suppression_percentile, "Peer context"],
    ["Strike%", c.strike_percentile, `${number1(e.strike_pct)}%`],
    ["GB%", c.gb_percentile, `${number1(e.gb_pct)}%`]
  ].filter(([, value]) => Number.isFinite(Number(value)));

  if (!items.length) return `<div class="pitcher-empty">No context-relative pitching profile is available.</div>`;

  return `
    <div class="context-meter-grid">
      ${items.map(([label, value, raw]) => contextMeter(label, value, raw)).join("")}
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

function roleAwareCompStat(comp) {
  const branch = String(comp.historical_role_branch || "").toUpperCase();
  if (branch === "RELIEVER") return { label: "SV+H", value: integer(comp.saves_holds_5y) };
  if (branch === "STARTER") return { label: "GS", value: integer(comp.starts_5y) };
  return { label: "G", value: integer(comp.games_5y) };
}

function comparableCards(player) {
  const comps = Array.isArray(player.top_comparables) ? player.top_comparables : [];
  if (!comps.length) return `<div class="pitcher-empty">No historical comparables available.</div>`;

  return comps.map((comp) => {
    const roleStat = roleAwareCompStat(comp);
    return `
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
          <span><small>${escapeHtml(roleStat.label)}</small><b>${escapeHtml(roleStat.value)}</b></span>
        </div>
      </article>
    `;
  }).join("");
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
        ${buckets.map((b) => `<i class="${toneForKey(b.key)}" style="width:${clamp(b.pct, 0, 100)}%"></i>`).join("")}
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

      <details class="pitcher-outcome-definitions">
        <summary>5-year outcome definitions</summary>
        <div>
          <p><b>No MLB:</b> No MLB innings within the five-year outcome window.</p>
          <p><b>Limited MLB:</b> MLB appearance, but fewer than 75 MLB innings.</p>
          <p><b>MLB Depth:</b> 75 to fewer than 150 MLB innings.</p>
          <p><b>MLB Role:</b> Historical outcome classified as Role Starter, Back End Starter, Role Reliever, or Middle Reliever.</p>
          <p><b>Impact MLB:</b> Historical outcome classified as Mid Rotation Starter, Top End Starter, or High Leverage Reliever.</p>
          <p><b>Median WAR & Starts:</b> Uses comparable pitchers with at least 75 MLB innings.</p>
        </div>
      </details>
    </div>
  `;
}


function normalizedDevelopmentContext(player) {
  const original = player.development_context || {};
  const profile = player.fantasy_skill_profile || {};
  const evidenceSeason = Number(player.current_evidence?.season);

  const timeline = (Array.isArray(original.stage_timeline) ? original.stage_timeline : [])
    .map((row) => ({ ...row }))
    .sort((a, b) => Number(a.season) - Number(b.season));

  // Keep the latest qualified evidence-season trait scores identical to
  // the main Fantasy Skill Profile.
  for (const row of timeline) {
    if (Number(row.season) !== evidenceSeason) continue;
    if (Number.isFinite(Number(profile.miss_bats))) row.miss_bats = Number(profile.miss_bats);
    if (Number.isFinite(Number(profile.command))) row.command = Number(profile.command);
    if (Number.isFinite(Number(profile.run_prevention))) row.run_prevention = Number(profile.run_prevention);
    if (Number.isFinite(Number(profile.contact_management))) row.contact_management = Number(profile.contact_management);
    if (Number.isFinite(Number(profile.workload))) row.workload = Number(profile.workload);
  }

  const previous = timeline.length >= 2 ? timeline[timeline.length - 2] : null;
  const latest = timeline.length ? timeline[timeline.length - 1] : null;
  const keys = ["miss_bats", "command", "run_prevention", "contact_management", "workload"];
  const traitDeltas = {};

  if (previous && latest) {
    for (const key of keys) {
      const now = Number(latest[key]);
      const before = Number(previous[key]);
      if (Number.isFinite(now) && Number.isFinite(before)) traitDeltas[key] = now - before;
    }
  }

  const values = Object.values(traitDeltas).filter((v) => Number.isFinite(Number(v))).map(Number);
  const overallDelta = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  let trendKey = "NO_QUALIFIED_HISTORY";
  if (timeline.length === 1) trendKey = "BASELINE_ONLY";
  if (timeline.length >= 2) {
    trendKey = overallDelta >= 3 ? "TRENDING_UP" : overallDelta <= -3 ? "TRENDING_DOWN" : "STEADY";
  }

  return {
    ...original,
    qualified_season_count: timeline.length,
    stage_timeline: timeline,
    latest_season: latest?.season ?? original.latest_season,
    previous_season: previous?.season ?? null,
    trait_deltas: traitDeltas,
    overall_delta: overallDelta,
    trend_key: trendKey
  };
}

function trendTag(context) {
  const key = String(context?.trend_key || "");
  if (key === "TRENDING_UP") return { icon: "↗", label: "Trending Up", tone: "trend-up" };
  if (key === "TRENDING_DOWN") return { icon: "↘", label: "Trending Down", tone: "trend-down" };
  if (key === "STEADY") return { icon: "→", label: "Steady", tone: "trend-steady" };
  if (key === "BASELINE_ONLY") return { icon: "•", label: "Baseline Only", tone: "trend-baseline" };
  return { icon: "•", label: "Limited History", tone: "trend-baseline" };
}

function mlbTransitionCompact(player) {
  const mlb = player.mlb_transition || {};
  if (!mlb.has_mlb_evidence) return "";

  const savesHolds = (Number(mlb.saves) || 0) + (Number(mlb.holds) || 0);

  return `
    <div class="pitcher-mlb-transition">
      <div class="pitcher-mlb-transition-head">
        <div>
          <small>MLB TRANSITION</small>
          <strong>${yearValue(mlb.season)} · ${escapeHtml(mlb.team || player.current_org || "MLB")}</strong>
        </div>
        <span>${escapeHtml(mlb.sample_label || "MLB Sample")}</span>
      </div>

      <div class="pitcher-mlb-stat-grid">
        ${statCell("IP", number1(mlb.ip))}
        ${statCell("ERA", number2(mlb.era))}
        ${statCell("WHIP", number2(mlb.whip))}
        ${statCell("xFIP", number2(mlb.xfip))}
        ${statCell("K%", `${number1(mlb.k_pct)}%`)}
        ${statCell("BB%", `${number1(mlb.bb_pct)}%`)}
      </div>

      <div class="pitcher-mlb-stat-grid pitcher-mlb-stat-grid-secondary">
        ${statCell("G", integer(mlb.games))}
        ${statCell("GS", integer(mlb.starts))}
        ${statCell("WAR", number2(mlb.war), signedToneClass(mlb.war))}
        ${statCell("K-BB%", `${number1(mlb.k_minus_bb_pct)}%`, mlbKbbToneClass(mlb.k_minus_bb_pct))}
        ${statCell("SwStr%", `${number1(mlb.swstr_pct)}%`)}
        ${statCell("SV+H", integer(savesHolds))}
      </div>

      <p>MLB performance is transition evidence and is not blended into the minor-league year-over-year trend.</p>
    </div>
  `;
}


function developmentTrendFromDelta(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "STABLE";
  if (n >= 1.5) return "UP";
  if (n <= -1.5) return "DOWN";
  return "STABLE";
}

function developmentTrendTag(value) {
  const trend = developmentTrendFromDelta(value);
  if (trend === "UP") return { icon: "↗", label: "Up", tone: "trend-up" };
  if (trend === "DOWN") return { icon: "↘", label: "Down", tone: "trend-down" };
  return { icon: "→", label: "Stable", tone: "trend-steady" };
}

function developmentSparkline(timeline, key) {
  const rows = (Array.isArray(timeline) ? timeline : [])
    .filter((row) => Number.isFinite(Number(row?.[key])));
  if (!rows.length) return "";

  if (rows.length === 1) {
    return `
      <div class="pitcher-development-sparkline single" aria-hidden="true">
        <span></span>
      </div>
    `;
  }

  const values = rows.map((row) => Number(row[key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 78;
  const height = 24;
  const pad = 3;

  const points = values.map((value, index) => {
    const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `
    <svg class="pitcher-development-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <polyline points="${points}"></polyline>
      ${points.split(" ").map((point) => {
        const [cx, cy] = point.split(",");
        return `<circle cx="${cx}" cy="${cy}" r="1.8"></circle>`;
      }).join("")}
    </svg>
  `;
}

function developmentSummary(context) {
  const deltas = context?.trait_deltas || {};
  const values = [
    deltas.miss_bats,
    deltas.command,
    deltas.run_prevention,
    deltas.contact_management,
    deltas.workload
  ].filter((value) => Number.isFinite(Number(value)));

  let improving = 0;
  let stable = 0;
  let declining = 0;

  for (const value of values) {
    const trend = developmentTrendFromDelta(value);
    if (trend === "UP") improving += 1;
    else if (trend === "DOWN") declining += 1;
    else stable += 1;
  }

  return `${improving} improving · ${stable} stable · ${declining} declining`;
}

function developmentTraitCards(context) {
  const d = context.trait_deltas || {};
  const timeline = Array.isArray(context.stage_timeline) ? context.stage_timeline : [];
  const traits = [
    ["Miss Bats", "miss_bats", d.miss_bats],
    ["Command", "command", d.command],
    ["Run Prevention", "run_prevention", d.run_prevention],
    ["Contact Mgmt", "contact_management", d.contact_management],
    ["Workload", "workload", d.workload]
  ];

  return `
    <div class="pitcher-development-traits">
      ${traits.map(([label, key, value]) => {
        const tag = developmentTrendTag(value);
        return `
          <div class="pitcher-development-trait ${deltaToneClass(value)}">
            <small>${escapeHtml(label)}</small>
            ${developmentSparkline(timeline, key)}
            <b class="pitcher-trait-trend ${tag.tone}">${tag.icon} ${escapeHtml(tag.label)}</b>
            <strong>${signed1(value)}</strong>
            <span>year over year</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function developmentPanel(player) {
  const context = normalizedDevelopmentContext(player);
  const timeline = Array.isArray(context.stage_timeline) ? context.stage_timeline : [];
  const count = Number(context.qualified_season_count) || 0;
  const tag = trendTag(context);

  if (!count) {
    return `
      <div class="pitcher-development-empty">
        <strong>Limited history</strong>
        <span>No 40+ IP minor-league season is available for a qualified trend.</span>
      </div>
      ${mlbTransitionCompact(player)}
    `;
  }

  if (count === 1) {
    const only = timeline[0] || {};
    return `
      <div class="pitcher-development-overview">
        <div class="pitcher-development-trend-row">
          <span>Trend</span>
          <b class="pitcher-trend-tag ${tag.tone}">${tag.icon} ${escapeHtml(tag.label)}</b>
        </div>
        <div class="pitcher-development-year-row">
          <strong>${yearValue(only.season)}</strong>
          <span>${escapeHtml(only.primary_level || only.highest_level || "—")} · ${number1(only.ip)} IP</span>
        </div>
        ${mlbTransitionCompact(player)}
        <button class="pitcher-development-open" type="button" data-pitcher-development-open>
          View development details <span aria-hidden="true">›</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="pitcher-development-overview">
      <div class="pitcher-development-trend-row">
        <span>Trend</span>
        <b class="pitcher-trend-tag ${tag.tone}">${tag.icon} ${escapeHtml(tag.label)}</b>
        <em>${escapeHtml(developmentSummary(context))}</em>
      </div>

      <div class="pitcher-development-year-row">
        <strong>${yearValue(context.previous_season)} → ${yearValue(context.latest_season)}</strong>
        <span>40+ IP season comparison</span>
      </div>

      ${developmentTraitCards(context)}
      ${mlbTransitionCompact(player)}

      <button class="pitcher-development-open" type="button" data-pitcher-development-open>
        View development details <span aria-hidden="true">›</span>
      </button>
    </div>
  `;
}

function developmentSeasonCard(season, isCurrent) {
  const scoreItems = [
    ["Miss Bats", season.miss_bats],
    ["Command", season.command],
    ["Run Prevention", season.run_prevention],
    ["Contact Mgmt", season.contact_management],
    ["Workload", season.workload]
  ];

  return `
    <article class="pitcher-development-season ${isCurrent ? "current" : ""}">
      <div class="pitcher-development-season-head">
        <div>
          <strong>${yearValue(season.season)}</strong>
          <span>${escapeHtml(season.primary_level || season.highest_level || "—")} · Age ${number1(season.age)}</span>
        </div>
        <b>${number1(season.ip)} IP</b>
      </div>

      <div class="pitcher-development-raw-grid">
        ${statCell("K%", `${number1(season.k_pct)}%`)}
        ${statCell("BB%", `${number1(season.bb_pct)}%`)}
        ${statCell("K-BB%", `${number1(season.k_minus_bb_pct)}%`)}
        ${statCell("ERA", number2(season.era))}
        ${statCell("WHIP", number2(season.whip))}
        ${statCell("xFIP", number2(season.xfip))}
      </div>

      <div class="pitcher-development-score-grid">
        ${scoreItems.map(([label, value]) => `
          <div class="${scoreToneClass(value)}">
            <small>${escapeHtml(label)}</small>
            <strong>${number1(value)}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function mlbTransitionDetails(player) {
  const mlb = player.mlb_transition || {};
  if (!mlb.has_mlb_evidence) return "";

  const savesHolds = (Number(mlb.saves) || 0) + (Number(mlb.holds) || 0);

  return `
    <section class="pitcher-development-detail-section">
      <div class="pitcher-development-detail-heading">
        <div>
          <h4>MLB Transition</h4>
          <span>${yearValue(mlb.season)} · ${escapeHtml(mlb.team || player.current_org || "MLB")}</span>
        </div>
        <small>${escapeHtml(mlb.sample_label || "MLB Sample")}</small>
      </div>

      <div class="pitcher-development-raw-grid pitcher-development-mlb-grid">
        ${statCell("IP", number1(mlb.ip))}
        ${statCell("ERA", number2(mlb.era))}
        ${statCell("WHIP", number2(mlb.whip))}
        ${statCell("xFIP", number2(mlb.xfip))}
        ${statCell("K%", `${number1(mlb.k_pct)}%`)}
        ${statCell("BB%", `${number1(mlb.bb_pct)}%`)}
        ${statCell("K-BB%", `${number1(mlb.k_minus_bb_pct)}%`, mlbKbbToneClass(mlb.k_minus_bb_pct))}
        ${statCell("SwStr%", `${number1(mlb.swstr_pct)}%`)}
        ${statCell("WAR", number2(mlb.war), signedToneClass(mlb.war))}
        ${statCell("G", integer(mlb.games))}
        ${statCell("GS", integer(mlb.starts))}
        ${statCell("SV+H", integer(savesHolds))}
      </div>

      <p class="pitcher-development-note">
        MLB performance is shown as transition evidence and is not blended into the minor-league development trend.
      </p>
    </section>
  `;
}

function developmentDetailMarkup(player) {
  const context = normalizedDevelopmentContext(player);
  const timeline = Array.isArray(context.stage_timeline) ? context.stage_timeline : [];
  const tag = trendTag(context);

  return `
    <div class="pitcher-development-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="pitcherDevelopmentTitle">
      <div class="pitcher-development-detail-sticky">
        <div>
          <small>DEVELOPMENT HISTORY</small>
          <h3 id="pitcherDevelopmentTitle">${escapeHtml(player.full_name)}</h3>
        </div>
        <button class="pitcher-development-detail-close" type="button" data-pitcher-development-close aria-label="Close development details">×</button>
      </div>

      <div class="pitcher-development-detail-body">
        <section class="pitcher-development-detail-section">
          <div class="pitcher-development-detail-heading">
            <div>
              <h4>Year-over-year change</h4>
              <span>${context.previous_season ? `${yearValue(context.previous_season)} → ${yearValue(context.latest_season)}` : "Baseline only"}</span>
            </div>
            <small>40+ IP seasons</small>
          </div>

          <div class="pitcher-development-detail-trend">
            <b class="pitcher-trend-tag ${tag.tone}">${tag.icon} ${escapeHtml(tag.label)}</b>
            ${context.previous_season ? `<span>${signed1(context.overall_delta)} overall</span>` : ""}
          </div>

          ${context.previous_season ? developmentTraitCards(context) : `
            <div class="pitcher-development-empty">
              <strong>Baseline only</strong>
              <span>A second 40+ IP MiLB season is needed before year-over-year change is shown.</span>
            </div>
          `}
        </section>

        ${mlbTransitionDetails(player)}

        <section class="pitcher-development-detail-section">
          <div class="pitcher-development-detail-heading">
            <div>
              <h4>Minor-league season profiles</h4>
              <span>${qualifiedSeasonLabel(context.qualified_season_count)}</span>
            </div>
            <small>Age + level context</small>
          </div>

          <div class="pitcher-development-season-list">
            ${timeline.length
              ? timeline.map((season, index) => developmentSeasonCard(season, index === timeline.length - 1)).join("")
              : `<div class="pitcher-development-empty"><strong>Limited history</strong><span>No 40+ IP MiLB season is available.</span></div>`
            }
          </div>
        </section>

        <p class="pitcher-development-note">${escapeHtml(context.qualification_note || "")}</p>
      </div>
    </div>
  `;
}

function readingGuide() {
  const items = [
    ["DiamondScore", "Overall DiamondRank score for the current pitcher board."],
    ["Opportunity", "Historical-comparable opportunity signal from the 30 closest eligible pitcher profiles."],
    ["Fantasy Profile", "Fantasy-minded underlying pitching profile built from miss bats, command, run prevention, contact management and workload."],
    ["Current Evidence", "The season and level selected by the pitcher evidence rules. Raw rates are displayed from that evidence season."],
    ["Development", "Year-to-year change uses qualified 40+ IP MiLB seasons. MLB performance is shown separately as transition evidence."],
    ["Context Profile", "Centered age-and-level context meters. Left is below context, right is above context; the raw stat is shown under each meter."],
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

function renderProfile(player, dialogContent, dialogLoading, openDevelopmentDetails) {
  const e = player.current_evidence || {};
  const f = player.fantasy_skill_profile || {};

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
          <div class="pitcher-diamondscore-ring" style="--meter:${clamp(player.overall_score, 0, 99.9)}">
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
        <span>Age + level adjusted</span>
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
        <span>${escapeHtml(evidenceSourceLabel(e.source))}</span>
      </div>
      <div class="pitcher-evidence-grid">
        ${statCell("Season", yearValue(e.season))}
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
        <h3>Development</h3>
        <span>${qualifiedSeasonLabel(normalizedDevelopmentContext(player).qualified_season_count)}</span>
      </div>
      ${developmentPanel(player)}
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>Context profile</h3>
        <span>Left = below • right = above</span>
      </div>
      ${contextMeters(player)}
    </section>

    <section class="pitcher-profile-section">
      <div class="pitcher-section-title">
        <h3>Swing & miss</h3>
        <span>Evidence season</span>
      </div>
      <div class="pitcher-miss-card ${scoreToneClass(f.miss_bats)}">
        <div class="pitcher-miss-head">
          <div>
            <small>Miss Bats Score</small>
            <strong>${number1(f.miss_bats)}</strong>
          </div>
          <span>${Number(f.miss_bats) >= 75 ? "Strong miss-bat profile" : Number(f.miss_bats) >= 60 ? "Above context" : Number(f.miss_bats) >= 40 ? "Near context" : "Below context"}</span>
        </div>

        <div class="pitcher-miss-meter" style="--miss:${clamp(f.miss_bats, 0, 99.9)}%">
          <i></i>
        </div>
        <div class="pitcher-miss-scale">
          <span>Lower miss bats</span>
          <span>Higher miss bats</span>
        </div>

        <div class="pitcher-miss-facts">
          <div>
            <small>Swinging-strike rate</small>
            <strong>${number1(e.swstr_pct)}%</strong>
            <span>Evidence season</span>
          </div>
          <div>
            <small>Sample</small>
            <strong>${integer(e.tbf)} TBF</strong>
            <span>${escapeHtml(evidenceSourceLabel(e.source))}</span>
          </div>
        </div>

        <p>
          The Miss Bats Score combines strikeout and swing-and-miss evidence against the pitcher's current age-and-level context.
        </p>
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

  dialogContent
    .querySelector("[data-pitcher-development-open]")
    ?.addEventListener("click", () => openDevelopmentDetails(player));
}

export function createPitcherPopup({ supabase }) {
  const dialog = document.getElementById("playerDialog");
  const closeButton = document.getElementById("dialogClose");
  const dialogLoading = document.getElementById("dialogLoading");
  const dialogContent = document.getElementById("dialogContent");

  function closeDevelopmentDetails() {
    dialog.querySelector("[data-pitcher-development-overlay]")?.remove();
    dialog.classList.remove("development-detail-active");
  }

  function openDevelopmentDetails(player) {
    closeDevelopmentDetails();

    const overlay = document.createElement("div");
    overlay.className = "pitcher-development-detail-overlay";
    overlay.dataset.pitcherDevelopmentOverlay = "true";
    overlay.innerHTML = developmentDetailMarkup(player);

    dialog.appendChild(overlay);
    dialog.classList.add("development-detail-active");

    overlay.querySelector("[data-pitcher-development-close]")?.focus();

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-pitcher-development-close]")) {
        closeDevelopmentDetails();
      }
    });
  }

  async function open(playerId) {
    closeDevelopmentDetails();
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

    renderProfile(data, dialogContent, dialogLoading, openDevelopmentDetails);
  }

  function close() {
    closeDevelopmentDetails();
    if (dialog.open) dialog.close();
  }

  closeButton.addEventListener("click", close);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener("close", () => {
    closeDevelopmentDetails();
    dialogContent.innerHTML = "";
    dialogContent.hidden = true;
    dialogLoading.hidden = false;
    dialogLoading.textContent = "Loading pitcher profile…";
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.querySelector("[data-pitcher-development-overlay]")) {
      event.preventDefault();
      closeDevelopmentDetails();
    }
  });

  return { open, close };
}
