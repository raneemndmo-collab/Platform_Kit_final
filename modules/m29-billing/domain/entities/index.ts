import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('billing_plans')
@Index(['tenantId'])
export class BillingPlan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() planName: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) basePrice: number;
  @Column() billingCycle: string;
  @Column() currency: string;
  @Column({ type: 'jsonb' }) features: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) usageLimits: Record<string, number>;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('invoices')
@Index(['tenantId', 'status'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() invoiceNumber: string;
  @Column() billingPeriod: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) subtotal: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) tax: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) total: number;
  @Column() currency: string;
  @Column({ default: 'draft' }) status: string;
  @Column({ type: 'jsonb' }) lineItems: Record<string, unknown>[];
  @Column({ type: 'timestamp', nullable: true }) dueDate: Date;
  @Column({ type: 'timestamp', nullable: true }) paidAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('payments')
@Index(['tenantId', 'invoiceId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() invoiceId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column() currency: string;
  @Column() paymentMethod: string;
  @Column({ default: 'pending' }) status: string;
  @Column({ nullable: true }) transactionId: string;
  @Column({ nullable: true }) gatewayResponse: string;
  @CreateDateColumn() processedAt: Date;
}

@Entity('usage_records')
@Index(['tenantId', 'metricName', 'period'])
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() metricName: string;
  @Column() period: string;
  @Column({ type: 'decimal', precision: 15, scale: 4 }) quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true }) unitPrice: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) totalPrice: number;
  @CreateDateColumn() recordedAt: Date;
}
