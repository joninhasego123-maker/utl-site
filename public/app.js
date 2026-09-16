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
              </div>
            `
        }

      </div>

    </section>
  `;
}

function renderPlayersTable(players) {
  return `
    <div class="players-table-scroll">

      <div class="players-table">

        <div class="players-table-head">

          <span>USER ID</span>
          <span>USERNAME</span>
          <span>TIER</span>
          <span>OVERALL</span>
          <span>TEAM</span>

        </div>

        ${players
          .map(renderPlayerRow)
          .join("")}

      </div>

    </div>
  `;
}

function renderPlayerRow(player) {
  const cls =
    formatClass(player.class);

  const team =
    playerTeam(player);

  let teamHTML;

  if (team) {
    teamHTML = `
      <div class="team-cell">

        ${
          team.logo
            ? `
              <img
                class="team-shield"
                src="${escapeHTML(
                  team.logo
                )}"
                alt=""
              >
            `
            : ""
        }

        <span>
          ${escapeHTML(team.name)}
        </span>

      </div>
    `;
  } else {
    teamHTML = `
      <div class="team-cell free-agent">

        <span>
          🏷️ FREE AGENT
        </span>

      </div>
    `;
  }

  return `
    <div class="player-row">

      <span class="player-id">
        ${escapeHTML(player.id)}
      </span>

      <span class="player-nick">
        ${escapeHTML(player.nick)}
      </span>

      <span class="player-tier">
        ${escapeHTML(cls)}
      </span>

      <span>
        ${escapeHTML(
          player.overall
        )}
      </span>

      ${teamHTML}

    </div>
  `;
}

/* =========================================================
   TEAMS / SELECTIONS
========================================================= */

function renderClubsPage(type) {
  const isTeam =
    type === "team";

  const clubs =
    isTeam
      ? state.data?.teams || []
      : state.data?.selections || [];

  if (state.detail) {
    return renderClubDetail(
      type,
      state.detail
    );
  }

  return `
    <div class="page-head">

      <div>

        <h1>
          ${isTeam ? "Times" : "Seleções"}
        </h1>

        <p>
          ${
            isTeam
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
          <div class="empty-state">

            <strong>
              Nenhum ${
                isTeam
                  ? "time"
                  : "seleção"
              } cadastrado
            </strong>

            <span>
              A administração ainda não adicionou nenhum item.
            </span>

          </div>
        `
    }
  `;
}

function renderClubCard(
  club,
  type
) {
  const logo =
    club.logo
      ? `
        <img
          class="club-logo"
          src="${escapeHTML(
            club.logo
          )}"
          alt=""
        >
      `
      : `
        <span class="club-logo-fallback">
          ${escapeHTML(
            club.name?.charAt(0) || "?"
          )}
        </span>
      `;

  let players = [];

  if (type === "team") {
    players =
      (
        state.data?.players || []
      ).filter(
        player =>
          String(
            player.teamId
          ) ===
          String(club.id)
      );
  } else {
    players =
      (club.players || [])
        .map(id =>
          getPlayer(id)
        )
        .filter(Boolean);
  }

  return `
    <article
      class="club-card"
      data-club-id="${escapeHTML(
        club.id
      )}"
      style="--club-bg:${escapeHTML(
        club.color || "#151515"
      )}"
    >

      <div class="club-logo-wrap">
        ${logo}
      </div>

      <div class="club-info">

        <strong>
          ${escapeHTML(club.name)}
        </strong>

        <span>
          ${players.length}/16
        </span>

      </div>

      <span class="club-arrow">
        ›
      </span>

    </article>
  `;
}

/* =========================================================
   PLAYER TABLE FOR TEAM / SELECTION
========================================================= */

function sortClubPlayers(players) {
  return sortedPlayers(players);
}

function renderClubPlayerTable(
  players,
  clubColor = "#151515"
) {
  const sorted =
    sortClubPlayers(players);

  return `
    <div
      class="club-player-list"
      style="--club-bg:${escapeHTML(
        clubColor
      )}"
    >

      <div class="players-table-scroll">

        <div class="players-table club-players-table">

          <div class="players-table-head">

            <span>ID</span>
            <span>NICK</span>
            <span>CLASS</span>
            <span>OVERALL</span>
            <span>WAGE</span>

          </div>

          ${sorted
            .map(player => {

              const cls =
                formatClass(
                  player.class
                );

              return `
                <div class="player-row">

                  <span class="player-id">
                    ${escapeHTML(
                      player.id
                    )}
                  </span>

                  <span class="player-nick">
                    ${escapeHTML(
                      player.nick
                    )}
                  </span>

                  <span class="player-tier">
                    ${escapeHTML(cls)}
                  </span>

                  <span>
                    ${escapeHTML(
                      player.overall
                    )}
                  </span>

                  <span>
                    ${formatMoney(
                      player.wage
                    )}
                  </span>

                </div>
              `;
            })
            .join("")}

        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   TEAM / SELECTION DETAIL
