import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtPayload, PublicUser } from './interfaces/jwt-payload.interface';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  /** 在显式启用的非生产环境中确保 demo 账号存在。 */
  async ensureDemoUser(email: string, password: string): Promise<void> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const exists = await this.userRepo.findOne({ where: { email: normalizedEmail } });
      if (exists) return;
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = this.userRepo.create({
        email: normalizedEmail,
        username: 'Demo 用户',
        passwordHash,
        role: 'demo',
      });
      await this.userRepo.save(user);
      this.logger.log(`已创建 demo 账号: ${normalizedEmail}`);
    } catch (err: any) {
      this.logger.warn(`ensureDemoUser 失败（可能是表未建好）: ${err?.message ?? err}`);
    }
  }

  async register(dto: RegisterDto): Promise<{ token: string; user: PublicUser }> {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('该邮箱已被注册');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepo.create({
      email,
      username: dto.username.trim(),
      passwordHash,
      role: 'user',
    });
    const saved = await this.userRepo.save(user);
    const token = this.signToken(saved);
    return { token, user: this.toPublic(saved) };
  }

  async login(dto: LoginDto): Promise<{ token: string; user: PublicUser }> {
    // passwordHash 默认 select: false，需要显式 addSelect
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email.toLowerCase().trim() })
      .getOne();
    if (!user || !user.isActive) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const token = this.signToken(user);
    return { token, user: this.toPublic(user) };
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.toPublic(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (dto.username !== undefined) user.username = dto.username.trim();
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.bio !== undefined) user.bio = dto.bio;
    const saved = await this.userRepo.save(user);
    return this.toPublic(saved);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new NotFoundException('用户不存在');
    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('原密码不正确');
    user.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.userRepo.save(user);
  }

  private signToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
