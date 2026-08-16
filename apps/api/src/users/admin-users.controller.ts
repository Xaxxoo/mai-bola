import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { UserRole } from '../enums';
import { UsersService } from './users.service';
import {
  AdminListUsersQueryDto,
  AdminUpdateUserDto,
  AdminCreateUserDto,
} from './dto';

@ApiTags('Admin Users')
@Controller('admin/users')
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@Query() query: AdminListUsersQueryDto) {
    return this.usersService.adminListUsers(query);
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto);
  }

  @Post()
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.usersService.adminCreateUser(dto);
  }
}
