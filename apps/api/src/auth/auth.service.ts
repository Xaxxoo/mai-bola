import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { UserRole } from '../enums';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.userRepo.create({
      phone: dto.phone,
      fullName: dto.fullName,
      passwordHash,
      role: UserRole.SUPPLIER,
      supplierType: dto.supplierType,
    });
    await this.userRepo.save(user);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.issueTokens(user);
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const storedToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // If the token was already revoked, this is a reuse attack.
    // Revoke the entire family.
    if (storedToken.revoked) {
      await this.refreshTokenRepo.update(
        { family: storedToken.family },
        { revoked: true },
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Revoke the current token (rotation)
    storedToken.revoked = true;
    await this.refreshTokenRepo.save(storedToken);

    // Issue new tokens in the same family
    return this.issueTokens(storedToken.user, storedToken.family);
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  private async issueTokens(user: User, family?: string) {
    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenFamily = family || crypto.randomUUID();

    const refreshExpiryMs = this.parseExpiry(
      process.env.JWT_REFRESH_EXPIRY || '7d',
    );
    const expiresAt = new Date(Date.now() + refreshExpiryMs);

    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      family: tokenFamily,
      expiresAt,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return num * multipliers[unit];
  }
}
