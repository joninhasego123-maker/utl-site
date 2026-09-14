const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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

const CLASS_GROUPS = ["X", "S", "A", "B", "C", "D"];

const FIXED_WAGES = {
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

const X_WAGES = {
  380000: "380K",
  385000: "385K",
  390000: "390K",
  395000: "395K",
  400000: "400K"
};

const ROLE_OPTIONS = [
  "PLAYER",
  "ASSIST MANAGER",
  "MANAGER"
];

let DATA = {
  links: {
    discord: "",
    tiktok: "",
    tabela: ""
  },
  newsCategories: ["Geral"],
  news: [],
  players: [],
  selections: [],
  teams: []
};

let isAdmin = false;
let currentPage = "news";
let currentClubType = null;
let currentClubId = null;

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function playerClass(player) {
  return String(player?.class || "D").toUpperCase();
}

function baseClass(className) {
  return className === "X" ? "X" : className.charAt(0);
}

function playerWage(player) {
  const cls = playerClass(player);

  if (cls === "X") {
    return X_WAGES[Number(player.wage)] || "380K";
  }

  return FIXED_WAGES[cls] || "—";
}

function getTeam(teamId) {
  return DATA.teams.find(team => String(team.id) === String(teamId));
}

function getSelection(selectionId) {
  return DATA.selections.find(
    selection => String(selection.id) === String(selectionId)
  );
}

function getPlayerTeam(player) {
  if (!player?.teamId) return null;
  return getTeam(player.teamId);
}

function formatImage(url, fallback = "") {
  return url || fallback;
}

function toast(message) {
  const el = $("#toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Ocorreu um erro.");
  }

  return data;
}

async function loadData() {
  try {
    const result = await api("/api/data");

    DATA = {
      links: {
        discord: "",
        tiktok: "",
        tabela: "",
        ...(result.links || {})
      },
      newsCategories:
        Array.isArray(result.newsCategories) && result.newsCategories.length
          ? result.newsCategories
          : ["Geral"],
      news: Array.isArray(result.news) ? result.news : [],
      players: Array.isArray(result.players) ? result.players : [],
      selections: Array.isArray(result.selections)
        ? result.selections
        : [],
      teams: Array.isArray(result.teams) ? result.teams : []
    };
  } catch (error) {
    toast(error.message);
  }
}

function setPageTitle(title) {
  const titleEl = $("#page-title");
  if (titleEl) titleEl.textContent = title;
}

function setActiveNav(page) {
  $$(".nav").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });
}

function renderPage(page) {
  currentPage = page;

  if (page === "table") {
    showExternalConfirm(DATA.links?.tabela);
    return;
  }

  currentClubType = null;
  currentClubId = null;

  setActiveNav(page);

  const titles = {
    news: "News",
    players: "Jogadores",
    selections: "Seleções",
    teams: "Times",
    admin: "Admin Area"
  };

  setPageTitle(titles[page] || "News");

  if (page === "news") renderNews();
  if (page === "players") renderPlayers();
  if (page === "selections") renderClubs("selection");
  if (page === "teams") renderClubs("team");
  if (page === "admin") renderAdmin();

  $("#sidebar")?.classList.remove("mobile-open");
}

function showExternalConfirm(url) {
  const old = $("#externalConfirm");

  if (old) old.remove();

  const overlay = document.createElement("div");

  overlay.id = "externalConfirm";
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal">
      <h2>Você está sendo levado a outro site</h2>

      <p>
        A tabela da ULTIMATE TCS LEAGUE será aberta em um
        site externo. Você deseja continuar?
      </p>

      <div class="modal-actions">
        <button class="btn secondary" data-external-no>Não</button>
        <button class="btn primary" data-external-yes>Sim</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  $("[data-external-no]", overlay)?.addEventListener(
    "click",
    () => overlay.remove()
  );

  $("[data-external-yes]", overlay)?.addEventListener(
    "click",
    () => {
      if (!url) {
        overlay.remove();
        toast("O link da tabela ainda não foi configurado.");
        return;
      }

      window.location.href = url;
    }
  );

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      overlay.remove();
    }
  });
}

