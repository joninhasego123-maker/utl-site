const state = {
  data: null,
  admin: false,
  page: "news",
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
  { name: "CLASS X", classes: ["X"] },
  { name: "CLASS S", classes: ["S+", "S", "S-"] },
  { name: "CLASS A", classes: ["A+", "A", "A-"] },
  { name: "CLASS B", classes: ["B+", "B", "B-"] },
  { name: "CLASS C", classes: ["C+", "C", "C-"] },
  { name: "CLASS D", classes: ["D"] }
];

const FIXED_WAGES = {
  D: 75000,
  "C-": 85000,
  C: 90000,
  "C+": 100000,
  "B-": 125000,
  B: 150000,
  "B+": 175000,
  "A-": 200000,
  A: 250000,
  "A+": 275000,
  "S-": 300000,
  S: 325000,
  "S+": 350000
};

const X_WAGES = [380000, 385000, 390000, 395000, 400000];

const ROLE_OPTIONS = [
  "PLAYER",
  "ASSIST MANAGER",
  "MANAGER"
];

const $ = (selector) => document.querySelector(selector);

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
    throw new Error(result.error || "Ocorreu um erro.");
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
  return String(value || "").trim().toUpperCase();
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
  if (!state.data?.teams) return null;

  return state.data.teams.find(
    team => String(team.id) === String(id)
  ) || null;
}

function getPlayer(id) {
  if (!state.data?.players) return null;

  return state.data.players.find(
    player => String(player.id) === String(id)
  ) || null;
}

function playerTeam(player) {
  return getTeam(player.teamId);
}

