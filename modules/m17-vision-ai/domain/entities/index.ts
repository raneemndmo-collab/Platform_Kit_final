import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('vision_tasks')
@Index(['tenantId', 'taskType'])
export class VisionTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() @Index() tenantId: string;
  @Column() taskType: string; // ocr, object_detection, classification, face_detection, document_analysis
  @Column() inputFileId: string;
  @Column({ type: 'jsonb', nullable: true }) result: Record<string, unknown>;
  @Column({ default: 'pending' }) status: string;
  @Column({ nullable: true }) modelId: string;
  @Column({ type: 'int', nullable: true }) latencyMs: number;
  @Column({ nullable: true }) requestSource: string;
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) confidence: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('vision_models')
@Index(['tenantId', 'taskType'])
export class VisionModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() taskType: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) supportedFormats: string[];
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) accuracy: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('vision_annotations')
@Index(['tenantId', 'taskId'])
export class VisionAnnotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() @Index() tenantId: string;
  @Column() taskId: string;
  @Column() annotationType: string; // bounding_box, polygon, text_region
  @Column({ type: 'jsonb' }) coordinates: Record<string, unknown>;
  @Column({ nullable: true }) label: string;
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) confidence: number;
  @CreateDateColumn() createdAt: Date;
}
