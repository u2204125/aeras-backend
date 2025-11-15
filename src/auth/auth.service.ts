import { Injectable, UnauthorizedException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entities/admin.entity';
import { Puller } from '../entities/puller.entity';
import { MqttController } from '../notifications/mqtt.controller';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(Puller)
    private pullerRepository: Repository<Puller>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => MqttController))
    private mqttController: MqttController,
  ) {}

  async validateAdmin(username: string, password: string): Promise<any> {
    const admin = await this.adminRepository.findOne({ where: { username } });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = admin;
    return result;
  }

  async login(username: string, password: string) {
    const admin = await this.validateAdmin(username, password);

    const payload = { username: admin.username, sub: admin.id };

    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        username: admin.username,
      },
    };
  }

  async validateToken(payload: any): Promise<any> {
    const admin = await this.adminRepository.findOne({
      where: { id: payload.sub },
    });

    if (!admin) {
      throw new UnauthorizedException();
    }

    const { password: _, ...result } = admin;
    return result;
  }

  /**
   * Puller login using phone number
   * Simplified authentication for pullers - no password required
   */
  async loginPuller(phone: string) {
    const puller = await this.pullerRepository.findOne({
      where: { phone },
    });

    if (!puller) {
      throw new NotFoundException(`Puller with phone ${phone} not found`);
    }

    if (!puller.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact admin.');
    }

    // Generate JWT token for puller
    const payload = { phone: puller.phone, sub: puller.id, type: 'puller' };

    const pullerData = {
      id: puller.id,
      name: puller.name,
      phone: puller.phone,
      pointsBalance: puller.pointsBalance,
      isOnline: puller.isOnline,
      isActive: puller.isActive,
      lastKnownLat: puller.lastKnownLat,
      lastKnownLon: puller.lastKnownLon,
    };

    // Publish login data to MQTT for hardware
    this.mqttController.publishPullerLogin(puller.id, pullerData);

    return {
      access_token: this.jwtService.sign(payload),
      puller: pullerData,
    };
  }
}
