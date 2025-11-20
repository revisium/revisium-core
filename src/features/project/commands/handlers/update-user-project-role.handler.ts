import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { isValidProjectRole } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  UpdateUserProjectRoleCommand,
  UpdateUserProjectRoleCommandReturnType,
} from 'src/features/project/commands/impl';

@CommandHandler(UpdateUserProjectRoleCommand)
export class UpdateUserProjectRoleHandler
  implements
    ICommandHandler<
      UpdateUserProjectRoleCommand,
      UpdateUserProjectRoleCommandReturnType
    >
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: UpdateUserProjectRoleCommand) {
    if (!isValidProjectRole(data.roleId)) {
      throw new BadRequestException('Invalid ProjectRole');
    }

    const project = await this.getProject(data);

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const userProject = await this.prisma.userProject.findFirst({
      where: {
        userId: data.userId,
        projectId: project.id,
      },
    });

    if (!userProject) {
      throw new BadRequestException('User is not a member of this project');
    }

    await this.prisma.userProject.update({
      where: {
        id: userProject.id,
      },
      data: {
        roleId: data.roleId,
      },
    });

    return true;
  }

  private getProject(data: UpdateUserProjectRoleCommand['data']) {
    return this.prisma.project.findFirst({
      where: {
        organizationId: data.organizationId,
        name: data.projectName,
        isDeleted: false,
      },
      select: { id: true },
    });
  }
}
