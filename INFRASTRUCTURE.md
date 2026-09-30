# THCODE v3.0 — INFRAESTRUTURA AVANÇADA EM PRODUÇÃO

## 📋 Visão Geral

O Thcode v3.0 agora está totalmente configurado com uma infraestrutura de **nível empresarial** no Railway:

- **Multi-region**: SFO (2 replicas) + IAD (1 replica) para alta disponibilidade
- **Performance**: Brotli L11, connection pooling 20, 4 workers
- **Observabilidade**: Metrics, tracing, profiling, audit logging
- **Segurança**: CORS, CSP, rate limiting, JWT, 2FA, OAuth2, SAML
- **Storage**: PostgreSQL replicado + Redis persistente + S3 buckets
- **Webhooks**: Deployment & monitoring eventos

---

## 🚀 DEPLOY AUTOMÁTICO

### Estrutura Criada

```
/backend/src/
├── config/
│   └── advanced.config.js       ← Configuração centralizada
├── middleware/
│   ├── observability.js         ← Metrics, tracing, profiling
│   └── security.js              ← CORS, CSP, rate limit, JWT, 2FA
└── routes/
    └── health.js                ← Endpoints de saúde

/backend/prisma/
└── schema.prisma                ← Data model com audit + soft deletes

.env.example                      ← Template de variáveis
Dockerfile.advanced               ← Otimizado para produção
railway.json                      ← Configuração Railway
INFRASTRUCTURE.md                 ← Este arquivo
```

---

## ⚙️ CONFIGURAÇÃO RAILWAY

### Variáveis Ativas (50+)

Todas já **conectadas automaticamente** via Railway:

```bash
# Database
DATABASE_URL          → Postgres.DATABASE_URL
POSTGRES_HOST/PORT    → Postgres references
POSTGRES_USER/PASS    → Postgres references

# Cache
REDIS_URL             → Redis.REDIS_URL
REDIS_HOST/PORT/PASS  → Redis references

# Storage
S3_BUCKET_ASSETS      → thcode-assets-prod.BUCKET
S3_BUCKET_BACKUPS     → thcode-backups-prod.BUCKET
S3_ENDPOINT/REGION    → S3 references
S3_ACCESS_KEY/SECRET  → S3 references

# Observability
ENABLE_METRICS=true
ENABLE_TRACING=true
ENABLE_PROFILING=true
SENTRY_ENABLED=true
DATADOG_ENABLED=true
JAEGER_ENABLED=true

# Security
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
ENABLE_2FA=true
ENABLE_OAUTH2=true
ENABLE_SAML=true
RATE_LIMIT_MAX_REQUESTS=100
COMPRESSION_LEVEL=11
```

---

## 📊 ENDPOINTS CRÍTICOS

### Health Check
```bash
GET /api/health
→ Status completo com métricas
```

### Detailed Health
```bash
GET /api/health/detailed
→ Database pool, cache, storage, compression
```

---

## 🔒 SEGURANÇA IMPLEMENTADA

✅ **CORS** - Origins configuráveis  
✅ **CSP** - Content Security Policy  
✅ **Rate Limiting** - 100 req/60s por IP  
✅ **JWT** - 15m expiry + 7d refresh  
✅ **2FA** - TOTP + backup codes  
✅ **OAuth2** - Integração pronta  
✅ **SAML** - Enterprise SSO  
✅ **Data Masking** - Campos sensíveis mascarados  
✅ **Soft Deletes** - Dados nunca perdidos  
✅ **Data Versioning** - Histórico completo  
✅ **API Key Rotation** - Automática  
✅ **GDPR Compliance** - Audit logs com retenção  

---

## 📈 OBSERVABILIDADE

### Métricas
- HTTP request duration
- Database query performance
- Redis memory usage
- Error rates & stack traces

### Tracing
- Jaeger distributed tracing
- Request flow tracking
- Service dependencies

### Profiling
- CPU usage patterns
- Memory consumption
- Hotspot detection

### Audit Logging
- User actions
- API access
- Data changes
- Security events
- GDPR-compliant retention

---

## 🗄️ BANCO DE DADOS

### PostgreSQL
- **Replicas**: SFO + IAD (redundância)
- **Connection Pooling**: Max 200 conexões
- **Slow Query Logging**: Queries > 1s
- **SSL**: Habilitado por padrão
- **Backups**: Diários automáticos

### Redis
- **Replicas**: SFO + IAD (redundância)
- **Persistence**: RDB + AOF (everysec)
- **Memory**: 512MB com LRU eviction
- **TTL**: Configurável por cache type

### Prisma ORM
```bash
npm run prisma:migrate    # Migrações automáticas
npm run prisma:seed       # Seed de dados
npm run prisma:studio     # Visual data browser
```

---

## 📦 STORAGE (S3)

### Buckets
- **thcode-assets-prod** - Uploads, imagens, CDN
- **thcode-backups-prod** - Database backups

### Configuração
```javascript
// Automático via referências Railway
S3_BUCKET_ASSETS → thcode-assets-prod.BUCKET
S3_ENDPOINT → Endpoint Railway S3
S3_REGION → us-east-1
```

---

## 🔄 WEBHOOKS

### Deployment Events
- `Deployment.deployed` ✅
- `Deployment.failed` ❌
- `Deployment.crashed` 💥
- `Deployment.oom_killed` 🔴

**URL**: `https://thcode-backend.railway.app/api/webhooks/deployment`

### Monitor Events
- `Monitor.triggered` 🔔
- `Monitor.resolved` ✓
- `VolumeAlert.triggered` ⚠️
- `VolumeAlert.resolved` ✓

**URL**: `https://thcode-backend.railway.app/api/webhooks/monitor`

---

## 🚀 PRÓXIMOS PASSOS

1. **Mergear PR** - Code review
2. **Testar endpoints** - `/api/health`
3. **Validar logs** - Build + deployment logs
4. **Monitorar métricas** - CPU, memória, requisições
5. **Configurar observability** - Sentry, Datadog, Jaeger
6. **Setup domínio** - CNAME para thcode.com
7. **Load testing** - Verificar limite de replicas

---

## 📋 LIMITES HOBBY (Atual)

| Recurso | Limite | Uso |
|---------|--------|-----|
| Replicas/service | 2 | 2 (SFO) + 1 (IAD) = 3 |
| Volume size | 0.5GB | 500MB (postgres), 500MB (redis) |
| Services | 5 | 5/5 (100%) |
| Buckets | 3 | 2/3 (67%) |
| Service domains | 2 | 1/2 |
| Custom domains | 1 | 0/1 |

**Recomendação**: Upgrade para **STARTER** ou **PRO** para:
- 8 replicas/service
- Volumes até 100GB
- 10+ services
- Unlimited buckets
- Custom domains

---

## 🆘 TROUBLESHOOTING

### Build falha?
```bash
# Ver logs de build
railway logs --service thcode-backend --build

# Verificar variáveis
railway variable list
```

### Deployment lento?
```bash
# Verificar métricas
railway metrics --service thcode-backend

# Ver replicas
railway service list
```

### Erro de connection pool?
```bash
# Aumentar pool size em .env
DATABASE_POOL_SIZE=30

# Ou verificar conexões ativas
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 📚 REFERÊNCIAS

- [Railway Docs](https://docs.railway.app)
- [Prisma ORM](https://www.prisma.io/docs)
- [Express.js](https://expressjs.com)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Thcode v3.0 — Built with ❤️ for production**

