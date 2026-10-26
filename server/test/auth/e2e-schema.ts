import { DataSource } from 'typeorm';

/** sqlite 兼容 DDL（实体使用 bigint，测试库用 INTEGER AUTOINCREMENT） */
export async function initE2eSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE TABLE IF NOT EXISTS auth_session (
    id VARCHAR(36) PRIMARY KEY, user_id BIGINT NOT NULL, type VARCHAR(16) NOT NULL,
    username VARCHAR(64) NOT NULL DEFAULT '', ip VARCHAR(64) NOT NULL DEFAULT '', user_agent TEXT,
    login_at DATETIME NOT NULL, expires_at DATETIME NOT NULL
  )`);
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(64) NOT NULL,
      avatar VARCHAR(512),
      status TINYINT NOT NULL DEFAULT 1,
      dept_id BIGINT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_role (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(64) NOT NULL,
      code VARCHAR(64) NOT NULL UNIQUE,
      status TINYINT NOT NULL DEFAULT 1,
      sort INT NOT NULL DEFAULT 0,
      data_scope TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_permission (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(64) NOT NULL,
      code VARCHAR(128) NOT NULL UNIQUE,
      type VARCHAR(16) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id BIGINT NOT NULL DEFAULT 0,
      name VARCHAR(64) NOT NULL,
      path VARCHAR(256),
      component VARCHAR(256),
      icon VARCHAR(64),
      type VARCHAR(16) NOT NULL,
      permission_code VARCHAR(128),
      sort INT NOT NULL DEFAULT 0,
      visible TINYINT NOT NULL DEFAULT 1,
      status TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_user_role (
      user_id BIGINT NOT NULL,
      role_id BIGINT NOT NULL,
      PRIMARY KEY (user_id, role_id)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_role_permission (
      role_id BIGINT NOT NULL,
      permission_id BIGINT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS member_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(64) NOT NULL,
      avatar VARCHAR(512),
      status TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS article (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(200) NOT NULL,
      summary VARCHAR(500) NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      cover_url VARCHAR(512),
      status TINYINT NOT NULL DEFAULT 0,
      author_id BIGINT NOT NULL,
      published_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_article_status_published_at
    ON article (status, published_at)
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_dict_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(64) NOT NULL,
      code VARCHAR(64) NOT NULL UNIQUE,
      status TINYINT NOT NULL DEFAULT 1,
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_dict_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id BIGINT NOT NULL,
      label VARCHAR(64) NOT NULL,
      value VARCHAR(64) NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      status TINYINT NOT NULL DEFAULT 1,
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (type_id, value)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key VARCHAR(64) NOT NULL UNIQUE,
      config_name VARCHAR(64) NOT NULL,
      config_value TEXT NOT NULL,
      config_group VARCHAR(32),
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_login_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(64) NOT NULL,
      user_id BIGINT,
      ip VARCHAR(64) NOT NULL,
      user_agent VARCHAR(255),
      status TINYINT NOT NULL,
      message VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_ip_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip VARCHAR(64) NOT NULL UNIQUE,
      source VARCHAR(16) NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      expires_at DATETIME,
      remark VARCHAR(255),
      created_by BIGINT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_oper_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id BIGINT NOT NULL,
      username VARCHAR(64) NOT NULL,
      module VARCHAR(32) NOT NULL,
      action VARCHAR(32) NOT NULL,
      method VARCHAR(8) NOT NULL,
      path VARCHAR(255) NOT NULL,
      ip VARCHAR(64) NOT NULL,
      request_summary TEXT,
      status TINYINT NOT NULL,
      error_msg VARCHAR(500),
      duration_ms INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_region (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id BIGINT NOT NULL DEFAULT 0,
      name VARCHAR(64) NOT NULL,
      code VARCHAR(12) NOT NULL UNIQUE,
      level TINYINT NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      status TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_notice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(128) NOT NULL,
      content TEXT NOT NULL,
      type TINYINT NOT NULL,
      status TINYINT NOT NULL DEFAULT 0,
      publisher_id BIGINT NOT NULL,
      published_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_notice_read (
      notice_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      read_at DATETIME NOT NULL,
      PRIMARY KEY (notice_id, user_id)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_message (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id BIGINT NOT NULL,
      receiver_id BIGINT NOT NULL,
      title VARCHAR(128) NOT NULL,
      content TEXT NOT NULL,
      is_read TINYINT NOT NULL DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_role_dept (
      role_id BIGINT NOT NULL,
      dept_id BIGINT NOT NULL,
      PRIMARY KEY (role_id, dept_id)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_dept (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id BIGINT NOT NULL DEFAULT 0,
      name VARCHAR(64) NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      leader VARCHAR(64),
      phone VARCHAR(32),
      status TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_job (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(64) NOT NULL,
      job_group VARCHAR(64) NOT NULL DEFAULT 'default',
      invoke_target VARCHAR(128) NOT NULL,
      cron_expression VARCHAR(64) NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      concurrent TINYINT NOT NULL DEFAULT 0,
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_job_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id BIGINT NOT NULL,
      job_name VARCHAR(64) NOT NULL,
      job_group VARCHAR(64) NOT NULL,
      invoke_target VARCHAR(128) NOT NULL,
      status TINYINT NOT NULL,
      message VARCHAR(500),
      exception_info TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      duration_ms INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_sms_channel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NOT NULL,
      config TEXT NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_sms_template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(64) NOT NULL,
      content TEXT NOT NULL,
      channel_id BIGINT NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_sms_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id BIGINT NOT NULL,
      template_code VARCHAR(64) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      status TINYINT NOT NULL,
      provider_message VARCHAR(500),
      sent_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_email_channel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NOT NULL,
      config TEXT NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_email_template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(64) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      channel_id BIGINT NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      remark VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id BIGINT NOT NULL,
      template_code VARCHAR(64) NOT NULL,
      "to" VARCHAR(128) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      status TINYINT NOT NULL,
      provider_message VARCHAR(500),
      sent_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS sys_file (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url VARCHAR(512) NOT NULL,
      object_key VARCHAR(512) NOT NULL,
      storage VARCHAR(16) NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      size INT NOT NULL,
      original_name VARCHAR(255),
      uploader_id BIGINT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
