import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建审批模板
   */
  async create(dto: CreateTemplateDto) {
    // 验证配置格式
    this.validateConfig(dto.config);

    const template = await this.prisma.approvalTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        isActive: dto.isActive ?? true,
        config: dto.config,
      },
    });

    this.logger.log(`创建审批模板: id=${template.id}, name=${template.name}`);

    return {
      id: template.id.toString(),
      name: template.name,
      description: template.description,
      type: template.type,
      isActive: template.isActive,
      config: template.config,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * 查询所有模板
   */
  async findAll(type?: string, isActive?: boolean) {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const templates = await this.prisma.approvalTemplate.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return templates.map((t) => ({
      id: t.id.toString(),
      name: t.name,
      description: t.description,
      type: t.type,
      isActive: t.isActive,
      config: t.config,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  /**
   * 根据ID查询模板
   */
  async findOne(id: bigint) {
    const template = await this.prisma.approvalTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('审批模板不存在');
    }

    return {
      id: template.id.toString(),
      name: template.name,
      description: template.description,
      type: template.type,
      isActive: template.isActive,
      config: template.config,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * 更新模板
   */
  async update(id: bigint, dto: UpdateTemplateDto) {
    const existing = await this.prisma.approvalTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('审批模板不存在');
    }

    // 如果更新了配置，验证格式
    if (dto.config) {
      this.validateConfig(dto.config);
    }

    const template = await this.prisma.approvalTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        isActive: dto.isActive,
        config: dto.config,
      },
    });

    this.logger.log(`更新审批模板: id=${template.id}, name=${template.name}`);

    return {
      id: template.id.toString(),
      name: template.name,
      description: template.description,
      type: template.type,
      isActive: template.isActive,
      config: template.config,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * 删除模板
   */
  async remove(id: bigint) {
    const existing = await this.prisma.approvalTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('审批模板不存在');
    }

    await this.prisma.approvalTemplate.delete({
      where: { id },
    });

    this.logger.log(`删除审批模板: id=${id}, name=${existing.name}`);

    return { success: true, message: '模板已删除' };
  }

  /**
   * 启用/停用模板
   */
  async toggleActive(id: bigint) {
    const existing = await this.prisma.approvalTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('审批模板不存在');
    }

    const template = await this.prisma.approvalTemplate.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
    });

    this.logger.log(
      `切换模板状态: id=${id}, isActive=${template.isActive}`,
    );

    return {
      id: template.id.toString(),
      name: template.name,
      isActive: template.isActive,
    };
  }

  /**
   * 验证配置格式（私有方法）
   */
  private validateConfig(config: any) {
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('配置格式错误：必须是对象');
    }

    if (!Array.isArray(config.steps) || config.steps.length === 0) {
      throw new BadRequestException('配置格式错误：必须包含至少一个步骤');
    }

    for (const step of config.steps) {
      if (!step.stepNumber || !step.stepName) {
        throw new BadRequestException(
          '配置格式错误：步骤必须包含 stepNumber 和 stepName',
        );
      }

      if (!step.stepType) {
        step.stepType = 'SEQUENTIAL'; // 默认顺序审批
      }

      if (!['SEQUENTIAL', 'PARALLEL', 'CONDITIONAL'].includes(step.stepType)) {
        throw new BadRequestException(
          `配置格式错误：无效的步骤类型 ${step.stepType}`,
        );
      }

      // 顺序审批需要 approverRole
      if (step.stepType === 'SEQUENTIAL' && !step.approverRole) {
        throw new BadRequestException(
          `配置格式错误：顺序审批步骤必须指定 approverRole`,
        );
      }

      // 并行审批需要 approvers
      if (step.stepType === 'PARALLEL' && !step.approvers) {
        throw new BadRequestException(
          `配置格式错误：并行审批步骤必须指定 approvers`,
        );
      }
    }
  }
}
