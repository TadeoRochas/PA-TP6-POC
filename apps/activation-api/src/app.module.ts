import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivationsModule } from './activations/activations.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/activation_db?replicaSet=rs0&directConnection=true'),
    ActivationsModule,
  ],
})
export class AppModule {}

