import { PartialType } from '@nestjs/mapped-types';
import { CreateAppReleaseDto } from './create-app-release.dto';

export class UpdateAppReleaseDto extends PartialType(CreateAppReleaseDto) {}
