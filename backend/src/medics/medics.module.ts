import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Medic } from './entities/medic.entity';
import { MedicsService } from './medics.service';
import { MedicsController } from './medics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Medic]),
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
