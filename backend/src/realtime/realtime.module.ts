import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEventsGateway } from './order-events.gateway';
import { PushNotificationsService } from './push-notifications.service';
import { WebPushService } from './web-push.service';
import { WebPushSubscription } from './entities/web-push-subscription.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WebPushSubscription]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') ?? '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [OrderEventsGateway, PushNotificationsService, WebPushService],
  exports: [OrderEventsGateway, PushNotificationsService, WebPushService],
})
export class RealtimeModule {}
