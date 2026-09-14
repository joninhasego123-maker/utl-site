const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  "ultimatetcsleaguesite6742";

const DATA_FILE =
  path.join(__dirname, "data.json");


/* =========================
   APP
   ========================= */

app.use(express.json({
  limit: "5mb"
}));

app.use(express.urlencoded({
  extended: true
}));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "utl-session-secret",

    resave: false,

    saveUninitialized: false,

    cookie: {
      maxAge:
        1000 * 60 * 60 * 24
    }
  })
);


/* =========================
   DADOS PADRÃO
   ========================= */

const DEFAULT_DATA = {
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


/* =========================
   BANCO JSON
   ========================= */

function ensureDataFile() {

  if (!fs.existsSync(DATA_FILE)) {

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        DEFAULT_DATA,
        null,
        2
      )
    );

  }

}


function normalizeData(data) {

  const result = {
    ...DEFAULT_DATA,
    ...data
  };


  result.links = {
    ...DEFAULT_DATA.links,
    ...(data.links || {})
  };


  result.newsCategories =
    Array.isArray(
      data.newsCategories
    )
      ? data.newsCategories
      : ["Geral"];


  if (
    !result.newsCategories.includes(
      "Geral"
    )
  ) {
    result.newsCategories.unshift(
      "Geral"
    );
  }


  result.news =
    Array.isArray(data.news)
      ? data.news
      : [];


  result.players =
    Array.isArray(data.players)
      ? data.players
      : [];


  result.selections =
    Array.isArray(data.selections)
      ? data.selections
      : [];


  result.teams =
    Array.isArray(data.teams)
      ? data.teams
      : [];


  return result;
}


function readData() {

  ensureDataFile();

  try {

    const raw =
      fs.readFileSync(
        DATA_FILE,
        "utf8"
      );

    return normalizeData(
      JSON.parse(raw)
    );

  } catch (error) {

    console.error(
      "Erro ao ler data.json:",
      error
    );

    return normalizeData(
      DEFAULT_DATA
    );

  }

}


function writeData(data) {

  fs.writeFileSync(
    DATA_FILE,

    JSON.stringify(
      normalizeData(data),
      null,
      2
    )
  );

}


/* =========================
   ID
   ========================= */

function generateId(prefix) {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );

}


/* =========================
   ADMIN
   ========================= */

function requireAdmin(
  req,
  res,
  next
) {

  if (!req.session.admin) {

    return res.status(401).json({
      error:
        "Você precisa estar logado como administrador."
    });

  }

  next();

}


/* =========================
   DATA PÚBLICA
   ========================= */

app.get(
  "/api/data",
  (req, res) => {

    res.json(
      readData()
    );

  }
);


/* =========================
   STATUS ADMIN
   ========================= */

