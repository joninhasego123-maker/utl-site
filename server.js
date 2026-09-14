const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "ultimatetcsleaguesite6742";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "utl-session-secret";

const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

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

const WAGES = {
  "S+": 350000,
  "S": 325000,
  "S-": 300000,
  "A+": 275000,
  "A": 250000,
  "A-": 200000,
  "B+": 175000,
  "B": 150000,
  "B-": 125000,
  "C+": 100000,
  "C": 90000,
  "C-": 85000,
  "D": 75000
};

const X_WAGES = [
  380000,
  385000,
  390000,
  395000,
  400000
];

const ROLES = [
  "PLAYER",
  "ASSIST MANAGER",
  "MANAGER"
];

function defaultData() {
  return {
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
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const data = defaultData();
      saveData(data);
      return data;
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    return {
      links: data.links || {
        discord: "",
        tiktok: "",
        tabela: ""
      },
      newsCategories:
        Array.isArray(data.newsCategories) && data.newsCategories.length
          ? data.newsCategories
          : ["Geral"],
      news: Array.isArray(data.news) ? data.news : [],
      players: Array.isArray(data.players) ? data.players : [],
      selections: Array.isArray(data.selections)
        ? data.selections
        : [],
      teams: Array.isArray(data.teams) ? data.teams : []
    };
  } catch (error) {
    console.error("Erro ao carregar data.json:", error);
    return defaultData();
  }
}

function saveData(data) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

let DATA = loadData();

function adminOnly(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({
      error: "Não autorizado."
    });
  }

  next();
}

function clean(value) {
  return String(value ?? "").trim();
}

function validClass(value) {
  return CLASS_ORDER.includes(value);
}

function validRole(value) {
  return ROLES.includes(value);
}

function getPlayerClass(player) {
  return player.class || "D";
}

function getPlayerWage(player) {
  const playerClass = getPlayerClass(player);

  if (playerClass === "X") {
    const wage = Number(player.wage);

    if (X_WAGES.includes(wage)) {
      return wage;
    }

    return 380000;
  }

  return WAGES[playerClass] || 75000;
}

function normalizePlayer(player, index = 0) {
  const playerClass = validClass(player.class)
    ? player.class
    : "D";

  const role = validRole(player.role)
    ? player.role
    : "PLAYER";

  let wage = getPlayerWage({
    ...player,
    class: playerClass
  });

  if (playerClass === "X" && !X_WAGES.includes(Number(player.wage))) {
    wage = 380000;
  }

  return {
    id: clean(player.id),
    nick: clean(player.nick),
    class: playerClass,
    overall: Math.max(
      0,
      Math.min(100, Number(player.overall) || 0)
    ),
    teamId: clean(player.teamId || player.team || ""),
    role,
    wage,
    freeAgent:
      !clean(player.teamId || player.team),
    order:
      Number.isFinite(Number(player.order))
        ? Number(player.order)
        : index
  };
}

function normalizePlayers() {
  DATA.players = DATA.players.map(normalizePlayer);

  DATA.players.sort((a, b) => {
    const classA = CLASS_ORDER.indexOf(a.class);
    const classB = CLASS_ORDER.indexOf(b.class);

    if (classA !== classB) {
      return classA - classB;
    }

    return a.order - b.order;
  });

  DATA.players.forEach((player, index) => {
    player.order = index;
  });
}

normalizePlayers();
saveData(DATA);

function makeId(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

/* =========================
   PUBLIC API
========================= */

app.get("/api/data", (req, res) => {
  normalizePlayers();

  res.json(DATA);
});

app.get("/api/admin/status", (req, res) => {
  res.json({
    loggedIn: !!req.session.isAdmin
  });
});

/* =========================
   LOGIN
========================= */

app.post("/api/admin/login", (req, res) => {
  const password = clean(req.body.password);

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: "Senha incorreta."
    });
  }

  req.session.isAdmin = true;

  res.json({
    success: true
  });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true
    });
  });
});

/* =========================
   LINKS
========================= */

