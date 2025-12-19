import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserExistsGuard } from './guards/user-exists.guard';
import { Request } from 'express';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'List users' })
  list(@Query() pagination: PaginationDto) {
    return this.usersService.list(pagination);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'Get user by ID' })
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.getById(id);
  }

  @Post()
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Create user' })
  create(@Body() payload: CreateUserDto) {
    return this.usersService.create(payload);
  }

  @Post(':id/image')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' }
      }
    }
  })
  @ApiOkResponse({ description: 'Upload user image' })
  @UseGuards(UserExistsGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.usersService.attachImage(id, file, request.userEntity);
  }
}
