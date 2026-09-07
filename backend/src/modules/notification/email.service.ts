import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP配置不完整，邮件功能将被禁用');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log('邮件服务初始化成功');
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('邮件服务未配置，跳过发送');
      return false;
    }

    try {
      const from = this.configService.get<string>('SMTP_FROM', 'noreply@ticketing.com');

      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      this.logger.log(`邮件发送成功: ${to} - ${subject}`);
      return true;
    } catch (error) {
      this.logger.error(`邮件发送失败: ${error.message}`, error.stack);
      return false;
    }
  }

  async sendTicketCreatedEmail(to: string, ticketNumber: number, title: string): Promise<boolean> {
    const subject = `新工单 #${ticketNumber}: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">新工单通知</h2>
        <p>您有一个新的工单：</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>工单编号：</strong>#${ticketNumber}</p>
          <p><strong>工单标题：</strong>${title}</p>
        </div>
        <p>请登录系统查看详情。</p>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  async sendTicketAssignedEmail(
    to: string,
    ticketNumber: number,
    title: string,
    assigneeName: string,
  ): Promise<boolean> {
    const subject = `工单已分配 #${ticketNumber}: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">工单分配通知</h2>
        <p>您有一个新的工单已被分配给您：</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>工单编号：</strong>#${ticketNumber}</p>
          <p><strong>工单标题：</strong>${title}</p>
          <p><strong>处理人：</strong>${assigneeName}</p>
        </div>
        <p>请登录系统查看详情并及时处理。</p>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  async sendTicketStatusChangedEmail(
    to: string,
    ticketNumber: number,
    title: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<boolean> {
    const subject = `工单状态变更 #${ticketNumber}: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">工单状态变更通知</h2>
        <p>工单状态已更新：</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>工单编号：</strong>#${ticketNumber}</p>
          <p><strong>工单标题：</strong>${title}</p>
          <p><strong>状态变更：</strong>${oldStatus} → ${newStatus}</p>
        </div>
        <p>请登录系统查看详情。</p>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  async sendTicketCommentedEmail(
    to: string,
    ticketNumber: number,
    title: string,
    commenterName: string,
    commentContent: string,
  ): Promise<boolean> {
    const subject = `工单新评论 #${ticketNumber}: ${title}`;
    const truncatedContent = commentContent.length > 200
      ? commentContent.substring(0, 200) + '...'
      : commentContent;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">工单新评论通知</h2>
        <p>您关注的工单有新评论：</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>工单编号：</strong>#${ticketNumber}</p>
          <p><strong>工单标题：</strong>${title}</p>
          <p><strong>评论人：</strong>${commenterName}</p>
          <p><strong>评论内容：</strong></p>
          <p style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 3px;">
            ${truncatedContent}
          </p>
        </div>
        <p>请登录系统查看完整评论。</p>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  /**
   * 发送审批请求邮件
   */
  async sendApprovalRequestEmail(
    to: string,
    ticketNumber: number,
    title: string,
    approvalType: string,
    stepName: string,
  ): Promise<boolean> {
    const subject = `待审批通知 #${ticketNumber}: ${title}`;
    const typeMap = {
      REPAIR_REVIEW: '报修审核',
      BUDGET_REVIEW: '预算审核',
      PROJECT_APPROVAL: '立项审批',
      VISA_APPROVAL_LOW: '签证审批',
      VISA_APPROVAL_MEDIUM: '签证审批',
      VISA_APPROVAL_HIGH: '签证审批',
      SETTLEMENT_APPROVAL_LOW: '结算审批',
      SETTLEMENT_APPROVAL_MEDIUM: '结算审批',
      SETTLEMENT_APPROVAL_HIGH: '结算审批',
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">🔔 待审批通知</h2>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">您有一个新的审批请求待处理：</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 10px 0;"><strong>工单编号：</strong><span style="color: #667eea;">#${ticketNumber}</span></p>
            <p style="margin: 10px 0;"><strong>工单标题：</strong>${title}</p>
            <p style="margin: 10px 0;"><strong>审批类型：</strong><span style="color: #764ba2;">${typeMap[approvalType] || approvalType}</span></p>
            <p style="margin: 10px 0;"><strong>审批步骤：</strong>${stepName}</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">请尽快登录系统进行审批处理</p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>本邮件由工单管理系统自动发送，请勿直接回复</p>
        </div>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  /**
   * 发送审批通过邮件
   */
  async sendApprovalApprovedEmail(
    to: string,
    ticketNumber: number,
    title: string,
    approverName: string,
    stepName: string,
    comment?: string,
  ): Promise<boolean> {
    const subject = `审批通过 #${ticketNumber}: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">✅ 审批通过通知</h2>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">您的工单审批已通过：</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38ef7d;">
            <p style="margin: 10px 0;"><strong>工单编号：</strong><span style="color: #11998e;">#${ticketNumber}</span></p>
            <p style="margin: 10px 0;"><strong>工单标题：</strong>${title}</p>
            <p style="margin: 10px 0;"><strong>审批步骤：</strong>${stepName}</p>
            <p style="margin: 10px 0;"><strong>审批人：</strong>${approverName}</p>
            ${comment ? `<p style="margin: 10px 0;"><strong>审批意见：</strong></p>
            <p style="white-space: pre-wrap; background: #f8f9fa; padding: 10px; border-radius: 3px; color: #555;">
              ${comment}
            </p>` : ''}
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">工单将继续流转，请登录系统查看详情</p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>本邮件由工单管理系统自动发送，请勿直接回复</p>
        </div>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  /**
   * 发送审批驳回邮件
   */
  async sendApprovalRejectedEmail(
    to: string,
    ticketNumber: number,
    title: string,
    approverName: string,
    stepName: string,
    reason: string,
  ): Promise<boolean> {
    const subject = `审批驳回 #${ticketNumber}: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">❌ 审批驳回通知</h2>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">您的工单审批已被驳回：</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
            <p style="margin: 10px 0;"><strong>工单编号：</strong><span style="color: #f093fb;">#${ticketNumber}</span></p>
            <p style="margin: 10px 0;"><strong>工单标题：</strong>${title}</p>
            <p style="margin: 10px 0;"><strong>审批步骤：</strong>${stepName}</p>
            <p style="margin: 10px 0;"><strong>审批人：</strong>${approverName}</p>
            <p style="margin: 10px 0;"><strong>驳回原因：</strong></p>
            <p style="white-space: pre-wrap; background: #fff3f3; padding: 15px; border-radius: 3px; color: #d32f2f; border-left: 3px solid #f5576c;">
              ${reason}
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">请根据驳回意见修改后重新提交</p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>本邮件由工单管理系统自动发送，请勿直接回复</p>
        </div>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  /**
   * 发送工单完成邮件
   */
  async sendTicketCompletedEmail(
    to: string,
    ticketNumber: number,
    title: string,
  ): Promise<boolean> {
    const subject = `工单已完成 #${ticketNumber}: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">🎉 工单完成通知</h2>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">您的工单已全部完成：</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 10px 0;"><strong>工单编号：</strong><span style="color: #667eea;">#${ticketNumber}</span></p>
            <p style="margin: 10px 0;"><strong>工单标题：</strong>${title}</p>
            <p style="margin: 10px 0;"><strong>状态：</strong><span style="color: #38ef7d;">已完成</span></p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">感谢您使用工单管理系统</p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>本邮件由工单管理系统自动发送，请勿直接回复</p>
        </div>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }
}
