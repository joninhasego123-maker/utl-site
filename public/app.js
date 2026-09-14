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
  "X",
  "S",
  "A",
  "B",
  "C",
  "D"
];

const WAGES = {
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

const $ = selector => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function playerNick(player) {
  return player.nick ?? player.name ?? "Sem nome";
}

function playerClass(player) {
  return player.class ?? player.className ?? "D";
}

function playerRole(player) {
  return player.role || "PLAYER";
}

function playerOverall(player) {
  if (
    player.overall === null ||
    player.overall === undefined ||
    player.overall === ""
  ) {
    return "—";
  }

  return player.overall;
}

function playerWage(player) {
  return WAGES[playerClass(player)] || "—";
}

function getBaseClass(value) {
  const c = String(value || "D").toUpperCase();

  if (c === "X") {
    return "X";
  }

  return c.charAt(0);
}

function getClassCSS(value) {
  return String(value || "D")
    .toLowerCase()
    .replace("+", "plus")
    .replace("-", "minus");
}

function getPlayerTeamId(player) {
  return player.teamId ?? player.team ?? "FREE AGENT";
}

function getTeam(player) {
  const teamId = getPlayerTeamId(player);

  if (
    !teamId ||
    String(teamId).toUpperCase() === "FREE AGENT"
  ) {
    return null;
  }

  return DATA.teams.find(team =>
    String(team.id) === String(teamId) ||
    String(team.name) === String(teamId)
  ) || null;
}

function toast(message) {
  let toastElement = $("#toast");

  if (!toastElement) {
    toastElement = document.createElement("div");
    toastElement.id = "toast";

    toastElement.style.position = "fixed";
    toastElement.style.right = "20px";
    toastElement.style.bottom = "20px";
    toastElement.style.zIndex = "9999";
    toastElement.style.padding = "12px 18px";
    toastElement.style.background = "#181818";
    toastElement.style.border = "1px solid rgba(255,255,255,.12)";
    toastElement.style.borderRadius = "10px";
    toastElement.style.color = "#fff";
    toastElement.style.boxShadow = "0 10px 30px rgba(0,0,0,.4)";
    toastElement.style.opacity = "0";
    toastElement.style.pointerEvents = "none";
    toastElement.style.transition = ".2s";

    document.body.appendChild(toastElement);
  }

  toastElement.textContent = message;
  toastElement.style.opacity = "1";

  clearTimeout(toastElement._timer);

  toastElement._timer = setTimeout(() => {
    toastElement.style.opacity = "0";
  }, 2200);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const result = await response
    .json()
    .catch(() => ({}));

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
    const response = await fetch("/api/data");

    if (!response.ok) {
      throw new Error("Erro ao carregar os dados.");
    }

    DATA = await response.json();

    const statusResponse =
      await fetch("/api/admin/status");

    const status =
      await statusResponse.json();

    isAdmin = !!status.admin;

    render(currentPage);

  } catch (error) {
    console.error(error);

    const content = $("#page-content");

    if (content) {
      content.innerHTML = `
        <div class="card">
          <h3>Erro</h3>
          <p class="muted">
            Não foi possível carregar o site.
          </p>
        </div>
      `;
    }
  }
}


/* =========================
   NAVEGAÇÃO
   ========================= */

let currentPage = "news";

const openClasses = new Set();
const openNewsCategories = new Set();

function setupNavigation() {

  document.querySelectorAll("[data-page]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const page =
          button.dataset.page;

        if (
          page === "admin" &&
          !isAdmin
        ) {
          openLogin();
          return;
        }

        render(page);

        const sidebar =
          document.querySelector(".sidebar");

        if (sidebar) {
          sidebar.classList.remove("open");
        }

      });

    });


  const mobileMenu =
    $("#mobileMenu");

  if (mobileMenu) {

    mobileMenu.addEventListener(
      "click",
      () => {

        const sidebar =
          document.querySelector(".sidebar");

        if (sidebar) {
          sidebar.classList.toggle("open");
        }

      }
    );

  }

}


/* =========================
   RENDER PRINCIPAL
   ========================= */

