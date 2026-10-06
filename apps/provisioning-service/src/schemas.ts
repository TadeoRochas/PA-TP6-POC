import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'provisioning_orders' })
export class ProvisioningOrder {
  @Prop({ unique: true }) activationId!: string;
  @Prop() customerId!: string;
  @Prop() planId!: string;
  @Prop({ default: 'COMPLETED' }) status!: string;
}
export const ProvisioningOrderSchema = SchemaFactory.createForClass(ProvisioningOrder);
export type ProvisioningOrderDocument = ProvisioningOrder & Document;

@Schema({ collection: 'processed_events' })
export class ProcessedEvent {
  @Prop({ unique: true }) eventId!: string;
  @Prop() at!: Date;
}
export const ProcessedEventSchema = SchemaFactory.createForClass(ProcessedEvent);
export type ProcessedEventDocument = ProcessedEvent & Document;
