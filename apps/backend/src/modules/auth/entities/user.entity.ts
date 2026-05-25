import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  username: string;

  /** bcrypt 哈希 */
  @Column({ select: false })
  passwordHash: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ default: 'user' })
  role: 'user' | 'admin' | 'demo';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
