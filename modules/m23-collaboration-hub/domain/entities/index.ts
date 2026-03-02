import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('collaboration_channels')
@Index(['tenantId', 'channelType'])
export class CollaborationChannel {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() channelType: string;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'jsonb', nullable: true }) members: string[];
  @Column({ nullable: true }) contextEntityType: string;
  @Column({ nullable: true }) contextEntityId: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('collaboration_messages')
@Index(['tenantId', 'channelId'])
export class CollaborationMessage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() channelId: string;
  @Column() senderId: string;
  @Column({ type: 'text' }) content: string;
  @Column({ default: 'text' }) messageType: string;
  @Column({ type: 'jsonb', nullable: true }) attachments: Record<string, unknown>[];
  @Column({ type: 'jsonb', nullable: true }) mentions: string[];
  @Column({ nullable: true }) parentMessageId: string;
  @Column({ default: false }) isEdited: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('collaboration_presence')
@Index(['tenantId', 'userId'])
export class CollaborationPresence {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() userId: string;
  @Column({ default: 'online' }) status: string;
  @Column({ nullable: true }) activeChannelId: string;
  @Column({ type: 'timestamp' }) lastSeenAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
