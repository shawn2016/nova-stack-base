import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SysSmsChannelEntity,
  SysSmsLogEntity,
  SysSmsTemplateEntity,
} from '../../database/entities';
import { SmsController } from './sms.controller';
import { SmsChannelService } from './sms-channel.service';
import { SmsLogService } from './sms-log.service';
import { SmsProviderFactory } from './sms-provider.factory';
import { SmsService } from './sms.service';
import { SmsTemplateService } from './sms-template.service';

@Module({
  imports: [TypeOrmModule.forFeature([SysSmsChannelEntity, SysSmsTemplateEntity, SysSmsLogEntity])],
  controllers: [SmsController],
  providers: [SmsChannelService, SmsTemplateService, SmsLogService, SmsService, SmsProviderFactory],
  exports: [SmsService],
})
export class SmsModule {}
