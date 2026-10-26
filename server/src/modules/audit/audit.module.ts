import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysLoginLogEntity, SysOperLogEntity, SysUserEntity } from '../../database/entities';
import { DataScopeModule } from '../data-scope/data-scope.module';
import { AuditController } from './audit.controller';
import { LoginLogService } from './login-log.service';
import { OperLogInterceptor } from './oper-log.interceptor';
import { OperLogService } from './oper-log.service';

@Module({
  imports: [
    DataScopeModule,
    TypeOrmModule.forFeature([SysLoginLogEntity, SysOperLogEntity, SysUserEntity]),
  ],
  controllers: [AuditController],
  providers: [
    LoginLogService,
    OperLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OperLogInterceptor,
    },
  ],
  exports: [LoginLogService, OperLogService],
})
export class AuditModule {}
