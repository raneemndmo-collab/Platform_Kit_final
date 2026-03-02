// Rasid v6.4 — Dual Interface Architecture — Part XVIII

export type InterfaceMode = 'EXECUTIVE' | 'EXPERT';
export interface ToolDefinition { id: string; name: string; category: string; complexity: 'basic' | 'advanced' | 'expert'; requiredPermission?: string; }

export class DualInterfaceEngine {
  private readonly toolRegistry: ToolDefinition[] = [
    // Executive-visible tools (basic)
    { id: 'upload', name: 'Upload File', category: 'input', complexity: 'basic' },
    { id: 'generate', name: 'Generate Dashboard', category: 'output', complexity: 'basic' },
    { id: 'export', name: 'Export', category: 'output', complexity: 'basic' },
    { id: 'share', name: 'Share', category: 'collaboration', complexity: 'basic' },
    { id: 'filter', name: 'Filter Data', category: 'data', complexity: 'basic' },
    { id: 'search', name: 'Search', category: 'navigation', complexity: 'basic' },
    // Advanced tools (expert only)
    { id: 'constraint_editor', name: 'Constraint Editor', category: 'design', complexity: 'advanced' },
    { id: 'formula_debugger', name: 'Formula Debugger', category: 'spreadsheet', complexity: 'advanced' },
    { id: 'dag_viewer', name: 'DAG Viewer', category: 'spreadsheet', complexity: 'expert' },
    { id: 'mcge_inspector', name: 'MCGE Inspector', category: 'design', complexity: 'expert' },
    { id: 'mode_override', name: 'Mode Override', category: 'system', complexity: 'advanced' },
    { id: 'gpu_allocator', name: 'GPU Allocator', category: 'system', complexity: 'expert' },
    { id: 'rtl_debugger', name: 'RTL Transform Debugger', category: 'arabic', complexity: 'advanced' },
    { id: 'triple_verifier', name: 'Triple Verification Panel', category: 'quality', complexity: 'expert' },
    { id: 'perf_monitor', name: 'Performance Monitor', category: 'system', complexity: 'advanced' },
    { id: 'tenant_config', name: 'Tenant Configuration', category: 'admin', complexity: 'expert', requiredPermission: 'admin' },
  ];

  getVisibleTools(mode: InterfaceMode, userPermissions: string[] = []): ToolDefinition[] {
    return this.toolRegistry.filter(tool => {
      if (tool.requiredPermission && !userPermissions.includes(tool.requiredPermission)) return false;
      if (mode === 'EXECUTIVE') return tool.complexity === 'basic';
      return true; // EXPERT sees all
    });
  }

  // Context-aware visibility — show/hide tools based on current context
  getContextAwareTools(mode: InterfaceMode, context: { activeModule: string; hasData: boolean; hasImage: boolean; isArabic: boolean }, userPermissions: string[] = []): ToolDefinition[] {
    const baseTools = this.getVisibleTools(mode, userPermissions);
    return baseTools.filter(tool => {
      // Hide spreadsheet tools when no data
      if (tool.category === 'spreadsheet' && !context.hasData) return false;
      // Hide Arabic tools when not Arabic context
      if (tool.category === 'arabic' && !context.isArabic) return false;
      // Always show basic tools
      if (tool.complexity === 'basic') return true;
      return true;
    });
  }

  getToolCount(mode: InterfaceMode): { total: number; visible: number; hidden: number } {
    const visible = this.getVisibleTools(mode).length;
    return { total: this.toolRegistry.length, visible, hidden: this.toolRegistry.length - visible };
  }

  suggestMode(userActions: Array<{ toolId: string; count: number }>): InterfaceMode {
    const advancedUsage = userActions.filter(a => {
      const tool = this.toolRegistry.find(t => t.id === a.toolId);
      return tool && (tool.complexity === 'advanced' || tool.complexity === 'expert');
    }).reduce((s, a) => s + a.count, 0);
    const totalUsage = userActions.reduce((s, a) => s + a.count, 0);
    return advancedUsage / (totalUsage || 1) > 0.3 ? 'EXPERT' : 'EXECUTIVE';
  }

// GAP-28 FIX: Synchronize dual interface state
  syncInterfaces(simpleState: Record<string, unknown>, advancedState: Record<string, unknown>): {
    merged: Record<string, unknown>;
    conflicts: Array<{ key: string; simple: unknown; advanced: unknown }>;
    resolution: 'simple_wins' | 'advanced_wins' | 'merged';
  } {
    const conflicts: Array<{ key: string; simple: unknown; advanced: unknown }> = [];
    const merged: Record<string, unknown> = { ...simpleState };
    for (const [key, val] of Object.entries(advancedState)) {
      if (key in merged && JSON.stringify(merged[key]) !== JSON.stringify(val)) {
        conflicts.push({ key, simple: merged[key], advanced: val });
        merged[key] = val; // Advanced wins by default
      } else {
        merged[key] = val;
      }
    }
    return { merged, conflicts, resolution: conflicts.length > 0 ? 'advanced_wins' : 'merged' };
  }

  // GAP-30 FIX: Strict tool visibility enforcement
  enforceVisibility(mode: InterfaceMode, requestedTool: string): { allowed: boolean; reason: string } {
    const tools = this.tools.filter(t => mode === 'EXECUTIVE' ? t.complexity === 'basic' : true);
    const allowed = tools.some(t => t.id === requestedTool);
    return {
      allowed,
      reason: allowed ? 'tool_permitted' : `Tool '${requestedTool}' not available in ${mode} mode`,
    };
  }
}
