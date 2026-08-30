import { Controller, ForbiddenException, Get, Inject, Param, ParseUUIDPipe, Patch, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Certificate, PrismaClient } from '@lms/database';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PRISMA_CLIENT } from '../database/database.constants';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { UsersService } from '../users/users.service';
import { renderCertificatePdf } from './certificate-pdf';
import { CertificatesService, CertificateWithRelations } from './certificates.service';

/**
 * Task 20's authenticated surface. There is no POST here on purpose:
 * certificates are issued by completion rollup (see CertificatesService),
 * never by a client asking for one.
 */
@ApiTags('Certificates')
@Controller('organizations/me/certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly usersService: UsersService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: 'List my certificates, newest first' })
  async listMine(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CertificateWithRelations[]> {
    const userId = await this.resolveUserId(organizationId, user);
    return this.certificatesService.listMine(organizationId, userId);
  }

  @Get()
  @Permissions('report:view')
  @ApiOperation({ summary: 'List certificates across the organization (compliance reporting)' })
  list(
    @CurrentTenant() organizationId: string,
    @Query('userId') userId?: string,
    @Query('courseId') courseId?: string,
  ): Promise<CertificateWithRelations[]> {
    return this.certificatesService.list(organizationId, { userId, courseId });
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download my certificate as a PDF' })
  async download(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const userId = await this.resolveUserId(organizationId, user);
    const certificate = await this.certificatesService.getOwned(organizationId, userId, id);
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

    const pdf = await renderCertificatePdf(certificate, organization.name);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateNumber}.pdf"`);
    res.end(pdf);
  }

  @Patch(':id/revoke')
  @Permissions('user:manage')
  @ApiOperation({ summary: 'Revoke a certificate' })
  revoke(@CurrentTenant() organizationId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Certificate> {
    return this.certificatesService.revoke(organizationId, id);
  }

  private async resolveUserId(organizationId: string, user: AuthenticatedUser): Promise<string> {
    const localUser = await this.usersService.findByExternalId(organizationId, user.id);
    if (!localUser) throw new ForbiddenException('You do not have a user profile in this organization yet');
    return localUser.id;
  }
}
