import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { TemplateService } from 'src/email/templates.service';
import { TransporterService } from 'src/email/transporter.service';

@Module({
  imports: [ConfigModule],
  providers: [TemplateService, TransporterService, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
