import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysJobEntity, SysJobLogEntity } from '../../database/entities';
import { JobController } from './job.controller';
import { JobHandlerRegistry } from './job-handler.registry';
import { JobLogService } from './job-log.service';
import { JobSchedulerService } from './job-scheduler.service';
import { JobService } from './job.service';

@Module({
  imports: [TypeOrmModule.forFeature([SysJobEntity, SysJobLogEntity])],
  controllers: [JobController],
  providers: [JobHandlerRegistry, JobLogService, JobSchedulerService, JobService],
  exports: [JobService],
})
export class JobModule {}
