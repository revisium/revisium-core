import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import {
  RemoveUserFromProjectCommand,
  RemoveUserFromProjectCommandReturnType,
} from 'src/project/commands/impl';

@CommandHandler(RemoveUserFromProjectCommand)
export class RemoveUserFromProjectHandler
  implements
    ICommandHandler<
      RemoveUserFromProjectCommand,
      RemoveUserFromProjectCommandReturnType
    >
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: RemoveUserFromProjectCommand) {
    const project = await this.getProject(data);

    if (!project) {
      throw new Error('Project not found');
    }

    const userProject = await this.getUserProject(data.userId, project.id);

    if (!userProject) {
      throw new Error('Not found user in project');
    }

    await this.removeUserProject(userProject.id);

    return true;
  }

  private getProject(data: RemoveUserFromProjectCommand['data']) {
    return this.prisma.project.findUnique({
      where: {
        organizationId_name: {
          organizationId: data.organizationId,
          name: data.projectName,
        },
      },
      select: { id: true },
    });
  }

  private removeUserProject(userProjectId: string) {
    return this.prisma.userProject.delete({
      where: {
        id: userProjectId,
      },
    });
  }

  private async getUserProject(userId: string, projectId: string) {
    return this.prisma.userProject.findFirst({
      where: {
        userId,
        projectId,
      },
      select: {
        id: true,
        roleId: true,
      },
    });
  }
}
