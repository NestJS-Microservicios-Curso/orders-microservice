import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { NatsModule } from '../transports/nats.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  // Registering the NatsModule to enable communication with the NATS microservice
  imports: [NatsModule],
})
export class OrdersModule {}
