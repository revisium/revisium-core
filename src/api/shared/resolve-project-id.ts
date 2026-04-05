import { ProjectApiService } from 'src/features/project/project-api.service';

export async function resolveProjectId(
  projectApi: ProjectApiService,
  organizationId: string,
  projectName: string,
): Promise<string> {
  const project = await projectApi.getProject({ organizationId, projectName });
  return project.id;
}
