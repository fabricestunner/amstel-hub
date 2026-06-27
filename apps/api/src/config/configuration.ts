/**
 * Centralized, type-safe configuration loaded from environment variables.
 * Registered via `ConfigModule.forRoot({ load: [configuration] })`.
 */
export interface AppConfig {
  env: string;
  api: {
    port: number;
    globalPrefix: string;
    corsOrigins: string[];
  };
  jwt: {
    accessSecret: string;
    accessTtl: number;
    refreshSecret: string;
    refreshTtl: number;
  };
  security: {
    encryptionKey: string;
    otpTtl: number;
    otpMaxAttempts: number;
    throttleTtl: number;
    throttleLimit: number;
  };
  redis: { url: string };
  resend: { apiKey: string; from: string };
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  sms: {
    provider: string;
    apiKey: string;
    senderId: string;
  };
  fcm: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  s3: {
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    forcePathStyle: boolean;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  api: {
    // Render/Railway/Heroku inject PORT; fall back to API_PORT then 4000.
    port: parseInt(process.env.PORT ?? process.env.API_PORT ?? '4000', 10),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api/v1',
    corsOrigins: (process.env.API_CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '2592000', 10),
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY ?? '0'.repeat(64),
    otpTtl: parseInt(process.env.OTP_TTL ?? '300', 10),
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
    throttleTtl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  },
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.RESEND_FROM ?? 'Amstel Rewards <no-reply@amstel-rewards.com>',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'Amstel Rewards <no-reply@amstel-rewards.com>',
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? 'mock',
    apiKey: process.env.SMS_API_KEY ?? '',
    senderId: process.env.SMS_SENDER_ID ?? 'AMSTEL',
  },
  fcm: {
    projectId: process.env.FCM_PROJECT_ID ?? '',
    clientEmail: process.env.FCM_CLIENT_EMAIL ?? '',
    privateKey: process.env.FCM_PRIVATE_KEY ?? '',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.S3_BUCKET ?? 'amstel-assets',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  },
});
