import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_login_log')
export class SysLoginLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '主键' })
  id!: string;

  @Column({ type: 'varchar', length: 64, comment: '登录用户名' })
  username!: string;

  /** 用户 ID；null=用户不存在时登录失败 */
  @Column({ type: 'bigint', name: 'user_id', nullable: true, comment: '用户ID' })
  userId!: string | null;

  @Column({ type: 'varchar', length: 64, comment: '客户端IP' })
  ip!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'user_agent',
    nullable: true,
    comment: 'User-Agent',
  })
  userAgent!: string | null;

  /** 结果：1=成功，0=失败 */
  @Column({ type: 'tinyint', comment: '结果：1成功 0失败' })
  status!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '消息' })
  message!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