app.put("/api/admin/links", adminOnly, (req, res) => {
  DATA.links = {
    discord: clean(req.body.discord),
    tiktok: clean(req.body.tiktok),
    tabela: clean(req.body.tabela)
  };

  saveData(DATA);

  res.json({
    success: true,
    links: DATA.links
  });
});

/* =========================
   NEWS CATEGORIES
========================= */

app.post(
  "/api/admin/news-categories",
  adminOnly,
  (req, res) => {
    const name = clean(req.body.name);

    if (!name) {
      return res.status(400).json({
        error: "Informe o nome da categoria."
      });
    }

    if (
      DATA.newsCategories.some(
        category =>
          category.toLowerCase() === name.toLowerCase()
      )
    ) {
      return res.status(400).json({
        error: "Essa categoria já existe."
      });
    }

    DATA.newsCategories.push(name);

    saveData(DATA);

    res.json({
      success: true,
      categories: DATA.newsCategories
    });
  }
);

app.delete(
  "/api/admin/news-categories/:name",
  adminOnly,
  (req, res) => {
    const name = decodeURIComponent(req.params.name);

    if (name === "Geral") {
      return res.status(400).json({
        error: "A categoria Geral não pode ser excluída."
      });
    }

    DATA.newsCategories = DATA.newsCategories.filter(
      category => category !== name
    );

    DATA.news.forEach(news => {
      if (news.category === name) {
        news.category = "Geral";
      }
    });

    saveData(DATA);

    res.json({
      success: true,
      categories: DATA.newsCategories
    });
  }
);

/* =========================
   NEWS
========================= */

app.post("/api/admin/news", adminOnly, (req, res) => {
  const title = clean(req.body.title);
  const description = clean(req.body.description);
  const image = clean(req.body.image);
  const category = clean(req.body.category) || "Geral";

  if (!title || !description) {
    return res.status(400).json({
      error: "Título e descrição são obrigatórios."
    });
  }

  if (!DATA.newsCategories.includes(category)) {
    return res.status(400).json({
      error: "Categoria inválida."
    });
  }

  const news = {
    id: makeId("news"),
    title,
    description,
    image,
    category,
    createdAt: Date.now()
  };

  DATA.news.unshift(news);

  saveData(DATA);

  res.json({
    success: true,
    news
  });
});

app.delete("/api/admin/news/:id", adminOnly, (req, res) => {
  DATA.news = DATA.news.filter(
    news => news.id !== req.params.id
  );

  saveData(DATA);

  res.json({
    success: true
  });
});

/* =========================
   PLAYERS
========================= */

app.post("/api/admin/players", adminOnly, (req, res) => {
  const id = clean(req.body.id);
  const nick = clean(req.body.nick);
  const playerClass = clean(req.body.class);
  const role = clean(req.body.role);
  const teamId = clean(req.body.teamId);
  const overall = Number(req.body.overall);

  if (!id || !nick) {
    return res.status(400).json({
      error: "ID e Nick são obrigatórios."
    });
  }

  if (!validClass(playerClass)) {
    return res.status(400).json({
      error: "Classe inválida."
    });
  }

  if (!validRole(role)) {
    return res.status(400).json({
      error: "Cargo inválido."
    });
  }

  if (
    !Number.isFinite(overall) ||
    overall < 0 ||
    overall > 100
  ) {
    return res.status(400).json({
      error: "Overall deve estar entre 0 e 100."
    });
  }

  if (
    DATA.players.some(
      player => String(player.id) === String(id)
    )
  ) {
    return res.status(400).json({
      error: "Já existe um jogador com esse ID."
    });
  }

  if (teamId) {
    const team = DATA.teams.find(
      team => team.id === teamId
    );

    if (!team) {
      return res.status(400).json({
        error: "Time não encontrado."
      });
    }

    const count = DATA.players.filter(
      player => player.teamId === teamId
    ).length;

    if (count >= 16) {
      return res.status(400).json({
        error: "Esse time já possui 16 jogadores."
      });
    }
  }

  let wage;

  if (playerClass === "X") {
    wage = Number(req.body.wage);

    if (!X_WAGES.includes(wage)) {
      return res.status(400).json({
        error:
          "Para a classe X, o salário deve ser 380K, 385K, 390K, 395K ou 400K."
      });
    }
  } else {
    wage = WAGES[playerClass];
  }

  const player = {
    id,
    nick,
    class: playerClass,
    overall,
    teamId,
    role,
    wage,
    freeAgent: !teamId,
    order: DATA.players.length
  };

  DATA.players.push(player);

  normalizePlayers();
  saveData(DATA);

  res.json({
    success: true,
    player
  });
});

