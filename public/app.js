const state = {
  data: null,
  admin: false,
  page: "players",
  detail: null
};

const CLASS_ORDER = [
  "X",
  "S+",
  "S",
  "S-",
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D"
];

const CLASS_GROUPS = [
  {
    name: "X",
    classes: ["X"],
    color: "#6A1B9A"
  },
  {
    name: "S",
    classes: ["S+", "S", "S-"],
    color: "#1565C0"
  },
  {
    name: "A",
    classes: ["A+", "A", "A-"],
    color: "#C62828"
  },
  {
    name: "B",
    classes: ["B+", "B", "B-"],
    color: "#EF6C00"
  },
  {
    name: "C",
    classes: ["C+", "C", "C-"],
    color: "#F9A825"
  },
  {
    name: "D",
    classes: ["D"],
    color: "#616161"
  }
];

const ROLE_OPTIONS = [
  "PLAYER",
  "ASSIST MANAGER",
  "MANAGER"
];

const $ = selector =>
  document.querySelector(selector);

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  let result = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(
      result.error || "Ocorreu um erro."
    );
  }

  return result;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  const number = Number(value || 0);

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });
}

function formatClass(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function classBase(value) {
  const cls = formatClass(value);

  if (cls === "X") return "X";
  if (cls.startsWith("S")) return "S";
  if (cls.startsWith("A")) return "A";
  if (cls.startsWith("B")) return "B";
  if (cls.startsWith("C")) return "C";

  return "D";
}

function getTeam(id) {
  if (!state.data?.teams) {
    return null;
  }

  return state.data.teams.find(
    team =>
      String(team.id) === String(id)
  ) || null;
}

function getPlayer(id) {
  if (!state.data?.players) {
    return null;
  }

  return state.data.players.find(
    player =>
      String(player.id) === String(id)
  ) || null;
}

function playerTeam(player) {
  return getTeam(player.teamId);
}

function sortedPlayers(players) {
  return players
    .map((player, index) => ({
      player,
      index
    }))
    .sort((a, b) => {
      const classA =
        CLASS_ORDER.indexOf(
          formatClass(a.player.class)
        );

      const classB =
        CLASS_ORDER.indexOf(
          formatClass(b.player.class)
        );

      const safeClassA =
        classA === -1
          ? CLASS_ORDER.length
          : classA;

      const safeClassB =
        classB === -1
          ? CLASS_ORDER.length
          : classB;

      if (safeClassA !== safeClassB) {
        return safeClassA - safeClassB;
      }

      return a.index - b.index;
    })
    .map(item => item.player);
}

function showToast(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function setPageTitle(title) {
  const element = $("#page-title");

  if (element) {
    element.textContent = title;
  }
}

function closeMobileMenu() {
  $("#sidebar")?.classList.remove("open");
}

function openMobileMenu() {
  $("#sidebar")?.classList.toggle("open");
}

function updateActiveNav(page) {
  document
    .querySelectorAll(".nav")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });
}

/* =========================================================
   LOAD
========================================================= */

async function loadData() {
  try {
    const result =
      await api("/api/data");

    state.data =
      result.data || result;

    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAdminStatus() {
  try {
    const result =
      await api("/api/admin/status");

    state.admin = Boolean(
      result.authenticated ??
      result.admin ??
      result.loggedIn
    );
  } catch {
    state.admin = false;
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

function navigate(page) {
  state.page = page;
  state.detail = null;

  closeMobileMenu();

  updateActiveNav(page);

  const titles = {
    players: "Jogadores",
    selections: "Seleções",
    teams: "Times",
    admin: "Admin Area"
  };

  setPageTitle(
    titles[page] || "Jogadores"
  );

  renderPage();
}

function render() {
  updateActiveNav(state.page);
  renderPage();
}

function renderPage() {
  const content =
    $("#page-content");

  if (!content) return;

  if (state.page === "players") {
    setPageTitle("Jogadores");

    content.innerHTML =
      renderPlayersPage();

    return;
  }

  if (state.page === "selections") {
    setPageTitle("Seleções");

    content.innerHTML =
      renderClubsPage("selection");

    bindClubCards();

    return;
  }

  if (state.page === "teams") {
    setPageTitle("Times");

    content.innerHTML =
      renderClubsPage("team");

    bindClubCards();

    return;
  }

  if (state.page === "admin") {
    setPageTitle("Admin Area");

    content.innerHTML =
      renderAdmin();

    bindAdmin();
  }
}

/* =========================================================
   PLAYERS
========================================================= */

function renderPlayersPage(
  players = state.data?.players || []
) {
  return `
    <div class="page-head">
      <div>
        <h1>Jogadores</h1>

        <p>
          Todos os jogadores classificados da UTL.
        </p>
      </div>
    </div>

    <div class="players-groups">

      ${CLASS_GROUPS.map(group =>
        renderPlayerClassGroup(
          group.name,
          group.classes,
          group.color,
          players
        )
      ).join("")}

    </div>
  `;
}

function renderPlayerClassGroup(
  title,
  classes,
  color,
  players
) {
  const groupPlayers =
    sortedPlayers(
      players.filter(player =>
        classes.includes(
          formatClass(player.class)
        )
      )
    );

  return `
    <section
      class="player-class player-tier-${classBase(title)}"
      style="--tier-color:${escapeHTML(color)}"
    >

      <div class="player-class-header">

        <strong>
          ${escapeHTML(title)}
        </strong>

      </div>

      <div class="player-class-content">

        ${
          groupPlayers.length
            ? renderPlayersTable(
                groupPlayers
              )
            : `
              <div class="empty-state">
                <strong>
                  Nenhum jogador
                </strong>

                <span>
                  Nenhum jogador está neste Tier.
                </span>
              </div