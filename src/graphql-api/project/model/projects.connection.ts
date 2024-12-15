import { ObjectType } from '@nestjs/graphql';
import { ProjectModel } from 'src/graphql-api/project/model/project.model';
import { Paginated } from 'src/graphql-api/share/model/paginated.model';

@ObjectType()
export class ProjectsConnection extends Paginated(ProjectModel) {}
