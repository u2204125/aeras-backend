import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustPointsDto {
  @ApiProperty({ description: 'Puller ID' })
  @IsString()
  @IsNotEmpty()
  pullerId: string;

  @ApiProperty({ description: 'Points to add or subtract' })
  @IsNumber()
  @IsNotEmpty()
  points: number;

  @ApiProperty({ description: 'Reason for the adjustment' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'Username', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ description: 'Settings object', required: false })
  @IsObject()
  @IsOptional()
  settings?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    soundEnabled?: boolean;
    theme?: string;
    compactMode?: boolean;
    mapProvider?: string;
    defaultZoom?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
  };
}
