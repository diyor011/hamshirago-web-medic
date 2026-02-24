import { IsString, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderLocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  house: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsString()
  @IsOptional()
  apartment?: string;

  @IsString()
  phone: string;
}

export class CreateOrderDto {
  @IsString()
  serviceId: string;

  @IsString()
  serviceTitle: string;

  @IsNumber()
  @Min(0)
  priceAmount: number;

  @IsNumber()
  @Min(0)
  discountAmount: number;

  @ValidateNested()
  @Type(() => OrderLocationDto)
  location: OrderLocationDto;
}
