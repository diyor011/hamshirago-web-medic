import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderEventsGateway } from './order-events.gateway';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') ?? '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [OrderEventsGateway, PushNotificationsService],
  exports: [OrderEventsGateway, PushNotificationsService],
})
export class RealtimeModule {}
