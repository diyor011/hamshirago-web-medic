import { IsString, MinLength } from 'class-validator';

export class LoginMedicDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
