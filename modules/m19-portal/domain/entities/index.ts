import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('portal_pages')
@Index(['tenantId', 'slug'])
export class PortalPage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() title: string;
  @Column() slug: string;
  @Column({ type: 'text', nullable: true }) content: string;
  @Column({ nullable: true }) templateId: string;
  @Column({ default: 'draft' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) seoConfig: Record<string, unknown>;
  @Column({ nullable: true }) parentPageId: string;
  @Column({ type: 'int', default: 0 }) sortOrder: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('portal_themes')
@Index(['tenantId'])
export class PortalTheme {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column({ type: 'jsonb' }) colors: Record<string, string>;
  @Column({ type: 'jsonb', nullable: true }) typography: Record<string, unknown>;
  @Column({ nullable: true }) logoFileId: string;
  @Column({ nullable: true }) faviconFileId: string;
  @Column({ default: false }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('portal_menus')
@Index(['tenantId', 'location'])
export class PortalMenu {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() label: string;
  @Column() location: string;
  @Column({ type: 'jsonb' }) items: Record<string, unknown>[];
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
