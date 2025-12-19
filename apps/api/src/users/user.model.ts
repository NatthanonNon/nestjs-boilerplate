import { Model } from 'objection';
import { UserRole } from '../common/enums/user-role.enum';

export class UserModel extends Model {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  imagePath?: string;
  createdAt!: string;
  updatedAt!: string;

  static tableName = 'users';
  static idColumn = 'id';

  static jsonSchema = {
    type: 'object',
    required: ['email', 'name'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', minLength: 1 },
      name: { type: 'string', minLength: 1 },
      role: { type: 'string', enum: Object.values(UserRole) },
      imagePath: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  };
}