========================================================= */

function renderClubDetail(
  type,
  club
) {
  const isTeam =
    type === "team";

  let players = [];

  if (isTeam) {
    players =
      (
        state.data?.players || []
      ).filter(
        player =>
          String(
            player.teamId
          ) ===
          String(club.id)
      );
  } else {
    players =
      (club.players || [])
        .map(id =>
          getPlayer(id)
        )
        .filter(Boolean);
  }

  const logo =
    club.logo
      ? `
        <img
          class="club-detail-logo"
          src="${escapeHTML(
            club.logo
          )}"
          alt=""
        >
      `
      : `
        <div class="club-detail-logo fallback">
          ${escapeHTML(
            club.name?.charAt(0) || "?"
          )}
        </div>
      `;

  return `
    <div class="club-detail">

      <button
        class="back-btn"
        id="clubBack"
        type="button"
      >
        ← Voltar
      </button>

      <div
        class="club-detail-header"
        style="--club-bg:${escapeHTML(
          club.color || "#151515"
        )}"
      >

        <div class="club-detail-main">

          ${logo}

          <div class="club-detail-info">

            <h1>
              ${escapeHTML(club.name)}
            </h1>

          </div>

          <div class="club-detail-count">
            ${players.length}/16
          </div>

        </div>

      </div>

      <div class="club-detail-players">

        ${
          players.length
            ? renderClubPlayerTable(
                players,
                club.color || "#151515"
              )
            : `
              <div class="empty-state">

                <strong>
                  Elenco vazio
                </strong>

                <span>
                  Nenhum jogador foi atribuído a este
                  ${isTeam ? "time" : "seleção"}.
                </span>

              </div>
            `
        }

      </div>

    </div>
  `;
}

function bindClubCards() {
  if (state.detail) {

    $("#clubBack")?.addEventListener(
      "click",
      () => {

        state.detail = null;

        renderPage();
        bindClubCards();

      }
    );

    return;
  }

  document
    .querySelectorAll(".club-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const type =
            state.page === "teams"
              ? "team"
              : "selection";

          const clubs =
            type === "team"
              ? state.data?.teams || []
              : state.data?.selections || [];

          state.detail =
            clubs.find(
              club =>
                String(club.id) ===
                String(
                  card.dataset.clubId
                )
            );

          if (!state.detail) {
            return;
          }

          renderPage();
          bindClubCards();

        }
      );

    });
}

/* =========================================================
   ADMIN
========================================================= */

function renderAdmin() {
  if (!state.admin) {

    return `
      <div class="admin-locked">

        <h2>
          Admin Area
        </h2>

        <p>
          Entre com a senha administrativa para gerenciar
          jogadores, times e seleções.
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

          <button
            class="btn primary"
            type="submit"
          >
            Entrar
          </button>

        </form>

      </div>
    `;
  }

  return `
    <div class="page-head">

      <div>

        <h1>
          Admin Area
        </h1>

        <p>
          Gerencie os jogadores, times e seleções da ULTIMATE TCS LEAGUE.
        </p>

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

      ${renderAdminPlayers()}

      ${renderAdminTeams()}

      ${renderAdminSelections()}

    </div>
  `;
}

