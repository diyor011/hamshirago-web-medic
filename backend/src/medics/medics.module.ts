import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Medic } from './entities/medic.entity';
import { Order } from '../orders/entities/order.entity';
import { MedicsService } from './medics.service';
import { MedicsController } from './medics.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Medic, Order]),
    forwardRef(() => RealtimeModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MedicsController],
  providers: [MedicsService],
  exports: [MedicsService],
})
export class MedicsModule {}
