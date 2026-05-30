import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

@Processor('mail')
export class MailQueueProcessor {
  private readonly logger = new Logger(MailQueueProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send-verification')
  async handleVerification(job: Job<{ to: string; name: string; otp: string }>) {
    const { to, name, otp } = job.data;
    try {
      await this.mailService.sendMailDirect(to, 'StudyHub - OTP Verification', name, otp, 'verify');
      this.logger.log(`Verification email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send verification to ${to}: ${err.message}`);
      throw err;
    }
  }

  @Process('send-password-reset')
  async handlePasswordReset(job: Job<{ to: string; name: string; otp: string }>) {
    const { to, name, otp } = job.data;
    try {
      await this.mailService.sendMailDirect(to, 'StudyHub - Password Reset OTP', name, otp, 'reset');
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset to ${to}: ${err.message}`);
      throw err;
    }
  }
}
