import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionDto {
  [module: string]: string[];
}
