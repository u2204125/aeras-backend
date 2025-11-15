import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestRideDto {
  @ApiProperty({ description: 'The block ID where the ride is requested from' })
  @IsString()
  @IsNotEmpty()
  blockId: string;
}

export class ConfirmRideDto {
  @ApiProperty({ description: 'The block ID to confirm the ride for' })
  @IsString()
  @IsNotEmpty()
  blockId: string;
}

export class AcceptRideDto {
  @ApiProperty({ description: 'The ID of the puller accepting the ride' })
  @IsString()
  @IsNotEmpty()
  pullerId: string;
}

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

export class RejectRideDto {
  @ApiProperty({ description: 'The ID of the puller rejecting the ride' })
  @IsString()
  @IsNotEmpty()
  pullerId: string;
}
