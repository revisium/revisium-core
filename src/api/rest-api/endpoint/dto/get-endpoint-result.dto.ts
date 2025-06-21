import { ApiProperty } from '@nestjs/swagger';
import { BranchModel } from 'src/api/rest-api/branch/model';
import { EndpointModel } from 'src/api/rest-api/endpoint/model';
import { ProjectModel } from 'src/api/rest-api/project/model';
import { RevisionModel } from 'src/api/rest-api/revision/model';

export class GetEndpointResultDto {
  @ApiProperty({ type: EndpointModel })
  endpoint: EndpointModel;

  @ApiProperty({ type: RevisionModel })
  revision: RevisionModel;

  @ApiProperty({ type: BranchModel })
  branch: BranchModel;

  @ApiProperty({ type: ProjectModel })
  project: ProjectModel;
}
