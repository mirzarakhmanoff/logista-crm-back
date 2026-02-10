import { IsObject } from 'class-validator';

export class UpdateRolePermissionDto {
  @IsObject()
  permissions: Record<string, string[]>;
}
