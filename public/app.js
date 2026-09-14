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
