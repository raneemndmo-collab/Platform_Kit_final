import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_profiles')
@Index(['tenantId', 'userId'])
export class UserProfile {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() userId: string;
  @Column({ type: 'jsonb', nullable: true }) preferences: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) uiSettings: Record<string, unknown>;
  @Column({ nullable: true }) language: string;
  @Column({ nullable: true }) timezone: string;
  @Column({ nullable: true }) themeMode: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('user_activity_history')
@Index(['tenantId', 'userId', 'activityType'])
export class UserActivityHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() userId: string;
  @Column() activityType: string;
  @Column({ nullable: true }) entityType: string;
  @Column({ nullable: true }) entityId: string;
  @Column({ type: 'jsonb', nullable: true }) context: Record<string, unknown>;
  @CreateDateColumn() timestamp: Date;
}

@Entity('recommendation_items')
@Index(['tenantId', 'userId', 'category'])
export class RecommendationItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() userId: string;
  @Column() category: string;
  @Column() entityType: string;
  @Column() entityId: string;
  @Column({ type: 'float', default: 0 }) score: number;
  @Column({ nullable: true }) reason: string;
  @Column({ default: false }) isDismissed: boolean;
  @CreateDateColumn() generatedAt: Date;
}
