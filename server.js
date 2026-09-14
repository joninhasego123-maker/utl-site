const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "utl-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data.json");

const defaultData = {
  links: {
    discord: "https://discord.gg/",
    tiktok: "https://tiktok.com/"
  },
  tableUrl: "",
  categories: ["Geral"],
  news: [],
  players: [],
  selections: [],
  teams: []
};

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
      return JSON.parse(JSON.stringify(defaultData));
    }

    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

let data = loadData();

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({
      error: "Não autorizado"
    });
  }

  next();
}

const wages = {
  "D": "75K",
  "C-": "85K",
  "C": "90K",
  "C+": "100K",
  "B-": "125K",
  "B": "150K",
  "B+": "175K",
  "A-": "200K",
  "A": "250K",
  "A+": "275K",
  "S-": "300K",
  "S": "325K",
  "S+": "350K"
};

function getWage(playerClass) {
  if (playerClass === "X") {
    return "380K–400K";
  }

  return wages[playerClass] || "—";
}

/* =========================
   DADOS PÚBLICOS
========================= */

app.get("/api/data", (req, res) => {
  res.json(data);
});

app.get("/api/classes", (req, res) => {
  res.json({
    classes: [
      {
        name: "X",
        color: "purple",
        subclasses: ["X"]
      },
      {
        name: "S",
        color: "blue",
        subclasses: ["S+", "S", "S-"]
      },
      {
        name: "A",
        color: "red",
        subclasses: ["A+", "A", "A-"]
      },
      {
        name: "B",
        color: "orange",
        subclasses: ["B+", "B", "B-"]
      },
      {
        name: "C",
        color: "yellow",
        subclasses: ["C+", "C", "C-"]
      },
      {
        name: "D",
        color: "gray",
        subclasses: ["D"]
      }
    ],
    wages
  });
});

