import { ProjectModel } from 'src/api/rest-api/project/model';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class ProjectsConnection extends Paginated(
  ProjectModel,
  'ProjectModel',
) {}
