let data = {
  links: {
    discord: "",
    tiktok: ""
  },
  tableUrl: "",
  categories: [],
  news: [],
  players: [],
  selections: [],
  teams: []
};

let isAdmin = false;

const classOrder = [
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

const classGroups = ["X", "S", "A", "B", "C", "D"];

const wages = {
  "X": "380K–400K",
  "S+": "350K",
  "S": "325K",
  "S-": "300K",
  "A+": "275K",
  "A": "250K",
  "A-": "200K",
  "B+": "175K",
  "B": "150K",
  "B-": "125K",
  "C+": "100K",
  "C": "90K",
  "C-": "85K",
  "D": "75K"
};

const content = document.getElementById("page-content");
const pageTitle = document.getElementById("page-title");
const sidebar = document.querySelector(".sidebar");

let currentPage = "home";

/* =========================
   UTILIDADES
========================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function getBaseClass(playerClass) {
  return String(playerClass || "D")
    .toUpperCase()
    .replace("+", "")
    .replace("-", "");
}

function getTeam(player) {
  if (
    player.freeAgent === true ||
    player.team === "FREE AGENT" ||
    player.teamId === "FREE AGENT"
  ) {
    return null;
  }

  return data.teams.find(team =>
    String(team.id) === String(player.teamId || player.team)
  );
}

function getPlayerWage(player) {
  return wages[player.class] || "—";
}

function classBadge(playerClass) {
  const cls = getBaseClass(playerClass);

  return `
    <span class="class-badge class-${cls.toLowerCase()}">
      ${escapeHTML(playerClass)}
    </span>
  `;
}

function teamHTML(player) {
  if (
    player.freeAgent === true ||
    player.teamId === "" ||
    !player.teamId
  ) {
    return `
      <span class="free-agent">
        🏷️ FREE AGENT
      </span>
    `;
  }

  const team = getTeam(player);

  if (!team) {
    return `
      <span class="free-agent">
        🏷️ FREE AGENT
      </span>
    `;
  }

  return `
    <span class="player-team">
      ${
        team.logo
          ? `<img src="${escapeHTML(team.logo)}" alt="">`
          : ""
      }
      <span>${escapeHTML(team.name)}</span>
    </span>
  `;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
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

/* =========================
   CARREGAR DADOS
========================= */

async function loadData() {
  try {
    const result = await api("/api/data");

    data = {
      links: {
        discord: "",
        tiktok: "",
        ...(result.links || {})
      },
      tableUrl: result.tableUrl || "",
      categories: result.categories || [],
      news: result.news || [],
      players: result.players || [],
      selections: result.selections || [],
      teams: result.teams || []
    };

    await checkAdmin();

    renderPage(currentPage);
  } catch (error) {
    console.error(error);

    content.innerHTML = `
      <div class="empty-state">
        <h2>Erro ao carregar o site</h2>
        <p>${escapeHTML(error.message)}</p>
        <button onclick="loadData()">Tentar novamente</button>
      </div>
    `;
  }
}

/* =========================
   ADMIN
========================= */

async function checkAdmin() {
  try {
    const result = await api("/api/admin/status");

    isAdmin = result.isAdmin === true;

    updateAdminButton();
  } catch {
    isAdmin = false;
  }
}

function updateAdminButton() {
  const button = document.querySelector(
    '[data-page="admin"]'
  );

  if (!button) return;

  button.innerHTML = isAdmin
    ? "⚙️ Painel Admin"
    : "🔐 Admin";
}

function openLogin() {
  const modal = document.getElementById("login-modal");

  if (!modal) return;

  modal.classList.add("show");

  const input = document.getElementById("admin-password");

  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 100);
  }
}

function closeLogin() {
  const modal = document.getElementById("login-modal");

  if (modal) {
    modal.classList.remove("show");
  }

  const error = document.getElementById("login-error");

  if (error) {
    error.textContent = "";
  }
}

async function loginAdmin() {
  const input = document.getElementById("admin-password");
  const error = document.getElementById("login-error");

  if (!input) return;

  const password = input.value;

  if (!password) {
    if (error) {
      error.textContent = "Digite a senha.";
    }

    return;
  }

  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password
      })
    });

    isAdmin = true;

    closeLogin();
    updateAdminButton();

    currentPage = "admin";
    renderPage("admin");

  } catch (err) {
    if (error) {
      error.textContent = err.message;
    }
  }
}

