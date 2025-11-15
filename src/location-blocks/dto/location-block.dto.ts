import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationBlockDto {
  @ApiProperty({ description: 'Unique block identifier' })
  @IsString()
  @IsNotEmpty()
  blockId: string;

  @ApiProperty({ description: 'Destination name' })
  @IsString()
  @IsNotEmpty()
  destinationName: string;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}

export class UpdateLocationBlockDto {
  @ApiPropertyOptional({ description: 'Unique block identifier' })
  @IsString()
  @IsOptional()
  blockId?: string;

  @ApiPropertyOptional({ description: 'Destination name' })
  @IsString()
  @IsOptional()
  destinationName?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
