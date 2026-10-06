import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Topics (4 de negocio + DLQ por topic). Todos: 3 particiones, retencion 7 dias,
// key = customerId (RNF-02).
// ---------------------------------------------------------------------------
export const TOPICS = {
  ACTIVATION_REQUESTED: 'activation.requested',
  BILLING_EVENTS: 'billing.events',
  PROVISIONING_EVENTS: 'provisioning.events',
  ACTIVATION_EVENTS: 'activation.events',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export function dlqTopic(topic: string): string {
  return `${topic}.dlq`;
}

// ---------------------------------------------------------------------------
// Tipos de evento (versionados, RNF-07)
// ---------------------------------------------------------------------------
export const EVENT_TYPES = {
  ActivationRequested: 'ActivationRequested',
  BillingAccountCreated: 'BillingAccountCreated',
  BillingFailed: 'BillingFailed',
  BillingAccountCancelled: 'BillingAccountCancelled',
  ProvisioningCompleted: 'ProvisioningCompleted',
  ProvisioningFailed: 'ProvisioningFailed',
  ActivationCompleted: 'ActivationCompleted',
  ActivationFailed: 'ActivationFailed',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type SimulateFailure = 'none' | 'billing' | 'provisioning';

// Sobre comun a todos los eventos (seccion 05 del PDF)
export interface EventEnvelope<TPayload = any> {
  eventId: string; // base idempotencia (RNF-03)
  eventType: EventType;
  version: number; // contrato versionado (RNF-07)
  occurredAt: string; // ISO
  correlationId: string; // = activationId, trazabilidad punta a punta (RNF-06)
  customerId: string; // tambien key Kafka -> orden por cliente (RNF-02)
  source: string; // servicio productor
  payload: TPayload;
}

// Payloads por evento
export interface ActivationRequestedPayload {
  planId: string;
  channel: string; // ej: 'web'
  simulateFailure: SimulateFailure; // solo demo
}

export interface BillingResultPayload {
  activationId: string;
  reason?: string;
}

export interface ProvisioningResultPayload {
  activationId: string;
  orderId?: string;
  reason?: string;
}

export interface ActivationFinishedPayload {
  activationId: string;
  customerId: string;
  planId: string;
}

// Factory: construye un sobre valido con defaults
export function buildEvent<T>(
  input: Pick<EventEnvelope<T>, 'eventType' | 'correlationId' | 'customerId' | 'source' | 'payload'> &
    Partial<Pick<EventEnvelope<T>, 'eventId' | 'version' | 'occurredAt'>>,
): EventEnvelope<T> {
  return {
    eventId: input.eventId ?? randomUUID(),
    version: input.version ?? 1,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    eventType: input.eventType,
    correlationId: input.correlationId,
    customerId: input.customerId,
    source: input.source,
    payload: input.payload,
  };
}

// Key Kafka = customerId (orden por cliente)
export function kafkaKeyFor(customerId: string): string {
  return customerId;
}

// Estados de la saga (seccion 06)
export type ActivationStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVE' | 'FAILED';
