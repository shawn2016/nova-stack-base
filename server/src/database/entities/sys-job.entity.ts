import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_job')
export class SysJobEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '主键' })
  id!: string;

  @Column({ type: 'varchar', length: 64, comment: '任务名称' })
  name!: string;

  @Column({
    type: 'varchar',
    length: 64,
    name: 'job_group',
    default: 'default',
    comment: '任务分组',
  })
  jobGroup!: string;

  @Column({ type: 'varchar', length: 128, name: 'invoke_target', comment: '调用目标' })
  invokeTarget!: string;

  @Column({ type: 'varchar', length: 64, name: 'cron_expression', comment: 'Cron表达式' })
  cronExpression!: string;

  /** 状态：1=运行，0=暂停 */
  @Column({ type: 'tinyint', default: 1, comment: '状态：1运行 0暂停' })
  status!: number;

  /** 并发执行：1=允许，0=禁止 */
  @Column({ type: 'tinyint', default: 0, comment: '并发：1允许 0禁止' })
  concurrent!: number;

  /** 备注；null=无 */
  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
