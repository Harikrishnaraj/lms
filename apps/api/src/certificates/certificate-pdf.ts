import PDFDocument from 'pdfkit';
import type { CertificateWithRelations } from './certificates.service';

/**
 * Renders one certificate as a single-page landscape PDF and resolves the
 * finished bytes. Buffered rather than streamed straight to the response
 * because a certificate is ~10KB and Nest needs a Content-Length to make
 * the browser treat it as a download.
 *
 * ponytail: hand-placed text on the default Helvetica, no logo, no
 * background art, no per-organization branding. Swap in a template (or an
 * HTML-to-PDF renderer) when design supplies one — the caller contract,
 * "give me a certificate, get back bytes", doesn't change.
 */
export function renderCertificatePdf(certificate: CertificateWithRelations, organizationName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 56 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const center = { width, align: 'center' as const };

    doc.fontSize(12).fillColor('#6b7280').text(organizationName.toUpperCase(), center);
    doc.moveDown(1.5);
    doc.fontSize(30).fillColor('#111827').text('Certificate of Completion', center);
    doc.moveDown(1.5);
    doc.fontSize(12).fillColor('#6b7280').text('This certifies that', center);
    doc.moveDown(0.5);
    doc
      .fontSize(24)
      .fillColor('#111827')
      .text(`${certificate.user.firstName} ${certificate.user.lastName}`, center);
    doc.moveDown(0.75);
    doc.fontSize(12).fillColor('#6b7280').text('has successfully completed', center);
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#111827').text(certificate.course.title, center);
    doc.moveDown(2);

    doc.fontSize(10).fillColor('#6b7280');
    doc.text(`Certificate number: ${certificate.certificateNumber}`, center);
    doc.text(`Issued: ${formatDate(certificate.issuedAt)}`, center);
    if (certificate.expiresAt) doc.text(`Valid until: ${formatDate(certificate.expiresAt)}`, center);
    doc.moveDown(0.5);
    doc.text(`Verify at /verify/${certificate.verificationToken}`, center);

    doc.end();
  });
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