async function logoutAdmin() {
  try {
    await api("/api/admin/logout", {
      method: "POST"
    });

    isAdmin = false;

    updateAdminButton();

    currentPage = "home";
    renderPage("home");

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   NAVEGAÇÃO
========================= */

function navigate(page) {
  currentPage = page;

  document
    .querySelectorAll("[data-page]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });

  renderPage(page);

  if (window.innerWidth <= 900) {
    sidebar?.classList.remove("open");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderPage(page) {
  switch (page) {
    case "home":
      pageTitle.textContent = "Início";
      renderHome();
      break;

    case "others":
      pageTitle.textContent = "Outros";
      renderOthers();
      break;

    case "news":
      pageTitle.textContent = "Notícias";
      renderNews();
      break;

    case "table":
      pageTitle.textContent = "Tabela";
      renderTable();
      break;

    case "players":
      pageTitle.textContent = "Jogadores";
      renderPlayers();
      break;

    case "selections":
      pageTitle.textContent = "Seleções";
      renderSelections();
      break;

    case "teams":
      pageTitle.textContent = "Times";
      renderTeams();
      break;

    case "admin":
      pageTitle.textContent = "Administração";

      if (!isAdmin) {
        openLogin();
        navigate("home");
        return;
      }

      renderAdmin();
      break;

    default:
      renderHome();
  }
}

/* =========================
   HOME
========================= */

function renderHome() {
  content.innerHTML = `
    <section class="hero">

      <img
        src="/images/banner.png"
        class="hero-banner"
        alt="ULTIMATE TCS LEAGUE"
        onerror="this.style.display='none'"
      >

      <div class="hero-content">

        <img
          src="/images/logo.png"
          class="hero-logo"
          alt="UTL"
          onerror="this.style.display='none'"
        >

        <div>
          <span class="hero-kicker">
            EST. 2026
          </span>

          <h1>
            ULTIMATE TCS LEAGUE
          </h1>

          <p>
            A casa oficial da UTL.
            Notícias, jogadores, times,
            seleções e muito mais.
          </p>
        </div>

      </div>

    </section>

    <section class="stats-grid">

      <div class="stat-card">
        <strong>${data.players.length}</strong>
        <span>Jogadores</span>
      </div>

      <div class="stat-card">
        <strong>${data.teams.length}</strong>
        <span>Times</span>
      </div>

      <div class="stat-card">
        <strong>${data.selections.length}</strong>
        <span>Seleções</span>
      </div>

      <div class="stat-card">
        <strong>${data.news.length}</strong>
        <span>Notícias</span>
      </div>

    </section>

    <section class="section-card">

      <div class="section-heading">
        <div>
          <span class="section-kicker">UTL</span>
          <h2>Últimas notícias</h2>
        </div>

        <button onclick="navigate('news')">
          Ver todas
        </button>
      </div>

      ${
        data.news.length
          ? `
            <div class="news-grid">
              ${data.news
                .slice(0, 3)
                .map(newsCard)
                .join("")}
            </div>
          `
          : `
            <div class="empty-state">
              <h3>Nenhuma notícia ainda</h3>
              <p>As notícias da UTL aparecerão aqui.</p>
            </div>
          `
      }

    </section>
  `;
}

/* =========================
   OUTROS
========================= */

function renderOthers() {
  content.innerHTML = `
    <section class="section-card">

      <div class="section-heading">
        <div>
          <span class="section-kicker">LINKS</span>
          <h2>Outros</h2>
        </div>
      </div>

      <div class="link-grid">

        ${
          data.links.discord
            ? `
              <a
                class="big-link"
                href="${escapeHTML(data.links.discord)}"
                target="_blank"
                rel="noopener"
              >
                <span>💬</span>
                <div>
                  <strong>Discord</strong>
                  <small>Entre no servidor oficial</small>
                </div>
              </a>
            `
            : ""
        }

        ${
          data.links.tiktok
            ? `
              <a
                class="big-link"
                href="${escapeHTML(data.links.tiktok)}"
                target="_blank"
                rel="noopener"
              >
                <span>🎵</span>
                <div>
                  <strong>TikTok</strong>
                  <small>Siga a UTL</small>
                </div>
              </a>
            `
            : ""
        }

      </div>

      ${
        !data.links.discord && !data.links.tiktok
          ? `
            <div class="empty-state">
              <h3>Nenhum link configurado</h3>
              <p>O administrador ainda não adicionou os links.</p>
            </div>
          `
          : ""
      }

    </section>
  `;
}

/* =========================
   NOTÍCIAS
========================= */

function newsCard(news) {
  const category = data.categories.find(
    category =>
      String(category.id) === String(news.categoryId)
  );

  return `
    <article class="news-card">

      ${
        news.image
          ? `
            <img
              src="${escapeHTML(news.image)}"
              alt=""
              loading="lazy"
            >
          `
          : `
            <div class="news-placeholder">
              UTL
            </div>
          `
      }

      <div class="news-body">

        ${
          category
            ? `
              <span class="news-category">
                ${escapeHTML(category.name)}
              </span>
            `
            : ""
        }

        <h3>
          ${escapeHTML(news.title)}
        </h3>

        <p>
          ${escapeHTML(news.description)}
        </p>

      </div>

    </article>
  `;
}

function renderNews() {
  const categories = data.categories || [];

  content.innerHTML = `
    <section class="section-card">

      <div class="section-heading">
        <div>
          <span class="section-kicker">UTL NEWS</span>
          <h2>Notícias</h2>
        </div>
      </div>

      ${
        categories.length
          ? `
            <div class="category-filter">
              <button
                class="category-button active"
                onclick="filterNews('all', this)"
              >
                Todas
              </button>

              ${categories
                .map(category => `
                  <button
                    class="category-button"
                    onclick="filterNews('${escapeHTML(category.id)}', this)"
                  >
                    ${escapeHTML(category.name)}
                  </button>
                `)
                .join("")}
            </div>
          `
          : ""
      }

      <div
        class="news-grid"
        id="news-grid"
      >
        ${
          data.news.length
            ? data.news.map(newsCard).join("")
            : `
              <div class="empty-state">
                <h3>Nenhuma notícia publicada</h3>
                <p>Volte mais tarde.</p>
              </div>
            `
        }
      </div>

    </section>
  `;
}

function filterNews(categoryId, button) {
  document
    .querySelectorAll(".category-button")
    .forEach(btn =>
      btn.classList.remove("active")
    );

  button.classList.add("active");

  const grid = document.getElementById("news-grid");

  if (!grid) return;

  const filtered =
    categoryId === "all"
      ? data.news
      : data.news.filter(
          news =>
            String(news.categoryId) ===
            String(categoryId)
        );

  grid.innerHTML = filtered.length
    ? filtered.map(newsCard).join("")
    : `
      <div class="empty-state">
        <h3>Nenhuma notícia nesta categoria</h3>
      </div>
    `;
}

/* =========================
   TABELA
========================= */

function renderTable() {
  content.innerHTML = `
    <section class="section-card table-section">

      <div class="section-heading">
        <div>
          <span class="section-kicker">COMPETIÇÃO</span>
          <h2>Tabela</h2>
        </div>
      </div>

      ${
        data.tableUrl
          ? `
            <div class="table-actions">
              <a
                href="${escapeHTML(data.tableUrl)}"
                target="_blank"
                rel="noopener"
                class="primary-button"
              >
                📊 Abrir tabela
              </a>
            </div>

            <iframe
              class="table-frame"
              src="${escapeHTML(data.tableUrl)}"
              loading="lazy"
            ></iframe>
          `
          : `
            <div class="empty-state">
              <h3>Tabela ainda não configurada</h3>
              <p>O administrador ainda não adicionou o link.</p>
            </div>
          `
      }

    </section>
  `;
}

/* =========================
   JOGADORES
========================= */

function renderPlayers() {
  content.innerHTML = `
    <section class="section-card">

      <div class="section-heading">
        <div>
          <span class="section-kicker">ELENCO</span>
          <h2>Jogadores</h2>
        </div>
      </div>

      <div class="players-container">

        ${classGroups
          .map(group => renderPlayerGroup(group))
          .join("")}

      </div>

    </section>
  `;
}

function renderPlayerGroup(group) {
  const players = data.players.filter(
    player =>
      getBaseClass(player.class) === group
  );

  const rows = players
    .map(player => `
      <div
        class="player-row"
        draggable="${isAdmin}"
        data-player-id="${escapeHTML(player.id)}"
      >

        <div class="player-class">
          ${classBadge(player.class)}
        </div>

        <div class="player-nick">
          ${escapeHTML(player.nick)}
        </div>

        <div class="player-team-cell">
          ${teamHTML(player)}
        </div>

        <div class="player-wage">
          ${escapeHTML(getPlayerWage(player))}
        </div>

      </div>
    `)
    .join("");

  return `
    <div class="player-class-group">

      <button
        class="class-group-header"
        onclick="togglePlayerGroup('${group}')"
      >

        <span>
          CLASS ${group}
        </span>

        <span
          class="class-arrow"
          id="arrow-${group}"
        >
          ^
        </span>

      </button>

      <div
        class="players-group-content"
        id="group-${group}"
        style="display:none"
      >

        <div class="players-table-head">
          <span>CLASS</span>
          <span>NICK</span>
          <span>TIME</span>
          <span>WAGE</span>
        </div>

        <div
          class="players-list"
          data-group="${group}"
        >
          ${
            rows ||
            `
              <div class="empty-player">
                Nenhum jogador nesta classe.
              </div>
            `
          }
        </div>

      </div>

    </div>
  `;
}

function togglePlayerGroup(group) {
  const element = document.getElementById(
    `group-${group}`
  );

  const arrow = document.getElementById(
    `arrow-${group}`
  );

  if (!element) return;

  const isClosed =
    element.style.display === "none";

  element.style.display =
    isClosed ? "block" : "none";

  if (arrow) {
    arrow.textContent =
      isClosed ? "v" : "^";
  }
}

/* =========================
   DRAG & DROP
========================= */

let draggedPlayerId = null;

function setupDragAndDrop() {
  if (!isAdmin) return;

  document
    .querySelectorAll(".player-row[draggable='true']")
    .forEach(row => {

      row.addEventListener(
        "dragstart",
        event => {
          draggedPlayerId =
            row.dataset.playerId;

          row.classList.add("dragging");

          event.dataTransfer.effectAllowed =
            "move";

          event.dataTransfer.setData(
            "text/plain",
            draggedPlayerId
          );
        }
      );

      row.addEventListener(
        "dragend",
        () => {
          row.classList.remove("dragging");
          draggedPlayerId = null;
        }
      );

      row.addEventListener(
        "dragover",
        event => {
          event.preventDefault();

          row.classList.add("drag-over");
        }
      );

      row.addEventListener(
        "dragleave",
        () => {
          row.classList.remove("drag-over");
        }
      );

      row.addEventListener(
        "drop",
        async event => {
          event.preventDefault();

          row.classList.remove("drag-over");

          const targetId =
            row.dataset.playerId;

          if (
            !draggedPlayerId ||
            draggedPlayerId === targetId
          ) {
            return;
          }

          reorderPlayers(
            draggedPlayerId,
            targetId
          );
        }
      );
    });
}

async function reorderPlayers(
  draggedId,
  targetId
) {
  const draggedIndex =
    data.players.findIndex(
      player =>
        String(player.id) ===
        String(draggedId)
    );

  const targetIndex =
    data.players.findIndex(
      player =>
        String(player.id) ===
        String(targetId)
    );

  if (
    draggedIndex === -1 ||
    targetIndex === -1
  ) {
    return;
  }

  const draggedPlayer =
    data.players.splice(
      draggedIndex,
      1
    )[0];

  data.players.splice(
    targetIndex,
    0,
    draggedPlayer
  );

  try {
    await api(
      "/api/admin/players/reorder",
      {
        method: "PUT",
        body: JSON.stringify({
          orderedIds:
            data.players.map(
              player => player.id
            )
        })
      }
    );

    renderPlayers();
    setupDragAndDrop();

  } catch (error) {
    alert(error.message);

    await loadData();
  }
}

/* =========================
   SELEÇÕES
========================= */

function renderSelections() {
  content.innerHTML = `
    <section class="section-card">

      <div class="section-heading">
        <div>
          <span class="section-kicker">INTERNACIONAL</span>
          <h2>Seleções</h2>
        </div>
      </div>

      ${
        data.selections.length
          ? `
            <div class="t
