import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_sms_log')
export class SysSmsLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '主键' })
  id!: string;

  @Column({ type: 'bigint', name: 'channel_id', comment: '短信渠道ID' })
  channelId!: string;

  @Column({ type: 'varchar', length: 64, name: 'template_code', comment: '模板编码' })
  templateCode!: string;

  @Column({ type: 'varchar', length: 20, comment: '手机号' })
  phone!: string;

  @Column({ type: 'text', comment: '短信内容' })
  content!: string;

  /** 发送状态：1=成功，0=失败 */
  @Column({ type: 'tinyint', comment: '发送状态：1成功 0失败' })
  status!: number;

  /** 服务商回执；null=无 */
  @Column({
    type: 'varchar',
    length: 500,
    name: 'provider_message',
    nullable: true,
    comment: '服务商回执',
  })
  providerMessage!: string | null;

  @Column({ type: 'datetime', name: 'sent_at', comment: '发送时间' })
  sentAt!: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
