import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderLocation } from './entities/order-location.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { MedicsModule } from '../medics/medics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderLocation]),
    RealtimeModule,
    MedicsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
