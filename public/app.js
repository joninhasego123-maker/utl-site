let data = {
  links: {},
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


/* =========================
   ELEMENTOS
========================= */

const content = document.getElementById("page-content");
const pageTitle = document.getElementById("page-title");
const sidebar = document.querySelector(".sidebar");


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
  if (wages[player.class]) {
    return wages[player.class];
  }

  return "—";
}


/* =========================
   CARREGAR DADOS
========================= */

async function loadData() {
  try {
    const response = await fetch("/api/data");

    if (!response.ok) {
      throw new Error("Erro ao carregar dados");
    }

    data = await response.json();

    await checkAdmin();

    showPage("home");

  } catch (error) {
    console.error(error);

    content.innerHTML = `
      <div class="card">
        <h2>Erro</h2>
        <p>Não foi possível carregar o site.</p>
      </div>
    `;
  }
}


/* =========================
   ADMIN
========================= */

async function checkAdmin() {
  try {
    const response = await fetch("/api/admin/status");

    const result = await response.json();

    isAdmin = result.isAdmin === true;

  } catch {
    isAdmin = false;
  }
}

async function loginAdmin() {
  const password =
    document.getElementById("admin-password").value;

  const error =
    document.getElementById("login-error");

  error.textContent = "";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      error.textContent =
        result.error || "Senha incorreta.";

      return;
    }

    isAdmin = true;

    document
      .getElementById("login-modal")
      .classList.add("hidden");

    document.getElementById("admin-password").value = "";

    showPage("admin");

  } catch {
    error.textContent =
      "Erro ao tentar entrar.";
  }
}

async function logoutAdmin() {
  await fetch("/api/admin/logout", {
    method: "POST"
  });

  isAdmin = false;

  showPage("home");
}


/* =========================
   NAVEGAÇÃO
========================= */

