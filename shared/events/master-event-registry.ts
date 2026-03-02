// Rasid v6.4 — Master Event Registry — ALL Modules
// Constitutional ref: P-006 (EventEmitter2 only)

export const MASTER_EVENT_REGISTRY = {
  // Kernel
  'k1_auth': ['k1.user.login', 'k1.user.logout', 'k1.token.refreshed', 'k1.mfa.verified'],
  'k2_authz': ['k2.role.assigned', 'k2.permission.denied', 'k2.policy.updated'],
  'k3_audit': ['k3.audit.recorded', 'k3.audit.exported'],
  'k4_config': ['k4.config.updated', 'k4.feature.toggled'],
  'k5_events': ['k5.event.published', 'k5.event.dead_letter'],
  'k6_notification': ['k6.notification.sent', 'k6.notification.failed', 'k6.template.updated'],
  'k7_tasks': ['k7.task.created', 'k7.task.completed', 'k7.task.failed', 'k7.task.retried'],
  'k8_governance': ['k8.classification.updated', 'k8.policy.enforced', 'k8.lineage.recorded'],
  'k9_monitoring': ['k9.alert.triggered', 'k9.health.degraded', 'k9.slo.breached'],
  'k10_lifecycle': ['k10.module.registered', 'k10.module.activated', 'k10.module.deactivated'],

  // Phase 1
  'm1_hrm': ['m1.employee.created', 'm1.employee.updated', 'm1.leave.approved'],
  'm2_finance': ['m2.invoice.created', 'm2.payment.processed', 'm2.budget.exceeded'],
  'm3_crm': ['m3.lead.created', 'm3.deal.closed', 'm3.contact.updated'],
  'm4_inventory': ['m4.stock.low', 'm4.item.received', 'm4.transfer.completed'],
  'm5_procurement': ['m5.po.created', 'm5.po.approved', 'm5.vendor.evaluated'],
  'm30_gateway': ['m30.route.registered', 'm30.rate_limit.hit', 'm30.circuit.opened'],

  // Phase 2
  'm6_project': ['m6.project.created', 'm6.milestone.reached', 'm6.task.assigned'],
  'm7_document': ['m7.document.uploaded', 'm7.version.created', 'm7.document.shared'],
  'm8_workflow': ['m8.workflow.started', 'm8.step.completed', 'm8.workflow.completed'],
  'm9_compliance': ['m9.check.passed', 'm9.violation.detected', 'm9.audit.scheduled'],
  'm10_legal': ['m10.contract.created', 'm10.contract.signed', 'm10.contract.expired'],
  'm25_storage': ['m25.file.uploaded', 'm25.file.deleted', 'm25.quota.exceeded'],
  'm26_scheduler': ['m26.job.scheduled', 'm26.job.executed', 'm26.job.failed'],

  // Phase 3
  'm11_ai': ['m11.model.deployed', 'm11.inference.completed', 'm11.training.started'],
  'm12_analytics': ['m12.report.generated', 'm12.dataset.processed', 'm12.insight.discovered'],
  'm13_reporting': ['m13.report.created', 'm13.report.exported', 'm13.schedule.triggered'],
  'm14_decision': ['m14.decision.created', 'm14.decision.evaluated', 'm14.decision.status_changed'],
  'm15_kg': ['m15.node.created', 'm15.edge.created', 'm15.graph.queried'],
  'm16_nlp': ['m16.text.analyzed', 'm16.entity.extracted', 'm16.sentiment.scored'],
  'm17_vision': ['m17.image.analyzed', 'm17.document.classified', 'm17.ocr.completed'],

  // Phase 4
  'm18_dashboard': ['m18.dashboard.created', 'm18.widget_added', 'm18.layout_updated', 'm18.shared'],
  'm19_portal': ['m19.portal.created', 'm19.portal.published', 'm19.page_published', 'm19.theme_updated'],
  'm20_notif': ['m20.channel.created', 'm20.template.updated', 'm20.batch.sent'],
  'm21_search': ['m21.index.rebuilt', 'm21.query.executed', 'm21.result.ranked'],
  'm22_personal': ['m22.preference.updated', 'm22.recommendation.generated', 'm22.activity_cleared'],
  'm23_collab': ['m23.channel_created', 'm23.message_posted', 'm23.member_added'],
  'm24_integration': ['m24.connector.created', 'm24.sync.completed', 'm24.webhook.triggered'],

  // Phase 5
  'm27_audit': ['m27.trail.exported', 'm27.retention.applied', 'm27.compliance.verified'],
  'm28_tenant': ['m28.tenant.provisioned', 'm28.tenant.activated', 'm28.tenant.suspended', 'm28.config_updated'],
  'm29_billing': ['m29.subscription.created', 'm29.invoice.generated', 'm29.payment.received'],
  'm31_devportal': ['m31.apikey.created', 'm31.apikey.revoked', 'm31.docs.published'],

  // Tier X DPC
  'd1_cdr': ['d1.document.parsed', 'd1.layers.extracted'],
  'd2_layout': ['d2.graph.built', 'd2.spatial.analyzed'],
  'd3_visual': ['d3.elements.classified', 'd3.semantic.mapped'],
  'd4_convert': ['d4.conversion.started', 'd4.conversion.completed'],
  'd5_render': ['d5.render.started', 'd5.render.completed', 'd5.pixel_diff.detected'],
  'd6_media': ['d6.image.processed', 'd6.chart.detected'],
  'd7_interact': ['d7.link.resolved', 'd7.animation.configured'],
  'd8_typo': ['d8.font.resolved', 'd8.shaping.completed'],
  'd9_brand': ['d9.check.passed', 'd9.violation.detected'],
  'd10_trans': ['d10.direction.detected', 'd10.transform.completed'],
  'd11_constraint': ['d11.constraint.solved', 'd11.conflict.detected'],
  'd12_rebind': ['d12.binding.created', 'd12.rebind.completed'],
  'd13_drift': ['d13.drift.detected', 'd13.comparison.completed'],

  // v6.4 Enhanced AI
  'apil': ['apil.plan.created', 'apil.execution.completed', 'apil.quality.below_threshold'],
  'arabic_ai': ['arabic.adaptation.completed', 'arabic.rtl.transformed', 'arabic.sector.mapped'],
  'bi_cognitive': ['bi.insight.generated', 'bi.pattern.detected', 'bi.crowding.detected'],
  'data_intelligence': ['data.model.inferred', 'data.kpi.derived', 'data.forecast.generated'],
  'data_safety': ['safety.alert.raised', 'safety.validation.failed', 'safety.history_cleared'],
  'infographic': ['infographic.generated', 'infographic.balanced'],
  'performance': ['perf.bottleneck.detected', 'perf.scaling.recommended', 'perf.prediction.generated'],
  'spreadsheet': ['spreadsheet.pattern.detected', 'spreadsheet.circular.detected', 'spreadsheet.precision.issue'],
} as const;

export type EventNamespace = keyof typeof MASTER_EVENT_REGISTRY;
export type EventName<T extends EventNamespace> = (typeof MASTER_EVENT_REGISTRY)[T][number];

// Total events: count
export const TOTAL_EVENTS = Object.values(MASTER_EVENT_REGISTRY).reduce((sum, events) => sum + events.length, 0);
