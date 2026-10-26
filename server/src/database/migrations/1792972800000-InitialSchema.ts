import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial generic platform schema; contains no seed credentials or business data. */
export class InitialSchema1792972800000 implements MigrationInterface {
  name = 'InitialSchema1792972800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `article` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `title` varchar(200) NOT NULL COMMENT '标题', `summary` varchar(500) NOT NULL COMMENT '摘要' DEFAULT '', `content` text NOT NULL COMMENT '正文', `cover_url` varchar(512) NULL COMMENT '封面URL', `status` tinyint NOT NULL COMMENT '状态：0草稿 1已发布' DEFAULT '0', `author_id` bigint NOT NULL COMMENT '作者用户ID', `published_at` datetime NULL COMMENT '发布时间', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX `IDX_9af34d954dc340d6fc71cd4cdf` (`status`, `published_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `member_user` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `phone` varchar(20) NOT NULL COMMENT '手机号', `password_hash` varchar(255) NULL COMMENT '密码哈希', `nickname` varchar(64) NOT NULL COMMENT '昵称', `avatar` varchar(512) NULL COMMENT '头像URL', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_77dfa36d16ae1f79fa54f09488` (`phone`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_config` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `config_key` varchar(64) NOT NULL COMMENT '配置键', `config_name` varchar(64) NOT NULL COMMENT '配置名称', `config_value` text NOT NULL COMMENT '配置值', `config_group` varchar(32) NULL COMMENT '配置分组', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_018d62dc9e7496d36994292299` (`config_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_dict_data` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `type_id` bigint NOT NULL COMMENT '字典类型ID', `label` varchar(64) NOT NULL COMMENT '显示标签', `value` varchar(64) NOT NULL COMMENT '字典值', `sort` int NOT NULL COMMENT '排序' DEFAULT '0', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_1218a636b27ee9b3c10d239537` (`type_id`, `value`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_dict_type` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(64) NOT NULL COMMENT '字典类型名称', `code` varchar(64) NOT NULL COMMENT '字典类型编码', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_74d0045ff7fab9f67adc0b1bda` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_login_log` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `username` varchar(64) NOT NULL COMMENT '登录用户名', `user_id` bigint NULL COMMENT '用户ID', `ip` varchar(64) NOT NULL COMMENT '客户端IP', `user_agent` varchar(255) NULL COMMENT 'User-Agent', `status` tinyint NOT NULL COMMENT '结果：1成功 0失败', `message` varchar(255) NULL COMMENT '消息', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_menu` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `parent_id` bigint NOT NULL COMMENT '父菜单ID' DEFAULT '0', `name` varchar(64) NOT NULL COMMENT '菜单名称', `path` varchar(256) NULL COMMENT '路由路径', `component` varchar(256) NULL COMMENT '组件路径', `icon` varchar(64) NULL COMMENT '图标', `type` varchar(16) NOT NULL COMMENT '菜单类型', `permission_code` varchar(128) NULL COMMENT '权限码', `sort` int NOT NULL COMMENT '排序' DEFAULT '0', `visible` tinyint NOT NULL COMMENT '是否可见：1是 0否' DEFAULT '1', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_oper_log` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `user_id` bigint NOT NULL COMMENT '操作用户ID', `username` varchar(64) NOT NULL COMMENT '操作用户名', `module` varchar(32) NOT NULL COMMENT '业务模块', `action` varchar(32) NOT NULL COMMENT '操作动作', `method` varchar(8) NOT NULL COMMENT 'HTTP方法', `path` varchar(255) NOT NULL COMMENT '请求路径', `ip` varchar(64) NOT NULL COMMENT '客户端IP', `request_summary` text NULL COMMENT '请求摘要', `status` tinyint NOT NULL COMMENT '结果：1成功 0失败', `error_msg` varchar(500) NULL COMMENT '错误信息', `duration_ms` int NOT NULL COMMENT '耗时毫秒', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_permission` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(64) NOT NULL COMMENT '权限名称', `code` varchar(128) NOT NULL COMMENT '权限码', `type` varchar(16) NOT NULL COMMENT '权限类型', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_ba9809c4237d793d905045f04e` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_role` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(64) NOT NULL COMMENT '角色名称', `code` varchar(64) NOT NULL COMMENT '角色编码', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `sort` int NOT NULL COMMENT '排序' DEFAULT '0', `data_scope` tinyint NOT NULL COMMENT '数据权限：1全部 2自定义 3本部门 4本部门及以下 5仅本人' DEFAULT '1', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_cf51756dc07761fea6b351e061` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_role_permission` (`role_id` bigint NOT NULL COMMENT '角色ID', `permission_id` bigint NOT NULL COMMENT '权限ID', PRIMARY KEY (`role_id`, `permission_id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_user` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `username` varchar(64) NOT NULL COMMENT '登录用户名', `password_hash` varchar(255) NOT NULL COMMENT '密码哈希', `nickname` varchar(64) NOT NULL COMMENT '昵称', `avatar` varchar(512) NULL COMMENT '头像URL', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `dept_id` bigint NULL COMMENT '部门ID', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_9e7164b2f1ea1348bc0eb0a7da` (`username`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_user_role` (`user_id` bigint NOT NULL COMMENT '用户ID', `role_id` bigint NOT NULL COMMENT '角色ID', PRIMARY KEY (`user_id`, `role_id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_region` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `parent_id` bigint NOT NULL COMMENT '父级ID' DEFAULT '0', `name` varchar(64) NOT NULL COMMENT '区划名称', `code` varchar(12) NOT NULL COMMENT '区划编码', `level` tinyint NOT NULL COMMENT '层级：1省 2市 3区县', `sort` int NOT NULL COMMENT '排序' DEFAULT '0', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_87a12595077c691d5584e23151` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_notice` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `title` varchar(128) NOT NULL COMMENT '标题', `content` text NOT NULL COMMENT '内容', `type` tinyint NOT NULL COMMENT '类型：1通知 2公告', `status` tinyint NOT NULL COMMENT '状态：1已发布 0草稿' DEFAULT '0', `publisher_id` bigint NOT NULL COMMENT '发布者用户ID', `published_at` datetime NULL COMMENT '发布时间', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_notice_read` (`notice_id` bigint NOT NULL COMMENT '公告ID', `user_id` bigint NOT NULL COMMENT '用户ID', `read_at` datetime NOT NULL COMMENT '阅读时间', PRIMARY KEY (`notice_id`, `user_id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_message` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `sender_id` bigint NOT NULL COMMENT '发送者用户ID', `receiver_id` bigint NOT NULL COMMENT '接收者用户ID', `title` varchar(128) NOT NULL COMMENT '消息标题', `content` text NOT NULL COMMENT '消息内容', `is_read` tinyint NOT NULL COMMENT '已读：1已读 0未读' DEFAULT '0', `read_at` datetime NULL COMMENT '阅读时间', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_dept` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `parent_id` bigint NOT NULL COMMENT '父部门ID' DEFAULT '0', `name` varchar(64) NOT NULL COMMENT '部门名称', `sort` int NOT NULL COMMENT '排序' DEFAULT '0', `leader` varchar(64) NULL COMMENT '负责人', `phone` varchar(32) NULL COMMENT '联系电话', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_role_dept` (`role_id` bigint NOT NULL COMMENT '角色ID', `dept_id` bigint NOT NULL COMMENT '部门ID', PRIMARY KEY (`role_id`, `dept_id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_job` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(64) NOT NULL COMMENT '任务名称', `job_group` varchar(64) NOT NULL COMMENT '任务分组' DEFAULT 'default', `invoke_target` varchar(128) NOT NULL COMMENT '调用目标', `cron_expression` varchar(64) NOT NULL COMMENT 'Cron表达式', `status` tinyint NOT NULL COMMENT '状态：1运行 0暂停' DEFAULT '1', `concurrent` tinyint NOT NULL COMMENT '并发：1允许 0禁止' DEFAULT '0', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_job_log` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `job_id` bigint NOT NULL COMMENT '定时任务ID', `job_name` varchar(64) NOT NULL COMMENT '任务名称', `job_group` varchar(64) NOT NULL COMMENT '任务分组', `invoke_target` varchar(128) NOT NULL COMMENT '调用目标', `status` tinyint NOT NULL COMMENT '执行状态：1成功 0失败', `message` varchar(500) NULL COMMENT '执行消息', `exception_info` text NULL COMMENT '异常信息', `start_time` datetime NOT NULL COMMENT '开始时间', `end_time` datetime NOT NULL COMMENT '结束时间', `duration_ms` int NOT NULL COMMENT '耗时（毫秒）', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_sms_channel` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(64) NOT NULL COMMENT '渠道名称', `provider` varchar(32) NOT NULL COMMENT '服务商标识', `config` text NOT NULL COMMENT '渠道配置JSON', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_sms_template` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `code` varchar(64) NOT NULL COMMENT '模板编码', `name` varchar(64) NOT NULL COMMENT '模板名称', `content` text NOT NULL COMMENT '模板内容', `channel_id` bigint NOT NULL COMMENT '短信渠道ID', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_06bef6a9d09225cc9f51ea4b26` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_sms_log` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `channel_id` bigint NOT NULL COMMENT '短信渠道ID', `template_code` varchar(64) NOT NULL COMMENT '模板编码', `phone` varchar(20) NOT NULL COMMENT '手机号', `content` text NOT NULL COMMENT '短信内容', `status` tinyint NOT NULL COMMENT '发送状态：1成功 0失败', `provider_message` varchar(500) NULL COMMENT '服务商回执', `sent_at` datetime NOT NULL COMMENT '发送时间', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_email_channel` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `name` varchar(64) NOT NULL COMMENT '渠道名称', `provider` varchar(32) NOT NULL COMMENT '服务商标识', `config` text NOT NULL COMMENT '渠道配置JSON', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_email_template` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `code` varchar(64) NOT NULL COMMENT '模板编码', `name` varchar(64) NOT NULL COMMENT '模板名称', `subject` varchar(255) NOT NULL COMMENT '邮件主题', `content` text NOT NULL COMMENT '模板内容', `channel_id` bigint NOT NULL COMMENT '邮件渠道ID', `status` tinyint NOT NULL COMMENT '状态：1启用 0禁用' DEFAULT '1', `remark` varchar(255) NULL COMMENT '备注', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_2f3d7c52afe70d56bf4afa215c` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_email_log` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `channel_id` bigint NOT NULL COMMENT '邮件渠道ID', `template_code` varchar(64) NOT NULL COMMENT '模板编码', `to` varchar(128) NOT NULL COMMENT '收件人', `subject` varchar(255) NOT NULL COMMENT '邮件主题', `content` text NOT NULL COMMENT '邮件正文', `status` tinyint NOT NULL COMMENT '发送状态：1成功 0失败', `provider_message` varchar(500) NULL COMMENT '服务商回执', `sent_at` datetime NOT NULL COMMENT '发送时间', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_file` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `url` varchar(512) NOT NULL COMMENT '访问URL', `object_key` varchar(512) NOT NULL COMMENT '存储对象键', `storage` varchar(32) NOT NULL COMMENT '存储类型', `mime_type` varchar(128) NOT NULL COMMENT 'MIME类型', `size` int NOT NULL COMMENT '文件大小（字节）', `original_name` varchar(255) NULL COMMENT '原始文件名', `uploader_id` bigint NOT NULL COMMENT '上传者用户ID', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `sys_ip_blacklist` (`id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键', `ip` varchar(64) NOT NULL COMMENT 'IPv4 地址', `source` varchar(16) NOT NULL COMMENT '来源：manual/auto', `status` tinyint NOT NULL COMMENT '状态：1启用 0停用' DEFAULT '1', `expires_at` datetime NULL COMMENT '过期时间，null=永久', `remark` varchar(255) NULL COMMENT '备注', `created_by` bigint NULL COMMENT '创建人 userId', `created_at` datetime(6) NOT NULL COMMENT '创建时间' DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL COMMENT '更新时间' DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_21426cabdb20c5ce9eb41e1eaf` (`ip`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `sys_ip_blacklist`');
    await queryRunner.query('DROP TABLE `sys_file`');
    await queryRunner.query('DROP TABLE `sys_email_log`');
    await queryRunner.query('DROP TABLE `sys_email_template`');
    await queryRunner.query('DROP TABLE `sys_email_channel`');
    await queryRunner.query('DROP TABLE `sys_sms_log`');
    await queryRunner.query('DROP TABLE `sys_sms_template`');
    await queryRunner.query('DROP TABLE `sys_sms_channel`');
    await queryRunner.query('DROP TABLE `sys_job_log`');
    await queryRunner.query('DROP TABLE `sys_job`');
    await queryRunner.query('DROP TABLE `sys_role_dept`');
    await queryRunner.query('DROP TABLE `sys_dept`');
    await queryRunner.query('DROP TABLE `sys_message`');
    await queryRunner.query('DROP TABLE `sys_notice_read`');
    await queryRunner.query('DROP TABLE `sys_notice`');
    await queryRunner.query('DROP TABLE `sys_region`');
    await queryRunner.query('DROP TABLE `sys_user_role`');
    await queryRunner.query('DROP TABLE `sys_user`');
    await queryRunner.query('DROP TABLE `sys_role_permission`');
    await queryRunner.query('DROP TABLE `sys_role`');
    await queryRunner.query('DROP TABLE `sys_permission`');
    await queryRunner.query('DROP TABLE `sys_oper_log`');
    await queryRunner.query('DROP TABLE `sys_menu`');
    await queryRunner.query('DROP TABLE `sys_login_log`');
    await queryRunner.query('DROP TABLE `sys_dict_type`');
    await queryRunner.query('DROP TABLE `sys_dict_data`');
    await queryRunner.query('DROP TABLE `sys_config`');
    await queryRunner.query('DROP TABLE `member_user`');
    await queryRunner.query('DROP TABLE `article`');
  }
}
