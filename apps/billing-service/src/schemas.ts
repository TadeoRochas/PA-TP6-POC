import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'billing_accounts' })
export class BillingAccount {
  @Prop({ unique: true }) activationId!: string;
  @Prop() customerId!: string;
  @Prop() planId!: string;
  @Prop({ default: 'CREATED' }) status!: string;
}
export const BillingAccountSchema = SchemaFactory.createForClass(BillingAccount);
export type BillingAccountDocument = BillingAccount & Document;

@Schema({ collection: 'processed_events' })
export class ProcessedEvent {
  @Prop({ unique: true }) eventId!: string;
  @Prop() at!: Date;
}
export const ProcessedEventSchema = SchemaFactory.createForClass(ProcessedEvent);

@Schema({ collection: 'compensations' })
export class Compensation {
  @Prop({ unique: true }) activationId!: string;
  @Prop() at!: Date;
}
export const CompensationSchema = SchemaFactory.createForClass(Compensation);
