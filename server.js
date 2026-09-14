const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "utl-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   BANCO DE DADOS
========================= */

const defaultData = {
  links: {
    discord: "",
    tiktok: ""
  },

  tableUrl: "",

  categories: [
    {
      id: "geral",
      name: "Geral"
    }
  ],

  news: [],

  players: [],

  teams: [],

  selections: []
};

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(defaultData, null, 2)
      );

      return JSON.parse(JSON.stringify(defaultData));
    }

    const file = fs.readFileSync(DATA_FILE, "utf8");

    if (!file.trim()) {
      return JSON.parse(JSON.stringify(defaultData));
    }

    const data = JSON.parse(file);

    return {
      ...defaultData,
      ...data,
      links: {
        ...defaultData.links,
        ...(data.links || {})
      },
      categories: data.categories || [],
      news: data.news || [],
      players: data.players || [],
      teams: data.teams || [],
      selections: data.selections || []
    };
  } catch (error) {
    console.error("Erro ao carregar data.json:", error);

    return JSON.parse(JSON.stringify(defaultData));
  }
}

let data = loadData();

function saveData() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );
}

/* =========================
   ADMIN
========================= */

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({
      error: "Não autorizado"
    });
  }

  next();
}

/* LOGIN */

app.post("/api/admin/login", (req, res) => {
  const password = req.body.password;

  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    "ultimatetcsleaguesite6742";

  if (password === adminPassword) {
    req.session.isAdmin = true;

    return res.json({
      success: true
    });
  }

  return res.status(401).json({
    success: false,
    error: "Senha incorreta"
  });
});

/* STATUS */

app.get("/api/admin/status", (req, res) => {
  res.json({
    isAdmin: !!req.session.isAdmin
  });
});

/* LOGOUT */

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      success: true
    });
  });
});

/* =========================
   DADOS PÚBLICOS
========================= */

app.get("/api/data", (req, res) => {
  res.json(data);
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
    success: true,
    tableUrl: data.tableUrl
  });
});

/* =========================
   CATEGORIAS DE NOTÍCIAS
========================= */

app.post(
  "/api/admin/categories",
  requireAdmin,
  (req, res) => {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        error: "Nome da categoria obrigatório"
      });
    }

    const category = {
      id:
        Date.now().toString() +
        Math.random().toString(36).slice(2, 7),

      name
    };

    data.categories.push(category);

    saveData();

    res.json({
      success: true,
      category
    });
  }
);

app.delete(
  "/api/admin/categories/:id",
  requireAdmin,
  (req, res) => {
    const id = req.params.id;

    data.categories = data.categories.filter(
      category => category.id !== id
    );

    /*
      Notícias dessa categoria passam para
      nenhuma categoria.
    */

    data.news = data.news.map(news => {
      if (news.categoryId === id) {
        return {
          ...news,
          categoryId: ""
        };
      }

      return news;
    });

    saveData();

    res.json({
      success: true
    });
  }
);

/* =========================
   NOTÍCIAS
========================= */

app.post(
  "/api/admin/news",
  requireAdmin,
  (req, res) => {
    const title = String(req.body.title || "").trim();
    const description = String(
      req.body.description || ""
    ).trim();

    const image = String(
      req.body.image || ""
    ).trim();

    const categoryId = String(
      req.body.categoryId || ""
    ).trim();

    if (!title || !description) {
      return res.status(400).json({
        error: "Título e descrição são obrigatórios"
      });
    }

    const news = {
      id:
        Date.now().toString() +
        Math.random().toString(36).slice(2, 7),

      title,
      description,
      image,
      categoryId,

      createdAt: new Date().toISOString()
    };

    data.news.unshift(news);

    saveData();

    res.json({
      success: true,
      news
    });
  }
);

app.delete(
  "/api/admin/news/:id",
  requireAdmin,
  (req, res) => {
    const id = req.params.id;

    data.news = data.news.filter(
      news => news.id !== id
    );

    saveData();

    res.json({
      success: true
    });
  }
);

