const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data.json");

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "ultimatetcsleaguesite6742";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "utl-session-secret-2026";

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

const FIXED_WAGES = {
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

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   DATA
========================= */

function defaultData() {
  return {
    links: {
      discord: "",
      tiktok: "",
      tabela: ""
    },

    newsCategories: [
      "Geral"
    ],

    news: [],

    players: [],

    selections: [],

    teams: []
  };
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const data = defaultData();
    saveData(data);
    return data;
  }

  try {
    const raw = fs.readFileSync(
      DATA_FILE,
      "utf8"
    );

    const parsed = JSON.parse(raw);

    return normalizeData(parsed);
  } catch {
    const data = defaultData();
    saveData(data);
    return data;
  }
}

function saveData(data) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function normalizeData(data) {
  const base = defaultData();

  data = data || {};

  const normalized = {
    links: {
      ...base.links,
      ...(data.links || {})
    },

    newsCategories:
      Array.isArray(data.newsCategories)
        ? data.newsCategories
        : ["Geral"],

    news:
      Array.isArray(data.news)
        ? data.news
        : [],

    players:
      Array.isArray(data.players)
        ? data.players
        : [],

    selections:
      Array.isArray(data.selections)
        ? data.selections
        : [],

    teams:
      Array.isArray(data.teams)
        ? data.teams
        : []
  };

  if (
    !normalized.newsCategories.includes("Geral")
  ) {
    normalized.newsCategories.unshift("Geral");
  }

  normalized.news = normalized.news.map(
    normalizeNews
  );

  normalized.players = normalized.players.map(
    normalizePlayer
  );

  normalized.teams = normalized.teams.map(
    normalizeTeam
  );

  normalized.selections =
    normalized.selections.map(
      normalizeSelection
    );

  return normalized;
}

let DATA = loadData();

saveData(DATA);

/* =========================
   NORMALIZATION
========================= */

function normalizeNews(news) {
  return {
    id:
      news.id ||
      Date.now() +
        Math.floor(Math.random() * 1000),

    category:
      DATA.newsCategories.includes(
        news.category
      )
        ? news.category
        : "Geral",

    title:
      String(news.title || "").trim(),

    description:
      String(news.description || "").trim(),

    image:
      String(news.image || "").trim(),

    createdAt:
      Number(news.createdAt) ||
      Date.now()
  };
}

function normalizePlayer(player) {
  const cls = CLASS_ORDER.includes(
    String(player.class || "").toUpperCase()
  )
    ? String(player.class).toUpperCase()
    : "D";

  let wage;

  if (cls === "X") {
    const oldWage = Number(player.wage);

    wage = X_WAGES.includes(oldWage)
      ? oldWage
      : 380000;
  } else {
    wage = FIXED_WAGES[cls];
  }

  let role = String(
    player.role || "PLAYER"
  ).toUpperCase();

  if (!ROLES.includes(role)) {
    role = "PLAYER";
  }

  let overall = Number(player.overall);

  if (!Number.isFinite(overall)) {
    overall = 0;
  }

  overall = Math.max(
    0,
    Math.min(100, Math.round(overall))
  );

  return {
    id: Number(player.id),

    nick:
      String(player.nick || "").trim(),

    class: cls,

    wage,

    teamId:
      player.teamId
        ? String(player.teamId)
        : null,

    role,

    overall,

    createdAt:
      Number(player.createdAt) ||
      Date.now()
  };
}

function normalizeTeam(team) {
  return {
    id:
      String(
        team.id ||
        `team_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`
      ),

    name:
      String(team.name || "").trim(),

    color:
      String(team.color || "#171717"),

    logo:
      String(team.logo || "").trim()
  };
}

function normalizeSelection(selection) {
  return {
    id:
      String(
        selection.id ||
        `selection_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`
      ),

    name:
      String(selection.name || "").trim(),

    color:
      String(
        selection.color || "#171717"
      ),

    logo:
      String(selection.logo || "").trim(),

    players:
      Array.isArray(selection.players)
        ? selection.players
            .map(Number)
            .filter(Number.isFinite)
            .slice(0, 16)
        : []
  };
}

