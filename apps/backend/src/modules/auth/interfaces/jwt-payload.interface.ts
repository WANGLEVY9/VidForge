/** JWT 解码后的负载结构 */
export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

/** 登录后返回的精简用户结构（不含 passwordHash） */
export interface PublicUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: string;
  createdAt?: Date;
}
