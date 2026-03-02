// =============================================================================
// Rasid Platform v6.2 — Date Usage Audit Configuration
// Constitutional Reference: FP-063
// RULE: Business logic MUST use RasidDateTime. raw Date() allowed only for:
//   - TypeORM @CreateDateColumn / @UpdateDateColumn (framework-managed)
//   - Audit timestamps (always UTC)
//   - Test fixtures
// =============================================================================

export const DATE_AUDIT_CONFIG = {
  allowedPatterns: [
    'new Date().toISOString()',  // Always UTC — acceptable
    '@CreateDateColumn',         // Framework-managed
    '@UpdateDateColumn',         // Framework-managed
  ],
  forbiddenPatterns: [
    'new Date().getMonth()',     // Timezone-dependent
    'new Date().getDay()',       // Timezone-dependent
    'Date.now()',                // Use RasidDateTime.now() instead
  ],
};