/* =========================
   HELPERS
========================= */

function adminOnly(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({
      error: "Não autorizado."
    });
  }

  next();
}

function generateId(prefix) {
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function validUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function cleanText(value, max = 500) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function getTeam(teamId) {
  return DATA.teams.find(
    team =>
      String(team.id) ===
      String(teamId)
  );
}

/* =========================
   PUBLIC DATA
========================= */

app.get("/api/data", (req, res) => {
  res.json(DATA);
});

app.get(
  "/api/admin/status",
  (req, res) => {
    res.json({
      authenticated:
        req.session.admin === true
    });
  }
);

/* =========================
   LOGIN
========================= */

app.post(
  "/api/admin/login",
  (req, res) => {
    const password =
      String(req.body.password || "");

    if (
      password !== ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        error: "Senha incorreta."
      });
    }

    req.session.admin = true;

    res.json({
      success: true
    });
  }
);

app.post(
  "/api/admin/logout",
  (req, res) => {
    req.session.destroy(() => {
      res.json({
        success: true
      });
    });
  }
);

/* =========================
   LINKS
========================= */

app.post(
  "/api/admin/links",
  adminOnly,
  (req, res) => {
    const discord =
      cleanText(req.body.discord, 300);

    const tiktok =
      cleanText(req.body.tiktok, 300);

    const tabela =
      cleanText(req.body.tabela, 300);

    if (
      !validUrl(discord) ||
      !validUrl(tiktok) ||
      !validUrl(tabela)
    ) {
      return res.status(400).json({
        error:
          "Um dos links informados é inválido."
      });
    }

    DATA.links = {
      discord,
      tiktok,
      tabela
    };

    saveData(DATA);

    res.json({
      success: true,
      links: DATA.links
    });
  }
);

/* =========================
   NEWS CATEGORIES
========================= */

app.post(
  "/api/admin/news-categories",
  adminOnly,
  (req, res) => {
    const name =
      cleanText(req.body.name, 40);

    if (!name) {
      return res.status(400).json({
        error:
          "Informe o nome da categoria."
      });
    }

    const exists =
      DATA.newsCategories.some(
        category =>
          category.toLowerCase() ===
          name.toLowerCase()
      );

    if (exists) {
      return res.status(400).json({
        error:
          "Essa categoria já existe."
      });
    }

    DATA.newsCategories.push(name);

    saveData(DATA);

    res.json({
      success: true,
      newsCategories:
        DATA.newsCategories
    });
  }
);

app.delete(
  "/api/admin/news-categories/:name",
  adminOnly,
  (req, res) => {
    const name =
      decodeURIComponent(req.params.name);

    if (name === "Geral") {
      return res.status(400).json({
        error:
          "A categoria Geral não pode ser excluída."
      });
    }

    if (
      !DATA.newsCategories.includes(name)
    ) {
      return res.status(404).json({
        error:
          "Categoria não encontrada."
      });
    }

    DATA.newsCategories =
      DATA.newsCategories.filter(
        category => category !== name
      );

    DATA.news = DATA.news.map(news => {
      if (news.category === name) {
        return {
          ...news,
          category: "Geral"
        };
      }

      return news;
    });

    saveData(DATA);

    res.json({
      success: true,
      newsCategories:
        DATA.newsCategories,
      news: DATA.news
    });
  }
);

/* =========================
   NEWS
========================= */

