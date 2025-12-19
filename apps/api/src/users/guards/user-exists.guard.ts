import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { AppException } from '../../common/errors/app.exception';
import { ERROR_CATALOG } from '../../common/errors/error-catalog';
import { UsersService } from '../users.service';

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userId = request.params?.id;

    if (!userId || !isUUID(userId)) {
      throw new AppException(ERROR_CATALOG.BAD_REQUEST, 'Invalid user id', { userId });
    }

    request.userEntity = await this.usersService.getById(userId);
    return true;
  }
}
