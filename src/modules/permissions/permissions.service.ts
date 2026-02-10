import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RolePermission } from './schemas/role-permission.schema';
import { DEFAULT_PERMISSIONS, PERMISSION_MODULES } from './permissions.constants';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private logger = new Logger('PermissionsService');
  private cache = new Map<string, Record<string, string[]>>();

  constructor(
    @InjectModel(RolePermission.name)
    private rolePermissionModel: Model<RolePermission>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
    await this.loadCache();
  }

  private async seedDefaults() {
    for (const [role, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
      const exists = await this.rolePermissionModel.findOne({ role }).exec();
      if (!exists) {
        await this.rolePermissionModel.create({ role, permissions });
        this.logger.log(`Default permissions seeded for role: ${role}`);
      }
    }
  }

  private async loadCache() {
    const all = await this.rolePermissionModel.find().exec();
    this.cache.clear();
    for (const rp of all) {
      const perms: Record<string, string[]> = {};
      if (rp.permissions) {
        rp.permissions.forEach((value, key) => {
          perms[key] = value;
        });
      }
      this.cache.set(rp.role, perms);
    }
    this.logger.log(`Permissions cache loaded: ${this.cache.size} roles`);
  }

  hasPermission(role: string, module: string, action: string): boolean {
    const perms = this.cache.get(role);
    if (!perms) return false;
    const actions = perms[module];
    if (!actions) return false;
    return actions.includes(action);
  }

  async getAllRolePermissions(): Promise<Record<string, Record<string, string[]>>> {
    const result: Record<string, Record<string, string[]>> = {};
    this.cache.forEach((perms, role) => {
      result[role] = perms;
    });
    return result;
  }

  async getPermissionsForRole(role: string): Promise<Record<string, string[]>> {
    return this.cache.get(role) || {};
  }

  async updateRolePermissions(
    role: string,
    permissions: Record<string, string[]>,
  ): Promise<Record<string, string[]>> {
    // Validate module keys and actions
    const validModuleKeys = PERMISSION_MODULES.map((m) => m.key);
    const cleaned: Record<string, string[]> = {};

    for (const [moduleKey, actions] of Object.entries(permissions)) {
      if (!validModuleKeys.includes(moduleKey)) continue;
      const moduleDef = PERMISSION_MODULES.find((m) => m.key === moduleKey);
      if (!moduleDef) continue;
      cleaned[moduleKey] = actions.filter((a) =>
        moduleDef.actions.includes(a as any),
      );
    }

    await this.rolePermissionModel.findOneAndUpdate(
      { role },
      { permissions: cleaned },
      { upsert: true, new: true },
    );

    // Update cache
    this.cache.set(role, cleaned);
    this.logger.log(`Permissions updated for role: ${role}`);

    return cleaned;
  }

  getModules() {
    return PERMISSION_MODULES;
  }
}
