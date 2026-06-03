import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class MailService {
  private oauth2Client;
  private gmail;

  constructor(private configService: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('MAIL_CLIENT_ID'),
      this.configService.get<string>('MAIL_CLIENT_SECRET'),
      'https://developers.google.com/oauthplayground'
    );

    this.oauth2Client.setCredentials({
      refresh_token: this.configService.get<string>('MAIL_REFRESH_TOKEN'),
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  private makeMessage(to: string, from: string, subject: string, html: string, text: string) {
    const str = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary"',
      '',
      '--boundary',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      text,
      '',
      '--boundary',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
      '',
      '--boundary--',
    ].join('\n');

    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async sendMail(to: string, subject: string, html: string, text: string) {
    try {
      const from = this.configService.get<string>('MAIL_FROM') || this.configService.get<string>('MAIL_USER') || 'studyhubteam.official@gmail.com';
      const rawMessage = this.makeMessage(to, from, subject, html, text);
      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: rawMessage },
      });
    } catch (error) {
      console.error('Mail Error:', error);
      throw new InternalServerErrorException('Failed to send email using Gmail API');
    }
  }

  async sendVerificationEmail(to: string, name: string, otp: string) {
    const subject = 'StudyHub - OTP Verification';
    const otpBoxColor = '#28a745';
    const headerText = '🔑 OTP Verification';
    const messageBody = `<p style="color: #333; font-size: 16px;">Hello <b>${name}</b>,</p>
                         <p>Thank you for registering with <b>StudyHub</b>. Use the OTP below to verify your email:</p>`;

    const html = this.getHtmlTemplate(headerText, messageBody, otp, otpBoxColor);
    const otpMinutes = this.configService.get<number>('OTP_EXPIRATION_MINUTES', 10);
    const text = `Hello ${name},\n\nThank you for registering with StudyHub. Your OTP code is: ${otp}\n\nThis OTP is valid for ${otpMinutes} minutes.`;

    await this.sendMail(to, subject, html, text);
  }

  async sendPasswordResetEmail(to: string, name: string, otp: string) {
    const subject = 'StudyHub - Password Reset OTP';
    const otpBoxColor = '#dc3545';
    const headerText = '🔑 Password Reset OTP';
    const messageBody = `<p style="color: #333; font-size: 16px;">Hello <b>${name}</b>,</p>
                         <p>You requested a password reset for <b>StudyHub</b>. Please use the OTP below to reset your password:</p>`;

    const html = this.getHtmlTemplate(headerText, messageBody, otp, otpBoxColor);
    const otpMinutes = this.configService.get<number>('OTP_EXPIRATION_MINUTES', 10);
    const text = `Hello ${name},\n\nYou requested a password reset for StudyHub. Your OTP code is: ${otp}\n\nThis OTP is valid for ${otpMinutes} minutes.`;

    await this.sendMail(to, subject, html, text);
  }

  private getHtmlTemplate(headerText: string, messageBody: string, otp: string, otpBoxColor: string): string {
    return `
    <div style='font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;'>
        <div style='max-width: 500px; margin: auto; background: white; padding: 25px; border-radius: 10px; box-shadow: 0px 4px 15px rgba(0,0,0,0.15);'>
            <h2 style='color: #007BFF;'>${headerText}</h2>
            ${messageBody}
            <div style='background: ${otpBoxColor}; color: white; font-size: 24px; font-weight: bold; padding: 15px; margin: 20px auto; width: 200px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);'>
                ${otp}
            </div>
            <p style='color: #777; font-size: 12px;'>This OTP is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
            <hr style='border: 0; height: 1px; background: #ddd; margin: 20px 0;'>
            <p style='color: #888; font-size: 12px;'>Best Regards,<br><b>StudyHub Team</b></p>
        </div>
    </div>`;
  }
}