app.get(
  "/api/admin/status",
  (req, res) => {

    res.json({
      admin:
        !!req.session.admin
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
      String(
        req.body.password || ""
      );


    if (
      password !==
      ADMIN_PASSWORD
    ) {

      return res.status(401).json({
        error:
          "Senha incorreta."
      });

    }


    req.session.admin = true;


    res.json({
      success: true
    });

  }
);


/* =========================
   LOGOUT
   ========================= */

app.post(
  "/api/admin/logout",
  (req, res) => {

    req.session.destroy(
      error => {

        if (error) {

          return res.status(500)
            .json({
              error:
                "Não foi possível sair."
            });

        }


        res.json({
          success: true
        });

      }
    );

  }
);


/* =========================
   LINKS
   ========================= */

app.put(
  "/api/admin/links",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    data.links = {

      discord:
        String(
          req.body.discord || ""
        ).trim(),

      tiktok:
        String(
          req.body.tiktok || ""
        ).trim(),

      tabela:
        String(
          req.body.tabela || ""
        ).trim()

    };


    writeData(data);


    res.json({
      success: true,
      links: data.links
    });

  }
);


/* =========================
   CATEGORIAS NEWS
   ========================= */

app.post(
  "/api/admin/categories",
  requireAdmin,
  (req, res) => {

    const name =
      String(
        req.body.name || ""
      ).trim();


    if (!name) {

      return res.status(400).json({
        error:
          "Nome da categoria obrigatório."
      });

    }


    const data =
      readData();


    const exists =
      data.newsCategories.some(
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


    data.newsCategories.push(
      name
    );


    writeData(data);


    res.json({
      success: true,
      categories:
        data.newsCategories
    });

  }
);


app.delete(
  "/api/admin/categories/:name",
  requireAdmin,
  (req, res) => {

    const name =
      decodeURIComponent(
        req.params.name
      );


    if (
      name.toLowerCase() ===
      "geral"
    ) {

      return res.status(400).json({
        error:
          "A categoria Geral não pode ser excluída."
      });

    }


    const data =
      readData();


    data.newsCategories =
      data.newsCategories.filter(
        category =>
          category !== name
      );


    data.news =
      data.news.map(news => {

        if (
          news.category === name
        ) {

          return {
            ...news,
            category: "Geral"
          };

        }

        return news;

      });


    writeData(data);


    res.json({
      success: true
    });

  }
);


/* =========================
   NEWS
   ========================= */

app.post(
  "/api/admin/news",
  requireAdmin,
  (req, res) => {

    const title =
      String(
        req.body.title || ""
      ).trim();


    const description =
      String(
        req.body.description || ""
      ).trim();


    const image =
      String(
        req.body.image || ""
      ).trim();


    const category =
      String(
        req.body.category ||
        "Geral"
      ).trim();


    if (
      !title ||
      !description
    ) {

      return res.status(400).json({
        error:
          "Título e descrição são obrigatórios."
      });

    }


    const data =
      readData();


    if (
      !data.newsCategories.includes(
        category
      )
    ) {

      return res.status(400).json({
        error:
          "Categoria inválida."
      });

    }


    const news = {

      id:
        generateId("news"),

      title,

      description,

      image,

      category,

      createdAt:
        new Date().toISOString()

    };


    data.news.unshift(
      news
    );


    writeData(data);


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

    const data =
      readData();


    const before =
      data.news.length;


    data.news =
      data.news.filter(
        news =>
          String(news.id) !==
          String(req.params.id)
      );


    if (
      data.news.length ===
      before
    ) {

      return res.status(404).json({
        error:
          "Notícia não encontrada."
      });

    }


    writeData(data);


    res.json({
      success: true
    });

  }
);


/* =========================
   JOGADORES
   ========================= */

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


function getClassIndex(
  playerClass
) {

  const index =
    CLASS_ORDER.indexOf(
      String(
        playerClass || "D"
      ).toUpperCase()
    );


  return index === -1
    ? CLASS_ORDER.length - 1
    : index;

}


function getBaseClass(
  playerClass
) {

  const value =
    String(
      playerClass || "D"
    ).toUpperCase();


  if (value === "X") {
    return "X";
  }


  return value.charAt(0);

}


/*
  Reorganiza automaticamente:

  S+  primeiro
  S   depois
  S-  último

  A+  primeiro
  A   depois
  A-  último

  etc.

  Dentro da mesma classe,
  o campo order mantém a posição.
*/

function normalizePlayerOrder(
  players
) {

  const groups = {};


  players.forEach(player => {

    const group =
      getBaseClass(
        player.class
      );


    if (!groups[group]) {
      groups[group] = [];
    }


    groups[group].push(
      player
    );

  });


  Object.values(groups)
    .forEach(group => {

      group.sort(
        (a, b) => {

          const classDifference =
            getClassIndex(
              a.class
            ) -
            getClassIndex(
              b.class
            );


          if (
            classDifference !== 0
          ) {

            return classDifference;

          }


          return (
            Number(a.order) || 0
          ) -
          (
            Number(b.order) || 0
          );

        }
      );


      group.forEach(
        (player, index) => {

          player.order =
            index;

        }
      );

    });


  return players;
}


/* CRIAR JOGADOR */

app.post(
  "/api/admin/players",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    const id =
      String(
        req.body.id || ""
      ).trim();


    const nick =
      String(
        req.body.nick || ""
      ).trim();


    const playerClass =
      String(
        req.body.class || "D"
      ).toUpperCase();


    const role =
      String(
        req.body.role ||
        "PLAYER"
      ).trim();


    const teamId =
      String(
        req.body.teamId ||
        "FREE AGENT"
      );


    let overall =
      req.body.overall;


    if (!id || !nick) {

      return res.status(400).json({
        error:
          "ID e Nick são obrigatórios."
      });

    }


    if (
      data.players.some(
        player =>
          String(player.id) === id
      )
    ) {

      return res.status(400).json({
        error:
          "Já existe um jogador com esse ID."
      });

    }


    if (
      !CLASS_ORDER.includes(
        playerClass
      )
    ) {

      return res.status(400).json({
        error:
          "Classe inválida."
      });

    }


    if (
      ![
        "PLAYER",
        "ASSIST MANAGER",
        "MANAGER"
      ].includes(role)
    ) {

      return res.status(400).json({
        error:
          "Role inválida."
      });

    }


    if (
      overall === "" ||
      overall === null ||
      overall === undefined
    ) {

      overall = null;

    }

    else {

      overall =
        Number(overall);


      if (
        !Number.isFinite(
          overall
        ) ||
        overall < 0 ||
        overall > 100
      ) {

        return res.status(400).json({
          error:
            "Overall deve estar entre 0 e 100."
        });

      }

    }


    if (
      teamId !==
      "FREE AGENT"
    ) {

      const teamExists =
        data.teams.some(
          team =>
            String(team.id) ===
            String(teamId)
        );


      if (!teamExists) {

        return res.status(400).json({
          error:
            "Time não encontrado."
        });

      }


      const teamPlayers =
        data.players.filter(
          player =>
            String(
              player.teamId
            ) ===
            String(teamId)
        );


      if (
        teamPlayers.length >= 16
      ) {

        return res.status(400).json({
          error:
            "Esse time já tem 16 jogadores."
        });

      }

    }


    const player = {

      id,

      nick,

      class:
        playerClass,

      overall,

      teamId:
        teamId ===
        "FREE AGENT"
          ? null
          : teamId,

      role,

      freeAgent:
        teamId ===
        "FREE AGENT",

      order:
        data.players.length

    };


    data.players.push(
      player
    );


    normalizePlayerOrder(
      data.players
    );


    writeData(data);


    res.json({
      success: true,
      player
    });

  }
);


/* EXCLUIR JOGADOR */

app.delete(
  "/api/admin/players/:id",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    const before =
      data.players.length;


    data.players =
      data.players.filter(
        player =>
          String(player.id) !==
          String(req.params.id)
      );


    if (
      data.players.length ===
      before
    ) {

      return res.status(404).json({
        error:
          "Jogador não encontrado."
      });

    }


    data.selections =
      data.selections.map(
        selection => ({
          ...selection,

          players:
            (selection.players || [])
              .filter(
                id =>
                  String(id) !==
                  String(req.params.id)
              )

        })
      );


    normalizePlayerOrder(
      data.players
    );


    writeData(data);


    res.json({
      success: true
    });

  }
);


