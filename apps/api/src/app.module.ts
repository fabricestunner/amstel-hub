import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import configuration from './config/configuration';

import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { HealthModule } from './modules/health/health.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OutletRewardsModule } from './modules/outlet-rewards/outlet-rewards.module';
import { OutletsModule } from './modules/outlets/outlets.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RewardCategoriesModule } from './modules/reward-categories/reward-categories.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { UsersModule } from './modules/users/users.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('security.throttleTtl', 60) * 1000,
          limit: config.get<number>('security.throttleLimit', 120),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UsersModule,
    LoyaltyModule,
    CampaignsModule,
    OutletsModule,
    OutletRewardsModule,
    VouchersModule,
    RewardsModule,
    RewardCategoriesModule,
    TournamentsModule,
    LeaderboardsModule,
    AnalyticsModule,
    NotificationsModule,
    StorageModule,
    SettingsModule,
    AuditModule,
    FraudModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
