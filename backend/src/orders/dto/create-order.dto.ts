import { IsString, IsUUID, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
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
  /** Must reference an active service in the catalog */
  @IsUUID()
  serviceId: string;

  /**
   * Optional discount in UZS (e.g. promo code).
   * Cannot exceed the service price — validated in OrdersService.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ValidateNested()
  @Type(() => OrderLocationDto)
  location: OrderLocationDto;
}
