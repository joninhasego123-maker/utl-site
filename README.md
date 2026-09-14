# UTL Site

Site oficial da ULTIMATE TCS LEAGUE.

## Render
Build Command: `npm install`
Start Command: `npm start`

Environment variables:
- `ADMIN_PASSWORD`: defina a senha do painel.
- `SESSION_SECRET`: coloque uma string aleatória longa.

## Importante
O projeto usa `data.json` para armazenamento local. No Render, o filesystem comum pode ser perdido em reinícios/deploys. Para produção, use um banco (ex.: Supabase/Postgres) ou Persistent Disk.

## Jogadores
As categorias X/S/A/B/C/D começam fechadas. A seta fica no fim do cabeçalho e muda de `⌃` para `⌄` quando aberta. Administradores podem arrastar jogadores para reorganizar a ordem dentro de cada categoria; a ordem é salva no servidor.