function render(page) {

  currentPage = page;

  const titles = {
    news: "News",
    table: "Tabela",
    players: "Jogadores",
    selections: "Seleções",
    teams: "Times",
    admin: "Admin Area"
  };

  const pageTitle =
    $("#page-title");

  if (pageTitle) {
    pageTitle.textContent =
      titles[page] || "UTL";
  }


  const content =
    $("#page-content");

  if (!content) {
    return;
  }


  if (page === "news") {
    content.innerHTML =
      renderNews();
  }

  else if (page === "table") {
    content.innerHTML =
      renderTable();
  }

  else if (page === "players") {
    content.innerHTML =
      renderPlayers();
  }

  else if (page === "selections") {
    content.innerHTML =
      renderClubs("selection");
  }

  else if (page === "teams") {
    content.innerHTML =
      renderClubs("team");
  }

  else if (page === "admin") {

    if (!isAdmin) {
      openLogin();
      return;
    }

    content.innerHTML =
      renderAdmin();
  }


  document
    .querySelectorAll("[data-page]")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });


  bindPageEvents();
}


/* =========================
   NEWS
   ========================= */

function renderNews() {

  const categories =
    Array.isArray(DATA.newsCategories) &&
    DATA.newsCategories.length
      ? DATA.newsCategories
      : ["Geral"];


  return `
    <div class="page-header">
      <h2>News</h2>

      <p>
        Notícias e atualizações
        da ULTIMATE TCS LEAGUE.
      </p>
    </div>

    <div class="news-categories">

      ${categories
        .map(category =>
          renderNewsCategory(category)
        )
        .join("")}

    </div>
  `;
}


function renderNewsCategory(category) {

  const news =
    DATA.news.filter(
      item =>
        String(
          item.category || "Geral"
        ) === String(category)
    );


  const isOpen =
    openNewsCategories.has(category);


  return `
    <section class="news-category">

      <button
        class="news-category-header"
        data-news-toggle="${escapeHTML(category)}"
      >

        <span>
          ${escapeHTML(category)}

          <small>
            ${news.length}
            ${
              news.length === 1
                ? "notícia"
                : "notícias"
            }
          </small>
        </span>

        <span class="news-category-arrow">
          ${isOpen ? "⌄" : "⌃"}
        </span>

      </button>


      <div
        class="news-category-content"
        ${isOpen ? "" : "hidden"}
      >

        ${
          news.length

            ? `
              <div class="news-grid">

                ${news
                  .map(newsCard)
                  .join("")}

              </div>
            `

            : `
              <div class="player-empty">
                Nenhuma notícia nesta categoria.
              </div>
            `
        }

      </div>

    </section>
  `;
}


