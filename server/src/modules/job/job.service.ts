import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { JobDetail, JobListItem, PaginationResult, RunJobResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysJobEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';
import { CreateJobDto, UpdateJobDto, UpdateJobStatusDto } from './dto/job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { JobHandlerRegistry } from './job-handler.registry';
import { JobSchedulerService } from './job-scheduler.service';
import { assertValidCronExpression } from './job-log.service';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(SysJobEntity)
    private readonly jobRepo: Repository<SysJobEntity>,
    private readonly handlerRegistry: JobHandlerRegistry,
    private readonly scheduler: JobSchedulerService,
  ) {}

  listHandlers() {
    return this.handlerRegistry.listHandlers();
  }

  async list(query: ListJobsDto): Promise<PaginationResult<JobListItem>> {
    const { page = 1, pageSize = 10, keyword } = query;
    const qb = this.jobRepo.createQueryBuilder('j').orderBy('j.id', 'DESC');

    if (keyword?.trim()) {
      qb.andWhere('(j.name LIKE :kw OR j.invokeTarget LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: rows.map((row) => this.toListItem(row)),
      total,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<JobDetail> {
    const job = await this.findEntityById(id);
    return this.toListItem(job);
  }

  async create(dto: CreateJobDto): Promise<JobDetail> {
    this.assertHandler(dto.invokeTarget);
    assertValidCronExpression(dto.cronExpression);

    const job = this.jobRepo.create({
      name: dto.name,
      jobGroup: dto.jobGroup ?? 'default',
      invokeTarget: dto.invokeTarget,
      cronExpression: dto.cronExpression,
      status: dto.status ?? 0,
      concurrent: dto.concurrent ?? 0,
      remark: dto.remark ?? null,
    });

    const saved = await this.jobRepo.save(job);
    if (saved.status === 1) {
      await this.scheduler.schedule(saved);
    }
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateJobDto): Promise<JobDetail> {
    const job = await this.findEntityById(id);

    if (dto.invokeTarget !== undefined) {
      this.assertHandler(dto.invokeTarget);
      job.invokeTarget = dto.invokeTarget;
    }
    if (dto.cronExpression !== undefined) {
      assertValidCronExpression(dto.cronExpression);
      job.cronExpression = dto.cronExpression;
    }
    if (dto.name !== undefined) job.name = dto.name;
    if (dto.jobGroup !== undefined) job.jobGroup = dto.jobGroup;
    if (dto.concurrent !== undefined) job.concurrent = dto.concurrent;
    if (dto.remark !== undefined) job.remark = dto.remark;
    if (dto.status !== undefined) job.status = dto.status;

    const saved = await this.jobRepo.save(job);
    await this.scheduler.schedule(saved);
    return this.toListItem(saved);
  }

  async updateStatus(id: string, dto: UpdateJobStatusDto): Promise<JobDetail> {
    const job = await this.findEntityById(id);
    job.status = dto.status;
    const saved = await this.jobRepo.save(job);
    await this.scheduler.schedule(saved);
    return this.toListItem(saved);
  }

  async runOnce(id: string): Promise<RunJobResult> {
    return this.scheduler.runOnce(id);
  }

  async remove(id: string): Promise<{ success: true }> {
    const job = await this.findEntityById(id);
    await this.jobRepo.remove(job);
    await this.scheduler.unschedule(job.id);
    return { success: true };
  }

  private assertHandler(invokeTarget: string): void {
    if (!this.handlerRegistry.has(invokeTarget)) {
      throw new BadRequestException('Invalid invokeTarget');
    }
  }

  private async findEntityById(id: string): Promise<SysJobEntity> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  private toListItem(job: SysJobEntity): JobListItem {
    return {
      id: toApiId(job.id),
      name: job.name,
      jobGroup: job.jobGroup,
      invokeTarget: job.invokeTarget,
      cronExpression: job.cronExpression,
      status: job.status as 0 | 1,
      concurrent: job.concurrent as 0 | 1,
      remark: job.remark,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
