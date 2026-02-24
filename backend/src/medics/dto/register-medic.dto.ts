import { IsString, MinLength, IsOptional, IsInt, Min, Max } from 'class-validator';

export class RegisterMedicDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears?: number;
}
