import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SysEmailChannelEntity,
  SysEmailLogEntity,
  SysEmailTemplateEntity,
} from '../../database/entities';
import { EmailController } from './email.controller';
import { EmailChannelService } from './email-channel.service';
import { EmailLogService } from './email-log.service';
import { EmailProviderFactory } from './email-provider.factory';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SysEmailChannelEntity, SysEmailTemplateEntity, SysEmailLogEntity]),
  ],
  controllers: [EmailController],
  providers: [
    EmailChannelService,
    EmailTemplateService,
    EmailLogService,
    EmailService,
    EmailProviderFactory,
  ],
  exports: [EmailService],
})
export class EmailModule {}
