import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('formula_analyses') export class FormulaAnalysis {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() cellRef: string;
  @Column({ type: 'text', nullable: true }) originalFormula: string;
  @Column({ type: 'text', nullable: true }) inferredFormula: string;
  @Column({ type: 'jsonb', nullable: true }) errors: Record<string, unknown>;
  @Column({ type: 'text', nullable: true }) simplification: string;
  @Column({ type: 'float', default: 0 }) confidence: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('spreadsheet_patterns') export class SpreadsheetPattern {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() patternType: string; // financial | inventory | production | statistical
  @Column({ type: 'jsonb' }) detectedFeatures: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) analyticalModel: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity('pivot_reconstructions') export class PivotReconstruction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column({ type: 'jsonb' }) sourceRange: Record<string, unknown>;
  @Column({ type: 'jsonb' }) pivotConfig: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) suggestedGrouping: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity('precision_checks') export class PrecisionCheck {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() cellRef: string;
  @Column({ type: 'float' }) standardResult: number;
  @Column({ type: 'float' }) extendedResult: number;
  @Column({ type: 'float' }) drift: number;
  @Column({ default: false }) recalculated: boolean;
  @CreateDateColumn() createdAt: Date;
}
