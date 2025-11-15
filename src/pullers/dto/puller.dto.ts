import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  lon: number;
}

export class CreatePullerDto {
  @ApiProperty({ description: 'Puller full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Puller phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'Initial points balance', default: 0 })
  @IsNumber()
  @IsOptional()
  pointsBalance?: number;

  @ApiPropertyOptional({ description: 'Is puller active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePullerDto {
  @ApiPropertyOptional({ description: 'Puller full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Puller phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Points balance' })
  @IsNumber()
  @IsOptional()
  pointsBalance?: number;

  @ApiPropertyOptional({ description: 'Is puller active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is puller online' })
  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;
}
