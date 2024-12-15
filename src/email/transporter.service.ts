import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

type Transporter = nodemailer.Transporter<
  SMTPTransport.SentMessageInfo,
  SMTPTransport.Options
>;

@Injectable()
export class TransporterService {
  private readonly _transporter: Transporter | null = null;

  private readonly _emailTransport: string | undefined;
  private readonly _emailFrom: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this._emailTransport = this.configService.get<string>('EMAIL_TRANSPORT');
    this._emailFrom = this.configService.get<string>('EMAIL_FROM');

    if (this.isAvailable) {
      this._transporter = nodemailer.createTransport(this._emailTransport);
    }
  }

  public get isAvailable(): boolean {
    return Boolean(this._emailTransport && this._emailFrom);
  }

  private get transporter(): Transporter {
    if (!this._transporter) {
      throw new Error('Invalid transporter');
    }

    return this._transporter;
  }

  public async sendMail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    return this.transporter.sendMail({
      from: this._emailFrom,
      to,
      subject,
      html,
    });
  }
}
