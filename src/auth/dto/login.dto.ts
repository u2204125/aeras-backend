import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'gelli_boy' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '1112' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  password: string;
}

export class PullerLoginDto {
  @ApiProperty({ example: '01712345678', description: 'Puller phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
