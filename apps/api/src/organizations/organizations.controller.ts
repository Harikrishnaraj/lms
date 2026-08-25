import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Organization } from '@lms/database';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: "Retrieve the caller's own organization" })
  getOwn(@CurrentTenant() organizationId: string): Promise<Organization> {
    return this.organizationsService.findOwn(organizationId);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the caller's own organization" })
  updateOwn(
    @CurrentTenant() organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    return this.organizationsService.updateOwn(organizationId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve an organization by id',
    description:
      'Restricted to the caller\'s own organization. Any other id resolves as 404, ' +
      'never 403, so cross-tenant probing cannot confirm another organization exists.',
  })
  getById(@Param('id') id: string, @CurrentTenant() organizationId: string): Promise<Organization> {
    return this.organizationsService.findByIdScoped(id, organizationId);
  }
}