/* =========================
   LOGIN ADMIN
========================= */

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");

  const adminPassword =
    process.env.ADMIN_PASSWORD || "ultimatetcsleaguesite6742";

  if (password !== adminPassword) {
    return res.status(401).json({
      error: "Senha incorreta"
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

app.get("/api/admin/status", (req, res) => {
  res.json({
    isAdmin: !!req.session.isAdmin
  });
});

/* =========================
   LINKS
========================= */

app.put("/api/admin/links", requireAdmin, (req, res) => {
  data.links = {
    discord: req.body.discord || "",
    tiktok: req.body.tiktok || ""
  };

  saveData();

  res.json({
    success: true,
    links: data.links
  });
});

/* =========================
   TABELA
========================= */

app.put("/api/admin/table", requireAdmin, (req, res) => {
  data.tableUrl = req.body.url || "";

  saveData();

  res.json({
    success: true
  });
});

/* =========================
   CATEGORIAS
========================= */

app.post("/api/admin/categories", requireAdmin, (req, res) => {
  const name = String(req.body.name || "").trim();

  if (!name) {
    return res.status(400).json({
      error: "Nome obrigatório"
    });
  }

  if (!data.categories.includes(name)) {
    data.categories.push(name);
    saveData();
  }

  res.json({
    success: true,
    categories: data.categories
  });
});

app.delete("/api/admin/categories/:name", requireAdmin, (req, res) => {
  const name = decodeURIComponent(req.params.name);

  data.categories = data.categories.filter(
    category => category !== name
  );

  saveData();

  res.json({
    success: true,
    categories: data.categories
  });
});

/* =========================
   NOTÍCIAS
========================= */

app.post("/api/admin/news", requireAdmin, (req, res) => {
  const news = {
    id: Date.now().toString(),
    title: req.body.title || "",
    description: req.body.description || "",
    image: req.body.image || "",
    category: req.body.category || "Geral",
    createdAt: new Date().toISOString()
  };

  data.news.unshift(news);

  saveData();

  res.json({
    success: true,
    news
  });
});

app.put("/api/admin/news/:id", requireAdmin, (req, res) => {
  const news = data.news.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!news) {
    return res.status(404).json({
      error: "Notícia não encontrada"
    });
  }

  news.title = req.body.title ?? news.title;
  news.description = req.body.description ?? news.description;
  news.image = req.body.image ?? news.image;
  news.category = req.body.category ?? news.category;

  saveData();

  res.json({
    success: true,
    news
  });
});

app.delete("/api/admin/news/:id", requireAdmin, (req, res) => {
  data.news = data.news.filter(
    item => String(item.id) !== String(req.params.id)
  );

  saveData();

  res.json({
    success: true
  });
});

/* =========================
   JOGADORES
========================= */

app.post("/api/admin/players", requireAdmin, (req, res) => {
  const playerClass = String(
    req.body.class || req.body.classe || "D"
  ).toUpperCase();

  const player = {
    id: Date.now().toString(),
    nick: req.body.nick || req.body.name || "Sem nome",
    class: playerClass,
    teamId: req.body.teamId || "",
    teamLogo: req.body.teamLogo || "",
    freeAgent:
      req.body.freeAgent === true ||
      req.body.freeAgent === "true",
    wage: getWage(playerClass)
  };

  data.players.push(player);

  saveData();

  res.json({
    success: true,
    player
  });
});

app.put("/api/admin/players/:id", requireAdmin, (req, res) => {
  const player = data.players.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!player) {
    return res.status(404).json({
      error: "Jogador não encontrado"
    });
  }

  if (req.body.nick !== undefined) {
    player.nick = req.body.nick;
  }

  if (req.body.class !== undefined) {
    player.class = String(req.body.class).toUpperCase();
    player.wage = getWage(player.class);
  }

  if (req.body.teamId !== undefined) {
    player.teamId = req.body.teamId;
  }

  if (req.body.teamLogo !== undefined) {
    player.teamLogo = req.body.teamLogo;
  }

  if (req.body.freeAgent !== undefined) {
    player.freeAgent =
      req.body.freeAgent === true ||
      req.body.freeAgent === "true";
  }

  saveData();

  res.json({
    success: true,
    player
  });
});

app.delete("/api/admin/players/:id", requireAdmin, (req, res) => {
  data.players = data.players.filter(
    item => String(item.id) !== String(req.params.id)
  );

  saveData();

  res.json({
    success: true
  });
});

/* =========================
   REORGANIZAR JOGADORES
========================= */

app.put("/api/admin/players/reorder", requireAdmin, (req, res) => {
  const order = Array.isArray(req.body.order)
    ? req.body.order.map(String)
    : [];

  const positions = new Map(
    order.map((id, index) => [id, index])
  );

  data.players.sort((a, b) => {
    const aPos = positions.has(String(a.id))
      ? positions.get(String(a.id))
      : 999999;

    const bPos = positions.has(String(b.id))
      ? positions.get(String(b.id))
      : 999999;

    return aPos - bPos;
  });

  saveData();

  res.json({
    success: true
  });
});

/* =========================
   SELEÇÕES
========================= */

app.post("/api/admin/selections", requireAdmin, (req, res) => {
  const selection = {
    id: Date.now().toString(),
    name: req.body.name || "",
    logo: req.body.logo || "",
    players: Array.isArray(req.body.players)
      ? req.body.players
      : []
  };

  data.selections.push(selection);

  saveData();

  res.json({
    success: true,
    selection
  });
});

app.put("/api/admin/selections/:id", requireAdmin, (req, res) => {
  const selection = data.selections.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!selection) {
    return res.status(404).json({
      error: "Seleção não encontrada"
    });
  }

  selection.name = req.body.name ?? selection.name;
  selection.logo = req.body.logo ?? selection.logo;

  if (Array.isArray(req.body.players)) {
    selection.players = req.body.players;
  }

  saveData();

  res.json({
    success: true,
    selection
  });
});

app.delete("/api/admin/selections/:id", requireAdmin, (req, res) => {
  data.selections = data.selections.filter(
    item => String(item.id) !== String(req.params.id)
  );

  saveData();

  res.json({
    success: true
  });
});

/* =========================
   TIMES
========================= */

app.post("/api/admin/teams", requireAdmin, (req, res) => {
  const team = {
    id: Date.now().toString(),
    name: req.body.name || "",
    logo: req.body.logo || "",
    players: Array.isArray(req.body.players)
      ? req.body.players
      : []
  };

  data.teams.push(team);

  saveData();

  res.json({
    success: true,
    team
  });
});

app.put("/api/admin/teams/:id", requireAdmin, (req, res) => {
  const team = data.teams.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!team) {
    return res.status(404).json({
      error: "Time não encontrado"
    });
  }

  team.name = req.body.name ?? team.name;
  team.logo = req.body.logo ?? team.logo;

  if (Array.isArray(req.body.players)) {
    team.players = req.body.players;
  }

  saveData();

  res.json({
    success: true,
    team
  });
});

app.delete("/api/admin/teams/:id", requireAdmin, (req, res) => {
  data.teams = data.teams.filter(
    item => String(item.id) !== String(req.params.id)
  );

  saveData();

  res.json({
    success: true
  });
});

/* =========================
   ROTA PRINCIPAL
========================= */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(PORT, () => {
  console.log(`UTL Site rodando na porta ${PORT}`);
});
