const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ultimatetcsleaguesite6742";
const DATA_FILE = path.join(__dirname, "data.json");

const DEFAULT_DATA = { links:{discord:"",tiktok:"",tabela:""}, newsCategories:["Geral"], news:[], players:[], selections:[], teams:[] };
function loadData(){try{return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));}catch{fs.writeFileSync(DATA_FILE,JSON.stringify(DEFAULT_DATA,null,2));return JSON.parse(JSON.stringify(DEFAULT_DATA));}}
function saveData(d){fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2));}
let data=loadData();
if(!Array.isArray(data.players)) data.players=[];
data.players.forEach((p,i)=>{if(typeof p.order!=="number")p.order=i;});
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true,limit:"10mb"}));
app.use(session({secret:process.env.SESSION_SECRET||"change-this-session-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:false}}));
app.use(express.static(path.join(__dirname,"public")));
function admin(req,res,next){if(!req.session.admin)return res.status(401).json({error:"Não autorizado."});next();}
app.get("/api/data",(req,res)=>res.json(data));
app.post("/api/admin/login",(req,res)=>{if(req.body.password!==ADMIN_PASSWORD)return res.status(401).json({error:"Senha incorreta."});req.session.admin=true;res.json({ok:true});});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/status",(req,res)=>res.json({admin:!!req.session.admin}));
app.put("/api/admin/links",admin,(req,res)=>{data.links={discord:String(req.body.discord||""),tiktok:String(req.body.tiktok||""),tabela:String(req.body.tabela||"")};saveData(data);res.json({ok:true,data});});
app.post("/api/admin/categories",admin,(req,res)=>{const n=String(req.body.name||"").trim();if(!n)return res.status(400).json({error:"Nome inválido."});if(!data.newsCategories.includes(n))data.newsCategories.push(n);saveData(data);res.json({ok:true,data});});
app.delete("/api/admin/categories/:name",admin,(req,res)=>{const n=decodeURIComponent(req.params.name);if(n==="Geral")return res.status(400).json({error:"A categoria Geral não pode ser excluída."});data.newsCategories=data.newsCategories.filter(x=>x!==n);data.news.forEach(x=>{if(x.category===n)x.category="Geral"});saveData(data);res.json({ok:true,data});});
app.post("/api/admin/news",admin,(req,res)=>{const {title,description,image,category}=req.body;if(!title||!description)return res.status(400).json({error:"Título e descrição são obrigatórios."});data.news.unshift({id:Date.now().toString(),title:String(title),description:String(description),image:String(image||""),category:data.newsCategories.includes(category)?category:"Geral",createdAt:new Date().toISOString()});saveData(data);res.json({ok:true,data});});
app.put("/api/admin/news/:id",admin,(req,res)=>{const n=data.news.find(x=>x.id===req.params.id);if(!n)return res.status(404).json({error:"Notícia não encontrada."});n.title=String(req.body.title||n.title);n.description=String(req.body.description||n.description);n.image=String(req.body.image||"");n.category=data.newsCategories.includes(req.body.category)?req.body.category:"Geral";saveData(data);res.json({ok:true,data});});
app.delete("/api/admin/news/:id",admin,(req,res)=>{data.news=data.news.filter(x=>x.id!==req.params.id);saveData(data);res.json({ok:true,data});});
const classes=["D","C-","C","C+","B-","B","B+","A-","A","A+","S-","S","S+","X"];
const wages={"D":"75K","C-":"85K","C":"90K","C+":"100K","B-":"125K","B":"150K","B+":"175K","A-":"200K","A":"250K","A+":"275K","S-":"300K","S":"325K","S+":"350K","X":"380K–400K"};
app.get("/api/classes",(req,res)=>res.json({classes,wages}));
app.post("/api/admin/players",admin,(req,res)=>{const {name,username,className,team}=req.body;if(!name||!classes.includes(className))return res.status(400).json({error:"Nome e classe válida são obrigatórios."});const max=data.players.reduce((m,p)=>Math.max(m,Number(p.order)||0),-1);data.players.push({id:Date.now().toString(),name:String(name),username:String(username||""),className,wage:wages[className],team:String(team||"FREE AGENT"),order:max+1});saveData(data);res.json({ok:true,data});});
app.put("/api/admin/players/:id",admin,(req,res)=>{const p=data.players.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"Jogador não encontrado."});if(req.body.className&&classes.includes(req.body.className)){p.className=req.body.className;p.wage=wages[p.className];}if(req.body.name!==undefined)p.name=String(req.body.name||p.name);if(req.body.username!==undefined)p.username=String(req.body.username||"");if(req.body.team!==undefined)p.team=String(req.body.team||"FREE AGENT");saveData(data);res.json({ok:true,data});});
app.post("/api/admin/players/reorder",admin,(req,res)=>{if(!Array.isArray(req.body.ids))return res.status(400).json({error:"Ordem inválida."});const ids=req.body.ids.map(String);const map=new Map(data.players.map(p=>[String(p.id),p]));ids.forEach((id,i)=>{if(map.has(id))map.get(id).order=i;});const missing=data.players.filter(p=>!ids.includes(String(p.id)));missing.forEach((p,i)=>p.order=ids.length+i);saveData(data);res.json({ok:true,data});});
app.delete("/api/admin/players/:id",admin,(req,res)=>{data.players=data.players.filter(x=>x.id!==req.params.id);data.selections.forEach(s=>s.players=s.players.filter(id=>id!==req.params.id));data.teams.forEach(t=>t.players=t.players.filter(id=>id!==req.params.id));saveData(data);res.json({ok:true,data});});
function saveClub(collection,body,res){const {name,logo,players}=body;if(!name)return res.status(400).json({error:"Nome obrigatório."});collection.push({id:Date.now().toString(),name:String(name),logo:String(logo||""),players:Array.isArray(players)?players:[]});saveData(data);res.json({ok:true,data});}
app.post("/api/admin/selections",admin,(req,res)=>saveClub(data.selections,req.body,res));app.post("/api/admin/teams",admin,(req,res)=>saveClub(data.teams,req.body,res));
app.put("/api/admin/selections/:id",admin,(req,res)=>{const x=data.selections.find(x=>x.id===req.params.id);if(!x)return res.status(404).json({error:"Seleção não encontrada."});x.name=String(req.body.name||x.name);x.logo=String(req.body.logo||"");x.players=Array.isArray(req.body.players)?req.body.players:[];saveData(data);res.json({ok:true,data});});
app.put("/api/admin/teams/:id",admin,(req,res)=>{const x=data.teams.find(x=>x.id===req.params.id);if(!x)return res.status(404).json({error:"Time não encontrado."});x.name=String(req.body.name||x.name);x.logo=String(req.body.logo||"");x.players=Array.isArray(req.body.players)?req.body.players:[];saveData(data);res.json({ok:true,data});});
app.delete("/api/admin/selections/:id",admin,(req,res)=>{data.selections=data.selections.filter(x=>x.id!==req.params.id);saveData(data);res.json({ok:true,data});});
app.delete("/api/admin/teams/:id",admin,(req,res)=>{data.teams=data.teams.filter(x=>x.id!==req.params.id);saveData(data);res.json({ok:true,data});});
app.listen(PORT,"0.0.0.0",()=>console.log(`UTL Site rodando na porta ${PORT}`));
