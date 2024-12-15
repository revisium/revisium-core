import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { isValidProjectRole, UserProjectRoles } from 'src/auth/consts';
import { IdService } from 'src/database/id.service';
import { PrismaService } from 'src/database/prisma.service';
import {
  AddUserToProjectCommand,
  AddUserToProjectCommandReturnType,
} from 'src/project/commands/impl';

@CommandHandler(AddUserToProjectCommand)
export class AddUserToProjectHandler
  implements
    ICommandHandler<AddUserToProjectCommand, AddUserToProjectCommandReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  public async execute({ data }: AddUserToProjectCommand) {
    if (!isValidProjectRole(data.roleId)) {
      throw new Error('Invalid ProjectRole');
    }

    const project = await this.getProject(data);

    if (!project) {
      throw new Error('Project not found');
    }

    const userProjectId = await this.getOrCreateUserProjectId(
      data.userId,
      project.id,
    );

    await this.upsertUserProject({
      id: userProjectId,
      userId: data.userId,
      projectId: project.id,
      roleId: data.roleId,
    });

    return true;
  }

  private upsertUserProject(data: {
    id: string;
    userId: string;
    projectId: string;
    roleId: UserProjectRoles;
  }) {
    return this.prisma.userProject.upsert({
      where: {
        id: data.id,
      },
      create: {
        id: data.id,
        userId: data.userId,
        projectId: data.projectId,
        roleId: data.roleId,
      },
      update: {
        roleId: data.roleId,
      },
    });
  }

  private getProject(data: AddUserToProjectCommand['data']) {
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

  private async getOrCreateUserProjectId(userId: string, projectId: string) {
    const result = await this.prisma.userProject.findFirst({
      where: {
        userId,
        projectId,
      },
      select: {
        id: true,
      },
    });

    return result?.id || this.idService.generate();
  }
}
