// اختبارات وحدة — توسيع محرك التقارير
import { ReportExpansionEngine, CustomTemplate } from '../../../shared/engines/report-engine/report-expansion';

describe('ReportExpansionEngine', () => {
  let engine: ReportExpansionEngine;

  beforeEach(() => {
    engine = new ReportExpansionEngine();
  });

  describe('Template Management', () => {
    it('should create and retrieve template', () => {
      const tpl: CustomTemplate = {
        id: 'tpl-1', tenantId: 'T1', name: 'Test', nameAr: 'اختبار',
        category: 'compliance', format: 'pdf', locale: 'ar', direction: 'rtl',
        sections: [], headerConfig: { title: 'Test', showDate: true, showPageNumber: true },
        footerConfig: { text: '', showConfidentiality: true, confidentialityLevel: 'internal' },
        styles: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Arial', fontSize: 12, headerFontSize: 18, pageSize: 'A4', orientation: 'portrait', margins: { top: 20, right: 20, bottom: 20, left: 20 } },
        variables: [], createdAt: new Date(), updatedAt: new Date(),
      };
      const created = engine.createTemplate(tpl);
      expect(created.id).toBe('tpl-1');
      const retrieved = engine.getTemplate('T1', 'tpl-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Test');
    });

    it('should list templates by category', () => {
      const base: any = {
        tenantId: 'T1', name: 'T', nameAr: 'ت', format: 'pdf', locale: 'ar', direction: 'rtl',
        sections: [], headerConfig: { title: '', showDate: true, showPageNumber: true },
        footerConfig: { text: '', showConfidentiality: false, confidentialityLevel: 'public' },
        styles: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Arial', fontSize: 12, headerFontSize: 18, pageSize: 'A4', orientation: 'portrait', margins: { top: 20, right: 20, bottom: 20, left: 20 } },
        variables: [], createdAt: new Date(), updatedAt: new Date(),
      };
      engine.createTemplate({ ...base, id: 'tpl-1', category: 'compliance' });
      engine.createTemplate({ ...base, id: 'tpl-2', category: 'financial' });
      engine.createTemplate({ ...base, id: 'tpl-3', category: 'compliance' });
      const compliance = engine.listTemplates('T1', 'compliance');
      expect(compliance).toHaveLength(2);
    });

    it('should update template', () => {
      const base: any = {
        id: 'tpl-1', tenantId: 'T1', name: 'Old', nameAr: 'قديم', category: 'compliance', format: 'pdf', locale: 'ar', direction: 'rtl',
        sections: [], headerConfig: { title: '', showDate: true, showPageNumber: true },
        footerConfig: { text: '', showConfidentiality: false, confidentialityLevel: 'public' },
        styles: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Arial', fontSize: 12, headerFontSize: 18, pageSize: 'A4', orientation: 'portrait', margins: { top: 20, right: 20, bottom: 20, left: 20 } },
        variables: [], createdAt: new Date(), updatedAt: new Date(),
      };
      engine.createTemplate(base);
      const updated = engine.updateTemplate('T1', 'tpl-1', { name: 'New' });
      expect(updated!.name).toBe('New');
    });

    it('should delete template', () => {
      const base: any = {
        id: 'tpl-1', tenantId: 'T1', name: 'Del', nameAr: 'حذف', category: 'compliance', format: 'pdf', locale: 'ar', direction: 'rtl',
        sections: [], headerConfig: { title: '', showDate: true, showPageNumber: true },
        footerConfig: { text: '', showConfidentiality: false, confidentialityLevel: 'public' },
        styles: { primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Arial', fontSize: 12, headerFontSize: 18, pageSize: 'A4', orientation: 'portrait', margins: { top: 20, right: 20, bottom: 20, left: 20 } },
        variables: [], createdAt: new Date(), updatedAt: new Date(),
      };
      engine.createTemplate(base);
      expect(engine.deleteTemplate('T1', 'tpl-1')).toBe(true);
      expect(engine.getTemplate('T1', 'tpl-1')).toBeUndefined();
    });
  });

  describe('Sector Reports', () => {
    it('should generate sector report with correct distribution', () => {
      const entities = [
        { entityId: 'E1', entityName: 'Org1', score: 90, previousScore: 85, delta: 5, riskLevel: 'low', criticalFindings: 0 },
        { entityId: 'E2', entityName: 'Org2', score: 60, previousScore: 55, delta: 5, riskLevel: 'medium', criticalFindings: 2 },
        { entityId: 'E3', entityName: 'Org3', score: 30, previousScore: 40, delta: -10, riskLevel: 'high', criticalFindings: 5 },
      ];
      const report = engine.generateSectorReport('T1', 'banking', 'مصرفي', { start: new Date(), end: new Date() }, entities, 70);
      expect(report.overallScore).toBe(60);
      expect(report.complianceDistribution.compliant).toBe(1);
      expect(report.complianceDistribution.partial).toBe(1);
      expect(report.complianceDistribution.non_compliant).toBe(1);
      expect(report.entities[0].score).toBe(90); // sorted desc
    });
  });

  describe('Historical Comparison', () => {
    it('should detect improving trend', () => {
      const periods = [
        { label: 'Q1', startDate: new Date('2025-01-01'), endDate: new Date('2025-03-31'), overallScore: 50, clauseScores: { DP: 40 }, findingsCount: 10, resolvedCount: 3 },
        { label: 'Q2', startDate: new Date('2025-04-01'), endDate: new Date('2025-06-30'), overallScore: 65, clauseScores: { DP: 60 }, findingsCount: 8, resolvedCount: 5 },
        { label: 'Q3', startDate: new Date('2025-07-01'), endDate: new Date('2025-09-30'), overallScore: 80, clauseScores: { DP: 80 }, findingsCount: 4, resolvedCount: 7 },
        { label: 'Q4', startDate: new Date('2025-10-01'), endDate: new Date('2025-12-31'), overallScore: 90, clauseScores: { DP: 90 }, findingsCount: 2, resolvedCount: 9 },
      ];
      const comparison = engine.generateHistoricalComparison('T1', 'E1', periods);
      expect(comparison.trendDirection).toBe('improving');
      expect(comparison.bestPeriod.period).toBe('Q4');
      expect(comparison.worstPeriod.period).toBe('Q1');
      expect(comparison.clauseTrends[0].trend).toBe('improving');
    });
  });

  describe('Pagination', () => {
    it('should paginate correctly', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const page1 = engine.paginate(items, 1, 10);
      expect(page1.items).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.totalPages).toBe(3);
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrevious).toBe(false);
      const page3 = engine.paginate(items, 3, 10);
      expect(page3.items).toHaveLength(5);
      expect(page3.hasNext).toBe(false);
    });
  });

  describe('Built-in Templates', () => {
    it('should return 7 built-in templates', () => {
      const templates = engine.getBuiltInTemplates();
      expect(templates.length).toBe(7);
      expect(templates.every(t => t.id && t.name && t.nameAr && t.category)).toBe(true);
    });
  });
});