function showPage(page) {

  document
    .querySelectorAll(".sidebar nav button")
    .forEach(button => {
      button.classList.remove("active");

      if (button.dataset.page === page) {
        button.classList.add("active");
      }
    });

  const titles = {
    home: "ULTIMATE TCS LEAGUE",
    others: "Others",
    news: "News",
    table: "Tabela",
    players: "Jogadores",
    selections: "Seleções",
    teams: "Times",
    admin: "Admin Area"
  };

  pageTitle.textContent =
    titles[page] || "ULTIMATE TCS LEAGUE";

  sidebar.classList.remove("open");

  switch (page) {

    case "home":
      renderHome();
      break;

    case "others":
      renderOthers();
      break;

    case "news":
      renderNews();
      break;

    case "table":
      renderTable();
      break;

    case "players":
      renderPlayers();
      break;

    case "selections":
      renderSelections();
      break;

    case "teams":
      renderTeams();
      break;

    case "admin":
      if (isAdmin) {
        renderAdmin();
      } else {
        openLogin();
      }
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
    <div class="home-page">

      <div class="hero">

        <div class="hero-content">

          <span class="hero-tag">
            UTL
          </span>

          <h1>
            ULTIMATE TCS LEAGUE
          </h1>

          <p>
            Bem-vindo ao site oficial da UTL.
          </p>

        </div>

      </div>

      ${
        data.news.length
          ? `
            <div style="margin-top:25px">

              <h2 style="margin-bottom:15px">
                Últimas notícias
              </h2>

              <div class="news-grid">
                ${data.news
                  .slice(0, 3)
                  .map(newsCard)
                  .join("")}
              </div>

            </div>
          `
          : ""
      }

    </div>
  `;
}


/* =========================
   OTHERS
========================= */

function renderOthers() {

  const discord =
    data.links?.discord || "";

  const tiktok =
    data.links?.tiktok || "";

  content.innerHTML = `

    <div class="card">

      <h2>Others</h2>

      <p>
        Links oficiais da ULTIMATE TCS LEAGUE.
      </p>

    </div>

    <div class="admin-grid">

      <div class="card">

        <h3>Discord</h3>

        <p style="margin-bottom:15px">
          Entre no servidor oficial.
        </p>

        ${
          discord
            ? `
              <a
                href="${escapeHTML(discord)}"
                target="_blank"
                class="primary-button"
                style="display:inline-block;text-decoration:none"
              >
                Entrar no Discord
              </a>
            `
            : "<p>Link não configurado.</p>"
        }

      </div>

      <div class="card">

        <h3>TikTok</h3>

        <p style="margin-bottom:15px">
          Acompanhe a UTL.
        </p>

        ${
          tiktok
            ? `
              <a
                href="${escapeHTML(tiktok)}"
                target="_blank"
                class="primary-button"
                style="display:inline-block;text-decoration:none"
              >
                Abrir TikTok
              </a>
            `
            : "<p>Link não configurado.</p>"
        }

      </div>

    </div>
  `;
}


/* =========================
   NEWS
========================= */

function newsCard(news) {

  return `
    <article class="news-card">

      ${
        news.image
          ? `
            <img
              src="${escapeHTML(news.image)}"
              alt="${escapeHTML(news.title)}"
            >
          `
          : ""
      }

      <div class="news-body">

        <span class="news-category">
          ${escapeHTML(news.category || "Geral")}
        </span>

        <h3>
          ${escapeHTML(news.title)}
        </h3>

        <p>
          ${escapeHTML(news.description)}
        </p>

        ${
          isAdmin
            ? `
              <button
                class="danger-button"
                style="margin-top:15px"
                onclick="deleteNews('${escapeHTML(news.id)}')"
              >
                Excluir
              </button>
            `
            : ""
        }

      </div>

    </article>
  `;
}

function renderNews() {

  content.innerHTML = `

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">

      <div>
        <h1>News</h1>
        <p style="color:#777;margin-top:5px">
          Notícias da ULTIMATE TCS LEAGUE
        </p>
      </div>

      ${
        isAdmin
          ? `
            <button
              class="primary-button"
              onclick="renderAdmin()"
            >
              + Nova notícia
            </button>
          `
          : ""
      }

    </div>

    ${
      data.news.length
        ? `
          <div class="news-grid">
            ${data.news.map(newsCard).join("")}
          </div>
        `
        : `
          <div class="empty">
            Nenhuma notícia publicada.
          </div>
        `
    }

  `;
}

async function deleteNews(id) {

  if (!confirm("Excluir esta notícia?")) {
    return;
  }

  await fetch(`/api/admin/news/${id}`, {
    method: "DELETE"
  });

  await refreshData();

  renderNews();
}


/* =========================
   TABELA
========================= */

function renderTable() {

  content.innerHTML = `

    <div class="card">

      <h1>Tabela</h1>

      ${
        data.tableUrl
          ? `
            <p style="margin:15px 0">
              Acesse a tabela da UTL pelo botão abaixo.
            </p>

            <a
              href="${escapeHTML(data.tableUrl)}"
              target="_blank"
              class="primary-button"
              style="display:inline-block;text-decoration:none"
            >
              Abrir Tabela
            </a>
          `
          : `
            <div class="empty">
              A tabela ainda não foi configurada.
            </div>
          `
      }

    </div>
  `;
}


/* =========================
   JOGADORES
========================= */

function renderPlayers() {

  const groups = {
    X: [],
    S: [],
    A: [],
    B: [],
    C: [],
    D: []
  };

  data.players.forEach(player => {

    const group =
      getBaseClass(player.class);

    if (groups[group]) {
      groups[group].push(player);
    }

  });

  classOrder.forEach(() => {});

  Object.keys(groups).forEach(group => {

    groups[group].sort((a, b) => {

      const aIndex =
        classOrder.indexOf(
          String(a.class).toUpperCase()
        );

      const bIndex =
        classOrder.indexOf(
          String(b.class).toUpperCase()
        );

      return aIndex - bIndex;

    });

  });

  content.innerHTML = `

    <div class="players-page">

      <div class="players-title">

        <div>
          <h1>Jogadores</h1>

          ${
            isAdmin
              ? `
                <span class="admin-hint">
                  Arraste os jogadores para reorganizar
                </span>
              `
              : ""
          }

        </div>

      </div>

      <div class="players-table-head">

        <span>CLASS</span>
        <span>NICK</span>
        <span>TIME</span>
        <span>WAGE</span>

      </div>

      <div class="player-class-list">

        ${classGroups
          .map(group => {

            const id =
              `players-${group}`;

            return `

              <section class="player-class">

                <button
                  class="player-class-toggle"
                  type="button"
                  data-target="${id}"
                  aria-expanded="false"
                >

                  <span>
                    CLASS ${group}
                  </span>

                  <span class="class-arrow">
                    ⌃
                  </span>

                </button>

                <div
                  class="player-class-content"
                  id="${id}"
                  hidden
                >

                  ${groups[group]
                    .map(player =>
                      playerRow(player)
                    )
                    .join("")}

                  ${
                    groups[group].length === 0
                      ? `
                        <div class="empty">
                          Nenhum jogador nesta classe.
                        </div>
                      `
                      : ""
                  }

                </div>

              </section>

            `;

          })
          .join("")}

      </div>

    </div>
  `;

  setupClassButtons();

  if (isAdmin) {
    setupDragAndDrop();
  }
}


/* =========================
   LINHA DO JOGADOR
========================= */

function playerRow(player) {

  const playerClass =
    String(player.class || "D").toUpperCase();

  const base =
    getBaseClass(playerClass);

  const team =
    getTeam(player);

  let teamHTML = "";

  if (!team) {

    teamHTML = `
      <span>
        🏷️ FREE AGENT
      </span>
    `;

  } else {

    teamHTML = `

      ${
        team.logo
          ? `
            <img
              src="${escapeHTML(team.logo)}"
              alt=""
            >
          `
          : ""
      }

      <span>
        ${escapeHTML(team.name)}
      </span>

    `;

  }

  return `

    <div
      class="player-row"
      draggable="${isAdmin}"
      data-player-id="${escapeHTML(player.id)}"
    >

      <span
        class="class-badge class-${base.toLowerCase()}"
      >
        ${escapeHTML(playerClass)}
      </span>

      <span class="player-nick">
        ${escapeHTML(
          player.nick ||
          player.name ||
          "Sem nome"
        )}
      </span>

      <span class="player-team">
        ${teamHTML}
      </span>

      <span class="player-wage">
        ${escapeHTML(
          player.wage ||
          getPlayerWage(player)
        )}
      </span>

    </div>

  `;
}


/* =========================
   ABRIR / FECHAR CLASSE
========================= */

function setupClassButtons() {

  document
    .querySelectorAll(".player-class-toggle")
    .forEach(button => {

      button.addEventListener("click", () => {

        const target =
          document.getElementById(
            button.dataset.target
          );

        const isOpen =
          !target.hidden;

        target.hidden = isOpen;

        button.setAttribute(
          "aria-expanded",
          String(!isOpen)
        );

        button
          .querySelector(".class-arrow")
          .textContent =
            isOpen ? "⌃" : "⌄";

      });

    });

}


/* =========================
   DRAG AND DROP
========================= */

function setupDragAndDrop() {

  document
    .querySelectorAll(".player-class-content")
    .forEach(zone => {

      let dragged = null;

      zone
        .querySelectorAll(".player-row")
        .forEach(row => {

          row.addEventListener(
            "dragstart",
            () => {

              dragged = row;

              row.classList.add(
                "dragging"
              );

            }
          );

          row.addEventListener(
            "dragend",
            async () => {

              row.classList.remove(
                "dragging"
              );

              await savePlayerOrder();

            }
          );

          row.addEventListener(
            "dragover",
            event => {

              event.preventDefault();

              if (
                !dragged ||
                dragged === row
              ) {
                return;
              }

              const rect =
                row.getBoundingClientRect();

              const before =
                event.clientY <
                rect.top +
                rect.height / 2;

              if (before) {

                zone.insertBefore(
                  dragged,
                  row
                );

              } else {

                zone.insertBefore(
                  dragged,
                  row.nextSibling
                );

              }

            }
          );

        });

    });

}


/* =========================
   SALVAR ORDEM
========================= */

async function savePlayerOrder() {

  const rows =
    document.querySelectorAll(
      ".player-class-content .player-row"
    );

  const order =
    Array.from(rows)
      .map(row =>
        row.dataset.playerId
      );

  try {

    await fetch(
      "/api/admin/players/reorder",
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          order
        })
      }
    );

    await refreshData();

  } catch (error) {

    console.error(
      "Erro ao salvar ordem:",
      error
    );

  }

}


/* =========================
   SELEÇÕES
========================= */

function renderSelections() {

  content.innerHTML = `

    <div style="margin-bottom:20px">

      <h1>Seleções</h1>

      <p style="color:#777;margin-top:5px">
        Seleções cadastradas na UTL.
      </p>

    </div>

    ${
      data.selections.length
        ? `
          <div class="selection-grid">

            ${data.selections
              .map(selection => `

                <div class="selection-card">

                  ${
                    selection.logo
                      ? `
                        <img
                          src="${escapeHTML(selection.logo)}"
                          alt=""
                        >
                      `
                      : ""
                  }

                  <h3>
                    ${escapeHTML(
                      selection.name
                    )}
                  </h3>

                  <p>
                    ${
                      Array.isArray(
                        selection.players
                      )
                        ? selection.players.length
                        : 0
                    }
                    jogadores
                  </p>

                </div>

              `)
              .join("")}

          </div>
        `
        : `
          <div class="empty">
            Nenhuma seleção cadastrada.
          </div>
        `
    }

  `;
}


/* =========================
   TIMES
========================= */

function renderTeams() {

  content.innerHTML = `

    <div style="margin-bottom:20px">

      <h1>Times</h1>

      <p style="color:#777;margin-top:5px">
        Times cadastrados na UTL.
      </p>

    </div>

    ${
      data.teams.length
        ? `
          <div class="team-grid">

            ${data.teams
              .map(team => `

                <div class="team-card">

                  ${
                    team.logo
                      ? `
                        <img
                          src="${escapeHTML(team.logo)}"
                          alt=""
                        >
                      `
                      : ""
                  }

                  <h3>
                    ${escapeHTML(
                      team.name
                    )}
                  </h3>

                  <p>
                    ${
                      Array.isArray(team.players)
                        ? team.players.length
                        : 0
                    }
                    jogadores
                  </p>

                </div>

              `)
              .join("")}

          </div>
        `
        : `
          <div class="empty">
            Nenhum time cadastrado.
          </div>
        `
    }

  `;
}


/* =========================
   ADMIN
========================= */

function renderAdmin() {

  if (!isAdmin) {
    openLogin();
    return;
  }

  content.innerHTML = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
      "
    >

      <div>

        <h1>Admin Area</h1>

        <p style="color:#777;margin-top:5px">
          Gerencie o conteúdo da UTL.
        </p>

      </div>

      <button
        class="danger-button"
        onclick="logoutAdmin()"
      >
        Sair
      </button>

    </div>


    <div class="admin-grid">


    
