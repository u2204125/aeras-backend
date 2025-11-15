import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for accepting a ride (used by pullers)
 */
export class AcceptRideDto {
  @ApiProperty({ description: 'The ID of the puller accepting the ride' })
  @IsString()
  @IsNotEmpty()
  pullerId: string;
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
