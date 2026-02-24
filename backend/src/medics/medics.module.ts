import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medic } from './entities/medic.entity';
import { MedicsService } from './medics.service';
import { MedicsController } from './medics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Medic])],
  controllers: [MedicsController],
  providers: [MedicsService],
  exports: [MedicsService],
})
export class MedicsModule {}
