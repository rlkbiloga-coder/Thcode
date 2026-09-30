/**
 * THCODE v3.0 — CONFIGURAÇÃO AVANÇADA DE PRODUÇÃO
 * ═════════════════════════════════════════════════════════════════════════════
 * - Multi-region deployment
 * - Connection pooling & replication
 * - Performance optimization
 * - Security hardening
 * - Observability stack
 * - Auto-scaling readiness
 */

import dotenv from 'dotenv';
dotenv.config();

const env = process.env;

export const config = {
  // ═════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT & ENVIRONMENT
  // ═════════════════════════════════════════════════════════════════════════
  deployment: {
    environment: env.NODE_ENV || 'production',
    region: env.DEPLOYMENT_REGION || 'sfo',
    multiRegion: ['sfo', 'iad'],
    port: parseInt(env.PORT) || 3000,
    logLevel: env.LOG_LEVEL || 'info',
    workers: parseInt(env.WORKERS) || 4,
    keepAliveTimeout: parseInt(env.KEEP_ALIVE_TIMEOUT) || 65000,
    requestTimeout: parseInt(env.REQUEST_TIMEOUT) || 30000,
    maxRequestSize: env.MAX_REQUEST_SIZE || '100mb',
    apiDomain: env.API_DOMAIN || 'localhost:3000',
    apiVersion: env.API_VERSION || '3.0.0',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DATABASE
  // ═════════════════════════════════════════════════════════════════════════
  database: {
    url: env.DATABASE_URL,
    host: env.POSTGRES_HOST || 'postgres.railway.internal',
    port: parseInt(env.POSTGRES_PORT) || 5432,
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB || 'thcode',
    pool: {
      min: 5,
      max: parseInt(env.DATABASE_POOL_SIZE) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      enablePgBouncer: true,
      replicationMode: 'async',
    },
    ssl: {
      enabled: true,
      rejectUnauthorized: false,
    },
    logging: {
      enabled: env.ENABLE_QUERY_LOGGING === 'true',
      slowThreshold: parseInt(env.QUERY_SLOW_THRESHOLD) || 1000,
      logAllQueries: env.NODE_ENV === 'development',
    },
    replication: {
      enabled: true,
      followers: ['iad'], // Replica in IAD
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CACHE (REDIS)
  // ═════════════════════════════════════════════════════════════════════════
  cache: {
    enabled: true,
    url: env.REDIS_URL,
    host: env.REDIS_HOST || 'redis.railway.internal',
    port: parseInt(env.REDIS_PORT) || 6379,
    password: env.REDIS_PASSWORD,
    db: parseInt(env.REDIS_DB) || 0,
    strategy: env.CACHE_STRATEGY || 'multi-tier',
    ttl: {
      default: 3600,
      short: 300,
      long: 86400,
    },
    persistence: {
      enabled: true,
      rdb: true,
      aof: true,
    },
    memory: {
      maxmemory: '512mb',
      policy: 'allkeys-lru',
    },
    clustering: {
      enabled: env.REDIS_CLUSTER_ENABLED === 'true',
      nodes: [],
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // STORAGE (S3)
  // ═════════════════════════════════════════════════════════════════════════
  storage: {
    enabled: env.S3_ENABLED === 'true',
    buckets: {
      assets: {
        name: env.S3_BUCKET_ASSETS || 'thcode-assets-prod',
        cdn: true,
      },
      backups: {
        name: env.S3_BUCKET_BACKUPS || 'thcode-backups-prod',
        versioning: true,
      },
    },
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION || 'us-east-1',
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      ssl: true,
    },
    multipartUpload: {
      enabled: true,
      partSize: 5242880, // 5MB
      queueSize: 4,
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SECURITY
  // ═════════════════════════════════════════════════════════════════════════
  security: {
    cors: {
      enabled: env.CORS_ENABLED === 'true',
      origins: env.CORS_ORIGINS?.split(',') || ['*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
    },
    csp: {
      enabled: env.CSP_ENABLED === 'true',
      policy: env.CSP_POLICY || "default-src 'self'",
    },
    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED === 'true',
      windowMs: parseInt(env.RATE_LIMIT_WINDOW) * 1000 || 60000,
      maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: 'Too many requests, please try again later.',
    },
    jwt: {
      secret: env.JWT_SECRET || 'dev-secret-change-in-prod',
      expiry: env.JWT_EXPIRY || '15m',
      refreshExpiry: env.REFRESH_TOKEN_EXPIRY || '7d',
      algorithm: 'HS256',
    },
    auth: {
      twoFactorEnabled: env.ENABLE_2FA === 'true',
      oauth2Enabled: env.ENABLE_OAUTH2 === 'true',
      samlEnabled: env.ENABLE_SAML === 'true',
      apiKeyRotation: env.ENABLE_API_KEY_ROTATION === 'true',
    },
    dataProtection: {
      masking: {
        enabled: env.ENABLE_DATA_MASKING === 'true',
        fields: ['email', 'phone', 'ssn', 'credit_card'],
      },
      softDeletes: env.ENABLE_SOFT_DELETES === 'true',
      versioning: env.ENABLE_DATA_VERSIONING === 'true',
      gdpr: env.GDPR_ENABLED === 'true',
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // OBSERVABILITY
  // ═════════════════════════════════════════════════════════════════════════
  observability: {
    metrics: {
      enabled: env.ENABLE_METRICS === 'true',
      interval: 10000,
      histograms: ['http_request_duration', 'db_query_duration'],
    },
    tracing: {
      enabled: env.ENABLE_TRACING === 'true',
      samplingRate: 0.1,
    },
    profiling: {
      enabled: env.ENABLE_PROFILING === 'true',
      interval: 60000,
    },
    audit: {
      enabled: env.ENABLE_AUDIT_LOG === 'true',
      level: env.AUDIT_LOG_LEVEL || 'critical',
      retention: 90,
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SENTRY (Error Tracking)
  // ═════════════════════════════════════════════════════════════════════════
  sentry: {
    enabled: env.SENTRY_ENABLED === 'true',
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || 'production',
    traceSampleRate: parseFloat(env.SENTRY_TRACE_SAMPLE_RATE) || 0.1,
    release: '3.0.0',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DATADOG (Monitoring)
  // ═════════════════════════════════════════════════════════════════════════
  datadog: {
    enabled: env.DATADOG_ENABLED === 'true',
    apiKey: env.DATADOG_API_KEY,
    site: env.DATADOG_SITE || 'datadoghq.com',
    metrics: env.DATADOG_METRICS_ENABLED === 'true',
    tracing: env.DATADOG_TRACE_ENABLED === 'true',
    tags: {
      service: 'thcode',
      version: '3.0.0',
      environment: env.NODE_ENV,
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // JAEGER (Distributed Tracing)
  // ═════════════════════════════════════════════════════════════════════════
  jaeger: {
    enabled: env.JAEGER_ENABLED === 'true',
    host: env.JAEGER_AGENT_HOST || 'localhost',
    port: parseInt(env.JAEGER_AGENT_PORT) || 6831,
    serviceName: 'thcode-backend',
    samplingRate: parseFloat(env.JAEGER_SAMPLE_RATE) || 0.1,
  },

  // ═════════════════════════════════════════════════════════════════════════
  // COMPRESSION & PERFORMANCE
  // ═════════════════════════════════════════════════════════════════════════
  performance: {
    compression: {
      enabled: true,
      type: env.COMPRESSION_TYPE || 'brotli',
      level: parseInt(env.COMPRESSION_LEVEL) || 11,
      threshold: 1024,
    },
    caching: {
      staticAssets: 86400, // 1 day
      apiResponses: 300, // 5 minutes
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // API FEATURES
  // ═════════════════════════════════════════════════════════════════════════
  api: {
    websocket: {
      enabled: env.ENABLE_WEBSOCKET === 'true',
      heartbeat: parseInt(env.WEBSOCKET_HEARTBEAT) || 30000,
    },
    streaming: {
      enabled: env.ENABLE_STREAMING === 'true',
    },
    graphql: {
      enabled: env.ENABLE_GRAPHQL === 'true',
      playground: env.GRAPHQL_PLAYGROUND === 'true',
    },
    rest: {
      enabled: env.ENABLE_REST_API === 'true',
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ═════════════════════════════════════════════════════════════════════════
  webhooks: {
    retry: {
      maxAttempts: parseInt(env.WEBHOOK_RETRY_MAX) || 5,
      backoffMs: 1000,
    },
    timeout: parseInt(env.WEBHOOK_TIMEOUT) || 30000,
    stripe: {
      enabled: env.STRIPE_WEBHOOK_ENABLED === 'true',
      secret: env.STRIPE_WEBHOOK_SECRET,
    },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // INTEGRATIONS
  // ═════════════════════════════════════════════════════════════════════════
  integrations: {
    openrouter: {
      enabled: !!env.OPENROUTER_API_KEY,
      apiKey: env.OPENROUTER_API_KEY,
    },
    github: {
      enabled: !!env.GITHUB_TOKEN,
      token: env.GITHUB_TOKEN,
    },
    stripe: {
      enabled: !!env.STRIPE_API_KEY,
      apiKey: env.STRIPE_API_KEY,
    },
    cdn: {
      enabled: env.CDN_ENABLED === 'true',
    },
    analytics: {
      enabled: env.ANALYTICS_ENABLED === 'true',
    },
  },
};

export default config;

