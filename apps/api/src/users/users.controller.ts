import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './dto';

@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch()
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  // --- Addresses ---

  @Get('addresses')
  listAddresses(@Request() req: any) {
    return this.usersService.listAddresses(req.user.id);
  }

  @Post('addresses')
  createAddress(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.id, dto);
  }

  @Get('addresses/:addressId')
  getAddress(
    @Request() req: any,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.usersService.getAddress(req.user.id, addressId);
  }

  @Patch('addresses/:addressId')
  updateAddress(
    @Request() req: any,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(req.user.id, addressId, dto);
  }

  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAddress(
    @Request() req: any,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.usersService.deleteAddress(req.user.id, addressId);
  }
}
