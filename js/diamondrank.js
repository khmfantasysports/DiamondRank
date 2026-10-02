const params = new URLSearchParams(window.location.search);
const requestedMode = params.get("mode");
const mode = requestedMode === "pitchers" ? "pitchers" : "hitters";

const MODE_CONFIG = {
  hitters: {
    bodyMode: "hitters",
    eyebrow: "CURRENT HITTER BOARD",
    title: "DiamondRank Hitter Rankings",
    heroText: "Short-term prospect value • current skill shape • historical context",
    poolLabel: "Current hitter pool",
    searchPlaceholder: "Player, org, position…",
    boardHeading: "Hitter Rankings",
    stylesheet: "./css/hitters.css?v=26",
    module: "./hitter-rankings.js?v=26"
  },
  pitchers: {
    bodyMode: "pitchers",
    eyebrow: "CURRENT PITCHER BOARD",
    title: "DiamondRank Pitcher Rankings",
    heroText: "Short-term pitching value • current skill shape • historical context",
    poolLabel: "Current pitcher pool",
    searchPlaceholder: "Pitcher, org, level…",
    boardHeading: "Pitcher Rankings",
    stylesheet: "./css/pitchers.css?v=26",
    module: "./pitcher-rankings.js?v=26"
  }
};

const config = MODE_CONFIG[mode];

document.body.dataset.boardMode = config.bodyMode;
document.documentElement.dataset.boardMode = config.bodyMode;
document.title = config.title;

const setText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};

setText("heroEyebrow", config.eyebrow);
setText("heroTitle", config.title);
setText("heroText", config.heroText);
setText("heroPoolLabel", config.poolLabel);
setText("boardHeading", config.boardHeading);

const search = document.getElementById("searchInput");
if (search) search.placeholder = config.searchPlaceholder;

for (const link of document.querySelectorAll("[data-board-mode]")) {
  const active = link.dataset.boardMode === mode;
  link.classList.toggle("active", active);
  link.setAttribute("aria-current", active ? "page" : "false");
}

const modeStylesheet = document.createElement("link");
modeStylesheet.rel = "stylesheet";
modeStylesheet.href = config.stylesheet;
modeStylesheet.dataset.modeStylesheet = mode;
document.head.append(modeStylesheet);

try {
  await import(config.module);
} catch (error) {
  console.error("DiamondRank board failed to initialize", error);
  const loading = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");
  const headerStatus = document.getElementById("headerStatus");

  if (loading) loading.hidden = true;
  if (errorState) errorState.hidden = false;
  if (errorMessage) errorMessage.textContent = "The ranking board could not initialize. Please retry.";
  if (headerStatus) headerStatus.textContent = "Rankings unavailable";
}
