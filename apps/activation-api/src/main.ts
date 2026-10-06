import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  const groupId = process.env.KAFKA_GROUP_ID ?? 'activation-api-svc';

  // Consumidor Kafka (resultados de billing + provisioning). Fase 1: auto-commit.
  // Fase 3: pasar a commit manual despues de procesar.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { clientId: process.env.KAFKA_CLIENT_ID ?? 'activation-api', brokers },
      consumer: { groupId },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
  // eslint-disable-next-line no-console
  console.log(`activation-api REST :${process.env.PORT ?? 3000} | Kafka ${brokers} group=${groupId}`);
}
bootstrap();
