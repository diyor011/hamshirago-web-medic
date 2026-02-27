import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { TelegramService } from './telegram.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudinaryService, TelegramService],
  exports: [CloudinaryService, TelegramService],
})
export class CommonModule {}
