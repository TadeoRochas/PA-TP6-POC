# Guía de Entrega y Capturas para la Demo — TP 6 (PA 2026)

Este documento detalla los pasos para subir el código a **Git**, ejecutar la demo paso a paso y tomar las **capturas de pantalla clave** para armar el PDF de entrega de la facultad.

---

## 📌 1. Preparación y Subida a Git

Asegúrate de tener un `.gitignore` correcto en la raíz para no subir carpetas pesadas (`node_modules`, `dist`, etc.):

### Comandos para subir a tu repositorio Git:
```bash
git add .
git commit -m "feat: POC Activacion de Servicios con Kafka completa y testeada (TP6)"
git branch -M main
git push -u origin main
```

---

## 🚀 2. URLs del Entorno Local

Con `docker compose up --build` corriendo:
- **Demo UI (React + Vite)**: `http://localhost:5173`
- **API REST (NestJS)**: `http://localhost:3000/activations`
- **Kafka UI**: `http://localhost:8080`
- **Mailhog (Bandeja de Emails)**: `http://localhost:8025`
- **MongoDB**: `mongodb://localhost:27017`

---

## 📸 3. Guión de Demo y Capturas para el Informe PDF

Para lograr una nota sobresaliente, organiza el documento PDF en secciones correspondientes a cada escenario clave del TP:

---

### 🔹 Captura 1: Infraestructura y Servicios Activos
* **Acción**: Ejecuta en la terminal `docker compose ps` o abre Docker Desktop.
* **Qué capturar**: La lista de todos los contenedores en estado **Up / Healthy** (`kafka`, `kafka-ui`, `mongo`, `mailhog`, `activation-api`, `billing-service`, `provisioning-service`, `notification-service`, `crm-analytics-service`, `demo-ui`).
* **Propósito en el PDF**: Demostrar que el entorno se levanta completo con un solo comando sin intervención manual (**RNF-01**).

---

### 🔹 Captura 2: Escenario 1 — Camino Feliz (Fan-Out)
* **Acción**:
  1. Ve a la UI en `http://localhost:5173`.
  2. Ingresa `customerId: C-1234`, `planId: FLOW-FULL`, `Forzar fallo: ninguno`.
  3. Haz clic en **Contratar plan**.
* **Qué capturar**:
  1. **Demo UI**: La timeline de eventos mostrando la secuencia en verde:
     `ActivationRequested` ➔ `BillingAccountCreated` ➔ `ProvisioningCompleted` ➔ `ActivationCompleted` (`ACTIVE`).
  2. **Kafka UI** (`http://localhost:8080`): Pantalla del topic `activation.events` mostrando el mensaje con la clave `C-1234` y el header/payload.
  3. **Mailhog** (`http://localhost:8025`): El correo de bienvenida recibido en la casilla `C-1234@demo.local`.
* **Propósito en el PDF**: Demostrar el desacoplamiento por eventos y reacción en abanico (Fan-Out) (**RF-01 a RF-05, RF-07, RF-08**).

---

### 🔹 Captura 3: Escenario 2 — Fallo Simulada y Compensación (Saga)
* **Acción**:
  1. En la UI (`http://localhost:5173`), ingresa `customerId: C-5678`, `planId: FLOW-FULL` y en **Forzar fallo** selecciona `provisioning`.
  2. Haz clic en **Contratar plan**.
* **Qué capturar**:
  1. **Demo UI**: La timeline mostrando la falla y la compensación:
     `ActivationRequested` ➔ `BillingAccountCreated` ➔ `ProvisioningFailed` ➔ `ActivationFailed` ➔ `BillingAccountCancelled` (`FAILED`).
  2. **Mailhog**: El email de fallo/cancelación enviado al cliente.
* **Propósito en el PDF**: Demostrar la gestión de transacciones distribuidas (Sagas) sin llamadas directas entre servicios (**RF-06, RF-07**).

---

### 🔹 Captura 4: Escenario 3 — Resiliencia y Tolerancia a Fallos (Servicio Caído)
* **Acción**:
  1. En la terminal ejecuta:
     ```bash
     docker compose stop notification-service
     ```
  2. Realiza 2 o 3 contrataciones nuevas desde la UI.
  3. Abre Kafka UI (`http://localhost:8080`) ➔ sección **Consumers** ➔ buscar `notification-svc`.
  4. Levanta nuevamente el servicio:
     ```bash
     docker compose start notification-service
     ```
* **Qué capturar**:
  1. **Kafka UI**: La métrica de **Lag = 3** en el consumer group `notification-svc` mientras estuvo detenido.
  2. **Mailhog**: El procesamiento posterior de todos los mails acumulados al reanudar el servicio.
* **Propósito en el PDF**: Demostrar la persistencia del log en Kafka y la recuperación del cursor (Offset) sin pérdida de mensajes (**RNF-05**).

---

### 🔹 Captura 5: Escenario 4 — Escalado Horizontal (Consumer Groups)
* **Acción**:
  1. Ejecuta en la terminal:
     ```bash
     docker compose up -d --scale billing-service=2
     ```
  2. En Kafka UI (`http://localhost:8080`), ingresa a **Consumer Groups** ➔ `billing-svc`.
* **Qué capturar**:
  1. **Kafka UI**: La tabla de asignación de particiones mostrando cómo las 3 particiones del topic se reparten equilibradamente entre las 2 instancias activas de `billing-service`.
* **Propósito en el PDF**: Demostrar balanceo de carga automático y escalabilidad horizontal de consumidores Kafka (**RNF-02**).

---

### 🔹 Captura 6: Escenario 5 — Replay del Log y Nuevo Consumidor
* **Acción**:
  1. Ejecuta en la terminal:
     ```bash
     docker compose --profile loyalty up -d loyalty-service
     ```
  2. Inspecciona los logs del nuevo servicio:
     ```bash
     docker compose logs loyalty-service
     ```
* **Qué capturar**:
  1. **Terminal / Logs**: La salida del contenedor mostrando el mensaje: `Replayed/Processed event for C-1234: +100 loyalty points` al leer los eventos desde el inicio (`auto.offset.reset = earliest`).
* **Propósito en el PDF**: Demostrar cómo se pueden sumar nuevos servicios analíticos o de fidelización que reprocesan el historial sin alterar los servicios existentes (**RF-10, Replay**).

---

## 📝 4. Estructura Sugerida para el Informe PDF

1. **Carátula**: Nombre de la materia (Programación Avanzada 2026), Carrera, Alumno, Nombre de la POC (TP 6: Activación de Servicios con Kafka).
2. **Resumen y Arquitectura**: Breve explicación del enfoque Event-Driven (Fan-Out y Sagas con Compensación) y diagrama de componentes de la POC.
3. **Desarrollo de los 5 Escenarios (con Capturas y Explicación)**:
   - Escenario 1: Camino Feliz (Fan-Out).
   - Escenario 2: Fallo Simulada y Compensación (Saga).
   - Escenario 3: Resiliencia (Servicio Caído y Lag).
   - Escenario 4: Escalado Horizontal de Consumidores.
   - Escenario 5: Replay del Log con Nuevo Consumidor (`loyalty-service`).
4. **Conclusión**: Resumen de los beneficios de Apache Kafka sobre arquitecturas basadas en APIs directas síncronas.
