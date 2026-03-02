// Rasid v6.4 — Centralized Thresholds Configuration — C4 Fix
// All magic numbers extracted to configurable values

export const RasidThresholds = {
  tripleVerification: {
    pixelDiffMax: parseFloat(process.env['TV_PIXEL_MAX'] || '0.001'),
    structuralMin: parseFloat(process.env['TV_STRUCTURAL_MIN'] || '0.999'),
    spatialMin: parseFloat(process.env['TV_SPATIAL_MIN'] || '0.999'),
    subPixelTolerance: parseFloat(process.env['TV_SUBPIXEL_TOL'] || '0.01'),
  },
  confidence: {
    autoLockThreshold: parseFloat(process.env['CONF_AUTO_LOCK'] || '0.98'),
    reviewThreshold: parseFloat(process.env['CONF_REVIEW'] || '0.90'),
  },
  aggregation: {
    gpuThreshold: parseInt(process.env['AGG_GPU_THRESHOLD'] || '10000000'),
    materializedThreshold: parseInt(process.env['AGG_MAT_THRESHOLD'] || '1000000'),
  },
  cognitiveLoad: {
    maxFocalPoints: parseInt(process.env['CL_MAX_FOCAL'] || '7'),
    imbalanceThreshold: parseFloat(process.env['CL_IMBALANCE'] || '0.35'),
  },
  security: {
    maxFailedAttempts: parseInt(process.env['SEC_MAX_FAILED'] || '5'),
    lockDurationMs: parseInt(process.env['SEC_LOCK_DURATION'] || '1800000'),
    jwtAccessTtl: parseInt(process.env['JWT_ACCESS_TTL'] || '3600'),
    jwtRefreshTtl: parseInt(process.env['JWT_REFRESH_TTL'] || '604800'),
    passwordMinLength: parseInt(process.env['PWD_MIN_LENGTH'] || '12'),
  },
  performance: {
    maxCacheSize: parseInt(process.env['PERF_MAX_CACHE'] || '50000'),
    cacheTtlMs: parseInt(process.env['PERF_CACHE_TTL'] || '300000'),
    maxHistoryEntries: parseInt(process.env['PERF_MAX_HISTORY'] || '1000'),
    eventBatchSize: parseInt(process.env['EVT_BATCH_SIZE'] || '50'),
    eventFlushIntervalMs: parseInt(process.env['EVT_FLUSH_INTERVAL'] || '500'),
  },
  database: {
    poolMax: parseInt(process.env['DB_POOL_MAX'] || '3'),
    idleTimeoutMs: parseInt(process.env['DB_IDLE_TIMEOUT'] || '30000'),
  },
};

export default RasidThresholds;