function renderNews() {
  const content = $("#page-content");

  if (!content) return;

  const categories = DATA.newsCategories?.length
    ? DATA.newsCategories
    : ["Geral"];

  content.innerHTML = `
    <div class="page-head">
      <div>
        <h1>News</h1>
        <p>Últimas notícias da ULTIMATE TCS LEAGUE</p>
      </div>
    </div>

    <div class="news-list">
      ${categories.map(category => {
        const categoryNews = DATA.news.filter(
          item => (item.category || "Geral") === category
        );

        return `
          <section class="news-category">
            <button
              class="news-category-header"
              data-news-category="${escapeHTML(category)}"
            >
              <span>${escapeHTML(category)}</span>
              <span>⌄</span>
            </button>

            <div class="news-category-content">
              ${
                categoryNews.length
                  ? categoryNews
                      .map(renderNewsCard)
                      .join("")
                  : `
                    <div class="empty-state">
                      Nenhuma notícia nesta categoria.
                    </div>
                  `
              }
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;

  $$(".news-category-header", content).forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("open");

      const box = button.nextElementSibling;

      if (box) {
        box.classList.toggle("open");
      }
    });
  });
}

function renderNewsCard(news) {
  return `
    <article class="news-card">
      ${
        news.image
          ? `
            <img
              src="${escapeHTML(news.image)}"
              alt=""
              class="news-image"
              onerror="this.style.display='none'"
            >
          `
          : ""
      }

      <div class="news-card-body">
        <h3>${escapeHTML(news.title)}</h3>

        <p>
          ${escapeHTML(news.description)}
        </p>
      </div>
    </article>
  `;
}

function renderPlayers(players = DATA.players, options = {}) {
  const content = $("#page-content");

  if (!content) return;

  const detail = Boolean(options.detail);
  const openCategories = Boolean(options.openCategories);

  const groups = {};

  CLASS_GROUPS.forEach(group => {
    groups[group] = [];
  });

  [...players]
    .sort((a, b) => {
      const ai = CLASS_ORDER.indexOf(playerClass(a));
      const bi = CLASS_ORDER.indexOf(playerClass(b));

      if (ai !== bi) return ai - bi;

      return Number(a.createdAt || a.id || 0) -
        Number(b.createdAt || b.id || 0);
    })
    .forEach(player => {
      const cls = playerClass(player);
      const group = cls === "X" ? "X" : cls.charAt(0);

      if (!groups[group]) groups[group] = [];

      groups[group].push(player);
    });

  content.innerHTML = `
    <div class="page-head">
      <div>
        <h1>${detail ? "Elenco" : "Jogadores"}</h1>
        <p>
          ${detail
            ? "Jogadores deste time ou seleção"
            : "Todos os jogadores da liga"}
        </p>
      </div>
    </div>

    <div class="players-groups">
      ${CLASS_GROUPS.map(group => {
        const list = groups[group] || [];

        return `
          <section class="player-class ${
            openCategories ? "open" : ""
          }">
            <button
              class="player-class-header"
              type="button"
            >
              <span>CLASS ${group}</span>
              <span>⌄</span>
            </button>

            <div class="player-class-content">
              ${
                list.length
                  ? renderPlayerTable(list)
                  : `
                    <div class="empty-state">
                      Nenhum jogador nesta classe.
                    </div>
                  `
              }
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;

  $$(".player-class-header", content).forEach(button => {
    button.addEventListener("click", () => {
      const section = button.closest(".player-class");

      if (section) {
        section.classList.toggle("open");
      }
    });
  });
}

function renderPlayerTable(players) {
  return `
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
  `;
}

function renderPlayerRow(player) {
  const cls = playerClass(player);
  const team = getPlayerTeam(player);

  const teamHTML = team
    ? `
      <span class="team-cell">
        ${
          team.logo
            ? `
              <img
                class="team-shield"
                src="${escapeHTML(team.logo)}"
                alt=""
                onerror="this.style.display='none'"
              >
            `
            : ""
        }

        <span>${escapeHTML(team.name)}</span>
      </span>
    `
    : `
      <span class="free-agent">
        🏷️ FREE AGENT
      </span>
    `;

  return `
    <div class="player-row">
      <span>${escapeHTML(player.id)}</span>

      <span class="player-nick">
        ${escapeHTML(player.nick)}
      </span>

      <span>
        <b class="class-badge class-${baseClass(cls)}">
          ${escapeHTML(cls)}
        </b>
      </span>

      <span>
        ${teamHTML}
      </span>

      <span>
        ${escapeHTML(player.role || "PLAYER")}
      </span>

      <span>
        ${escapeHTML(player.overall ?? "0")}
      </span>

      <span>
        ${escapeHTML(playerWage(player))}
      </span>
    </div>
  `;
}

