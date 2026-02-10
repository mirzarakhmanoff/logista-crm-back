import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'role_permissions' })
export class RolePermission extends Document {
  @Prop({ required: true, unique: true })
  role: string;

  @Prop({ type: Map, of: [String], default: {} })
  permissions: Map<string, string[]>;
}

export const RolePermissionSchema = SchemaFactory.createForClass(RolePermission);

RolePermissionSchema.index({ role: 1 }, { unique: true });
