import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** 会话元数据索引；SQL 与 Redis 会话均有效时才能使用凭据。 */
@Entity('auth_session')
@Index('idx_auth_session_expiry', ['expiresAt'])
@Index('idx_auth_session_login', ['type', 'loginAt', 'id'])
@Index('idx_auth_session_user', ['userId', 'expiresAt'])
export class AuthSessionEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '会话UUID' }) id!: string;
  @Column({ type: 'bigint', name: 'user_id', comment: '管理员或会员ID' }) userId!: string;
  @Column({ type: 'varchar', length: 16, comment: '主体类型：admin/member' }) type!:
    'admin' | 'member';
  @Column({ type: 'varchar', length: 64, default: '', comment: '登录用户名快照' })
  username!: string;
  @Column({ type: 'varchar', length: 64, default: '', comment: '登录IP快照' }) ip!: string;
  @Column({ type: 'text', name: 'user_agent', nullable: true, comment: '登录客户端' }) userAgent!:
    string | null;
  @Column({ type: 'datetime', name: 'login_at', comment: '登录时间' }) loginAt!: Date;
  @Column({ type: 'datetime', name: 'expires_at', comment: '会话绝对过期时间' }) expiresAt!: Date;
}
