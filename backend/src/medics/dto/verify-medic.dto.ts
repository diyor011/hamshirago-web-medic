import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VerificationStatus } from '../entities/verification-status.enum';

export class VerifyMedicDto {
  @IsEnum([VerificationStatus.APPROVED, VerificationStatus.REJECTED])
  status: VerificationStatus.APPROVED | VerificationStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