app.delete(
  "/api/admin/players/:id",
  adminOnly,
  (req, res) => {
    const id = String(req.params.id);

    DATA.players = DATA.players.filter(
      player => String(player.id) !== id
    );

    DATA.selections.forEach(selection => {
      selection.players = selection.players.filter(
        playerId => String(playerId) !== id
      );
    });

    normalizePlayers();
    saveData(DATA);

    res.json({
      success: true
    });
  }
);

/* =========================
   TEAMS
========================= */

app.post("/api/admin/teams", adminOnly, (req, res) => {
  const name = clean(req.body.name);
  const color = clean(req.body.color) || "#b00020";
  const logo = clean(req.body.logo);

  if (!name) {
    return res.status(400).json({
      error: "Informe o nome do time."
    });
  }

  if (
    DATA.teams.some(
      team =>
        team.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    return res.status(400).json({
      error: "Esse time já existe."
    });
  }

  const team = {
    id: makeId("team"),
    name,
    color,
    logo,
    players: []
  };

  DATA.teams.push(team);

  saveData(DATA);

  res.json({
    success: true,
    team
  });
});

app.delete(
  "/api/admin/teams/:id",
  adminOnly,
  (req, res) => {
    const id = String(req.params.id);

    DATA.players.forEach(player => {
      if (String(player.teamId) === id) {
        player.teamId = "";
        player.freeAgent = true;
      }
    });

    DATA.teams = DATA.teams.filter(
      team => String(team.id) !== id
    );

    normalizePlayers();
    saveData(DATA);

    res.json({
      success: true
    });
  }
);

/* =========================
   SELECTIONS
========================= */

app.post(
  "/api/admin/selections",
  adminOnly,
  (req, res) => {
    const name = clean(req.body.name);
    const color =
      clean(req.body.color) || "#b00020";
    const logo = clean(req.body.logo);

    let playerIds = Array.isArray(req.body.players)
      ? req.body.players.map(String)
      : [];

    playerIds = [...new Set(playerIds)];

    if (!name) {
      return res.status(400).json({
        error: "Informe o nome da seleção."
      });
    }

    if (playerIds.length > 16) {
      return res.status(400).json({
        error:
          "Uma seleção pode ter no máximo 16 jogadores."
      });
    }

    const existingPlayerIds = new Set(
      DATA.players.map(player => String(player.id))
    );

    const invalid = playerIds.find(
      id => !existingPlayerIds.has(id)
    );

    if (invalid) {
      return res.status(400).json({
        error: "Um dos jogadores selecionados não existe."
      });
    }

    if (
      DATA.selections.some(
        selection =>
          selection.name.toLowerCase() ===
          name.toLowerCase()
      )
    ) {
      return res.status(400).json({
        error: "Essa seleção já existe."
      });
    }

    const selection = {
      id: makeId("selection"),
      name,
      color,
      logo,
      players: playerIds
    };

    DATA.selections.push(selection);

    saveData(DATA);

    res.json({
      success: true,
      selection
    });
  }
);

app.delete(
  "/api/admin/selections/:id",
  adminOnly,
  (req, res) => {
    DATA.selections = DATA.selections.filter(
      selection =>
        String(selection.id) !==
        String(req.params.id)
    );

    saveData(DATA);

    res.json({
      success: true
    });
  }
);

/* =========================
   STATIC SITE
========================= */

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.listen(PORT, () => {
  console.log(
    `UTL Site rodando na porta ${PORT}`
  );
});