app.post(
  "/api/admin/news",
  adminOnly,
  (req, res) => {
    const category =
      cleanText(
        req.body.category || "Geral",
        40
      );

    const title =
      cleanText(req.body.title, 120);

    const description =
      cleanText(
        req.body.description,
        500
      );

    const image =
      cleanText(req.body.image, 500);

    if (!title) {
      return res.status(400).json({
        error:
          "Informe o título da notícia."
      });
    }

    if (!description) {
      return res.status(400).json({
        error:
          "Informe a descrição da notícia."
      });
    }

    if (
      !DATA.newsCategories.includes(
        category
      )
    ) {
      return res.status(400).json({
        error:
          "Categoria inválida."
      });
    }

    if (!validUrl(image)) {
      return res.status(400).json({
        error:
          "O link da imagem é inválido."
      });
    }

    DATA.news.unshift({
      id: generateId("news"),
      category,
      title,
      description,
      image,
      createdAt: Date.now()
    });

    saveData(DATA);

    res.json({
      success: true,
      news: DATA.news
    });
  }
);

app.delete(
  "/api/admin/news/:id",
  adminOnly,
  (req, res) => {
    const id =
      String(req.params.id);

    const before =
      DATA.news.length;

    DATA.news =
      DATA.news.filter(
        news =>
          String(news.id) !== id
      );

    if (
      DATA.news.length === before
    ) {
      return res.status(404).json({
        error:
          "Notícia não encontrada."
      });
    }

    saveData(DATA);

    res.json({
      success: true,
      news: DATA.news
    });
  }
);

/* =========================
   PLAYERS
========================= */

app.post(
  "/api/admin/players",
  adminOnly,
  (req, res) => {
    const id =
      Number(req.body.id);

    const nick =
      cleanText(req.body.nick, 40);

    const cls =
      String(
        req.body.class || ""
      ).toUpperCase();

    const role =
      String(
        req.body.role || "PLAYER"
      ).toUpperCase();

    const overall =
      Number(req.body.overall);

    const teamId =
      req.body.teamId
        ? String(req.body.teamId)
        : null;

    if (
      !Number.isInteger(id) ||
      id < 1
    ) {
      return res.status(400).json({
        error:
          "O ID precisa ser um número inteiro válido."
      });
    }

    if (!nick) {
      return res.status(400).json({
        error:
          "Informe o nick do jogador."
      });
    }

    if (
      !CLASS_ORDER.includes(cls)
    ) {
      return res.status(400).json({
        error:
          "Classe inválida."
      });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({
        error:
          "Cargo inválido."
      });
    }

    if (
      !Number.isFinite(overall) ||
      overall < 0 ||
      overall > 100
    ) {
      return res.status(400).json({
        error:
          "Overall precisa estar entre 0 e 100."
      });
    }

    if (
      DATA.players.some(
        player =>
          Number(player.id) === id
      )
    ) {
      return res.status(400).json({
        error:
          "Esse ID já está sendo usado."
      });
    }

    if (teamId) {
      const team =
        getTeam(teamId);

      if (!team) {
        return res.status(400).json({
          error:
            "Time não encontrado."
        });
      }

      const count =
        DATA.players.filter(
          player =>
            String(player.teamId) ===
            teamId
        ).length;

      if (count >= 16) {
        return res.status(400).json({
          error:
            "Esse time já possui 16 jogadores."
        });
      }
    }

    let wage;

    if (cls === "X") {
      wage =
        Number(req.body.wage);

      if (
        !X_WAGES.includes(wage)
      ) {
        return res.status(400).json({
          error:
            "Escolha um wage válido para a classe X."
        });
      }
    } else {
      wage = FIXED_WAGES[cls];
    }

    DATA.players.push({
      id,
      nick,
      class: cls,
      wage,
      teamId,
      role,
      overall:
        Math.round(overall),
      createdAt: Date.now()
    });

    saveData(DATA);

    res.json({
      success: true,
      players: DATA.players
    });
  }
);

app.delete(
  "/api/admin/players/:id",
  adminOnly,
  (req, res) => {
    const id =
      Number(req.params.id);

    const exists =
      DATA.players.some(
        player =>
          Number(player.id) === id
      );

    if (!exists) {
      return res.status(404).json({
        error:
          "Jogador não encontrado."
      });
    }

    DATA.players =
      DATA.players.filter(
        player =>
          Number(player.id) !== id
      );

    DATA.selections =
      DATA.selections.map(
        selection => ({
          ...selection,
          players:
            selection.players.filter(
              playerId =>
                Number(playerId) !== id
            )
        })
      );

    saveData(DATA);

    res.json({
      success: true,
      players: DATA.players,
      selections:
        DATA.selections
    });
  }
);