/* =========================
   ATUALIZAR JOGADOR
   ========================= */

app.put(
  "/api/admin/players/:id",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    const player =
      data.players.find(
        item =>
          String(item.id) ===
          String(req.params.id)
      );


    if (!player) {

      return res.status(404).json({
        error:
          "Jogador não encontrado."
      });

    }


    if (
      req.body.nick !== undefined
    ) {

      player.nick =
        String(
          req.body.nick
        ).trim();

    }


    if (
      req.body.class !== undefined
    ) {

      const newClass =
        String(
          req.body.class
        ).toUpperCase();


      if (
        !CLASS_ORDER.includes(
          newClass
        )
      ) {

        return res.status(400).json({
          error:
            "Classe inválida."
        });

      }


      player.class =
        newClass;

    }


    if (
      req.body.overall !==
      undefined
    ) {

      if (
        req.body.overall ===
          null ||
        req.body.overall === ""
      ) {

        player.overall =
          null;

      }

      else {

        const overall =
          Number(
            req.body.overall
          );


        if (
          !Number.isFinite(
            overall
          ) ||
          overall < 0 ||
          overall > 100
        ) {

          return res.status(400).json({
            error:
              "Overall inválido."
          });

        }


        player.overall =
          overall;

      }

    }


    if (
      req.body.role !== undefined
    ) {

      const role =
        String(
          req.body.role
        );


      if (
        ![
          "PLAYER",
          "ASSIST MANAGER",
          "MANAGER"
        ].includes(role)
      ) {

        return res.status(400).json({
          error:
            "Role inválida."
        });

      }


      player.role =
        role;

    }


    normalizePlayerOrder(
      data.players
    );


    writeData(data);


    res.json({
      success: true,
      player
    });

  }
);


