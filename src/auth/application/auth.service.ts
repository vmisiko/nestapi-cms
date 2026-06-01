import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../users/application/users.service';
import { UserRepository } from '../../users/infrastructure/user.repository';
import { LoginUseCase } from '../domain/usecases/login.usecase';
import type { LoginDto } from '../presentation/dto/login.dto';
import type { ChangePasswordDto } from '../presentation/dto/change-password.dto';
import type { User } from '../../users/domain/user';

@Injectable()
export class AuthService {
  private readonly loginUseCase: LoginUseCase;

  constructor(
    private readonly usersService: UsersService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.loginUseCase = new LoginUseCase(userRepository);
  }

  async login(dto: LoginDto) {
    const result = await this.loginUseCase.execute(dto);
    if (result.isLeft()) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const user = result.fold<User | null>(
      () => null,
      (u: User | null) => u,
    ) as User;
    const tokens = await this.generateTokens(user);
    await this.storeRefreshHash(user.id, tokens.refreshToken);
    await this.usersService.setLastLogin(user.id);
    return { user, ...tokens };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshTokenHash) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches)
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);

    const tokens = await this.generateTokens(user);
    await this.storeRefreshHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async getMe(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new HttpException(
        'Current password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordHash(userId, newHash);
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateJwtPayload(payload: { sub: string }) {
    return this.usersService.findById(payload.sub);
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshHash(userId: string, token: string) {
    const hash = await bcrypt.hash(token, 10);
    await this.usersService.updateRefreshToken(userId, hash);
  }
}