/* =========================
   TEAMS
========================= */

app.post(
  "/api/admin/teams",
  adminOnly,
  (req, res) => {
    const name =
      cleanText(req.body.name, 60);

    const color =
      cleanText(
        req.body.color || "#171717",
        30
      );

    const logo =
      cleanText(req.body.logo, 500);

    if (!name) {
      return res.status(400).json({
        error:
          "Informe o nome do time."
      });
    }

    if (!validUrl(logo)) {
      return res.status(400).json({
        error:
          "O link do logo é inválido."
      });
    }

    if (
      DATA.teams.some(
        team =>
          team.name.toLowerCase() ===
          name.toLowerCase()
      )
    ) {
      return res.status(400).json({
        error:
          "Esse time já existe."
      });
    }

    DATA.teams.push({
      id: generateId("team"),
      name,
      color,
      logo
    });

    saveData(DATA);

    res.json({
      success: true,
      teams: DATA.teams
    });
  }
);

app.delete(
  "/api/admin/teams/:id",
  adminOnly,
  (req, res) => {
    const id =
      String(req.params.id);

    const exists =
      DATA.teams.some(
        team =>
          String(team.id) === id
      );

    if (!exists) {
      return res.status(404).json({
        error:
          "Time não encontrado."
      });
    }

    DATA.teams =
      DATA.teams.filter(
        team =>
          String(team.id) !== id
      );

    DATA.players =
      DATA.players.map(player => {
        if (
          String(player.teamId) === id
        ) {
          return {
            ...player,
            teamId: null
          };
        }

        return player;
      });

    saveData(DATA);

    res.json({
      success: true,
      teams: DATA.teams,
      players: DATA.players
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
    const name =
      cleanText(
        req.body.name,
        60
      );

    const color =
      cleanText(
        req.body.color || "#171717",
        30
      );

    const logo =
      cleanText(
        req.body.logo,
        500
      );

    const players =
      Array.isArray(req.body.players)
        ? req.body.players
            .map(Number)
            .filter(Number.isInteger)
        : [];

    if (!name) {
      return res.status(400).json({
        error:
          "Informe o nome da seleção."
      });
    }

    if (!validUrl(logo)) {
      return res.status(400).json({
        error:
          "O link do logo é inválido."
      });
    }

    if (players.length > 16) {
      return res.status(400).json({
        error:
          "Uma seleção pode ter no máximo 16 jogadores."
      });
    }

    const uniquePlayers = [
      ...new Set(players)
    ];

    const validPlayers =
      uniquePlayers.filter(id =>
        DATA.players.some(
          player =>
            Number(player.id) === id
        )
      );

    if (
      validPlayers.length !==
      uniquePlayers.length
    ) {
      return res.status(400).json({
        error:
          "Um ou mais jogadores não existem."
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
        error:
          "Essa seleção já existe."
      });
    }

    DATA.selections.push({
      id: generateId("selection"),
      name,
      color,
      logo,
      players:
        validPlayers.slice(0, 16)
    });

    saveData(DATA);

    res.json({
      success: true,
      selections:
        DATA.selections
    });
  }
);

app.delete(
  "/api/admin/selections/:id",
  adminOnly,
  (req, res) => {
    const id =
      String(req.params.id);

    const exists =
      DATA.selections.some(
        selection =>
          String(selection.id) === id
      );

    if (!exists) {
      return res.status(404).json({
        error:
          "Seleção não encontrada."
      });
    }

    DATA.selections =
      DATA.selections.filter(
        selection =>
          String(selection.id) !== id
      );

    saveData(DATA);

    res.json({
      success: true,
      selections:
        DATA.selections
    });
  }
);

/* =========================
   SPA FALLBACK
========================= */

app.use(
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `UTL Site rodando na porta ${PORT}`
    );
  }
);
