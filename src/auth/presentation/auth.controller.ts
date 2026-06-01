import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from '../application/auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login and receive access token' })
  @ApiResponse({ status: 200, description: 'Returns accessToken; sets refresh_token cookie' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie('refresh_token', refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      secure: process.env.NODE_ENV === 'production',
    });
    return { accessToken, tokenType: 'Bearer' };
  }

  @ApiOperation({ summary: 'Refresh access token using refresh_token cookie' })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, description: 'Returns new accessToken' })
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: { sub: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      user.sub,
      user.refreshToken,
    );
    res.cookie('refresh_token', refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      secure: process.env.NODE_ENV === 'production',
    });
    return { accessToken, tokenType: 'Bearer' };
  }

  @ApiOperation({ summary: 'Logout and clear refresh token' })
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token');
  }
}
