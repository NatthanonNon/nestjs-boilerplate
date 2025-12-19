import 'express';
import type { UserModel } from '../users/user.model';

declare module 'express' {
  interface Request {
    requestId?: string;
    userEntity?: UserModel;
  }
}
