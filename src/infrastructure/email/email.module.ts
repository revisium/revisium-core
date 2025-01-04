import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from 'src/infrastructure/email/email.service';
import { TemplateService } from 'src/infrastructure/email/templates.service';
import { TransporterService } from 'src/infrastructure/email/transporter.service';

@Module({
  imports: [ConfigModule],
  providers: [TemplateService, TransporterService, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
