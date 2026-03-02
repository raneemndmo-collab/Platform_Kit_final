import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('spreadsheet_intelligence')
export class SpreadsheetIntelligenceEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column('uuid') tenantId: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'jsonb', default: '{}' }) config: Record<string, any>;
  @Column({ type: 'varchar', length: 50, default: 'active' }) status: string;
  @Column({ type: 'jsonb', default: '{}' }) metadata: Record<string, any>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