/* =========================
   TIMES
   ========================= */

app.post(
  "/api/admin/teams",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    const name =
      String(
        req.body.name || ""
      ).trim();


    if (!name) {

      return res.status(400).json({
        error:
          "Nome do time obrigatório."
      });

    }


    const team = {

      id:
        generateId("team"),

      name,

      logo:
        String(
          req.body.logo || ""
        ).trim(),

      color:
        String(
          req.body.color ||
          "#15151b"
        ).trim(),

      link:
        String(
          req.body.link || ""
        ).trim(),

      players: []

    };


    data.teams.push(
      team
    );


    writeData(data);


    res.json({
      success: true,
      team
    });

  }
);


/* EXCLUIR TIME */

app.delete(
  "/api/admin/teams/:id",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    const team =
      data.teams.find(
        item =>
          String(item.id) ===
          String(req.params.id)
      );


    if (!team) {

      return res.status(404).json({
        error:
          "Time não encontrado."
      });

    }


    data.teams =
      data.teams.filter(
        item =>
          String(item.id) !==
          String(req.params.id)
      );


    /*
      Jogadores do time
      viram FREE AGENT.
    */

    data.players =
      data.players.map(
        player => {

          if (
            String(
              player.teamId
            ) ===
            String(req.params.id)
          ) {

            return {
              ...player,

              teamId: null,

              freeAgent: true

            };

          }


          return player;

        }
      );


    writeData(data);


    res.json({
      success: true
    });

  }
);


/* =========================
   SELEÇÕES
   ========================= */

app.post(
  "/api/admin/selections",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    const name =
      String(
        req.body.name || ""
      ).trim();


    const players =
      Array.isArray(
        req.body.players
      )
        ? req.body.players
        : [];


    if (!name) {

      return res.status(400).json({
        error:
          "Nome da seleção obrigatório."
      });

    }


    if (
      players.length > 16
    ) {

      return res.status(400).json({
        error:
          "Uma seleção pode ter no máximo 16 jogadores."
      });

    }


    const validPlayers =
      players.filter(
        id =>
          data.players.some(
            player =>
              String(player.id) ===
              String(id)
          )
      );


    if (
      validPlayers.length !==
      players.length
    ) {

      return res.status(400).json({
        error:
          "Um ou mais jogadores não existem."
      });

    }


    const selection = {

      id:
        generateId("selection"),

      name,

      logo:
        String(
          req.body.logo || ""
        ).trim(),

      color:
        String(
          req.body.color ||
          "#15151b"
        ).trim(),

      link:
        String(
          req.body.link || ""
        ).trim(),

      players:
        [...new Set(validPlayers)]

    };


    data.selections.push(
      selection
    );


    writeData(data);


    res.json({
      success: true,
      selection
    });

  }
);


/* EXCLUIR SELEÇÃO */

app.delete(
  "/api/admin/selections/:id",
  requireAdmin,
  (req, res) => {

    const data =
      readData();


    const before =
      data.selections.length;


    data.selections =
      data.selections.filter(
        selection =>
          String(selection.id) !==
          String(req.params.id)
      );


    if (
      data.selections.length ===
      before
    ) {

      return res.status(404).json({
        error:
          "Seleção não encontrada."
      });

    }


    writeData(data);


    res.json({
      success: true
    });

  }
);


/* =========================
   FALLBACK
   ========================= */

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


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


/* =========================
   INICIAR
   ========================= */

ensureDataFile();


app.listen(
  PORT,
  () => {

    console.log(
      `UTL Site rodando na porta ${PORT}`
    );

  }
);
