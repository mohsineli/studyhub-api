import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

@Processor('mail')
export class MailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(MailQueueProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<{ to: string; name: string; otp: string; type: 'verify' | 'reset' }>): Promise<any> {
    const { to, name, otp, type } = job.data;
    try {
      await this.mailService.sendMailDirect(to, name, otp, type);
      this.logger.log(`${type} email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send ${type} email to ${to}: ${err.message}`);
      throw err;
    }
  }
}
