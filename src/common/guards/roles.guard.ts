import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/schemas/user.schema';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsService } from '../../modules/permissions/permissions.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Permissions() decorator — allow access
    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // ADMIN and DIRECTOR always have full access
    if (user.role === UserRole.ADMIN || user.role === UserRole.DIRECTOR) {
      return true;
    }

    // Parse permission string: 'clients.create' → module='clients', action='create'
    const [module, action] = requiredPermission.split('.');
    if (!module || !action) {
      return false;
    }

    return this.permissionsService.hasPermission(user.role, module, action);
  }
}
