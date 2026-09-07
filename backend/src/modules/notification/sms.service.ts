import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 短信通知服务（可选功能）
 *
 * 支持的短信服务商：
 * - 阿里云短信
 * - 腾讯云短信
 * - 其他SMS网关
 *
 * 使用前需要配置环境变量：
 * SMS_ENABLED=true
 * SMS_PROVIDER=aliyun|tencent|custom
 * SMS_ACCESS_KEY=your_access_key
 * SMS_ACCESS_SECRET=your_access_secret
 * SMS_SIGN_NAME=your_sign_name
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private enabled: boolean;
  private provider: string;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('SMS_ENABLED') === 'true';
    this.provider = this.configService.get<string>('SMS_PROVIDER', 'aliyun');

    if (!this.enabled) {
      this.logger.log('短信功能未启用');
    } else {
      this.logger.log(`短信功能已启用，提供商: ${this.provider}`);
    }
  }

  /**
   * 发送短信
   */
  async sendSms(
    phoneNumber: string,
    templateCode: string,
    params: Record<string, string>,
  ): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`短信功能未启用，跳过发送到 ${phoneNumber}`);
      return false;
    }

    try {
      this.logger.log(`发送短信到 ${phoneNumber}，模板: ${templateCode}`);

      // TODO: 根据不同的provider调用对应的短信API
      switch (this.provider) {
        case 'aliyun':
          return await this.sendAliyunSms(phoneNumber, templateCode, params);
        case 'tencent':
          return await this.sendTencentSms(phoneNumber, templateCode, params);
        default:
          this.logger.warn(`不支持的短信提供商: ${this.provider}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`发送短信失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 发送审批通知短信
   */
  async sendApprovalNotification(
    phoneNumber: string,
    ticketNumber: number,
    approvalType: string,
  ): Promise<boolean> {
    return this.sendSms(phoneNumber, 'SMS_APPROVAL_NOTIFICATION', {
      ticket_number: ticketNumber.toString(),
      approval_type: approvalType,
    });
  }

  /**
   * 发送审批结果短信
   */
  async sendApprovalResult(
    phoneNumber: string,
    ticketNumber: number,
    result: '通过' | '驳回',
  ): Promise<boolean> {
    return this.sendSms(phoneNumber, 'SMS_APPROVAL_RESULT', {
      ticket_number: ticketNumber.toString(),
      result: result,
    });
  }

  /**
   * 发送工单状态变更短信
   */
  async sendTicketStatusChange(
    phoneNumber: string,
    ticketNumber: number,
    newStatus: string,
  ): Promise<boolean> {
    return this.sendSms(phoneNumber, 'SMS_TICKET_STATUS_CHANGE', {
      ticket_number: ticketNumber.toString(),
      new_status: newStatus,
    });
  }

  /**
   * 阿里云短信发送实现
   * 需要安装依赖: npm install @alicloud/dysmsapi20170525 @alicloud/openapi-client
   */
  private async sendAliyunSms(
    phoneNumber: string,
    templateCode: string,
    params: Record<string, string>,
  ): Promise<boolean> {
    // TODO: 实现阿里云短信发送
    this.logger.log(`[阿里云] 发送短信到 ${phoneNumber}`);

    // 示例代码（需要安装依赖后启用）:
    /*
    const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525');
    const OpenApi = require('@alicloud/openapi-client');

    const config = new OpenApi.Config({
      accessKeyId: this.configService.get<string>('SMS_ACCESS_KEY'),
      accessKeySecret: this.configService.get<string>('SMS_ACCESS_SECRET'),
      endpoint: 'dysmsapi.aliyuncs.com',
    });

    const client = new Dysmsapi20170525(config);
    const request = new Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phoneNumber,
      signName: this.configService.get<string>('SMS_SIGN_NAME'),
      templateCode: templateCode,
      templateParam: JSON.stringify(params),
    });

    const response = await client.sendSms(request);
    return response.body.code === 'OK';
    */

    // 模拟发送成功
    return true;
  }

  /**
   * 腾讯云短信发送实现
   * 需要安装依赖: npm install tencentcloud-sdk-nodejs
   */
  private async sendTencentSms(
    phoneNumber: string,
    templateCode: string,
    params: Record<string, string>,
  ): Promise<boolean> {
    // TODO: 实现腾讯云短信发送
    this.logger.log(`[腾讯云] 发送短信到 ${phoneNumber}`);

    // 示例代码（需要安装依赖后启用）:
    /*
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const SmsClient = tencentcloud.sms.v20210111.Client;

    const client = new SmsClient({
      credential: {
        secretId: this.configService.get<string>('SMS_ACCESS_KEY'),
        secretKey: this.configService.get<string>('SMS_ACCESS_SECRET'),
      },
      region: 'ap-guangzhou',
    });

    const request = {
      PhoneNumberSet: [phoneNumber],
      SmsSdkAppId: this.configService.get<string>('SMS_SDK_APP_ID'),
      SignName: this.configService.get<string>('SMS_SIGN_NAME'),
      TemplateId: templateCode,
      TemplateParamSet: Object.values(params),
    };

    const response = await client.SendSms(request);
    return response.SendStatusSet[0].Code === 'Ok';
    */

    // 模拟发送成功
    return true;
  }

  /**
   * 验证手机号格式
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // 中国大陆手机号正则
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * 批量发送短信
   */
  async sendBatchSms(
    phoneNumbers: string[],
    templateCode: string,
    params: Record<string, string>,
  ): Promise<{ success: string[]; failed: string[] }> {
    const result = {
      success: [] as string[],
      failed: [] as string[],
    };

    await Promise.all(
      phoneNumbers.map(async (phone) => {
        const sent = await this.sendSms(phone, templateCode, params);
        if (sent) {
          result.success.push(phone);
        } else {
          result.failed.push(phone);
        }
      }),
    );

    return result;
  }
}