/* =========================
   CLASSES E SALÁRIOS
========================= */

const wageTable = {
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
  "S+": "350K",

  "X": "380K-400K"
};

app.get("/api/classes", (req, res) => {
  res.json({
    classes: [
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
    ],

    wages: wageTable
  });
});

/* =========================
   JOGADORES
========================= */

/*
  IMPORTANTE:
  Essa rota vem ANTES de /:id
  para não ser interpretada como um ID.
*/

app.put(
  "/api/admin/players/reorder",
  requireAdmin,
  (req, res) => {
    const orderedIds = req.body.orderedIds;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        error: "orderedIds precisa ser uma lista"
      });
    }

    const playersById = new Map(
      data.players.map(player => [
        player.id,
        player
      ])
    );

    const reordered = [];

    for (const id of orderedIds) {
      if (playersById.has(id)) {
        reordered.push(playersById.get(id));
        playersById.delete(id);
      }
    }

    /*
      Mantém jogadores que não estavam
      na lista enviada.
    */

    for (const player of playersById.values()) {
      reordered.push(player);
    }

    data.players = reordered;

    saveData();

    res.json({
      success: true,
      players: data.players
    });
  }
);

/* CRIAR JOGADOR */

app.post(
  "/api/admin/players",
  requireAdmin,
  (req, res) => {
    const nick = String(
      req.body.nick || ""
    ).trim();

    const playerClass = String(
      req.body.class || ""
    ).trim();

    const teamId = String(
      req.body.teamId || ""
    ).trim();

    const freeAgent =
      !!req.body.freeAgent;

    if (!nick) {
      return res.status(400).json({
        error: "Nick obrigatório"
      });
    }

    if (!wageTable[playerClass]) {
      return res.status(400).json({
        error: "Classe inválida"
      });
    }

    const player = {
      id:
        Date.now().toString() +
        Math.random().toString(36).slice(2, 7),

      nick,
      class: playerClass,

      teamId:
        freeAgent ? "" : teamId,

      freeAgent,

      wage: wageTable[playerClass]
    };

    data.players.push(player);

    saveData();

    res.json({
      success: true,
      player
    });
  }
);

/* EDITAR JOGADOR */

app.put(
  "/api/admin/players/:id",
  requireAdmin,
  (req, res) => {
    const player = data.players.find(
      player =>
        player.id === req.params.id
    );

    if (!player) {
      return res.status(404).json({
        error: "Jogador não encontrado"
      });
    }

    if (req.body.nick !== undefined) {
      player.nick = String(
        req.body.nick
      ).trim();
    }

    if (req.body.class !== undefined) {
      const newClass = String(
        req.body.class
      ).trim();

      if (!wageTable[newClass]) {
        return res.status(400).json({
          error: "Classe inválida"
        });
      }

      player.class = newClass;
      player.wage = wageTable[newClass];
    }

    if (req.body.teamId !== undefined) {
      player.teamId =
        String(req.body.teamId || "");
    }

    if (req.body.freeAgent !== undefined) {
      player.freeAgent =
        !!req.body.freeAgent;

      if (player.freeAgent) {
        player.teamId = "";
      }
    }

    saveData();

    res.json({
      success: true,
      player
    });
  }
);

/* DELETAR JOGADOR */

app.delete(
  "/api/admin/players/:id",
  requireAdmin,
  (req, res) => {
    const id = req.params.id;

    data.players = data.players.filter(
      player => player.id !== id
    );

    /*
      Também remove o jogador das
      seleções e times.
    */

    data.teams = data.teams.map(team => ({
      ...team,
      playerIds: (team.playerIds || []).filter(
        playerId => playerId !== id
      )
    }));

    data.selections =
      data.selections.map(selection => ({
        ...selection,
        playerIds:
          (selection.playerIds || []).filter(
            playerId => playerId !== id
          )
      }));

    saveData();

    res.json({
      success: true
    });
  }
);

