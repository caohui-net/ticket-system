import { PartialType } from '@nestjs/swagger';
import { InitiateProjectDto } from './initiate-project.dto';

export class UpdateProjectDto extends PartialType(InitiateProjectDto) {}
