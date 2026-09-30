/**
 * HEALTH CHECK ENDPOINT
 * GET /api/health — Status completo com observability
 */

import config from '../config/advanced.config.js';
import observability from '../middleware/observability.js';

export default function setupHealthRoutes(app) {
  app.get('/api/health', (req, res) => {
    const health = observability.getHealth();

    return res.status(200).json({
      ...health,
      config: {
        deployment: {
          environment: config.deployment.environment,
          region: config.deployment.region,
          multiRegion: config.deployment.multiRegion,
          version: config.deployment.apiVersion,
        },
        features: {
          database: !!config.database.url,
          redis: !!config.cache.url,
          s3: config.storage.enabled,
          websocket: config.api.websocket.enabled,
          graphql: config.api.graphql.enabled,
          streaming: config.api.streaming.enabled,
        },
        observability: {
          metrics: config.observability.metrics.enabled,
          tracing: config.observability.tracing.enabled,
          profiling: config.observability.profiling.enabled,
          audit: config.observability.audit.enabled,
          sentry: config.sentry.enabled,
          datadog: config.datadog.enabled,
          jaeger: config.jaeger.enabled,
        },
        security: {
          cors: config.security.cors.enabled,
          csp: config.security.csp.enabled,
          rateLimit: config.security.rateLimit.enabled,
          jwt: config.security.jwt.secret !== 'dev-secret-change-in-prod',
          twoFA: config.security.auth.twoFactorEnabled,
          oauth2: config.security.auth.oauth2Enabled,
          saml: config.security.auth.samlEnabled,
          dataProtection: {
            masking: config.security.dataProtection.masking.enabled,
            softDeletes: config.security.dataProtection.softDeletes,
            versioning: config.security.dataProtection.versioning,
            gdpr: config.security.dataProtection.gdpr,
          },
        },
      },
    });
  });

  app.get('/api/health/detailed', (req, res) => {
    return res.status(200).json({
      ...observability.getHealth(),
      database: {
        pool: {
          min: config.database.pool.min,
          max: config.database.pool.max,
          idle: config.database.pool.idleTimeoutMillis,
        },
        logging: config.database.logging.enabled,
        replication: config.database.replication.enabled,
      },
      cache: {
        strategy: config.cache.strategy,
        persistence: config.cache.persistence.enabled,
        memory: config.cache.memory.maxmemory,
        clustering: config.cache.clustering.enabled,
      },
      storage: {
        buckets: config.storage.buckets,
        multipartUpload: config.storage.multipartUpload.enabled,
      },
      performance: {
        compression: config.performance.compression.type,
        compressionLevel: config.performance.compression.level,
      },
    });
  });
}

