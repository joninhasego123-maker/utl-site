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
let currentPage = "home";

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

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]);
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

function api(url, options = {}) {
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
}

async function loadData() {
  try {
    const response = await api("/api/data");

    if (!response.ok) {
      throw new Error("Erro ao carregar dados");
    }

    const result = await response.json();

    data = {
      links: result.links || {},
      tableUrl: result.tableUrl || "",
      categories: result.categories || [],
      news: result.news || [],
      players: result.players || [],
      selections: result.selections || [],
      teams: result.teams || []
    };

    renderPage(currentPage);

  } catch (error) {
    console.error(error);

    content.innerHTML = `
      <div class="card">
        <h2>Erro ao carregar o site</h2>
        <p>Tente atualizar a página.</p>
      </div>
    `;
  }
}

async function checkAdmin() {
  try {
    const response = await api("/api/admin/status");

    if (response.ok) {
      const result = await response.json();
      isAdmin = !!result.isAdmin;
    }
  } catch {
    isAdmin = false;
  }
}

function showLogin() {
  const modal = document.getElementById("login-modal");

  if (modal) {
    modal.classList.add("active");

    const input = document.getElementById("admin-password");

    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 100);
    }
  }
}

function hideLogin() {
  const modal = document.getElementById("login-modal");

  if (modal) {
    modal.classList.remove("active");
  }
}

async function login() {
  const input = document.getElementById("admin-password");
  const error = document.getElementById("login-error");

  const password = input ? input.value : "";

  if (!password) {
    if (error) {
      error.textContent = "Digite a senha.";
    }
    return;
  }

  try {
    const response = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });

    const result = await response.json();

    if (!response.ok) {
      if (error) {
        error.textContent = result.error || "Senha incorreta.";
      }
      return;
    }

    isAdmin = true;

    hideLogin();

    renderPage("admin");

  } catch {
    if (error) {
      error.textContent = "Erro ao entrar.";
    }
  }
}

async function logout() {
  try {
    await api("/api/admin/logout", {
      method: "POST"
    });
  } catch {}

  isAdmin = false;

  renderPage("home");
}

function navigate(page) {
  currentPage = page;

  if (sidebar) {
    sidebar.classList.remove("open");
  }

  renderPage(page);
}

function renderPage(page) {
  if (!content) return;

  currentPage = page;

  const titles = {
    home: "Início",
    others: "Others",
    news: "Notícias",
    table: "Tabela",
    players: "Jogadores",
    selections: "Seleções",
    teams: "Times",
    admin: "Área Administrativa"
  };

  if (pageTitle) {
    pageTitle.textContent = titles[page] || "UTL";
  }

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

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
        showLogin();
        renderHome();
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
  const latestNews = [...data.news]
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 3);

  content.innerHTML = `
    <section class="hero">

      <img
        src="/images/banner.png"
        class="hero-banner"
        alt="UTL Banner"
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
          <h1>ULTIMATE TCS LEAGUE</h1>
          <p>A maior competição da UTL.</p>
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

    <section class="section">

      <div class="section-title">
        <h2>Últimas notícias</h2>

        <button
          class="secondary-button"
          data-page="news"
        >
          Ver todas
        </button>
      </div>

      ${
        latestNews.length
          ? `
            <div class="news-grid">
              ${latestNews.map(newsCard).join("")}
            </div>
          `
          : `
            <div class="card empty">
              <p>Nenhuma notícia publicada ainda.</p>
            </div>
          `
      }

    </section>
  `;
}


/* =========================
   OTHERS
========================= */

function renderOthers() {
  const discord = data.links?.discord || "";
  const tiktok = data.links?.tiktok || "";

  content.innerHTML = `
    <div class="page-header">
      <h2>Others</h2>
      <p>Links oficiais da ULTIMATE TCS LEAGUE.</p>
    </div>

    <div class="cards-grid">

      ${
        discord
          ? `
            <a
              class="link-card"
              href="${escapeHTML(discord)}"
              target="_blank"
              rel="noopener noreferrer"
            >

              <div class="link-icon">
                💬
              </div>

              <div>
                <h3>Discord</h3>
                <p>Entre no servidor oficial da UTL.</p>
              </div>

            </a>
          `
          : ""
      }

      ${
        tiktok
          ? `
            <a
              class="link-card"
              href="${escapeHTML(tiktok)}"
              target="_blank"
              rel="noopener noreferrer"
            >

              <div class="link-icon">
                🎵
              </div>

              <div>
                <h3>TikTok</h3>
                <p>Acompanhe a UTL no TikTok.</p>
              </div>

            </a>
          `
          : ""
      }

      ${
        !discord && !tiktok
          ? `
            <div class="card empty">
              <p>Nenhum link foi configurado.</p>
            </div>
          `
          : ""
      }

    </div>
  `;
}


/* =========================
   NEWS
========================= */

function newsCard(news) {
  const category = data.categories.find(
    cat => String(cat.id) === String(news.categoryId)
  );

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
          : `
            <div class="news-placeholder">
              UTL
            </div>
          `
      }

      <div class="news-card-body">

        ${
          category
            ? `
              <span class="category-tag">
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

        ${
          isAdmin
            ? `
              <button
                class="danger-button small"
                data-delete-news="${escapeHTML(news.id)}"
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
  const categories = data.categories || [];

  content.innerHTML = `
    <div class="page-header">
      <h2>Notícias</h2>
      <p>
        Confira as novidades da ULTIMATE TCS LEAGUE.
      </p>
    </div>

    ${
      categories.length
        ? `
          <div class="category-filter">

            <button
              class="category-button active"
              data-news-category="all"
            >
              Todas
            </button>

            ${categories.map(category => `
              <button
                class="category-button"
                data-news-category="${escapeHTML(category.id)}"
              >
                ${escapeHTML(category.name)}
              </button>
            `).join("")}

          </div>
        `
        : ""
    }

    <div
      id="news-list"
      class="news-grid"
    >

      ${
        data.news.length
          ? data.news.map(newsCard).join("")
          : `
            <div class="card empty">
              <p>Nenhuma notícia publicada.</p>
            </div>
          `
      }

    </div>
  `;
}


function filterNews(categoryId) {
  const container =
    document.getElementById("news-list");

  if (!container) return;

  const filtered =
    categoryId === "all"
      ? data.news
      : data.news.filter(
          news =>
            String(news.categoryId) ===
            String(categoryId)
        );

  container.innerHTML =
    filtered.length
      ? filtered.map(newsCard).join("")
      : `
        <div class="card empty">
          <p>Nenhuma notícia nessa categoria.</p>
        </div>
      `;

  document
    .querySelectorAll("[data-news-category]")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.newsCategory === categoryId
      );

    });
}


/* =========================
   TABELA
========================= */

function renderTable() {

  content.innerHTML = `
    <div class="page-header">
      <h2>Tabela</h2>
      <p>
        Classificação oficial da competição.
      </p>
    </div>

    ${
      data.tableUrl
        ? `
          <div class="table-frame-card">

            <a
              class="primary-button"
              href="${escapeHTML(data.tableUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir tabela
            </a>

            <div class="table-iframe-wrapper">

              <iframe
                src="${escapeHTML(data.tableUrl)}"
                title="Tabela UTL"
                loading="lazy"
              ></iframe>

            </div>

          </div>
        `
        : `
          <div class="card empty">

            <h3>
              Tabela ainda não configurada
            </h3>

            <p>
              O administrador ainda não adicionou o link.
            </p>

          </div>
        `
    }
  `;
}
