import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class TemplateService implements OnModuleInit {
  private logger = new Logger(TemplateService.name);
  private templates: Record<string, HandlebarsTemplateDelegate> = {};

  async onModuleInit() {
    try {
      await this.loadTemplates();
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async loadTemplates() {
    const templatesDir = path.join(__dirname, 'templates');
    const templateFiles = fs.readdirSync(templatesDir);

    for (const file of templateFiles) {
      if (path.extname(file) === '.hbs') {
        const templateName = path.basename(file, '.hbs');
        const templatePath = path.join(templatesDir, file);
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        this.templates[templateName] = handlebars.compile(templateSource);
        this.logger.log(`Template "${templateName}" loaded.`);
      }
    }
  }

  public getTemplate(name: string): HandlebarsTemplateDelegate {
    const template = this.templates[name];
    if (!template) {
      throw new Error(`Template "${name}" not found.`);
    }
    return template;
  }
}
