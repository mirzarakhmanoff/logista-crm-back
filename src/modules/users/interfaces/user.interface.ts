import { UserRole } from '../schemas/user.schema';

export interface IUser {
  _id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
