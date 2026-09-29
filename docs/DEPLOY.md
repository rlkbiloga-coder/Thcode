# DEPLOY

## Frontend (GitHub Pages)
Já configurado via workflow (.github/workflows/pages.yml): push em main publica frontend/.
URL: https://rlkbiloga-coder.github.io/Thcode/

Alternativas: Vercel/Netlify/Cloudflare Pages apontando o build para a pasta `frontend/`.

## Backend (onde o PTY/terminal funciona)
O backend precisa de um servidor Node real. Opções:

### Railway
1. Importe o repositório, escolha "backend" como root directory
2. Variáveis: THCODE_API_TOKEN, WORKSPACE_DIR=/data/workspace (volume)
3. Deploy. A URL pública é a que você cola no painel Servidor do app.

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