function renderClubs(type) {
  const content = $("#page-content");

  if (!content) return;

  const clubs =
    type === "team"
      ? DATA.teams
      : DATA.selections;

  const title =
    type === "team"
      ? "Times"
      : "Seleções";

  const subtitle =
    type === "team"
      ? "Times participantes da UTL"
      : "Seleções participantes da UTL";

  content.innerHTML = `
    <div class="page-head">
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
    </div>

    <div class="club-list">
      ${
        clubs.length
          ? clubs.map(club => renderClubCard(club, type)).join("")
          : `
            <div class="empty-state">
              Nenhum ${type === "team" ? "time" : "seleção"} cadastrado.
            </div>
          `
      }
    </div>
  `;

  $("[data-club-open]", content);

  $$("[data-club-open]", content).forEach(card => {
    card.addEventListener("click", () => {
      const [clubType, clubId] =
        card.dataset.clubOpen.split("|");

      openClubDetail(clubType, clubId);
    });
  });
}

function renderClubCard(club, type) {
  const count =
    type === "team"
      ? DATA.players.filter(
          player =>
            String(player.teamId) === String(club.id)
        ).length
      : Array.isArray(club.players)
        ? club.players.length
        : 0;

  return `
    <button
      class="club-card"
      type="button"
      data-club-open="${type}|${escapeHTML(club.id)}"
      style="--club-bg:${escapeHTML(
        club.color || "#171717"
      )}"
    >
      <div class="club-logo-wrap">
        ${
          club.logo
            ? `
              <img
                class="club-logo"
                src="${escapeHTML(club.logo)}"
                alt=""
                onerror="this.style.display='none'"
              >
            `
            : `
              <span class="club-logo-fallback">
                ${escapeHTML(
                  (club.name || "?").charAt(0).toUpperCase()
                )}
              </span>
            `
        }
      </div>

      <div class="club-info">
        <h3>${escapeHTML(club.name)}</h3>
        <span>${count}/16 jogadores</span>
      </div>

      <span class="club-arrow">›</span>
    </button>
  `;
}

function openClubDetail(type, id) {
  const club =
    type === "team"
      ? getTeam(id)
      : getSelection(id);

  if (!club) {
    toast("Não foi possível encontrar este cadastro.");
    return;
  }

  currentClubType = type;
  currentClubId = id;

  const players =
    type === "team"
      ? DATA.players.filter(
          player =>
            String(player.teamId) === String(club.id)
        )
      : DATA.players.filter(player =>
          Array.isArray(club.players) &&
          club.players.some(
            playerId =>
              String(playerId) === String(player.id)
          )
        );

  setPageTitle(club.name);

  const content = $("#page-content");

  content.innerHTML = `
    <div class="club-detail">
      <button
        class="back-btn"
        type="button"
        data-club-back="${type}"
      >
        ← Voltar
      </button>

      <section
        class="club-detail-header"
        style="--club-bg:${escapeHTML(
          club.color || "#171717"
        )}"
      >
        ${
          club.logo
            ? `
              <img
                class="club-detail-logo"
                src="${escapeHTML(club.logo)}"
                alt=""
                onerror="this.style.display='none'"
              >
            `
            : `
              <div class="club-detail-logo fallback">
                ${escapeHTML(
                  (club.name || "?").charAt(0).toUpperCase()
                )}
              </div>
            `
        }

        <div>
          <h1>${escapeHTML(club.name)}</h1>
          <p>${players.length}/16 jogadores</p>
        </div>
      </section>

      <div class="club-detail-players"></div>
    </div>
  `;

  const holder = $(".club-detail-players", content);

  renderPlayerGroupsInto(
    holder,
    players,
    true
  );

  $("[data-club-back]", content)?.addEventListener(
    "click",
    () => renderPage(type === "team" ? "teams" : "selections")
  );
}