function renderAdminPlayers() {
  const players =
    state.data?.players || [];

  const teams =
    state.data?.teams || [];

  return `
    <section class="admin-card full">

      <h2>
        Jogadores
      </h2>

      <p>
        Cadastre jogadores, Tier, overall, wage, time e função.
      </p>

      <form id="playerForm">

        <label>
          ID

          <input
            name="id"
            type="number"
            min="1"
            placeholder="Ex.: 12345678"
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
          Tier

          <select
            name="class"
            id="playerClass"
            required
          >

            ${CLASS_ORDER
              .map(cls => `
                <option value="${escapeHTML(cls)}">
                  ${escapeHTML(cls)}
                </option>
              `)
              .join("")}

          </select>

        </label>

        <label>
          Wage

          <input
            name="wage"
            type="number"
            min="0"
            step="1"
            placeholder="Ex.: 250000"
            required
          >

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

            <option value="">
              FREE AGENT
            </option>

            ${teams
              .map(team => `
                <option
                  value="${escapeHTML(
                    team.id
                  )}"
                >
                  ${escapeHTML(
                    team.name
                  )}
                </option>
              `)
              .join("")}

          </select>

        </label>

        <label>
          Role

          <select
            name="role"
            required
          >

            ${ROLE_OPTIONS
              .map(role => `
                <option
                  value="${escapeHTML(
                    role
                  )}"
                >
                  ${escapeHTML(
                    role
                  )}
                </option>
              `)
              .join("")}

          </select>

        </label>

        <button
          class="btn primary"
          type="submit"
        >
          Salvar jogador
        </button>

      </form>

      <div class="admin-list">

        ${
          players.length
            ? players
                .map(player => `
                  <div class="admin-list-item">

                    <div>

                      <strong>
                        #${escapeHTML(
                          player.id
                        )}
                        —
                        ${escapeHTML(
                          player.nick
                        )}
                      </strong>

                      <small>
                        ${escapeHTML(
                          player.class
                        )}
                        ·
                        ${escapeHTML(
                          player.role || "PLAYER"
                        )}
                        ·
                        ${escapeHTML(
                          player.overall
                        )}
                        OVR
                        ·
                        ${formatMoney(
                          player.wage
                        )}
                      </small>

                    </div>

                    <button
                      class="btn danger small delete-player"
                      data-id="${escapeHTML(
                        player.id
                      )}"
                      type="button"
                    >
                      Excluir
                    </button>

                  </div>
                `)
                .join("")
            : `
              <div class="empty-state">

                <strong>
                  Nenhum jogador
                </strong>

                <span>
                  Cadastre o primeiro jogador.
                </span>

              </div>
            `
        }

      </div>

    </section>
  `;
}

function renderAdminTeams() {
  const teams =
    state.data?.teams || [];

  return `
    <section class="admin-card">

      <h2>
        Times
      </h2>

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
            type="color"
            value="#151515"
          >
        </label>

        <button
          class="btn primary"
          type="submit"
        >
          Criar time
        </button>

      </form>

      <div class="admin-list">

        ${
          teams.length
            ? teams
                .map(team => `
                  <div class="admin-list-item">

                    <div>

                      <strong>
                        ${escapeHTML(
                          team.name
                        )}
                      </strong>

                      <small>
                        Máximo de 16 jogadores
                      </small>

                    </div>

                    <button
                      class="btn danger small delete-team"
                      data-id="${escapeHTML(
                        team.id
                      )}"
                      type="button"
                    >
                      Excluir
                    </button>

                  </div>
                `)
                .join("")
            : `
              <div class="empty-state">

                <strong>
                  Nenhum time
                </strong>

                <span>
                  Crie o primeiro time.
                </span>

              </div>
            `
        }

      </div>

    </section>
  `;
}

function renderAdminSelections() {
  const selections =
    state.data?.selections || [];

  const players =
    state.data?.players || [];

  return `
    <section class="admin-card">

      <h2>
        Seleções
      </h2>

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
            type="color"
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
                ? players
                    .map(player => `
                      <label class="check-player">

                        <input
                          type="checkbox"
                          name="players"
                          value="${escapeHTML(
                            player.id
                          )}"
                        >

                        <span>
                          #${escapeHTML(
                            player.id
                          )}
                          —
                          ${escapeHTML(
                            player.nick
                          )}
                        </span>

                      </label>
                    `)
                    .join("")
                : `
                  <div class="empty-state">

                    <strong>
                      Nenhum jogador disponível
                    </strong>

                    <span>
                      Cadastre jogadores primeiro.
                    </span>

                  </div>
                `
            }

          </div>

        </div>

        <button
          class="btn primary"
          type="submit"
        >
          Criar seleção
        </button>

      </form>

      <div class="admin-list">

        ${
          selections.length
            ? selections
                .map(selection => `
                  <div class="admin-list-item">

                    <div>

                      <strong>
                        ${escapeHTML(
                          selection.name
                        )}
                      </strong>

                      <small>
                        ${
                          (
                            selection.players ||
                            []
                          ).length
                        }/16 jogadores
                      </small>

                    </div>

                    <button
                      class="btn danger small delete-selection"
                      data-id="${escapeHTML(
                        selection.id
                      )}"
                      type="button"
                    >
                      Excluir
                    </button>

                  </div>
                `)
                .join("")
            : `
              <div class="empty-state">

                <strong>
                  Nenhuma seleção
                </strong>

                <span>
                  Crie a primeira seleção.
                </span>

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
  $("#loginForm")?.addEventListener(
    "submit",
    async event => {

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

        state.admin = true;

        showToast(
          "Login realizado."
        );

        renderPage();
        bindAdmin();

      } catch (error) {

        showToast(
          error.message
        );

      }
    }
  );

  $("#logoutBtn")?.addEventListener(
    "click",
    async () => {

      try {

        await api(
          "/api/admin/logout",
          {
            method: "POST"
          }
        );

        state.admin = false;

        showToast(
          "Sessão encerrada."
        );

        renderPage();

      } catch (error) {

        showToast(
          error.message
        );

      }
    }
  );

  bindPlayerAdmin();
  bindTeamAdmin();
  bindSelectionAdmin();
}

