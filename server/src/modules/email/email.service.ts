import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SendEmailResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysEmailLogEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { SendEmailDto } from './dto/email-send.dto';
import { EmailProviderFactory } from './email-provider.factory';
import { EmailChannelService } from './email-channel.service';
import { EmailTemplateService } from './email-template.service';
import { assertEmail, parseEmailConfig, renderEmailTemplate } from './email.utils';

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(SysEmailLogEntity)
    private readonly logRepo: Repository<SysEmailLogEntity>,
    private readonly channelService: EmailChannelService,
    private readonly templateService: EmailTemplateService,
    private readonly providerFactory: EmailProviderFactory,
  ) {}

  async send(dto: SendEmailDto): Promise<SendEmailResult> {
    assertEmail(dto.to);

    const template = await this.templateService.findByCode(dto.templateCode);
    if (template.status !== 1) {
      throw new BadRequestException('Email template is disabled');
    }

    const channel = await this.channelService.findEntityById(template.channelId);
    if (channel.status !== 1) {
      throw new BadRequestException('Email channel is disabled');
    }

    const subject = renderEmailTemplate(template.subject, dto.params);
    const content = renderEmailTemplate(template.content, dto.params);
    const config = parseEmailConfig(channel.config);
    const provider = this.providerFactory.resolve(channel.provider);

    const sentAt = new Date();
    const result = await provider.send({
      to: dto.to,
      subject,
      content,
      config,
    });
    const status: 0 | 1 = result.success ? 1 : 0;
    const providerMessage = result.message;

    const log = await this.logRepo.save(
      this.logRepo.create({
        channelId: channel.id,
        templateCode: template.code,
        to: dto.to,
        subject,
        content,
        status,
        providerMessage,
        sentAt,
      }),
    );

    return {
      logId: toApiId(log.id),
      status,
      subject,
      content,
      providerMessage,
    };
  }
}
