/** Session-bound JWT. Legacy tokens without purpose/sid require a new login. */
export interface JwtPayload {
  sub: string;
  type: 'admin' | 'member';
  purpose: 'access' | 'refresh';
  sid: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface SignTokenParams {
  userId: string;
  type: 'admin' | 'member';
  sessionId?: string;
}
