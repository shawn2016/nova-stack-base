import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_file')
export class SysFileEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '主键' })
  id!: string;

  @Column({ type: 'varchar', length: 512, comment: '访问URL' })
  url!: string;

  @Column({ type: 'varchar', length: 512, name: 'object_key', comment: '存储对象键' })
  objectKey!: string;

  /** 存储类型：local/oss/aliyun_oss/tencent_cos */
  @Column({ type: 'varchar', length: 32, comment: '存储类型' })
  storage!: 'local' | 'oss' | 'aliyun_oss' | 'tencent_cos';

  @Column({ type: 'varchar', length: 128, name: 'mime_type', comment: 'MIME类型' })
  mimeType!: string;

  @Column({ type: 'int', comment: '文件大小（字节）' })
  size!: number;

  /** 原始文件名；null=未知 */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'original_name',
    nullable: true,
    comment: '原始文件名',
  })
  originalName!: string | null;

  @Column({ type: 'bigint', name: 'uploader_id', comment: '上传者用户ID' })
  uploaderId!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