/* =========================
   TIMES
========================= */

/* CRIAR TIME */

app.post(
  "/api/admin/teams",
  requireAdmin,
  (req, res) => {
    const name = String(
      req.body.name || ""
    ).trim();

    const logo = String(
      req.body.logo || ""
    ).trim();

    if (!name) {
      return res.status(400).json({
        error: "Nome do time obrigatório"
      });
    }

    const team = {
      id:
        Date.now().toString() +
        Math.random().toString(36).slice(2, 7),

      name,
      logo,

      playerIds: []
    };

    data.teams.push(team);

    saveData();

    res.json({
      success: true,
      team
    });
  }
);

/* EDITAR TIME */

app.put(
  "/api/admin/teams/:id",
  requireAdmin,
  (req, res) => {
    const team = data.teams.find(
      team =>
        team.id === req.params.id
    );

    if (!team) {
      return res.status(404).json({
        error: "Time não encontrado"
      });
    }

    if (req.body.name !== undefined) {
      team.name = String(
        req.body.name
      ).trim();
    }

    if (req.body.logo !== undefined) {
      team.logo = String(
        req.body.logo
      ).trim();
    }

    if (Array.isArray(req.body.playerIds)) {
      team.playerIds = req.body.playerIds;
    }

    saveData();

    res.json({
      success: true,
      team
    });
  }
);

/* DELETAR TIME */

app.delete(
  "/api/admin/teams/:id",
  requireAdmin,
  (req, res) => {
    const id = req.params.id;

    data.teams = data.teams.filter(
      team => team.id !== id
    );

    /*
      Jogadores desse time ficam
      como Free Agent.
    */

    data.players = data.players.map(
      player => {
        if (player.teamId === id) {
          return {
            ...player,
            teamId: "",
            freeAgent: true
          };
        }

        return player;
      }
    );

    saveData();

    res.json({
      success: true
    });
  }
);

/* =========================
   SELEÇÕES
========================= */

/* CRIAR SELEÇÃO */

app.post(
  "/api/admin/selections",
  requireAdmin,
  (req, res) => {
    const name = String(
      req.body.name || ""
    ).trim();

    const logo = String(
      req.body.logo || ""
    ).trim();

    if (!name) {
      return res.status(400).json({
        error: "Nome da seleção obrigatório"
      });
    }

    const selection = {
      id:
        Date.now().toString() +
        Math.random().toString(36).slice(2, 7),

      name,
      logo,

      playerIds: []
    };

    data.selections.push(selection);

    saveData();

    res.json({
      success: true,
      selection
    });
  }
);

/* EDITAR SELEÇÃO */

app.put(
  "/api/admin/selections/:id",
  requireAdmin,
  (req, res) => {
    const selection =
      data.selections.find(
        selection =>
          selection.id === req.params.id
      );

    if (!selection) {
      return res.status(404).json({
        error: "Seleção não encontrada"
      });
    }

    if (req.body.name !== undefined) {
      selection.name = String(
        req.body.name
      ).trim();
    }

    if (req.body.logo !== undefined) {
      selection.logo = String(
        req.body.logo
      ).trim();
    }

    if (Array.isArray(req.body.playerIds)) {
      selection.playerIds =
        req.body.playerIds;
    }

    saveData();

    res.json({
      success: true,
      selection
    });
  }
);

/* DELETAR SELEÇÃO */

app.delete(
  "/api/admin/selections/:id",
  requireAdmin,
  (req, res) => {
    const id = req.params.id;

    data.selections =
      data.selections.filter(
        selection =>
          selection.id !== id
      );

    saveData();

    res.json({
      success: true
    });
  }
);

/* =========================
   ROTA DO SITE
========================= */

/*
  NÃO usar app.get("*") no Express 5.
*/

app.use((req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(PORT, () => {
  console.log(
    `UTL Site rodando na porta ${PORT}`
  );
});
