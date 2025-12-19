import { Module, BadRequestException } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { isUUID } from 'class-validator';
import { DatabaseModule } from '../database/database.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserExistsGuard } from './guards/user-exists.guard';
import appConfig from '../config/app.config';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [appConfig.KEY],
      useFactory: (appSettings: ConfigType<typeof appConfig>) => {
        const uploadDir = appSettings.uploadDir;
        const resolvedUploadDir = path.resolve(uploadDir);
        const usersUploadDir = path.join(resolvedUploadDir, 'users');

        fs.mkdirSync(usersUploadDir, { recursive: true });

        const resolveUserDir = (userId?: string) => {
          if (!userId || !isUUID(userId)) {
            throw new BadRequestException('Invalid user id');
          }

          const targetDir = path.resolve(usersUploadDir, userId);
          if (!targetDir.startsWith(`${usersUploadDir}${path.sep}`)) {
            throw new BadRequestException('Invalid user id');
          }

          fs.mkdirSync(targetDir, { recursive: true });
          return targetDir;
        };

        return {
          storage: diskStorage({
            destination: (req, file, cb) => {
              try {
                const dir = resolveUserDir(req.params?.id);
                cb(null, dir);
              } catch (error) {
                cb(error as Error, resolvedUploadDir);
              }
            },
            filename: (req, file, cb) => {
              const ext = path.extname(file.originalname).toLowerCase();
              cb(null, `${randomUUID()}${ext}`);
            }
          }),
          fileFilter: (req, file, cb) => {
            try {
              resolveUserDir(req.params?.id);
            } catch (error) {
              cb(error as Error, false);
              return;
            }

            if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
              cb(new BadRequestException('Only image files are allowed'), false);
              return;
            }
            cb(null, true);
          },
          limits: {
            fileSize: 5 * 1024 * 1024
          }
        };
      }
    })
  ],
  controllers: [UsersController],
  providers: [UsersService, UserExistsGuard]
})
export class UsersModule {}
