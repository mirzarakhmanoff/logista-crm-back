import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('users.read')
  async getAllPermissions() {
    return this.permissionsService.getAllRolePermissions();
  }

  @Get('modules')
  @Permissions('users.read')
  async getModules() {
    return { modules: this.permissionsService.getModules() };
  }

  @Get(':role')
  @Permissions('users.read')
  async getRolePermissions(@Param('role') role: string) {
    return this.permissionsService.getPermissionsForRole(role);
  }

  @Put(':role')
  @Permissions('users.update')
  async updateRolePermissions(
    @Param('role') role: string,
    @Body() dto: UpdateRolePermissionDto,
  ) {
    return this.permissionsService.updateRolePermissions(role, dto.permissions);
  }
}