function newsCard(news) {

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
            <div
              class="news-image-placeholder"
              style="
                height:190px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#181818;
                color:#555;
                font-size:40px;
                font-weight:900;
              "
            >
              UTL
            </div>
          `
      }


      <div class="news-card-content">

        <span class="news-card-category">
          ${escapeHTML(
            news.category || "Geral"
          )}
        </span>

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


/* =========================
   TABELA
   ========================= */

function renderTable() {

  return `
    <div class="page-header">
      <h2>Tabela</h2>

      <p>
        Tabela oficial da competição.
      </p>
    </div>

    <div class="table-container">

      ${
        DATA.links &&
        DATA.links.tabela

          ? `
            <div style="padding:20px">

              <a
                class="primary-button"
                href="${escapeHTML(DATA.links.tabela)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir tabela
              </a>

            </div>
          `

          : `
            <div
              class="player-empty"
              style="min-width:0"
            >
              O link da tabela ainda
              não foi configurado.
            </div>
          `
      }

    </div>
  `;
}


/* =========================
   JOGADORES
   ========================= */

function sortPlayers(players) {

  return [...players].sort(
    (a, b) => {

      const classA =
        CLASS_ORDER.indexOf(
          playerClass(a)
        );

      const classB =
        CLASS_ORDER.indexOf(
          playerClass(b)
        );


      if (classA !== classB) {
        return classA - classB;
      }


      return (
        (Number(a.order) || 0) -
        (Number(b.order) || 0)
      );

    }
  );

}


function renderPlayers() {

  const groups = {};

  CLASS_GROUPS.forEach(
    group => {
      groups[group] = [];
    }
  );


  sortPlayers(DATA.players)
    .forEach(player => {

      const group =
        getBaseClass(
          playerClass(player)
        );

      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push(player);

    });


  return `
    <div class="page-header">

      <h2>Jogadores</h2>

      <p>
        Jogadores separados por classe.
      </p>

    </div>


    <div class="players-container">

      ${CLASS_GROUPS
        .map(group =>
          renderPlayerCategory(
            group,
            groups[group]
          )
        )
        .join("")}

    </div>
  `;
}


function renderPlayerCategory(
  group,
  players
) {

  const isOpen =
    openClasses.has(group);


  return `
    <section class="player-class-section">

      <button
        class="player-class-header"
        data-toggle-class="${group}"
      >

        <span>
          CLASS ${group}

          <small>
            ${players.length}
            ${
              players.length === 1
                ? "jogador"
                : "jogadores"
            }
          </small>
        </span>


        <span class="class-arrow">
          ${isOpen ? "⌄" : "⌃"}
        </span>

      </button>


      <div
        class="player-class-content"
        ${isOpen ? "" : "hidden"}
      >

        <div class="players-table-head">

          <span>ID</span>

          <span>NICK</span>

          <span>CLASS</span>

          <span>TEAM</span>

          <span>ROLE</span>

          <span>OVERALL</span>

          <span>WAGE</span>

        </div>


        ${
          players.length

            ? players
                .map(renderPlayerRow)
                .join("")

            : `
              <div class="player-empty">
                Nenhum jogador nessa classe.
              </div>
            `
        }

      </div>

    </section>
  `;
}


function renderPlayerRow(player) {

  const team =
    getTeam(player);

  const playerClassValue =
    playerClass(player);

  const cssClass =
    getClassCSS(
      playerClassValue
    );


  let teamHTML = "";


  if (team) {

    teamHTML = `
      <span class="team-cell">

        ${
          team.logo

            ? `
              <img
                class="team-shield"
                src="${escapeHTML(team.logo)}"
                alt=""
              >
            `

            : ""
        }

        <span>
          ${escapeHTML(team.name)}
        </span>

      </span>
    `;

  }

  else {

    teamHTML = `
      <span class="free-agent">
        🏷️ FREE AGENT
      </span>
    `;

  }


  return `
    <div class="player-row">

      <span class="player-id">
        ${escapeHTML(
          player.id || "—"
        )}
      </span>


      <span class="player-nick">
        ${escapeHTML(
          playerNick(player)
        )}
      </span>


      <span>
        <b class="
          class-badge
          class-${cssClass}
        ">
          ${escapeHTML(
            playerClassValue
          )}
        </b>
      </span>


      <span>
        ${teamHTML}
      </span>


      <span class="player-role">
        ${escapeHTML(
          playerRole(player)
        )}
      </span>


      <span class="player-overall">
        ${escapeHTML(
          playerOverall(player)
        )}
      </span>


      <span class="player-wage">
        ${escapeHTML(
          playerWage(player)
        )}
      </span>

    </div>
  `;
}


/* =========================
   TIMES / SELEÇÕES
   ========================= */

function getClubPlayers(
  club,
  type
) {

  if (type === "team") {

    return DATA.players.filter(
      player =>
        String(
          getPlayerTeamId(player)
        ) === String(club.id)
    );

  }


  const ids =
    Array.isArray(club.players)
      ? club.players
      : [];


  return ids
    .map(id =>
      DATA.players.find(
        player =>
          String(player.id) === String(id)
      )
    )
    .filter(Boolean);
}


function renderClubs(type) {

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
      ? "Times da ULTIMATE TCS LEAGUE."
      : "Seleções cadastradas na liga.";


  return `
    <div class="page-header">

      <h2>${title}</h2>

      <p>
        ${subtitle}
        Máximo de 16 jogadores.
      </p>

    </div>


    ${
      clubs.length

        ? `
          <div class="club-grid">

            ${clubs
              .map(club =>
                renderClubCard(
                  club,
                  type
                )
              )
              .join("")}

          </div>
        `

        : `
          <div class="card">
            <p class="muted">
              Nenhum ${
                type === "team"
                  ? "time"
                  : "seleção"
              } cadastrado.
            </p>
          </div>
        `
    }
  `;
}


function renderClubCard(
  club,
  type
) {

  const players =
    getClubPlayers(
      club,
      type
    );


  return `
    <article
      class="club-card"
      style="
        --club-bg:
        ${escapeHTML(
          club.color || "#15151b"
        )};
        background:
        var(--club-bg);
      "
    >

      <div class="club-top">

        ${
          club.logo

            ? `
              <img
                src="${escapeHTML(club.logo)}"
                class="club-logo"
                alt=""
              >
            `

            : `
              <div class="club-logo placeholder">
                ${
                  type === "team"
                    ? "⚽"
                    : "🌎"
                }
              </div>
            `
        }


        <div class="club-title">

          <h3>
            ${escapeHTML(club.name)}
          </h3>


          ${
            club.link

              ? `
                <a
                  href="${escapeHTML(club.link)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir link
                </a>
              `

              : ""
          }

        </div>

      </div>


      <div class="club-roster-head">

        <span>
          JOGADORES
        </span>

        <b>
          ${players.length}/16
        </b>

      </div>


      <div class="club-roster">

        ${
          players.length

            ? players
                .map(player => `
                  <div class="club-player">

                    <span>
                      ${escapeHTML(
                        playerNick(player)
                      )}
                    </span>

                    <b class="
                      mini-class
                      class-${getClassCSS(
                        playerClass(player)
                      )}
                    ">
                      ${escapeHTML(
                        playerClass(player)
                      )}
                    </b>

                  </div>
                `)
                .join("")

            : `
              <span class="muted">
                Nenhum jogador.
              </span>
            `
        }

      </div>

    </article>
  `;
}


/* =========================
   ADMIN
   ========================= */

function renderAdmin() {

  const teamOptions =
    DATA.teams
      .map(team => `
        <option value="${escapeHTML(team.id)}">
          ${escapeHTML(team.name)}
        </option>
      `)
      .join("");


  const selectionPlayers =
    DATA.players
      .map(player => `
        <label
          class="check-player"
          style="
            display:flex;
            gap:8px;
            align-items:center;
          "
        >

          <input
            type="checkbox"
            value="${escapeHTML(player.id)}"
            data-selection-player
          >

          <span>
            ${escapeHTML(
              playerNick(player)
            )}
            —
            ${escapeHTML(
              playerClass(player)
            )}
          </span>

        </label>
      `)
      .join("");


  return `
    <div class="page-header">

      <h2>Admin Area</h2>

      <p>
        Organize o conteúdo da UTL.
      </p>

    </div>


    <!-- LINKS -->

    <section class="admin-section">

      <h3>Links</h3>

      <form
        id="links-form"
        class="admin-form"
      >

        <input
          id="discordLink"
          placeholder="Link do Discord"
          value="${escapeHTML(
            DATA.links?.discord
          )}"
        >

        <input
          id="tiktokLink"
          placeholder="Link do TikTok"
          value="${escapeHTML(
            DATA.links?.tiktok
          )}"
        >

        <input
          id="tableLink"
          placeholder="Link da Tabela"
          value="${escapeHTML(
            DATA.links?.tabela
          )}"
        >

        <button
          type="submit"
          class="primary-button"
        >
          Salvar links
        </button>

      </form>

    </section>


    <!-- CATEGORIAS NEWS -->

    <section class="admin-section">

      <h3>
        Categorias de News
      </h3>

      <form
        id="category-form"
        class="admin-form"
      >

        <input
          id="categoryName"
          placeholder="Nome da categoria"
        >

        <button
          type="submit"
          class="primary-button"
        >
          Criar categoria
        </button>

      </form>


      <div
        class="admin-list"
        style="margin-top:15px"
      >

        ${
          (DATA.newsCategories || [])
            .map(category => `
              <div class="admin-list-item">

                <span>
                  ${escapeHTML(category)}
                </span>

                ${
                  category !== "Geral"

                    ? `
                      <button
                        class="danger-button"
                        data-delete-category="${escapeHTML(category)}"
                      >
                        Excluir
                      </button>
                    `

                    : `
                      <span
                        class="muted"
                        style="font-size:12px"
                      >
                        padrão
                      </span>
                    `
                }

              </div>
            `)
            .join("")
        }

      </div>

    </section>


    <!-- PUBLICAR NEWS -->

    <section class="admin-section">

      <h3>
        Publicar notícia
      </h3>

      <form
        id="news-form"
        class="admin-form"
      >

        <input
          id="newsTitle"
          placeholder="Título"
          required
        >


        <select id="newsCategory">

          ${(DATA.newsCategories || ["Geral"])
            .map(category => `
              <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
              </option>
            `)
            .join("")}

        </select>


        <input
          id="newsImage"
          placeholder="URL da imagem"
        >


        <textarea
          id="newsDescription"
          placeholder="Descrição"
          required
        ></textarea>


        <button
          type="submit"
          class="primary-button"
        >
          Publicar notícia
        </button>

      </form>


      <div
        class="admin-list"
        style="margin-top:20px"
      >

        ${
          DATA.news.length

            ? DATA.news
                .map(news => `
                  <div
                    class="admin-list-item"
                  >

                    <div>

                      <strong>
                        ${escapeHTML(
                          news.title
                        )}
                      </strong>

                      <div
                        class="muted"
                        style="
                          margin-top:4px;
                          font-size:12px;
                        "
                      >
                        ${escapeHTML(
                          news.category ||
                          "Geral"
                        )}
                      </div>

                    </div>


                    <button
                      class="danger-button"
                      data-delete-news="${escapeHTML(news.id)}"
                    >
                      Excluir
                    </button>

                  </div>
                `)
                .join("")

            : `
              <p class="muted">
                Nenhuma notícia publicada.
              </p>
            `
        }

      </div>

    </section>


    <!-- CRIAR TIME -->

    <section class="admin-section">

      <h3>
        Criar time
      </h3>

      <form
        id="team-form"
        class="admin-form"
      >

        <input
          id="teamName"
          placeholder="Nome do time"
          required
        >


        <label>
          Cor do fundo
        </label>

        <input
          id="teamColor"
          class="color-input"
          type="color"
          value="#15151b"
        >


        <input
          id="teamLogo"
          placeholder="URL do escudo"
        >


        <input
          id="teamLink"
          placeholder="Link do time"
        >


        <button
          type="submit"
          class="primary-button"
        >
          Criar time
        </button>

      </form>

    </section>


    <!-- CRIAR SELEÇÃO -->

    <section class="admin-section">

      <h3>
        Criar seleção
      </h3>

      <form
        id="selection-form"
        class="admin-form"
      >

        <input
          id="selectionName"
          placeholder="Nome da seleção"
          required
        >


        <label>
          Cor do fundo
        </label>

        <input
          id="selectionColor"
          class="color-input"
          type="color"
          value="#15151b"
        >


        <input
          id="selectionLogo"
          placeholder="URL do escudo"
        >


        <input
          id="selectionLink"
          placeholder="Link da seleção"
        >


        <div
          class="selection-picker"
          style="
            margin-top:5px;
          "
        >

          <strong>
            Jogadores — máximo 16
          </strong>


          <div
            class="check-grid"
            style="
              display:grid;
              gap:8px;
              margin-top:10px;
            "
          >

            ${
              selectionPlayers ||

              `
                <span class="muted">
                  Cadastre jogadores primeiro.
                </span>
              `
            }

          </div>

        </div>


        <button
          type="submit"
          class="primary-button"
        >
          Criar seleção
        </button>

      </form>

    </section>


    <!-- ADICIONAR JOGADOR -->

    <section class="admin-section">

      <h3>
        Adicionar jogador
      </h3>

      <form
        id="player-form"
        class="admin-form"
      >

        <input
          id="playerId"
          placeholder="ID do jogador"
          required
        >


        <input
          id="playerNick"
          placeholder="Nick"
          required
        >


        <select id="playerClass">

          ${CLASS_ORDER
            .map(className => `
              <option value="${className}">
                ${className}
              </option>
            `)
            .join("")}

        </select>


        <input
          id="playerOverall"
          type="number"
          min="0"
          max="100"
          placeholder="Overall (0–100)"
        >


        <select id="playerTeam">

          <option value="FREE AGENT">
            🏷️ FREE AGENT
          </option>

          ${teamOptions}

        </select>


        <select id="playerRole">

          <option value="PLAYER">
            PLAYER
          </option>

          <option value="ASSIST MANAGER">
            ASSIST MANAGER
          </option>

          <option value="MANAGER">
            MANAGER
          </option>

        </select>


        <button
          type="submit"
          class="primary-button"
        >
          Adicionar jogador
        </button>

      </form>


      <p
        class="muted"
        style="
          margin-top:12px;
          font-size:12px;
        "
      >
        A ordem é automática:
        + primeiro, normal depois
        e - por último.
      </p>

    </section>


    <!-- CONTEÚDO -->

    <section class="admin-section">

      <h3>
        Conteúdo cadastrado
      </h3>


      <div class="admin-list">

        ${
          DATA.teams
            .map(team => `
              <div class="admin-list-item">

                <div>

                  <strong>
                    TIME:
                  </strong>

                  ${escapeHTML(team.name)}

                  <span
                    class="muted"
                    style="
                      margin-left:8px;
                      font-size:12px;
                    "
                  >
                    ${
                      getClubPlayers(
                        team,
                        "team"
                      ).length
                    }/16
                  </span>

                </div>


                <button
                  class="danger-button"
                  data-delete-team="${escapeHTML(team.id)}"
                >
                  Excluir
                </button>

              </div>
            `)
            .join("")
        }


        ${
          DATA.selections
            .map(selection => `
              <div class="admin-list-item">

                <div>

                  <strong>
                    SELEÇÃO:
                  </strong>

                  ${escapeHTML(
                    selection.name
                  )}

                  <span
                    class="muted"
                    style="
                      margin-left:8px;
                      font-size:12px;
                    "
                  >
                    ${
                      getClubPlayers(
                        selection,
                        "selection"
                      ).length
                    }/16
                  </span>

                </div>


                <button
                  class="danger-button"
                  data-delete-selection="${escapeHTML(selection.id)}"
                >
                  Excluir
                </button>

              </div>
            `)
            .join("")
        }


        ${
          DATA.players
            .map(player => `
              <div class="admin-list-item">

                <div>

                  <strong>
                    ${escapeHTML(
                      playerNick(player)
                    )}
                  </strong>

                  <div
                    class="muted"
                    style="
                      margin-top:4px;
                      font-size:12px;
                    "
                  >
                    ID:
                    ${escapeHTML(player.id)}
                    ·
                    ${escapeHTML(
                      playerClass(player)
                    )}
                    ·
                    OVR:
                    ${escapeHTML(
                      playerOverall(player)
                    )}
                    ·
                    ${escapeHTML(
                      playerRole(player)
                    )}
                  </div>

                </div>


                <button
                  class="danger-button"
                  data-delete-player="${escapeHTML(player.id)}"
                >
                  Excluir
                </button>

              </div>
            `)
            .join("")
        }

      </div>

    </section>


    <!-- SAIR -->

    <section class="admin-section">

      <button
        id="logout-button"
        class="danger-button"
      >
        Sair da conta
      </button>

    </section>

  `;
}


/* =========================
   LOGIN
   ========================= */

function openLogin() {

  let modal =
    $("#admin-login-modal");


  if (modal) {
    modal.remove();
  }


  modal =
    document.createElement("div");

  modal.id =
    "admin-login-modal";

  modal.className =
    "modal";


  modal.innerHTML = `

    <div class="modal-box">

      <button
        class="modal-close"
        id="close-admin-login"
      >
        ×
      </button>


      <h2>
        Área Administrativa
      </h2>


      <p>
        Digite a senha de administrador.
      </p>


      <input
        id="admin-login-password"
        type="password"
        placeholder="Senha"
      >


      <button
        id="admin-login-button"
        class="primary-button"
      >
        Entrar
      </button>


      <div
        id="admin-login-error"
        class="login-error"
      ></div>

    </div>

  `;


  document.body.appendChild(modal);


  const close =
    $("#close-admin-login");

  const password =
    $("#admin-login-password");

  const loginButton =
    $("#admin-login-button");

  const error =
    $("#admin-login-error");


  close.onclick = () => {
    modal.remove();
  };


  setTimeout(() => {
    password.focus();
  }, 50);


  password.onkeydown =
    event => {

      if (event.key === "Enter") {
        loginButton.click();
      }

    };


  loginButton.onclick =
    async () => {

      try {

        await api(
          "/api/admin/login",
          {
            method: "POST",

            body: JSON.stringify({
              password:
                password.value
            })
          }
        );


        modal.remove();

        isAdmin = true;

        render("admin");

        toast(
          "Login realizado com sucesso."
        );


      } catch (err) {

        error.textContent =
          err.message;

      }

    };

}


/* =========================
   EVENTOS DAS PÁGINAS
   ========================= */

function bindPageEvents() {


  /* ABRIR CLASSE */

  document
    .querySelectorAll(
      "[data-toggle-class]"
    )
    .forEach(button => {

      button.onclick = () => {

        const group =
          button.dataset.toggleClass;


        if (
          openClasses.has(group)
        ) {
          openClasses.delete(group);
        }

        else {
          openClasses.add(group);
        }


        render("players");

      };

    });


  /* ABRIR CATEGORIA NEWS */

  document
    .querySelectorAll(
      "[data-news-toggle]"
    )
    .forEach(button => {

      button.onclick = () => {

        const category =
          button.dataset.newsToggle;


        if (
          openNewsCategories.has(
            category
          )
        ) {
          openNewsCategories.delete(
            category
          );
        }

        else {
          openNewsCategories.add(
            category
          );
        }


        render("news");

      };

    });


  /* SALVAR LINKS */

  const linksForm =
    $("#links-form");

  if (linksForm) {

    linksForm.onsubmit =
      async event => {

        event.preventDefault();

        try {

          await api(
            "/api/admin/links",
            {
              method: "PUT",

              body: JSON.stringify({
                discord:
                  $("#discordLink").value
                    .trim(),

                tiktok:
                  $("#tiktokLink").value
                    .trim(),

                tabela:
                  $("#tableLink").value
                    .trim()
              })
            }
          );


          await loadData();

          toast(
            "Links salvos."
          );

        } catch (error) {

          toast(error.message);

        }

      };

  }


  /* CATEGORIA */

  const categoryForm =
    $("#category-form");

  if (categoryForm) {

    categoryForm.onsubmit =
      async event => {

        event.preventDefault();

        const name =
          $("#categoryName")
            .value
            .trim();


        if (!name) {
          toast(
            "Digite o nome da categoria."
          );
          return;
        }


        try {

          await api(
            "/api/admin/categories",
            {
              method: "POST",

              body: JSON.stringify({
                name
              })
            }
          );


          await loadData();

          render("admin");

          toast(
            "Categoria criada."
          );

        } catch (error) {

          toast(error.message);

        }

      };

  }


  /* EXCLUIR CATEGORIA */

  document
    .querySelectorAll(
      "[data-delete-category]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          const category =
            button.dataset.deleteCategory;


          if (
            !confirm(
              `Excluir a categoria "${category}"?`
            )
          ) {
            return;
          }


          try {

            await api(
              "/api/admin/categories/" +
              encodeURIComponent(category),
              {
                method: "DELETE"
              }
            );


            await loadData();

            render("admin");

            toast(
              "Categoria excluída."
            );

          } catch (error) {

            toast(error.message);

          }

        };

    });


  /* NEWS */

  const newsForm =
    $("#news-form");

  if (newsForm) {

    newsForm.onsubmit =
      async event => {

        event.preventDefault();


        try {

          await api(
            "/api/admin/news",
            {
              method: "POST",

              body: JSON.stringify({

                title:
                  $("#newsTitle")
                    .value
                    .trim(),

                description:
                  $("#newsDescription")
                    .value
                    .trim(),

                image:
                  $("#newsImage")
                    .value
                    .trim(),

                category:
                  $("#newsCategory")
                    .value

              })
            }
          );


          await loadData();

          render("admin");

          toast(
            "Notícia publicada."
          );

        } catch (error) {

          toast(error.message);

        }

      };

  }


  /* EXCLUIR NEWS */

  document
    .querySelectorAll(
      "[data-delete-news]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          if (
            !confirm(
              "Excluir esta notícia?"
            )
          ) {
            return;
          }


          try {

            await api(
              "/api/admin/news/" +
              encodeURIComponent(
                button.dataset.deleteNews
              ),
              {
                method: "DELETE"
              }
            );


            await loadData();

            render("admin");

            toast(
              "Notícia excluída."
            );

          } catch (error) {

            toast(error.message);

          }

        };

    });


  /* JOGADOR */

  const playerForm =
    $("#player-form");

  if (playerForm) {

    playerForm.onsubmit =
      async event => {

        event.preventDefault();


        const id =
          $("#playerId")
            .value
            .trim();

        const nick =
          $("#playerNick")
            .value
            .trim();

        const playerClassValue =
          $("#playerClass")
            .value;

        const overallValue =
          $("#playerOverall")
            .value
            .trim();

        const teamId =
          $("#playerTeam")
            .value;

        const role =
          $("#playerRole")
            .value;


        if (!id || !nick) {

          toast(
            "ID e Nick são obrigatórios."
          );

          return;

        }


        if (
          overallValue !== "" &&
          (
            Number(overallValue) < 0 ||
            Number(overallValue) > 100
          )
        ) {

          toast(
            "Overall deve ficar entre 0 e 100."
          );

          return;

        }


        try {

          await api(
            "/api/admin/players",
            {
              method: "POST",

              body: JSON.stringify({

                id,

                nick,

                class:
                  playerClassValue,

                overall:
                  overallValue === ""
                    ? null
                    : Number(
                        overallValue
                      ),

                teamId,

                role,

                freeAgent:
                  teamId ===
                  "FREE AGENT"

              })
            }
          );


          await loadData();

          render("admin");

          toast(
            "Jogador adicionado."
          );

        } catch (error) {

          toast(error.message);

        }

      };

  }


  /* EXCLUIR JOGADOR */

  document
    .querySelectorAll(
      "[data-delete-player]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          if (
            !confirm(
              "Excluir este jogador?"
            )
          ) {
            return;
          }


          try {

            await api(
              "/api/admin/players/" +
              encodeURIComponent(
                button.dataset.deletePlayer
              ),
              {
                method: "DELETE"
              }
            );


            await loadData();

            render("admin");

            toast(
              "Jogador excluído."
            );

          } catch (error) {

            toast(error.message);

          }

        };

    });


  /* TIME */

  const teamForm =
    $("#team-form");

  if (teamForm) {

    teamForm.onsubmit =
      async event => {

        event.preventDefault();


        const name =
          $("#teamName")
            .value
            .trim();


        if (!name) {

          toast(
            "Digite o nome do time."
          );

          return;

        }


        try {

          await api(
            "/api/admin/teams",
            {
              method: "POST",

              body: JSON.stringify({

                name,

                logo:
                  $("#teamLogo")
                    .value
                    .trim(),

                color:
                  $("#teamColor")
                    .value,

                link:
                  $("#teamLink")
                    .value
                    .trim(),

                players: []

              })
            }
          );


          await loadData();

          render("admin");

          toast(
            "Time criado."
          );

        } catch (error) {

          toast(error.message);

        }

      };

  }


  /* EXCLUIR TIME */

  document
    .querySelectorAll(
      "[data-delete-team]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          if (
            !confirm(
              "Excluir este time?"
            )
          ) {
            return;
          }


          try {

            await api(
              "/api/admin/teams/" +
              encodeURIComponent(
                button.dataset.deleteTeam
              ),
              {
                method: "DELETE"
              }
            );


            await loadData();

            render("admin");

            toast(
              "Time excluído."
            );

          } catch (error) {

            toast(error.message);

          }

        };

    });


  /* SELEÇÃO */

  const selectionForm =
    $("#selection-form");

  if (selectionForm) {

    selectionForm.onsubmit =
      async event => {

        event.preventDefault();


        const players =
          [
            ...document.querySelectorAll(
              "[data-selection-player]:checked"
            )
          ]
          .map(input => input.value);


        if (players.length > 16) {

          toast(
            "Uma seleção pode ter no máximo 16 jogadores."
          );

          return;

        }


        const name =
          $("#selectionName")
            .value
            .trim();


        if (!name) {

          toast(
            "Digite o nome da seleção."
          );

          return;

        }


        try {

          await api(
            "/api/admin/selections",
            {
              method: "POST",

              body: JSON.stringify({

                name,

                logo:
                  $("#selectionLogo")
                    .value
                    .trim(),

                color:
                  $("#selectionColor")
                    .value,

                link:
                  $("#selectionLink")
                    .value
                    .trim(),

                players

              })
            }
          );


          await loadData();

          render("admin");

          toast(
            "Seleção criada."
          );

        } catch (error) {

          toast(error.message);

        }

      };

  }


  /* EXCLUIR SELEÇÃO */

  document
    .querySelectorAll(
      "[data-delete-selection]"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          if (
            !confirm(
              "Excluir esta seleção?"
            )
          ) {
            return;
          }


          try {

            await api(
              "/api/admin/selections/" +
              encodeURIComponent(
                button.dataset.deleteSelection
              ),
              {
                method: "DELETE"
              }
            );


            await loadData();

            render("admin");

            toast(
              "Seleção excluída."
            );

          } catch (error) {

            toast(error.message);

          }

        };

    });


  /* LOGOUT */

  const logoutButton =
    $("#logout-button");

  if (logoutButton) {

    logoutButton.onclick =
      async () => {

        try {

          await api(
            "/api/admin/logout",
            {
              method: "POST"
            }
          );


          isAdmin = false;

          render("news");

          toast(
            "Sessão encerrada."
          );

        } catch (error) {

          toast(error.message);

        }

      };

  }

}


/* =========================
   INICIAR SITE
   ========================= */

setupNavigation();

loadData();
