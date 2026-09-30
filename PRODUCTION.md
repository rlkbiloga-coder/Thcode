# Thcode Production — Deployment & Setup Guide

## 🚀 Quick Start (60 segundos)

```bash
# Frontend (GitHub Pages)
git checkout feature/advanced-redesign
cd frontend
# Push para https://github.com/rlkbiloga-coder/Thcode/settings/pages
# Source: Branch `main`, `/frontend` folder
# Resultado: https://rlkbiloga-coder.github.io/Thcode/

# Backend (Railway, Render ou Fly)
cd ../backend
npm install
cp .env.example .env
# Edite .env com os valores reais:
# THCODE_API_TOKEN=<token-novo-gerado>
# GITHUB_TOKEN=<seu-token-github>
# GROQ_API_KEY=<sua-chave-ia>
npm start
```

## 📋 Production Checklist

- [x] Frontend hardening (CSP, CORS, headers)
- [x] Backend security (token auth, rate limit, path traversal bloqueado)
- [x] PWA pronto para offline
- [x] Manifest.json com logo real do app
- [x] Service Worker com cache network-first
- [x] Dashboard de status em tempo real
- [x] Glassmorphism UI com animações
- [x] Backend logging com leak redaction
- [x] API health check real
- [x] Stripe integration (pagamento REAL)

## 🔐 Security Hardening

### Frontend
```javascript
// CSP Headers (configure no seu servidor)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

### Backend
```javascript
// Helmet + CORS
app.use(helmet());
app.use(cors({ origin: isAllowedOrigin, credentials: true }));

// Rate limit: 300 requisições/min por IP
// Token auth: Bearer token + timing-safe comparison
// Path traversal: bloqueado com validação de workspace
```

## 🌍 Deploy Options

### 1. GitHub Pages (Frontend)
```bash
# Branch main, pasta /frontend como source
# URL: https://rlkbiloga-coder.github.io/Thcode/
```

### 2. Railway (Backend Recomendado)
```bash
# 1. Conecte seu repo: https://railway.app
# 2. Deploy com: 
#    THCODE_API_TOKEN=<gerado>
#    PORT=8080
# 3. Railway oferece domínio público automático
# 4. Copie a URL e configure no frontend
```

### 3. Render ou Fly.io (Alternativas)
```bash
# Render: render.yaml incluído
# Fly: fly.toml incluído
```

## 🔑 Variáveis de Ambiente (Backend)

```env
# Obrigatório
PORT=8080
HOST=0.0.0.0
THCODE_API_TOKEN=<gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
WORKSPACE_DIR=./workspace

# Segurança
ALLOWED_ORIGINS=https://rlkbiloga-coder.github.io,https://seu-dominio.com,http://localhost:3000
RATE_WINDOW_MS=60000
RATE_MAX=300
MAX_TERMINALS=5

# GitHub (opcional, para funcionalidades GitHub real)
GITHUB_TOKEN=<seu-pat-github>
GITHUB_CLIENT_ID=<seu-oauth-id>
GITHUB_CLIENT_SECRET=<seu-oauth-secret>

# IA (opcional, cada provedor é independente)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=<recomendado: grátis e rápido>
OPENROUTER_API_KEY=

# Pagamento (opcional, Stripe PRO)
STRIPE_SECRET_KEY=sk_live_xxx

# Analytics (opcional)
ANALYTICS_ENABLED=true
```

## 📡 Connecting Frontend to Backend

No arquivo `frontend/js/thcode-server.js`, configure:

```javascript
const API_URL = 'https://seu-backend.railway.app'; // ou seu domínio
const API_TOKEN = localStorage.getItem('thcode_api_token') || 'seu-token-temporário';
const WS_URL = 'wss://seu-backend.railway.app'; // WebSocket seguro

// Headers padrão
const AUTH_HEADERS = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json'
};
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test  # 19 testes de integração

# Frontend smoke tests
cd frontend
npm run test
```

## 📊 Monitoring

```bash
# Health check
curl -H "Authorization: Bearer YOUR_TOKEN" https://seu-backend/api/health

# Logs reais
curl -H "Authorization: Bearer YOUR_TOKEN" https://seu-backend/api/logs

# Analytics
curl -H "Authorization: Bearer YOUR_TOKEN" https://seu-backend/api/analytics
```

## 🎨 UI Components (Avançados)

### Advanced Dashboard (Real)
- Status de backend (online/offline)
- Memória em uso
- Runtime ativo
- Workspace info
- Animações de float + hover
- Glassmorphism com backdrop-filter

### Icons (65+)
- Todas as operações: files, search, plugins, terminal, git, etc.
- Logo real do app (Thcode)
- Ícones de status: online/offline, warning, success, error

### Temas
- Purple Neon (padrão)
- Dark (oficial)
- + 8 temas adicionais (OLED, Ocean, Bump, etc.)

## 🚨 Error Handling

- Nenhum erro expõe secrets ou paths internos
- Logging com redaction automática
- Status HTTP corretos: 401, 429, 503, etc.
- Mensagens de erro úteis mas seguras

## 📱 PWA Offline

- Funciona 100% offline (editor local + cache)
- Sincroniza com backend quando conectado
- Service Worker com cache network-first
- Instalável como app (Android/iOS)

## 🔗 Real Integration Points

1. **Terminal Real**: via node-pty (Linux/macOS) ou bash (Windows)
2. **Git Real**: executa git commands com validação
3. **GitHub Real**: API oficial (com token ou OAuth)
4. **SFTP Real**: ssh2 library (conexões verdadeiras)
5. **IA Real**: OpenAI, Anthropic, Gemini, Groq (chaves no backend)
6. **Stripe Real**: pagamento processado via API oficial

## 🎯 Next Steps

1. Gere um novo `THCODE_API_TOKEN`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Deploy backend em Railway/Render
3. Configure `ALLOWED_ORIGINS` no backend
4. Configure `API_URL` no frontend
5. Push para main e ative GitHub Pages

## 📚 Documentação Completa

- `docs/ARCHITECTURE.md` - Estrutura técnica
- `docs/SECURITY.md` - Segurança e boas práticas
- `docs/API.md` - Endpoints REST e WebSocket
- `docs/DEPLOY.md` - Deployment detalhado
- `docs/PLUGIN.md` - Sistema de plugins

## 🆘 Support

- Issues: https://github.com/rlkbiloga-coder/Thcode/issues
- Discussions: https://github.com/rlkbiloga-coder/Thcode/discussions
- Twitter/X: @rlkbiloga

---

**Thcode 2.5.0 • Production Ready • MIT License**

Última atualização: 2026-09-30
Branch: `feature/advanced-redesign`
Status: ✅ Pronto para produção
