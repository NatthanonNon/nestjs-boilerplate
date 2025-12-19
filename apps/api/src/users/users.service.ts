import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CreateUserDto } from './dto/create-user.dto';
import { UserModel } from './user.model';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPagination } from '../common/utils/pagination';
import { UserRole } from '../common/enums/user-role.enum';
import { AppException } from '../common/errors/app.exception';
import { ERROR_CATALOG } from '../common/errors/error-catalog';
import appConfig from '../config/app.config';

@Injectable()
export class UsersService {
  constructor(
    @Inject(appConfig.KEY) private readonly appSettings: ConfigType<typeof appConfig>
  ) {}
  async list(pagination: PaginationDto) {
    const { page, limit, offset } = buildPagination(pagination.page, pagination.limit);

    const [items, total] = await Promise.all([
      UserModel.query().orderBy('createdAt', 'desc').limit(limit).offset(offset),
      UserModel.query().resultSize()
    ]);

    return {
      items,
      page,
      limit,
      total
    };
  }

  async getById(id: string) {
    const user = await UserModel.query().findById(id);
    if (!user) {
      throw new AppException(ERROR_CATALOG.USER_NOT_FOUND, 'User not found', { userId: id });
    }

    return user;
  }

  async create(payload: CreateUserDto) {
    return UserModel.query().insertAndFetch({
      ...payload,
      role: payload.role ?? UserRole.USER
    });
  }

  async attachImage(id: string, file: Express.Multer.File, user?: UserModel) {
    const targetUser = user ?? (await this.getById(id));
    const uploadDir = this.appSettings.uploadDir;
    const resolvedUploadDir = path.resolve(uploadDir);
    const resolvedFilePath = path.resolve(file.path);
    const relativePath = path
      .relative(resolvedUploadDir, resolvedFilePath)
      .split(path.sep)
      .join('/');

    if (relativePath.startsWith('..')) {
      await fs.unlink(resolvedFilePath).catch(() => undefined);
      throw new AppException(ERROR_CATALOG.BAD_REQUEST, 'Invalid upload path');
    }

    await this.assertImageSignature(resolvedFilePath).catch(async (error) => {
      await fs.unlink(resolvedFilePath).catch(() => undefined);
      throw error;
    });

    const previousImagePath = targetUser.imagePath;

    try {
      const updatedUser = await UserModel.query().patchAndFetchById(id, {
        imagePath: relativePath
      });

      if (previousImagePath && previousImagePath !== relativePath) {
        const previousPath = path.resolve(resolvedUploadDir, previousImagePath);
        if (previousPath.startsWith(`${resolvedUploadDir}${path.sep}`)) {
          await fs.unlink(previousPath).catch(() => undefined);
        }
      }

      return updatedUser;
    } catch (error) {
      await fs.unlink(resolvedFilePath).catch(() => undefined);
      throw error;
    }
  }

  private async assertImageSignature(filePath: string) {
    const handle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(12);

    try {
      await handle.read(buffer, 0, buffer.length, 0);
    } finally {
      await handle.close();
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    const isGif =
      buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    const isWebp =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!(isJpeg || isPng || isGif || isWebp)) {
      throw new AppException(ERROR_CATALOG.BAD_REQUEST, 'Invalid image file');
    }
  }
}