function bindPlayerAdmin() {
  $("#playerForm")?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const form =
        new FormData(
          event.currentTarget
        );

      const playerClass =
        formatClass(
          form.get("class")
        );

      const overall =
        Number(
          form.get("overall")
        );

      const wage =
        Number(
          form.get("wage")
        );

      if (
        overall < 0 ||
        overall > 100
      ) {
        showToast(
          "O overall deve estar entre 0 e 100."
        );

        return;
      }

      if (
        !Number.isFinite(wage) ||
        wage < 0
      ) {
        showToast(
          "Digite uma wage válida."
        );

        return;
      }

      try {

        await api(
          "/api/admin/players",
          {
            method: "POST",

            body: JSON.stringify({
              id:
                form.get("id"),

              nick:
                form.get("nick"),

              class:
                playerClass,

              wage,

              overall,

              teamId:
                form.get("teamId") ||
                null,

              role:
                form.get("role")
            })
          }
        );

        showToast(
          "Jogador salvo."
        );

        await loadData();
        bindAdmin();

      } catch (error) {

        showToast(
          error.message
        );

      }
    }
  );

  document
    .querySelectorAll(
      ".delete-player"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset.id;

          if (
            !confirm(
              "Excluir este jogador?"
            )
          ) {
            return;
          }

          try {

            await api(
              `/api/admin/players/${encodeURIComponent(
                id
              )}`,
              {
                method: "DELETE"
              }
            );

            showToast(
              "Jogador excluído."
            );

            await loadData();
            bindAdmin();

          } catch (error) {

            showToast(
              error.message
            );

          }
        }
      );
    });
}

function bindTeamAdmin() {
  $("#teamForm")?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const form =
        new FormData(
          event.currentTarget
        );

      try {

        await api(
          "/api/admin/teams",
          {
            method: "POST",

            body: JSON.stringify({
              name:
                form.get("name"),

              logo:
                form.get("logo"),

              color:
                form.get("color")
            })
          }
        );

        showToast(
          "Time criado."
        );

        await loadData();
        bindAdmin();

      } catch (error) {

        showToast(
          error.message
        );

      }
    }
  );

  document
    .querySelectorAll(
      ".delete-team"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset.id;

          if (
            !confirm(
              "Excluir este time?"
            )
          ) {
            return;
          }

          try {

            await api(
              `/api/admin/teams/${encodeURIComponent(
                id
              )}`,
              {
                method: "DELETE"
              }
            );

            showToast(
              "Time excluído."
            );

            await loadData();
            bindAdmin();

          } catch (error) {

            showToast(
              error.message
            );

          }
        }
      );
    });
}

function bindSelectionAdmin() {
  const form =
    $("#selectionForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const data =
        new FormData(form);

      const selectedPlayers =
        data.getAll("players");

      if (
        selectedPlayers.length > 16
      ) {
        showToast(
          "Uma seleção pode ter no máximo 16 jogadores."
        );

        return;
      }

      try {

        await api(
          "/api/admin/selections",
          {
            method: "POST",

            body: JSON.stringify({
              name:
                data.get("name"),

              logo:
                data.get("logo"),

              color:
                data.get("color"),

              players:
                selectedPlayers
            })
          }
        );

        showToast(
          "Seleção criada."
        );

        await loadData();
        bindAdmin();

      } catch (error) {

        showToast(
          error.message
        );

      }
    }
  );

  document
    .querySelectorAll(
      ".delete-selection"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset.id;

          if (
            !confirm(
              "Excluir esta seleção?"
            )
          ) {
            return;
          }

          try {

            await api(
              `/api/admin/selections/${encodeURIComponent(
                id
              )}`,
              {
                method: "DELETE"
              }
            );

            showToast(
              "Seleção excluída."
            );

            await loadData();
            bindAdmin();

          } catch (error) {

            showToast(
              error.message
            );

          }
        }
      );
    });
}

/* =========================================================
   GLOBAL EVENTS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    document
      .querySelectorAll(".nav")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const page =
              button.dataset.page;

            navigate(page);

          }
        );

      });

    $("#mobileMenu")?.addEventListener(
      "click",
      openMobileMenu
    );

    await loadAdminStatus();

    await loadData();

  }
);