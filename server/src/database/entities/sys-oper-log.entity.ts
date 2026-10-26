import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_oper_log')
export class SysOperLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '主键' })
  id!: string;

  @Column({ type: 'bigint', name: 'user_id', comment: '操作用户ID' })
  userId!: string;

  @Column({ type: 'varchar', length: 64, comment: '操作用户名' })
  username!: string;

  @Column({ type: 'varchar', length: 32, comment: '业务模块' })
  module!: string;

  @Column({ type: 'varchar', length: 32, comment: '操作动作' })
  action!: string;

  @Column({ type: 'varchar', length: 8, comment: 'HTTP方法' })
  method!: string;

  @Column({ type: 'varchar', length: 255, comment: '请求路径' })
  path!: string;

  @Column({ type: 'varchar', length: 64, comment: '客户端IP' })
  ip!: string;

  @Column({
    type: 'text',
    name: 'request_summary',
    nullable: true,
    comment: '请求摘要',
  })
  requestSummary!: string | null;

  /** 结果：1=成功，0=失败 */
  @Column({ type: 'tinyint', comment: '结果：1成功 0失败' })
  status!: number;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'error_msg',
    nullable: true,
    comment: '错误信息',
  })
  errorMsg!: string | null;

  @Column({ type: 'int', name: 'duration_ms', comment: '耗时毫秒' })
  durationMs!: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
