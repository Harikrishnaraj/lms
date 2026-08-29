import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CertificatesService, CertificateVerification } from './certificates.service';

/**
 * Task 20's verification token, made useful: an unauthenticated third
 * party (an employer, an auditor) can confirm a certificate without an
 * account. Not under /organizations/me because the caller has no tenant
 * context — the token itself is the only credential, and it resolves to
 * exactly one certificate in one organization.
 */
@ApiTags('Certificates')
@Controller('certificate-verifications')
export class CertificateVerificationController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Verify a certificate by its verification token',
    description: 'Returns the learner name, course, and validity. Unknown tokens 404 rather than reporting invalid, so the endpoint cannot be used to enumerate.',
  })
  verify(@Param('token') token: string): Promise<CertificateVerification> {
    return this.certificatesService.verify(token);
  }
}
