import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolePermission, RolePermissionSchema } from './schemas/role-permission.schema';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RolePermission.name, schema: RolePermissionSchema },
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
