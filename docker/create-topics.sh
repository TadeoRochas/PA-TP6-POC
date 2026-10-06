#!/bin/bash
set -e
BOOTSTRAP="kafka:29092"

echo "Esperando a Kafka en $BOOTSTRAP..."
for i in $(seq 1 30); do
  if /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BOOTSTRAP" --list >/dev/null 2>&1; then
    echo "Kafka listo."
    break
  fi
  echo "  intento $i/30..."
  sleep 3
done

create() {
  local topic=$1
  if /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BOOTSTRAP" --describe --topic "$topic" >/dev/null 2>&1; then
    echo "topic ya existe: $topic"
  else
    /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BOOTSTRAP" \
      --create --topic "$topic" \
      --partitions 3 --replication-factor 1 \
      --config retention.ms=604800000
    echo "topic creado: $topic (3 particiones, retencion 7d)"
  fi
}

# 4 topics de negocio + DLQs
create "activation.requested"
create "billing.events"
create "provisioning.events"
create "activation.events"
create "activation.requested.dlq"
create "billing.events.dlq"
create "provisioning.events.dlq"
create "activation.events.dlq"

echo "Topics OK:"
/opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BOOTSTRAP" --list