function renderPlayerGroupsInto(holder, players, openCategories) {
  if (!holder) return;

  const groups = {};

  CLASS_GROUPS.forEach(group => {
    groups[group] = [];
  });

  players.forEach(player => {
    const cls = playerClass(player);
    const group = cls === "X" ? "X" : cls.charAt(0);

    if (!groups[group]) groups[group] = [];

    groups[group].push(player);
  });

  holder.innerHTML = CLASS_GROUPS.map(group => {
    const list = groups[group] || [];

    return `
      <section class="player-class ${
        openCategories ? "open" : ""
      }">
        <button
          class="player-class-header"
          type="button"
        >
          <span>CLASS ${group}</span>
          <span>⌄</span>
        </button>

        <div class="player-class-content">
          ${
            list.length
              ? renderPlayerTable(list)
              : `
                <div class="empty-state">
                  Nenhum jogador nesta classe.
                </div>
              `
          }
        </div>
      </section>
    `;
  }).join("");

  $$(".player-class-header", holder).forEach(button => {
    button.addEventListener("click", () => {
      button
        .closest(".player-class")
        ?.classList.toggle("open");
    });
  });
}

function renderAdmin() {
  const content = $("#page-content");

  if (!content) return;

  if (!isAdmin) {
    content.innerHTML = `
      <div class="admin-locked">
        <h1>Admin Area</h1>
        <p>
          A área administrativa é protegida.
        </p>

        <button class="btn primary" id="loginBtn">
          Entrar
        </button>
      </div>
    `;

    $("#loginBtn")?.addEventListener(
      "click",
      showLoginModal
    );

    return;
  }

  content.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Admin Area</h1>
        <p>Gerencie o conteúdo da UTL</p>
      </div>

      <button class="btn secondary" id="logoutBtn">
        Sair
      </button>
    </div>

    <div class="admin-grid">

      <section class="admin-card">
        <h2>Links</h2>

        <form id="linksForm">
          <label>
            Discord
            <input
              id="discordLink"
              type="url"
              value="${escapeHTML(DATA.links.discord)}"
              placeholder="https://discord.gg/..."
            >
          </label>

          <label>
            TikTok
            <input
              id="tiktokLink"
              type="url"
              value="${escapeHTML(DATA.links.tiktok)}"
              placeholder="https://tiktok.com/..."
            >
          </label>

          <label>
            Tabela
            <input
              id="tableLink"
              type="url"
              value="${escapeHTML(DATA.links.tabela)}"
              placeholder="https://..."
            >
          </label>

          <button class="btn primary" type="submit">
            Salvar links
          </button>
        </form>
      </section>

      <section class="admin-card">
        <h2>Notícias</h2>

        <form id="newsForm">
          <label>
            Categoria
            <select id="newsCategory">
              ${DATA.newsCategories.map(category => `
                <option value="${escapeHTML(category)}">
                  ${escapeHTML(category)}
                </option>
              `).join("")}
            </select>
          </label>

          <label>
            Título
            <input
              id="newsTitle"
              type="text"
              required
              maxlength="120"
            >
          </label>

          <label>
            Descrição
            <textarea
              id="newsDescription"
              required
              maxlength="500"
            ></textarea>
          </label>

          <label>
            Imagem
            <input
              id="newsImage"
              type="url"
              placeholder="https://..."
            >
          </label>

          <button class="btn primary" type="submit">
            Criar notícia
          </button>
        </form>

        <div class="admin-list">
          ${DATA.news.map(news => `
            <div class="admin-list-item">
              <div>
                <b>${escapeHTML(news.title)}</b>
                <small>
                  ${escapeHTML(news.category || "Geral")}
                </small>
              </div>

              <button
                class="btn danger small"
                data-delete-news="${escapeHTML(news.id)}"
              >
                Excluir
              </button>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="admin-card">
        <h2>Categorias de notícias</h2>

        <form id="categoryForm">
          <label>
            Nova categoria
            <input
              id="categoryName"
              type="text"
              maxlength="40"
              required
            >
          </label>

          <button class="btn primary" type="submit">
            Criar categoria
          </button>
        </form>

        <div class="admin-list">
          ${DATA.newsCategories.map(category => `
            <div class="admin-list-item">
              <div>
                <b>${escapeHTML(category)}</b>
              </div>

              ${
                category === "Geral"
                  ? `
                    <small>Categoria padrão</small>
                  `
                  : `
                    <button
                      class="btn danger small"
                      data-delete-category="${escapeHTML(
                        category
                      )}"
                    >
                      Excluir
                    </button>
                  `
              }
            </div>
          `).join("")}
        </div>
      </section>

      <section class="admin-card">
        <h2>Jogadores</h2>

        <form id="playerForm">

          <label>
            ID
            <input
              id="pid"
              type="number"
              min="1"
              required
            >
          </label>

          <label>
            Nick
            <input
              id="pnick"
              type="text"
              maxlength="40"
              required
            >
          </label>

          <label>
            Class
            <select id="pclass">
              ${CLASS_ORDER.map(cls => `
                <option value="${cls}">
                  ${cls}
                </option>
              `).join("")}
            </select>
          </label>

          <label id="xWageWrap" hidden>
            Wage do X
            <select id="pxwage">
              ${Object.entries(X_WAGES).map(
                ([value, label]) => `
                  <option value="${value}">
                    ${label}
                  </option>
                `
              ).join("")}
            </select>
          </label>

          <label>
            Overall
            <input
              id="poverall"
              type="number"
              min="0"
              max="100"
              value="0"
              required
            >
          </label>

          <label>
            Time
            <select id="pteam">
              <option value="">FREE AGENT</option>

              ${DATA.teams.map(team => `
                <option value="${escapeHTML(team.id)}">
                  ${escapeHTML(team.name)}
                </option>
              `).join("")}
            </select>
          </label>

          <label>
            Role
            <select id="prole">
              ${ROLE_OPTIONS.map(role => `
                <option value="${role}">
                  ${role}
                </option>
              `).join("")}
            </select>
          </label>

          <button class="btn primary" type="submit">
            Criar jogador
          </button>
        </form>

        <div class="admin-list">
          ${DATA.players.map(player => `
            <div class="admin-list-item">
              <div>
                <b>
                  ${escapeHTML(player.nick)}
                </b>

                <small>
                  ID ${escapeHTML(player.id)}
                  · ${escapeHTML(playerClass(player))}
                  · ${escapeHTML(player.role || "PLAYER")}
                </small>
              </div>

              <button
                class="btn danger small"
                data-delete-player="${escapeHTML(player.id)}"
              >
                Excluir
              </button>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="admin-card">
        <h2>Times</h2>

        <form id="teamForm">

          <label>
            Nome
            <input
              id="teamName"
              type="text"
              maxlength="60"
              required
            >
          </label>

          <label>
            Cor de fundo
            <input
              id="teamColor"
              type="color"
              value="#171717"
            >
          </label>

          <label>
            Logo
            <input
              id="teamLogo"
              type="url"
              placeholder="https://..."
            >
          </label>

          <button class="btn primary" type="submit">
            Criar time
          </button>
        </form>

        <div class="admin-list">
          ${DATA.teams.map(team => `
            <div class="admin-list-item">
              <div>
                <b>${escapeHTML(team.name)}</b>
              </div>

              <button
                class="btn danger small"
                data-delete-team="${escapeHTML(team.id)}"
              >
                Excluir
              </button>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="admin-card">
        <h2>Seleções</h2>

        <form id="selectionForm">

          <label>
            Nome
            <input
              id="selectionName"
              type="text"
              maxlength="60"
              required
            >
          </label>

          <label>
            Cor de fundo
            <input
              id="selectionColor"
              type="color"
              value="#171717"
            >
          </label>

          <label>
            Logo
            <input
              id="selectionLogo"
              type="url"
              placeholder="https://..."
            >
          </label>

          <div class="selection-players">
            <b>Jogadores da seleção — máximo 16</b>

            <div class="selection-checks">
              ${DATA.players.map(player => `
                <label class="check-player">
                  <input
                    type="checkbox"
                    name="selectionPlayers"
                    value="${escapeHTML(player.id)}"
                  >

                  <span>
                    ${escapeHTML(player.nick)}
                  </span>
                </label>
              `).join("")}
            </div>
          </div>

          <button class="btn primary" type="submit">
            Criar seleção
          </button>
        </form>

        <div class="admin-list">
          ${DATA.selections.map(selection => `
            <div class="admin-list-item">
              <div>
                <b>
                  ${escapeHTML(selection.name)}
                </b>

                <small>
                  ${
                    Array.isArray(selection.players)
                      ? selection.players.length
                      : 0
                  }/16 jogadores
                </small>
              </div>

              <button
                class="btn danger small"
                data-delete-selection="${escapeHTML(
                  selection.id
                )}"
              >
                Excluir
              </button>
            </div>
          `).join("")}
        </div>
      </section>

    </div>
  `;

  bindAdminEvents();
}

function bindAdminEvents() {
  $("#logoutBtn")?.addEventListener(
    "click",
    logout
  );

  $("#linksForm")?.addEventListener(
    "submit",
    saveLinks
  );

  $("#newsForm")?.addEventListener(
    "submit",
    createNews
  );

  $("#categoryForm")?.addEventListener(
    "submit",
    createCategory
  );

  $("#playerForm")?.addEventListener(
    "submit",
    createPlayer
  );

  $("#teamForm")?.addEventListener(
    "submit",
    createTeam
  );

  $("#selectionForm")?.addEventListener(
    "submit",
    createSelection
  );

  $("#pclass")?.addEventListener(
    "change",
    updateXWage
  );

  updateXWage();

  $$("[data-delete-news]").forEach(button => {
    button.addEventListener(
      "click",
      () => deleteNews(button.dataset.deleteNews)
    );
  });

  $$("[data-delete-category]").forEach(button => {
    button.addEventListener(
      "click",
      () =>
        deleteCategory(
          button.dataset.deleteCategory
        )
    );
  });

  $$("[data-delete-player]").forEach(button => {
    button.addEventListener(
      "click",
      () =>
        deletePlayer(
          button.dataset.deletePlayer
        )
    );
  });

  $$("[data-delete-team]").forEach(button => {
    button.addEventListener(
      "click",
      () =>
        deleteTeam(
          button.dataset.deleteTeam
        )
    );
  });

  $$("[data-delete-selection]").forEach(button => {
    button.addEventListener(
      "click",
      () =>
        deleteSelection(
          button.dataset.deleteSelection
        )
    );
  });

  $$('input[name="selectionPlayers"]').forEach(
    checkbox => {
      checkbox.addEventListener(
        "change",
        limitSelectionPlayers
      );
    }
  );
}

function updateXWage() {
  const wrap = $("#xWageWrap");
  const classInput = $("#pclass");

  if (!wrap || !classInput) return;

  wrap.hidden = classInput.value !== "X";
}

async function saveLinks(event) {
  event.preventDefault();

  try {
    const result = await api(
      "/api/admin/links",
      {
        method: "POST",
        body: JSON.stringify({
          discord: $("#discordLink").value.trim(),
          tiktok: $("#tiktokLink").value.trim(),
          tabela: $("#tableLink").value.trim()
        })
      }
    );

    DATA.links = result.links;

    toast("Links salvos.");
  } catch (error) {
    toast(error.message);
  }
}

async function createNews(event) {
  event.preventDefault();

  try {
    const result = await api(
      "/api/admin/news",
      {
        method: "POST",
        body: JSON.stringify({
          category:
            $("#newsCategory").value,
          title:
            $("#newsTitle").value.trim(),
          description:
            $("#newsDescription").value.trim(),
          image:
            $("#newsImage").value.trim()
        })
      }
    );

    DATA.news = result.news;

    toast("Notícia criada.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function createCategory(event) {
  event.preventDefault();

  try {
    const result = await api(
      "/api/admin/news-categories",
      {
        method: "POST",
        body: JSON.stringify({
          name:
            $("#categoryName").value.trim()
        })
      }
    );

    DATA.newsCategories =
      result.newsCategories;

    toast("Categoria criada.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function deleteNews(id) {
  if (!confirm("Excluir esta notícia?")) {
    return;
  }

  try {
    const result = await api(
      `/api/admin/news/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    DATA.news = result.news;

    toast("Notícia excluída.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function deleteCategory(name) {
  if (!confirm(
    `Excluir a categoria "${name}"?`
  )) {
    return;
  }

  try {
    const result = await api(
      `/api/admin/news-categories/${encodeURIComponent(name)}`,
      {
        method: "DELETE"
      }
    );

    DATA.newsCategories =
      result.newsCategories;

    DATA.news = result.news;

    toast("Categoria excluída.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function createPlayer(event) {
  event.preventDefault();

  const cls = $("#pclass").value;

  const payload = {
    id: Number($("#pid").value),
    nick: $("#pnick").value.trim(),
    class: cls,
    wage:
      cls === "X"
        ? Number($("#pxwage").value)
        : undefined,
    overall: Number($("#poverall").value),
    teamId: $("#pteam").value || null,
    role: $("#prole").value
  };

  try {
    const result = await api(
      "/api/admin/players",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    DATA.players = result.players;

    toast("Jogador criado.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function deletePlayer(id) {
  if (!confirm("Excluir este jogador?")) {
    return;
  }

  try {
    const result = await api(
      `/api/admin/players/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    DATA.players = result.players;
    DATA.selections = result.selections;

    toast("Jogador excluído.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function createTeam(event) {
  event.preventDefault();

  const playersInTeam =
    DATA.players.filter(
      player =>
        String(player.teamId) ===
        String("__new__")
    );

  if (playersInTeam.length >= 16) {
    toast("O time já possui 16 jogadores.");
    return;
  }

  try {
    const result = await api(
      "/api/admin/teams",
      {
        method: "POST",
        body: JSON.stringify({
          name:
            $("#teamName").value.trim(),
          color:
            $("#teamColor").value,
          logo:
            $("#teamLogo").value.trim()
        })
      }
    );

    DATA.teams = result.teams;

    toast("Time criado.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function deleteTeam(id) {
  if (!confirm(
    "Excluir este time? Os jogadores serão enviados para FREE AGENT."
  )) {
    return;
  }

  try {
    const result = await api(
      `/api/admin/teams/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    DATA.teams = result.teams;
    DATA.players = result.players;

    toast("Time excluído.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

function limitSelectionPlayers() {
  const checked =
    $$('input[name="selectionPlayers"]:checked');

  if (checked.length > 16) {
    this.checked = false;
    toast("Uma seleção pode ter no máximo 16 jogadores.");
  }
}

async function createSelection(event) {
  event.preventDefault();

  const players = $$(
    'input[name="selectionPlayers"]:checked'
  ).map(input => input.value);

  if (players.length > 16) {
    toast("Uma seleção pode ter no máximo 16 jogadores.");
    return;
  }

  try {
    const result = await api(
      "/api/admin/selections",
      {
        method: "POST",
        body: JSON.stringify({
          name:
            $("#selectionName").value.trim(),
          color:
            $("#selectionColor").value,
          logo:
            $("#selectionLogo").value.trim(),
          players
        })
      }
    );

    DATA.selections =
      result.selections;

    toast("Seleção criada.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function deleteSelection(id) {
  if (!confirm("Excluir esta seleção?")) {
    return;
  }

  try {
    const result = await api(
      `/api/admin/selections/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

    DATA.selections =
      result.selections;

    toast("Seleção excluída.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

function showLoginModal() {
  const old = $("#loginModal");

  if (old) old.remove();

  const overlay = document.createElement("div");

  overlay.id = "loginModal";
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal">
      <h2>Admin Area</h2>

      <p>
        Digite a senha de administrador para continuar.
      </p>

      <form id="loginForm">
        <label>
          Senha
          <input
            id="adminPassword"
            type="password"
            autocomplete="current-password"
            required
          >
        </label>

        <div class="modal-actions">
          <button
            type="button"
            class="btn secondary"
            id="cancelLogin"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="btn primary"
          >
            Entrar
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  $("#cancelLogin")?.addEventListener(
    "click",
    () => overlay.remove()
  );

  $("#loginForm")?.addEventListener(
    "submit",
    login
  );

  $("#adminPassword")?.focus();

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      overlay.remove();
    }
  });
}

async function login(event) {
  event.preventDefault();

  const password =
    $("#adminPassword")?.value || "";

  try {
    await api(
      "/api/admin/login",
      {
        method: "POST",
        body: JSON.stringify({
          password
        })
      }
    );

    isAdmin = true;

    $("#loginModal")?.remove();

    toast("Login realizado.");

    renderAdmin();
  } catch (error) {
    toast(error.message);
  }
}

async function logout() {
  try {
    await api(
      "/api/admin/logout",
      {
        method: "POST"
      }
    );
  } catch {
    // continua mesmo se a sessão já tiver expirado
  }

  isAdmin = false;

  toast("Você saiu da área administrativa.");

  renderAdmin();
}

async function checkAdmin() {
  try {
    const result = await api(
      "/api/admin/status"
    );

    isAdmin = Boolean(result.authenticated);
  } catch {
    isAdmin = false;
  }
}

function bindNavigation() {
  $$(".nav").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      if (page === "table") {
        showExternalConfirm(
          DATA.links?.tabela
        );
        return;
      }

      renderPage(page);
    });
  });

  $("#mobileMenu")?.addEventListener(
    "click",
    () => {
      $("#sidebar")
        ?.classList.toggle("mobile-open");
    }
  );
}

async function init() {
  await loadData();
  await checkAdmin();

  bindNavigation();

  renderPage("news");
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
