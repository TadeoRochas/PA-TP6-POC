import { dlqTopic, type EventEnvelope } from '@poc/contracts';

// ---------------------------------------------------------------------------
// kafka-toolkit: idempotencia + reintentos + DLQ.
// Fase 1: version funcional minima. Fase 3: se usa a pleno (retry 1s,2s,4s).
// Fase 4: aqui se aisla el cliente para reemplazar kafkajs si hace falta.
// ---------------------------------------------------------------------------

export const RETRY_DELAYS_MS = [1000, 2000, 4000];
export const MAX_ATTEMPTS = 3;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DlqPublisher {
  // Publica el mensaje original en <topic>.dlq con motivo en headers/payload
  publishToDlq(targetTopic: string, event: any, reason: string): Promise<void>;
}

export interface IdempotencyStore {
  // true si es la primera vez que se ve eventId; false si duplicado.
  tryMarkProcessed(eventId: string): Promise<boolean>;
}

// Helper en memoria (solo para tests / fallback). En prod usar Mongo.
export function createMemoryIdempotencyStore(): IdempotencyStore {
  const seen = new Set<string>();
  return {
    async tryMarkProcessed(eventId: string): Promise<boolean> {
      if (seen.has(eventId)) return false;
      seen.add(eventId);
      return true;
    },
  };
}

// Ejecuta handler con reintentos 1s,2s,4s. Si agota, publica a DLQ.
// Los errores de negocio simulados NO deben pasar por aqui: se publican
// como BillingFailed/ProvisioningFailed, no van a DLQ (seccion 08).
export async function withRetriesAndDlq(
  event: any,
  sourceTopic: string,
  handler: () => Promise<void>,
  dlq: DlqPublisher,
): Promise<'ok' | 'dlq'> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await handler();
      return 'ok';
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 4000);
      }
    }
  }
  const reason = lastError instanceof Error ? `${lastError.name}: ${lastError.message}` : String(lastError);
  try {
    await dlq.publishToDlq(dlqTopic(sourceTopic), event, reason);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[kafka-toolkit] Error publicando a DLQ para ${sourceTopic}:`, e);
  }
  return 'dlq';
}

// Idempotencia Mongo (a usar por cada consumidor):
//   db.processed_events.createIndex({ eventId: 1 }, { unique: true })
//   session.startTransaction();
//   await db.processed_events.insertOne({ eventId, at: new Date() }, { session });
//   ... efecto de negocio ...
//   await session.commitTransaction();
// Si insert falla por duplicado -> descartar evento y confirmar offset.
export const IDEMPOTENCY_MONGO_SNIPPET = `
db.processed_events.createIndex({ eventId: 1 }, { unique: true });
db.processed_events.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // TTL 7d = retencion topics
`.trim();
