import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class StepResult {
  @Prop() status!: string; // OK | FAIL
  @Prop() at!: Date;
  @Prop() reason?: string;
}
export const StepResultSchema = SchemaFactory.createForClass(StepResult);

@Schema({ _id: false })
export class HistoryEntry {
  @Prop() eventType!: string;
  @Prop() at!: Date;
}
export const HistoryEntrySchema = SchemaFactory.createForClass(HistoryEntry);

export type ActivationDocument = Activation & Document;

@Schema({ timestamps: true, collection: 'activations' })
export class Activation {
  @Prop() _id!: string; // = activationId
  @Prop({ index: true }) customerId!: string;
  @Prop() planId!: string;
  @Prop({ default: 'PENDING' }) status!: string; // PENDING|IN_PROGRESS|ACTIVE|FAILED
  @Prop({ default: 'none' }) simulateFailure!: string;
  @Prop({ type: Object, default: {} }) steps!: {
    billing?: { status: string; at: string; reason?: string };
    provisioning?: { status: string; at: string; reason?: string };
  };
  @Prop({ type: [HistoryEntrySchema], default: [] }) history!: Array<{ eventType: string; at: Date }>;
}
export const ActivationSchema = SchemaFactory.createForClass(Activation);
