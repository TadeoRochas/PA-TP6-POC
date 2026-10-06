# Fases 0 + 1 — Base + Camino feliz (cerrada)

## Que incluye
- Monorepo npm workspaces: `apps/*`, `libs/*` (contratos versionados + kafka-toolkit).
- Infra `docker compose`: kafka KRaft 1 nodo :9092, kafka-ui :8080, mongo replica-set 1 nodo :27017, mailhog :8025/:1025, activation-api :3000, demo-ui :5173.
- Topics (3 particiones, retencion 7d, key=customerId): `activation.requested`, `billing.events`, `provisioning.events`, `activation.events` + `*.dlq`.
- `activation-api`: POST /activations -> 202 PENDING + publica ActivationRequested; GET /activations/:id; agregador billing+provisioning -> ACTIVE + ActivationCompleted; WS `activation-updated`.
- `billing-service`: consume requested (grupo billing-svc), idempotencia por eventId, crea cuenta CREATED, publica BillingAccountCreated. Incluye hooks fase 2 (BillingFailed + compensacion ActivationFailed + caso borde crear-despues-de-fallo).
- `provisioning-service`: delay 1-3s, idempotencia, publica ProvisioningCompleted. Incluye hook fallo simulado fase 2.
- `notification-service`: consume activation.events, idempotente, envia via Mailhog, guarda en notifications.
- `crm-analytics-service`: consume los 4 topics, guarda en event_log, no publica (RF-10).
- `demo-ui`: formulario customerId/planId/simulateFailure + timeline WS + polling respaldo.

## Como levantar
```bat
docker compose up --build
```
UI: http://localhost:5173 — API: http://localhost:3000/activations — Kafka UI: http://localhost:8080 — Mailhog: http://localhost:8025

## Probar escenario 1 (camino feliz)
1. En la UI contratar con `customerId=C-1234, planId=FLOW-FULL, fallo=ninguno`.
2. Ver timeline: ActivationRequested -> BillingAccountCreated -> ProvisioningCompleted -> ActivationCompleted (verde).
3. Ver email en Mailhog y mensajes en Kafka UI por particion (key=C-1234).
4. `GET /activations/:id` devuelve status ACTIVE + historial.

## Nota Windows
`npm install` local con workspaces necesita symlink: ejecutar la terminal como Administrador o activar Modo Desarrollador. En Docker (Linux) funciona sin esto; por eso el flujo oficial es `docker compose up --build`.

## Queda para fase 2
- Validar compensacion punta a punta con `simulateFailure=provisioning|billing` (codigo ya preparado, falta test E2E).
- Escenarios 3/4/5 (fase 3) y outbox (fase 4).
