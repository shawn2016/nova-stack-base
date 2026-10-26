// Only CI's disposable local MySQL fixture; never accepts production database names.
const mysql = require('mysql2/promise');
(async () => {
  if (!process.env.TEST_MYSQL_ROOT_PASSWORD) throw new Error('Explicit disposable root fixture required');
  const connection = await mysql.createConnection({ host: '127.0.0.1', port: Number(process.env.DB_PORT ?? 13316), user: 'root', password: process.env.TEST_MYSQL_ROOT_PASSWORD });
  try {
    for (const name of ['nova_foundation_migration_test', 'nova_foundation_auth_race_test']) {
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await connection.query(`GRANT ALL ON ${name}.* TO 'nova_ci'@'%'`);
    }
  } finally { await connection.end(); }
})().catch(() => { console.error('Disposable MySQL fixture preparation failed'); process.exitCode = 1; });
