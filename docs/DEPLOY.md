# DEPLOY

## Frontend (GitHub Pages)
Já configurado via workflow (.github/workflows/pages.yml): push em main publica frontend/.
URL: https://rlkbiloga-coder.github.io/Thcode/

Alternativas: Vercel/Netlify/Cloudflare Pages apontando o build para a pasta `frontend/`.

## Backend (onde o PTY/terminal funciona)
O backend precisa de um servidor Node real. Opções:

### Railway (infraestrutura v2.6)
O `railway.json` usa `backend/Dockerfile`, Node 22 e `/api/ready`.
O contexto Docker é a raiz do repositório. Para esse modo, configure o serviço com Root Directory `/` e config file `/railway.json`, não `backend/`.

Variáveis no serviço `thcode-backend`:
1. Preserve `THCODE_API_TOKEN` existente. Não gire tokens de acesso usados pelo frontend sem planejar a troca.
2. `DATABASE_URL=${{Postgres.DATABASE_URL}}` e `REDIS_URL=${{Redis.REDIS_URL}}` referenciam os serviços já existentes. Nomes devem corresponder exatamente ao projeto.
3. `E2B_API_KEY` recebe a chave E2B do painel, exclusivamente no backend.
4. `E2B_WEBHOOK_SECRET` recebe o segredo compartilhado registrado no webhook E2B.
5. `CORS_ORIGINS=https://rlkbiloga-coder.github.io` (origem, sem o caminho `/Thcode/`).
6. `WORKSPACE_DIR=/app/workspace`. Monte um volume nesse caminho para arquivos persistirem entre deploys. O usuário `node` do container precisa de permissão de escrita.

A configuração em arquivo não registra automaticamente um webhook no E2B, não cria serviços Postgres/Redis e não monta volumes. Esses recursos precisam existir e ser verificados na conta.
O endpoint webhook é uma URL HTTPS do backend, nunca uma URL do GitHub Pages.

### Render (render.yaml resumo)
1. New → Blueprint (detecta o repo)
2. Add Environment Variable THCODE_API_TOKEN
3. Build: cd backend && npm install; Start: node src/server.js

### Fly.io
```bash
fly launch --no-deploy  # root: /backend, internal_port 8080
fly secrets set THCODE_API_TOKEN=...
fly deploy
```

### VPS / Docker
```bash
THCODE_API_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  docker compose up -d
```
Coloque um reverse proxy (Caddy/Nginx) com TLS na frente:
```caddy
seu-dominio.com {
  reverse_proxy localhost:8080
}
```
O WebSocket funciona automaticamente (Caddy faz o upgrade).

## APK Android (PWABuilder — real, gera APK assinável)
1. O PWA já tem manifest + ícones + SW (obrigatório)
2. Abra https://www.pwabuilder.com
3. Cole: https://rlkbiloga-coder.github.io/Thcode/
4. Start → Package for stores → Android → Download (.apk/.aab)
5. O PWABuilder assina com keystore próprio; para Play Store, gere seu keystore:
   keytool -genkey -v -keystore thcode.keystore -alias thcode -keyalg RSA -keysize 2048

## Google (SEO)
robots.txt + sitemap.xml já publicam a URL. Para acelerar a indexação:
1. https://search.google.com/search-console
2. Add property → URL Prefix → https://rlkbiloga-coder.github.io/Thcode/
3. Verify via GitHub (GitHub provides the meta tag in Pages settings)
4. Submit sitemap.xml
