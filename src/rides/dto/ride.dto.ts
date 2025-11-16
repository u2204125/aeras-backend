import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for accepting a ride (used by pullers)
 */
export class AcceptRideDto {
  @ApiProperty({ description: 'The ID of the starting location block' })
  @IsString()
  @IsNotEmpty()
  startBlockId: string;

  @ApiProperty({ description: 'The ID of the destination location block' })
  @IsString()
  @IsNotEmpty()
  destinationBlockId: string;

  @ApiProperty({ description: 'The ID of the puller accepting the ride' })
  @IsNumber()
  @IsNotEmpty()
  pullerId: number;
}

/**
 * DTO for completing a ride
 */
export class CompleteRideDto {
  @ApiProperty({ description: 'Final latitude coordinate where ride was completed' })
  @IsNumber()
  @IsNotEmpty()
  finalLat: number;

  @ApiProperty({ description: 'Final longitude coordinate where ride was completed' })
  @IsNumber()
  @IsNotEmpty()
  finalLon: number;

  @ApiProperty({ description: 'Optional override for points to award to the puller', required: false })
  @IsOptional()
  @IsNumber()
  pointsOverride?: number;
}

/**
 * DTO for rejecting a ride (used by pullers)
 */
export class RejectRideDto {
  @ApiProperty({ description: 'The ID of the puller rejecting the ride' })
  @IsString()
  @IsNotEmpty()
  pullerId: string;
}
