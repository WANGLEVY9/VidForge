import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('鉴权')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '注册新账号' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '登录' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  me(@CurrentUser() payload: JwtPayload) {
    return this.authService.getProfile(payload.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新个人资料' })
  updateProfile(@CurrentUser() payload: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(payload.sub, dto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  changePassword(@CurrentUser() payload: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(payload.sub, dto);
  }
}