function sortedPlayers(players) {
  return [...players].sort((a, b) => {
    const classA = CLASS_ORDER.indexOf(formatClass(a.class));
    const classB = CLASS_ORDER.indexOf(formatClass(b.class));

    if (classA !== classB) {
      return classA - classB;
    }

    return Number(a.id) - Number(b.id);
  });
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
  document.querySelectorAll(".nav").forEach(button => {
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
    const result = await api("/api/data");

    state.data = result.data || result;

    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAdminStatus() {
  try {
    const result = await api("/api/admin/status");

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
    news: "News",
    table: "Tabela",
    players: "Jogadores",
    selections: "Seleções",
    teams: "Times",
    admin: "Admin Area"
  };

  setPageTitle(titles[page] || "News");

  renderPage();
}

function render() {
  updateActiveNav(state.page);
  renderPage();
}

function renderPage() {
  const content = $("#page-content");

  if (!content) return;

  if (state.page === "news") {
    setPageTitle("News");
    content.innerHTML = renderNews();
    bindNews();
    return;
  }

  if (state.page === "table") {
    setPageTitle("Tabela");
    renderTableRedirect();
    return;
  }

  if (state.page === "players") {
    setPageTitle("Jogadores");
    content.innerHTML = renderPlayersPage();
    bindPlayerGroups();
    return;
  }

  if (state.page === "selections") {
    setPageTitle("Seleções");
    content.innerHTML = renderClubsPage("selection");
    bindClubCards();
    return;
  }

  if (state.page === "teams") {
    setPageTitle("Times");
    content.innerHTML = renderClubsPage("team");
    bindClubCards();
    return;
  }

  if (state.page === "admin") {
    setPageTitle("Admin Area");
    content.innerHTML = renderAdmin();
    bindAdmin();
  }
}

/* =========================================================
   NEWS
   ========================================================= */

function renderNews() {
  const categories = state.data?.newsCategories || ["Geral"];
  const news = state.data?.news || [];

  const orderedCategories = [
    "Geral",
    ...categories.filter(
      category => category !== "Geral"
    )
  ];

  const groups = orderedCategories.map(category => {
    const items = news.filter(
      item => (item.category || "Geral") === category
    );

    return `
      <section class="news-category">
        <div class="news-category-header">
          <strong>${escapeHTML(category)}</strong>
        </div>

        <div class="news-category-content">
          ${
            items.length
              ? items.map(renderNewsCard).join("")
              : `
                <div class="empty-state">
                  <strong>Nenhuma notícia</strong>
                  <span>Esta categoria ainda não possui notícias.</span>
                </div>
              `
          }
        </div>
      </section>
    `;
  }).join("");

  return `
    <div class="page-head">
      <div>
        <h1>News</h1>
        <p>Confira as últimas notícias da ULTIMATE TCS LEAGUE.</p>
      </div>
    </div>

    <div class="news-list">
      ${groups}
    </div>
  `;
}

function renderNewsCard(item) {
  const image = item.image
    ? `<img class="news-image" src="${escapeHTML(item.image)}" alt="">`
    : `<div class="news-image"></div>`;

  return `
    <article class="news-card">
      ${image}

      <div class="news-card-body">
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
      </div>
    </article>
  `;
}

function bindNews() {
  document.querySelectorAll(".news-category-header").forEach(header => {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("open");
    });
  });
}

/* =========================================================
   TABLE REDIRECT
   ========================================================= */

function renderTableRedirect() {
  const content = $("#page-content");

  content.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Tabela</h1>
        <p>A tabela oficial da competição está disponível em outro site.</p>
      </div>
    </div>

    <div class="empty-state">
      <strong>Abrindo tabela externa</strong>
      <span>Você será direcionado para o site configurado pela administração.</span>
    </div>
  `;

  setTimeout(() => {
    openTableModal();
  }, 100);
}

function openTableModal() {
  const url = state.data?.links?.tabela;

  if (!url) {
    showToast("A tabela ainda não foi configurada.");
    navigate("news");
    return;
  }

  const overlay = document.createElement("div");

  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal">
      <h2>Você está sendo levado a outro site</h2>

      <p>
        Ao continuar, você sairá do site da ULTIMATE TCS LEAGUE
        e será direcionado para a página externa da tabela.
      </p>

      <div class="modal-actions">
        <button class="btn secondary" id="tableNo">
          Não
        </button>

        <button class="btn primary" id="tableYes">
          Sim
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  $("#tableNo")?.addEventListener("click", () => {
    overlay.remove();
    navigate("news");
  });

  $("#tableYes")?.addEventListener("click", () => {
    window.location.href = url;
  });

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      overlay.remove();
      navigate("news");
    }
  });
}

/* =========================================================
   PLAYERS
   ========================================================= */

function renderPlayersPage(players = state.data?.players || []) {
  return `
    <div class="page-head">
      <div>
        <h1>Jogadores</h1>
        <p>Todos os jogadores classificados da UTL.</p>
      </div>
    </div>

    <div class="players-groups">
      ${CLASS_GROUPS.map(group =>
        renderPlayerClassGroup(
          group.name,
          group.classes,
          players
        )
      ).join("")}
    </div>
  `;
}

function renderPlayerClassGroup(title, classes, players) {
  const groupPlayers = sortedPlayers(
    players.filter(player =>
      classes.includes(formatClass(player.class))
    )
  );

  return `
    <section class="player-class">
      <div class="player-class-header">
        <strong>${escapeHTML(title)}</strong>
      </div>

      <div class="player-class-content">
        ${
          groupPlayers.length
            ? renderPlayersTable(groupPlayers)
            : `
              <div class="empty-state">
                <strong>Nenhum jogador</strong>
                <span>Nenhum jogador está nesta categoria.</span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function renderPlayersTable(players) {
  return `
    <div style="overflow-x:auto;">
      <div class="players-table">
        <div class="players-table-head">
          <span>ID</span>
          <span>NICK</span>
          <span>CLASS</span>
          <span>TEAM</span>
          <span>ROLE</span>
          <span>OVERALL</span>
          <span>WAGE</span>
        </div>

        ${players.map(renderPlayerRow).join("")}
      </div>
    </div>
  `;
}

function renderPlayerRow(player) {
  const cls = formatClass(player.class);
  const base = classBase(cls);
  const team = playerTeam(player);

  let teamHTML;

  if (team) {
    teamHTML = `
      <div class="team-cell">
        ${
          team.logo
            ? `<img
                class="team-shield"
                src="${escapeHTML(team.logo)}"
                alt=""
              >`
            : ""
        }

        <span>${escapeHTML(team.name)}</span>
      </div>
    `;
  } else {
    teamHTML = `
      <div class="team-cell free-agent">
        <span>🏷️ FREE AGENT</span>
      </div>
    `;
  }

  return `
    <div class="player-row">
      <span>${escapeHTML(player.id)}</span>

      <span class="player-nick">
        ${escapeHTML(player.nick)}
      </span>

      <span>
        <span class="class-badge class-${base}">
          ${escapeHTML(cls)}
        </span>
      </span>

      ${teamHTML}

      <span>
        ${escapeHTML(player.role || "PLAYER")}
      </span>

      <span>
        ${escapeHTML(player.overall)}
      </span>

      <span>
        ${formatMoney(player.wage)}
      </span>
    </div>
  `;
}

function bindPlayerGroups() {
  document.querySelectorAll(".player-class-header").forEach(header => {
    header.addEventListener("click", () => {
      header.parentElement.classList.toggle("open");
    });
  });
}

/* =========================================================
   TEAMS / SELECTIONS
   ========================================================= */

function renderClubsPage(type) {
  const isTeam = type === "team";
  const clubs = isTeam
    ? state.data?.teams || []
    : state.data?.selections || [];

  if (state.detail) {
    return renderClubDetail(type, state.detail);
  }

  return `
    <div class="page-head">
      <div>
        <h1>${isTeam ? "Times" : "Seleções"}</h1>
        <p>
          ${isTeam
            ? "Confira os times participantes da UTL."
            : "Confira as seleções cadastradas na competição."
          }
        </p>
      </div>
    </div>

    ${
      clubs.length
        ? `
          <div class="club-list">
            ${clubs.map(club =>
              renderClubCard(club, type)
            ).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            <strong>Nenhum ${isTeam ? "time" : "seleção"} cadastrado</strong>
            <span>A administração ainda não adicionou nenhum item.</span>
          </div>
        `
    }
  `;
}

function renderClubCard(club, type) {
  const logo = club.logo
    ? `
      <img
        class="club-logo"
        src="${escapeHTML(club.logo)}"
        alt=""
      >
    `
    : `
      <span class="club-logo-fallback">
        ${escapeHTML(club.name?.charAt(0) || "?")}
      </span>
    `;

  const players = type === "team"
    ? (state.data.players || []).filter(
        player => String(player.teamId) === String(club.id)
      )
    : (club.players || [])
        .map(id => getPlayer(id))
        .filter(Boolean);

  return `
    <article
      class="club-card"
      data-club-id="${escapeHTML(club.id)}"
      style="--club-bg:${escapeHTML(club.color || "#151515")}"
    >
      <div class="club-logo-wrap">
        ${logo}
      </div>

      <div class="club-info">
        <strong>${escapeHTML(club.name)}</strong>
        <span>${players.length}/16 jogadores</span>
      </div>

      <span class="club-arrow">›</span>
    </article>
  `;
}

function renderClubDetail(type, club) {
  const isTeam = type === "team";

  let players;

  if (isTeam) {
    players = (state.data.players || []).filter(
      player => String(player.teamId) === String(club.id)
    );
  } else {
    players = (club.players || [])
      .map(id => getPlayer(id))
      .filter(Boolean);
  }

  const logo = club.logo
    ? `
      <img
        class="club-detail-logo"
        src="${escapeHTML(club.logo)}"
        alt=""
      >
    `
    : `
      <div class="club-detail-logo fallback">
        ${escapeHTML(club.name?.charAt(0) || "?")}
      </div>
    `;

  return `
    <div class="club-detail">

      <button class="back-btn" id="clubBack" type="button">
        ← Voltar
      </button>

      <div
        class="club-detail-header"
        style="--club-bg:${escapeHTML(club.color || "#151515")}"
      >
        ${logo}

        <div>
          <h1>${escapeHTML(club.name)}</h1>
          <p>
            ${players.length}/16 jogadores
          </p>
        </div>
      </div>

      <div class="club-detail-players">
        ${
          players.length
            ? `
              <div class="players-groups">
                ${CLASS_GROUPS.map(group =>
                  renderPlayerClassGroup(
                    group.name,
                    group.classes,
                    players
                  )
                ).join("")}
              </div>
            `
            : `
              <div class="empty-state">
                <strong>Elenco vazio</strong>
                <span>Nenhum jogador foi atribuído a este ${isTeam ? "time" : "seleção"}.</span>
              </div>
            `
        }
      </div>
    </div>
  `;
}

function bindClubCards() {
  if (state.detail) {
    $("#clubBack")?.addEventListener("click", () => {
      state.detail = null;
      renderPage();
      bindClubCards();
    });

    bindPlayerGroups();
    return;
  }

  document.querySelectorAll(".club-card").forEach(card => {
    card.addEventListener("click", () => {
      const type =
        state.page === "teams"
          ? "team"
          : "selection";

      const clubs =
        type === "team"
          ? state.data.teams || []
          : state.data.selections || [];

      state.detail = clubs.find(
        club => String(club.id) === String(card.dataset.clubId)
      );

      renderPage();
      bindClubCards();
    });
  });
}

/* =========================================================
   ADMIN
   ========================================================= */

function renderAdmin() {
  if (!state.admin) {
    return `
      <div class="admin-locked">
        <h2>Admin Area</h2>

        <p>
          Entre com a senha administrativa para gerenciar
          links, notícias, jogadores, times e seleções.
        </p>

        <form id="loginForm">
          <label>
            Senha
            <input
              id="adminPassword"
              type="password"
              placeholder="Digite a senha"
              required
            >
          </label>

          <button class="btn primary" type="submit">
            Entrar
          </button>
        </form>
      </div>
    `;
  }

  return `
    <div class="page-head">
      <div>
        <h1>Admin Area</h1>
        <p>Gerencie todo o conteúdo da ULTIMATE TCS LEAGUE.</p>
      </div>

      <button
        class="btn danger"
        id="logoutBtn"
        type="button"
      >
        Sair
      </button>
    </div>

    <div class="admin-grid">

      ${renderAdminLinks()}

      ${renderAdminNews()}

      ${renderAdminCategories()}

      ${renderAdminPlayers()}

      ${renderAdminTeams()}

      ${renderAdminSelections()}

    </div>
  `;
}

function renderAdminLinks() {
  const links = state.data?.links || {};

  return `
    <section class="admin-card">
      <h2>Links</h2>
      <p>Configure os links oficiais usados pelo site.</p>

      <form id="linksForm">

        <label>
          Discord
          <input
            name="discord"
            type="url"
            value="${escapeHTML(links.discord || "")}"
            placeholder="https://discord.gg/..."
          >
        </label>

        <label>
          TikTok
          <input
            name="tiktok"
            type="url"
            value="${escapeHTML(links.tiktok || "")}"
            placeholder="https://tiktok.com/..."
          >
        </label>

        <label>
          Tabela
          <input
            name="tabela"
            type="url"
            value="${escapeHTML(links.tabela || "")}"
            placeholder="https://..."
          >
        </label>

        <button class="btn primary" type="submit">
          Salvar links
        </button>

      </form>
    </section>
  `;
}

function renderAdminNews() {
  const categories = state.data?.newsCategories || ["Geral"];
  const news = state.data?.news || [];

  return `
    <section class="admin-card">
      <h2>News</h2>
      <p>Crie e exclua notícias da liga.</p>

      <form id="newsForm">

        <label>
          Título
          <input
            name="title"
            type="text"
            placeholder="Título da notícia"
            required
          >
        </label>

        <label>
          Descrição
          <textarea
            name="description"
            placeholder="Descrição da notícia"
            required
          ></textarea>
        </label>

        <label>
          Imagem
          <input
            name="image"
            type="url"
            placeholder="https://..."
          >
        </label>

        <label>
          Categoria
          <select name="category">
            ${categories.map(category => `
              <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
              </option>
            `).join("")}
          </select>
        </label>

        <button class="btn primary" type="submit">
          Criar notícia
        </button>

      </form>

      <div class="admin-list">
        ${
          news.length
            ? news.map(item => `
                <div class="admin-list-item">
                  <div>
                    <strong>${escapeHTML(item.title)}</strong>
                    <small>${escapeHTML(item.category || "Geral")}</small>
                  </div>

                  <button
                    class="btn danger small delete-news"
                    data-id="${escapeHTML(item.id)}"
                    type="button"
                  >
                    Excluir
                  </button>
                </div>
              `).join("")
            : `
              <div class="empty-state">
                <strong>Nenhuma notícia</strong>
                <span>Crie a primeira notícia.</span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function renderAdminCategories() {
  const categories =
    state.data?.newsCategories || ["Geral"];

  return `
    <section class="admin-card">
      <h2>Categorias de News</h2>
      <p>
        Crie novas categorias. A categoria Geral não pode ser excluída.
      </p>

      <form id="categoryForm">

        <label>
          Nome da categoria
          <input
            name="name"
            type="text"
            placeholder="Ex.: Transferências"
            required
          >
        </label>

        <button class="btn primary" type="submit">
          Criar categoria
        </button>

      </form>

      <div class="admin-list">
        ${categories.map(category => `
          <div class="admin-list-item">
            <div>
              <strong>${escapeHTML(category)}</strong>
            </div>

            ${
              category === "Geral"
                ? `<small>Principal</small>`
                : `
                  <button
                    class="btn danger small delete-category"
                    data-name="${escapeHTML(category)}"
                    type="button"
                  >
                    Excluir
                  </button>
                `
            }
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAdminPlayers() {
  const players = state.data?.players || [];
  const teams = state.data?.teams || [];

  return `
    <section class="admin-card full">
      <h2>Jogadores</h2>
      <p>
        Cadastre jogadores, classe, overall, salário, time e função.
      </p>

      <form id="playerForm">

        <label>
          ID
          <input
            name="id"
            type="number"
            min="1"
            placeholder="Ex.: 1"
            required
          >
        </label>

        <label>
          Nick
          <input
            name="nick"
            type="text"
            placeholder="Nick do jogador"
            required
          >
        </label>

        <label>
          Class
          <select name="class" id="playerClass" required>
            ${CLASS_ORDER.map(cls => `
              <option value="${cls}">
                ${cls}
              </option>
            `).join("")}
          </select>
        </label>

        <label id="xWageWrap" hidden>
          Salário do Class X
          <select name="wage" id="xWage">
            ${X_WAGES.map(wage => `
              <option value="${wage}">
                ${formatMoney(wage)}
              </option>
            `).join("")}
          </select>
        </label>

        <label>
          Overall
          <input
            name="overall"
            type="number"
            min="0"
            max="100"
            placeholder="0 - 100"
            required
          >
        </label>

        <label>
          Team
          <select name="teamId">
            <option value="">FREE AGENT</option>

            ${teams.map(team => `
              <option value="${escapeHTML(team.id)}">
                ${escapeHTML(team.name)}
              </option>
            `).join("")}
          </select>
        </label>

        <label>
          Role
          <select name="role" required>
            ${ROLE_OPTIONS.map(role => `
              <option value="${escapeHTML(role)}">
                ${escapeHTML(role)}
              </option>
            `).join("")}
          </select>
        </label>

        <button class="btn primary" type="submit">
          Salvar jogador
        </button>

      </form>

      <div class="admin-list">
        ${
          players.length
            ? players.map(player => `
                <div class="admin-list-item">
                  <div>
                    <strong>
                      #${escapeHTML(player.id)} — ${escapeHTML(player.nick)}
                    </strong>

                    <small>
                      ${escapeHTML(player.class)}
                      · ${escapeHTML(player.role)}
                      · ${escapeHTML(player.overall)} OVR
                    </small>
                  </div>

                  <button
                    class="btn danger small delete-player"
                    data-id="${escapeHTML(player.id)}"
                    type="button"
                  >
                    Excluir
                  </button>
                </div>
              `).join("")
            : `
              <div class="empty-state">
                <strong>Nenhum jogador</strong>
                <span>Cadastre o primeiro jogador.</span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function renderAdminTeams() {
  const teams = state.data?.teams || [];

  return `
    <section class="admin-card">
      <h2>Times</h2>
      <p>
        Crie times e defina nome, escudo e cor de fundo.
      </p>

      <form id="teamForm">

        <label>
          Nome
          <input
            name="name"
            type="text"
            placeholder="Ex.: Cruzeiro"
            required
          >
        </label>

        <label>
          Logo / Escudo
          <input
            name="logo"
            type="url"
            placeholder="https://..."
          >
        </label>

        <label>
          Cor do fundo
          <input
            name="color"
            type="text"
            placeholder="#0057FF"
            value="#151515"
          >
        </label>

        <button class="btn primary" type="submit">
          Criar time
        </button>

      </form>

      <div class="admin-list">
        ${
          teams.length
            ? teams.map(team => `
                <div class="admin-list-item">
                  <div>
                    <strong>${escapeHTML(team.name)}</strong>
                    <small>Máximo de 16 jogadores</small>
                  </div>

                  <button
                    class="btn danger small delete-team"
                    data-id="${escapeHTML(team.id)}"
                    type="button"
                  >
                    Excluir
                  </button>
                </div>
              `).join("")
            : `
              <div class="empty-state">
                <strong>Nenhum time</strong>
                <span>Crie o primeiro time.</span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function renderAdminSelections() {
  const selections = state.data?.selections || [];
  const players = state.data?.players || [];

  return `
    <section class="admin-card">
      <h2>Seleções</h2>
      <p>
        Crie uma seleção e atribua até 16 jogadores manualmente.
      </p>

      <form id="selectionForm">

        <label>
          Nome
          <input
            name="name"
            type="text"
            placeholder="Ex.: Brasil"
            required
          >
        </label>

        <label>
          Logo / Escudo
          <input
            name="logo"
            type="url"
            placeholder="https://..."
          >
        </label>

        <label>
          Cor do fundo
          <input
            name="color"
            type="text"
            placeholder="#009C3B"
            value="#151515"
          >
        </label>

        <div class="selection-players">
          <label>
            Jogadores
          </label>

          <div class="selection-checks">
            ${
              players.length
                ? players.map(player => `
                    <label class="check-player">
                      <input
                        type="checkbox"
                        name="players"
                        value="${escapeHTML(player.id)}"
                      >

                      <span>
                        #${escapeHTML(player.id)}
                        —
                        ${escapeHTML(player.nick)}
                      </span>
                    </label>
                  `).join("")
                : `
                  <div class="empty-state">
                    <strong>Nenhum jogador disponível</strong>
                    <span>Cadastre jogadores primeiro.</span>
                  </div>
                `
            }
          </div>
        </div>

        <button class="btn primary" type="submit">
          Criar seleção
        </button>

      </form>

      <div class="admin-list">
        ${
          selections.length
            ? selections.map(selection => `
                <div class="admin-list-item">
                  <div>
                    <strong>${escapeHTML(selection.name)}</strong>

                    <small>
                      ${(selection.players || []).length}/16 jogadores
                    </small>
                  </div>

                  <button
                    class="btn danger small delete-selection"
                    data-id="${escapeHTML(selection.id)}"
                    type="button"
                  >
                    Excluir
                  </button>
                </div>
              `).join("")
            : `
              <div class="empty-state">
                <strong>Nenhuma seleção</strong>
                <span>Crie a primeira seleção.</span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

/* =========================================================
   ADMIN EVENTS
   ========================================================= */

function bindAdmin() {
  $("#loginForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const password = $("#adminPassword")?.value || "";

    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password })
      });

      state.admin = true;

      showToast("Login realizado.");

      renderPage();
      bindAdmin();
    } catch (error) {
      showToast(error.message);
    }
  });

  $("#logoutBtn")?.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", {
        method: "POST"
      });

      state.admin = false;

      showToast("Sessão encerrada.");

      renderPage();
    } catch (error) {
      showToast(error.message);
    }
  });

  $("#linksForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    try {
      await api("/api/admin/links", {
        method: "POST",
        body: JSON.stringify({
          discord: form.get("discord"),
          tiktok: form.get("tiktok"),
          tabela: form.get("tabela")
        })
      });

      showToast("Links salvos.");

      await loadData();
      bindAdmin();
    } catch (error) {
      showToast(error.message);
    }
  });

  $("#categoryForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    try {
      await api("/api/admin/news-categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name")
        })
      });

      showToast("Categoria criada.");

      await loadData();
      bindAdmin();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll(".delete-category").forEach(button => {
    button.addEventListener("click", async () => {
      const name = button.dataset.name;

      if (!confirm(`Excluir a categoria "${name}"?`)) {
        return;
      }

      try {
        await api(
          `/api/admin/news-categories/${encodeURIComponent(name)}`,
          {
            method: "DELETE"
          }
        );

        showToast("Categoria excluída.");

        await loadData();
        bindAdmin();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  $("#newsForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    try {
      await api("/api/admin/news", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          image: form.get("image"),
          category: form.get("category")
        })
      });

      showToast("Notícia criada.");

      await loadData();
      bindAdmin();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll(".delete-news").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      if (!confirm("Excluir esta notícia?")) {
        return;
      }

      try {
        await api(`/api/admin/news/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });

        showToast("Notícia excluída.");

        await loadData();
        bindAdmin();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  bindPlayerAdmin();
  bindTeamAdmin();
  bindSelectionAdmin();
}

function bindPlayerAdmin() {
  const classSelect = $("#playerClass");
  const wageWrap = $("#xWageWrap");

  function updateWageVisibility() {
    if (!classSelect || !wageWrap) return;

    wageWrap.hidden =
      formatClass(classSelect.value) !== "X";
  }

  classSelect?.addEventListener(
    "change",
    updateWageVisibility
  );

  updateWageVisibility();

  $("#playerForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const playerClass = formatClass(
      form.get("class")
    );

    const overall = Number(
      form.get("overall")
    );

    if (overall < 0 || overall > 100) {
      showToast("O overall deve estar entre 0 e 100.");
      return;
    }

    let wage;

    if (playerClass === "X") {
      wage = Number(form.get("wage"));

      if (!X_WAGES.includes(wage)) {
        showToast("Selecione um salário válido para Class X.");
        return;
      }
    } else {
      wage = FIXED_WAGES[playerClass];

      if (!wage) {
        showToast("Classe inválida.");
        return;
      }
    }

    try {
      await api("/api/admin/players", {
        method: "POST",
        body: JSON.stringify({
          id: Number(form.get("id")),
          nick: form.get("nick"),
          class: playerClass,
          wage,
          overall,
          teamId: form.get("teamId") || null,
          role: form.get("role")
        })
      });

      showToast("Jogador salvo.");

      await loadData();
      bindAdmin();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll(".delete-player").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      if (!confirm("Excluir este jogador?")) {
        return;
      }

      try {
        await api(
          `/api/admin/players/${encodeURIComponent(id)}`,
          {
            method: "DELETE"
          }
        );

        showToast("Jogador excluído.");

        await loadData();
        bindAdmin();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function bindTeamAdmin() {
  $("#teamForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    try {
      await api("/api/admin/teams", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          logo: form.get("logo"),
          color: form.get("color")
        })
      });

      showToast("Time criado.");

      await loadData();
      bindAdmin();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll(".delete-team").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      if (!confirm("Excluir este time?")) {
        return;
      }

      try {
        await api(
          `/api/admin/teams/${encodeURIComponent(id)}`,
          {
            method: "DELETE"
          }
        );

        showToast("Time excluído.");

        await loadData();
        bindAdmin();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function bindSelectionAdmin() {
  const form = $("#selectionForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const data = new FormData(form);

    const selectedPlayers = data.getAll("players");

    if (selectedPlayers.length > 16) {
      showToast("Uma seleção pode ter no máximo 16 jogadores.");
      return;
    }

    try {
      await api("/api/admin/selections", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          logo: data.get("logo"),
          color: data.get("color"),
          players: selectedPlayers
        })
      });

      showToast("Seleção criada.");

      await loadData();
      bindAdmin();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll(".delete-selection").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      if (!confirm("Excluir esta seleção?")) {
        return;
      }

      try {
        await api(
          `/api/admin/selections/${encodeURIComponent(id)}`,
          {
            method: "DELETE"
          }
        );

        showToast("Seleção excluída.");

        await loadData();
        bindAdmin();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

/* =========================================================
   GLOBAL EVENTS
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".nav").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      if (page === "table") {
        state.page = "table";
        state.detail = null;

        closeMobileMenu();

        updateActiveNav("table");
        setPageTitle("Tabela");

        renderTableRedirect();
        return;
      }

      navigate(page);
    });
  });

  $("#mobileMenu")?.addEventListener(
    "click",
    openMobileMenu
  );

  await loadAdminStatus();
  await loadData();
});
