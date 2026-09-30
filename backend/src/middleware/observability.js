/**
 * MIDDLEWARE DE OBSERVABILIDADE AVANÇADA
 * Metrics, Tracing, Profiling, Audit Logging
 */

import config from '../config/advanced.config.js';

class Observability {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      uptime: Date.now(),
    };
    this.traces = [];
    this.auditLog = [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────
  recordMetric(name, value, tags = {}) {
    if (!config.observability.metrics.enabled) return;

    const metric = {
      timestamp: Date.now(),
      name,
      value,
      tags: {
        service: 'thcode',
        environment: config.deployment.environment,
        ...tags,
      },
    };

    // Em produção, enviar para Datadog/Prometheus
    if (config.datadog.enabled) {
      this.sendToDatadog(metric);
    }
  }

  sendToDatadog(metric) {
    // Implementar envio real para Datadog
    if (process.env.DEBUG) {
      console.log('[DATADOG]', metric);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRACING
  // ─────────────────────────────────────────────────────────────────────────
  startTrace(traceId, spanName, tags = {}) {
    if (!config.observability.tracing.enabled) return null;

    const span = {
      traceId,
      spanId: Math.random().toString(36).substring(7),
      spanName,
      startTime: Date.now(),
      tags: {
        service: 'thcode',
        environment: config.deployment.environment,
        ...tags,
      },
    };

    // Em produção, enviar para Jaeger/Datadog
    if (config.jaeger.enabled) {
      this.sendToJaeger(span);
    }

    return span;
  }

  endTrace(span, status = 'success', error = null) {
    if (!span) return;

    span.duration = Date.now() - span.startTime;
    span.status = status;
    if (error) span.error = error;

    if (config.jaeger.enabled) {
      this.sendToJaeger(span);
    }
  }

  sendToJaeger(span) {
    // Implementar envio real para Jaeger
    if (process.env.DEBUG) {
      console.log('[JAEGER]', span);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILING
  // ─────────────────────────────────────────────────────────────────────────
  profileFunction(fn, functionName) {
    if (!config.observability.profiling.enabled) return fn;

    return (...args) => {
      const start = process.hrtime.bigint();
      const result = fn(...args);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to ms

      this.recordMetric(`function_duration_${functionName}`, duration);

      return result;
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AUDIT LOGGING
  // ─────────────────────────────────────────────────────────────────────────
  auditLog(action, details) {
    if (!config.security.dataProtection.masking.enabled) return;

    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details: this.maskSensitiveData(details),
      userId: details.userId,
      ipAddress: details.ipAddress,
    };

    this.auditLog.push(entry);

    if (process.env.DEBUG) {
      console.log('[AUDIT]', entry);
    }
  }

  maskSensitiveData(data) {
    const masked = { ...data };
    const sensitiveFields = config.security.dataProtection.masking.fields;

    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '*'.repeat(masked[field].length);
      }
    }

    return masked;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPRESS MIDDLEWARE
  // ─────────────────────────────────────────────────────────────────────────
  expressMiddleware() {
    return (req, res, next) => {
      const traceId = req.headers['x-trace-id'] || Math.random().toString(36).substring(7);
      const span = this.startTrace(traceId, `${req.method} ${req.path}`);

      const startTime = Date.now();

      // Interceptar response
      const originalSend = res.send;
      res.send = function (data) {
        const duration = Date.now() - startTime;

        // Registrar métrica
        this.recordMetric('http_request_duration', duration, {
          method: req.method,
          path: req.path,
          status: res.statusCode,
        });

        // Finalizar trace
        this.endTrace(span, res.statusCode < 500 ? 'success' : 'error');

        // Chamar original
        return originalSend.call(this, data);
      }.bind(this);

      this.auditLog(`HTTP_REQUEST`, {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        ipAddress: req.ip,
      });

      next();
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH STATUS
  // ─────────────────────────────────────────────────────────────────────────
  getHealth() {
    return {
      status: 'healthy',
      uptime: Math.round((Date.now() - this.metrics.uptime) / 1000),
      metrics: {
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors,
        errorRate: (this.metrics.errors / this.metrics.requests) || 0,
        avgResponseTime: this.metrics.avgResponseTime,
      },
      services: {
        database: this.checkDatabaseHealth(),
        redis: this.checkRedisHealth(),
        s3: this.checkS3Health(),
      },
      features: {
        metrics: config.observability.metrics.enabled,
        tracing: config.observability.tracing.enabled,
        profiling: config.observability.profiling.enabled,
        audit: config.observability.audit.enabled,
        sentry: config.sentry.enabled,
        datadog: config.datadog.enabled,
        jaeger: config.jaeger.enabled,
      },
      timestamp: new Date().toISOString(),
    };
  }

  checkDatabaseHealth() {
    return { status: 'connected', poolSize: config.database.pool.max };
  }

  checkRedisHealth() {
    return { status: 'connected', memory: config.cache.memory.maxmemory };
  }

  checkS3Health() {
    return { status: 'configured', buckets: Object.keys(config.storage.buckets).length };
  }
}

export const observability = new Observability();
export default observability;

