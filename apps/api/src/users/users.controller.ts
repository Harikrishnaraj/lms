import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsers, UsersService, UserWithRelations } from './users.service';

@ApiTags('Users')
@Controller('organizations/me/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('user:view')
  @ApiOperation({
    summary: "List the caller's organization users",
    description:
      'Supports free-text search (first name / last name / email), plus filters by status, role, and department. Paginated (page + pageSize).',
  })
  list(
    @CurrentTenant() organizationId: string,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsers> {
    return this.usersService.list(organizationId, query);
  }

  @Get(':id')
  @Permissions('user:view')
  @ApiOperation({ summary: 'Retrieve a single user by id (scoped to the caller\'s organization)' })
  getById(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserWithRelations> {
    return this.usersService.getById(organizationId, id);
  }

  @Post()
  @Permissions('user:manage')
  @ApiOperation({
    summary: 'Create or invite a user',
    description:
      'If `externalId` (Auth0 subject) is provided, the user is created ACTIVE. If omitted, the user is INVITED and will be finalized on first login.',
  })
  create(
    @CurrentTenant() organizationId: string,
    @Body() dto: CreateUserDto,
  ): Promise<UserWithRelations> {
    return this.usersService.create(organizationId, dto);
  }

  @Put(':id')
  @Permissions('user:manage')
  @ApiOperation({ summary: 'Update a user\'s profile fields, department, or role' })
  update(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserWithRelations> {
    return this.usersService.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @Permissions('user:manage')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  setStatus(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserStatusDto,
  ): Promise<UserWithRelations> {
    return this.usersService.setStatus(organizationId, id, dto.status);
  }
}
