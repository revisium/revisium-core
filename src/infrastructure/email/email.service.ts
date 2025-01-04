import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TemplateService } from 'src/infrastructure/email/templates.service';
import { TransporterService } from 'src/infrastructure/email/transporter.service';

@Injectable()
export class EmailService {
  private readonly _emailPublicUrl: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly transporterService: TransporterService,
    private readonly templateService: TemplateService,
  ) {
    this._emailPublicUrl = this.configService.get<string>('EMAIL_PUBLIC_URL');
  }

  public get isAvailable(): boolean {
    return Boolean(this.transporterService.isAvailable && this._emailPublicUrl);
  }

  private get emailPublicUrl(): string {
    if (!this._emailPublicUrl) {
      throw new InternalServerErrorException('Invalid EMAIL_PUBLIC_URL');
    }

    return this._emailPublicUrl;
  }

  public sendVerifyEmail(email: string, confirmationCode: string) {
    const url = `${this.emailPublicUrl}/signup/confirm?code=${confirmationCode}`;

    return this.transporterService.sendMail({
      to: email,
      subject: 'Verify your email',
      html: this.getTemplate('registration', {
        URL: url,
      }),
    });
  }

  private getTemplate(templateName: string, context?: Record<string, any>) {
    const template = this.templateService.getTemplate(templateName);
    return template(context);
  }
}
