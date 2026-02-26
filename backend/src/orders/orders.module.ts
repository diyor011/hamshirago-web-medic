import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderLocation } from './entities/order-location.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { MedicsModule } from '../medics/medics.module';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderLocation]),
    RealtimeModule,
    MedicsModule,
    UsersModule,
    ServicesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
