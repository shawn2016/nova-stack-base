process.env.NODE_ENV = 'test';
process.env.SKIP_EXTERNAL_SERVICES = 'true';
process.env.SKIP_JOB_SCHEDULER = 'true';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '3001';
// 固定测试 origin，避免各项目本机 .env 的预览端口影响 CORS 用例。
process.env.CORS_ORIGINS = 'http://localhost:5173,http://localhost:5174';
