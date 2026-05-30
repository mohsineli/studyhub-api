import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../../mail/mail.service';

@Processor('email')
export class EmailConsumer extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-verification': {
        const { to, name, otp } = job.data;
        await this.mailService.sendVerificationEmail(to, name, otp);
        break;
      }
      case 'send-password-reset': {
        const { to, name, otp } = job.data;
        await this.mailService.sendPasswordResetEmail(to, name, otp);
        break;
      }
      default:
        console.warn(`[Queue] Unknown email job: ${job.name}`);
    }
  }
}
