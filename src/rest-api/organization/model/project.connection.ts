import { ProjectModel } from 'src/rest-api/project/model';
import { Paginated } from 'src/rest-api/share/model/paginated.model';

export class ProjectsConnection extends Paginated(
  ProjectModel,
  'ProjectModel',
) {}
