/**
 * D5: Swagger/OpenAPI Documentation
 * ────────────────────────────────────────────────────────
 * Full API documentation with Arabic descriptions,
 * domain-organized tags, and server environments.
 */
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const logger = new Logger('Swagger');

  const config = new DocumentBuilder()
    .setTitle('Rasid Platform API — منصة رصيد')
    .setDescription(
      '**Universal Intelligent Document & Intelligence Platform**\n\n' +
      'منصة رصيد — المنصة الذكية الشاملة لمعالجة الوثائق والذكاء الاصطناعي\n\n' +
      '**Architecture**: Modular Monolith | CQRS | Event-Driven\n\n' +
      '**Authentication**: JWT Bearer + Tenant ID Header\n\n' +
      '---\n\n' +
      '## Phases\n' +
      '- Phase 0: Kernel (K1-K10)\n' +
      '- Phase 1-5: Business Modules (M1-M31)\n' +
      '- Phase 6-7: Tier X — Document Intelligence (D1-D13)\n' +
      '- Phase 8: v6.4 Enhanced Intelligence Modules'
    )
    .setVersion('6.4.0')
    .setContact('NDMO Engineering', 'https://ndmo.gov.sa', 'platform@ndmo.gov.sa')
    .setLicense('Proprietary', 'https://ndmo.gov.sa/license')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT Access Token' }, 'JWT')
    .addApiKey({ type: 'apiKey', name: 'X-Tenant-Id', in: 'header', description: 'Tenant UUID' }, 'Tenant')
    .addServer(process.env['API_URL'] ?? 'http://localhost:3000', 'Current')
    .addServer('https://api.rasid.ndmo.gov.sa', 'Production')
    .addServer('https://staging-api.rasid.ndmo.gov.sa', 'Staging')
    // --- Kernel Tags ---
    .addTag('Auth — المصادقة', 'K1: JWT, MFA, Sessions')
    .addTag('Authorization — التفويض', 'K2: RBAC, Permissions, Policies')
    .addTag('Audit — التدقيق', 'K3: Audit Trail with SHA-256 Hash Chain')
    .addTag('Config — الإعدادات', 'K4: System Configuration')
    .addTag('Event Bus — الأحداث', 'K5: Event-Driven Architecture')
    .addTag('Notification — الإشعارات', 'K6: Multi-Channel Notifications')
    .addTag('Orchestration — التنسيق', 'K7: Task Orchestration')
    .addTag('Governance — الحوكمة', 'K8: Data Governance & Retention')
    .addTag('Monitoring — المراقبة', 'K9: System Health & Metrics')
    .addTag('Lifecycle — دورة الحياة', 'K10: Module Lifecycle Management')
    // --- Intelligence Tags ---
    .addTag('APIL — الذكاء التلقائي', 'Autonomous Platform Intelligence Layer')
    .addTag('Data Intelligence — ذكاء البيانات', 'Data Modeling, KPI, Analytics')
    .addTag('BI Cognitive — ذكاء الأعمال', 'Dashboards, Widgets, Cross-Filtering')
    .addTag('Arabic AI — الذكاء العربي', 'NLP, Translation, RTL Optimization')
    .addTag('Spreadsheet — الجداول', 'Parsing, Formulas, Inference')
    .addTag('Infographic — الإنفوجرافيك', 'Auto-generation, Templates')
    // --- Document Tags ---
    .addTag('CDR Engine — محرك التحويل', 'D1: Capture, Digitize, Reconstruct')
    .addTag('Layout — التخطيط', 'D2-D13: Layout, Visual, Rendering')
    // --- Business Tags ---
    .addTag('HRM — الموارد البشرية', 'M1: Employees, Attendance, Payroll')
    .addTag('Finance — المالية', 'M2: Transactions, Accounts, Reports')
    .addTag('CRM — العملاء', 'M3: Contacts, Leads, Deals')
    .addTag('Projects — المشاريع', 'M6: Project Management')
    .addTag('Documents — المستندات', 'M7: Document Management')
    .addTag('Workflow — سير العمل', 'M8: Process Automation')
    // --- Platform Tags ---
    .addTag('Health — الصحة', 'Health Checks, Readiness, Liveness')
    .addTag('Metrics — المقاييس', 'Prometheus-format Metrics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Rasid API — منصة رصيد',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      tryItOutEnabled: true,
    },
  });

  logger.log('📚 Swagger: http://localhost:3000/api/docs');
}

/**
 * JSON Schema endpoint for programmatic API discovery.
 */
export function setupOpenApiJson(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Rasid Platform API')
    .setVersion('6.4.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  app.getHttpAdapter().get('/api/openapi.json', (_req: unknown, res: { json: (data: unknown) => void }) => {
    res.json(document);
  });
}
