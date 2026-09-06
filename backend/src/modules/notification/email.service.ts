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
}
