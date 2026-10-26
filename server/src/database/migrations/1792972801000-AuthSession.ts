import { MigrationInterface, QueryRunner } from 'typeorm';

/** SQL metadata for independently revocable login sessions. */
export class AuthSession1792972801000 implements MigrationInterface {
  name = 'AuthSession1792972801000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `auth_session` (`id` varchar(36) NOT NULL COMMENT '会话UUID', `user_id` bigint NOT NULL COMMENT '管理员或会员ID', `type` varchar(16) NOT NULL COMMENT '主体类型：admin/member', `username` varchar(64) NOT NULL COMMENT '登录用户名快照' DEFAULT '', `ip` varchar(64) NOT NULL COMMENT '登录IP快照' DEFAULT '', `user_agent` text NULL COMMENT '登录客户端', `login_at` datetime NOT NULL COMMENT '登录时间', `expires_at` datetime NOT NULL COMMENT '会话绝对过期时间', INDEX `idx_auth_session_user` (`user_id`, `expires_at`), INDEX `idx_auth_session_login` (`type`, `login_at`, `id`), INDEX `idx_auth_session_expiry` (`expires_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `auth_session`');
  }
}
