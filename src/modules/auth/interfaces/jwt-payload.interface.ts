export interface JwtPayload {
  sub: string;
  userId: string;
  username: string;
  role?: string;
  iat?: number;
  exp?: number;
}
