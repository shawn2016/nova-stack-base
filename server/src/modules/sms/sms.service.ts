import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SendSmsResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysSmsLogEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { SendSmsDto } from './dto/sms-send.dto';
import { SmsProviderFactory } from './sms-provider.factory';
import { SmsChannelService } from './sms-channel.service';
import { SmsTemplateService } from './sms-template.service';
import { assertPhone, parseSmsConfig, renderSmsTemplate } from './sms.utils';

@Injectable()
export class SmsService {
  constructor(
    @InjectRepository(SysSmsLogEntity)
    private readonly logRepo: Repository<SysSmsLogEntity>,
    private readonly channelService: SmsChannelService,
    private readonly templateService: SmsTemplateService,
    private readonly providerFactory: SmsProviderFactory,
  ) {}

  async send(dto: SendSmsDto): Promise<SendSmsResult> {
    assertPhone(dto.phone);

    const template = await this.templateService.findByCode(dto.templateCode);
    if (template.status !== 1) {
      throw new BadRequestException('SMS template is disabled');
    }

    const channel = await this.channelService.findEntityById(template.channelId);
    if (channel.status !== 1) {
      throw new BadRequestException('SMS channel is disabled');
    }

    const content = renderSmsTemplate(template.content, dto.params);
    const config = parseSmsConfig(channel.config);
    const provider = this.providerFactory.resolve(channel.provider);

    const sentAt = new Date();
    const result = await provider.send({
      phone: dto.phone,
      content,
      config,
    });
    const status: 0 | 1 = result.success ? 1 : 0;
    const providerMessage = result.message;

    const log = await this.logRepo.save(
      this.logRepo.create({
        channelId: channel.id,
        templateCode: template.code,
        phone: dto.phone,
        content,
        status,
        providerMessage,
        sentAt,
      }),
    );

    return {
      logId: toApiId(log.id),
      status,
      content,
      providerMessage,
    };
  }
}
