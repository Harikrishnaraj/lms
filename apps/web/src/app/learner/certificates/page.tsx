'use client';

import * as React from 'react';
import Link from 'next/link';
import { Award, Download, Globe } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, EmptyState, ErrorState, FullPageLoader } from '@lms/ui';
import { listCertificates, downloadCertificatePdf, type CertificateView } from '../../../lib/certificates-client';
import { isUnauthorized } from '../../../lib/api-client';

export default function LearnerCertificatesPage() {
  const [certs, setCerts] = React.useState<CertificateView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number } | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCertificates();
      setCerts(data);
    } catch (err) {
      setError({ status: (err as { status?: number }).status });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleDownload = async (cert: CertificateView) => {
    setDownloadingId(cert.id);
    try {
      const blob = await downloadCertificatePdf(cert.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.course.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download certificate PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <FullPageLoader label="Loading certificates..." />;
  if (error) {
    if (isUnauthorized(error)) {
      return (
        <ErrorState
          title="Sign in to view certificates"
          description="Please authenticate to access your earned certificates."
        />
      );
    }
    return <ErrorState onRetry={() => void load()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-foreground font-semibold flex items-center gap-2">
          <Award className="size-8 text-primary" /> My Certificates
        </h1>
        <p className="text-body-sm text-muted-foreground mt-1">
          Review and download credentials for courses you completed successfully.
        </p>
      </div>

      {certs.length === 0 ? (
        <EmptyState
          title="No certificates earned yet"
          description="Once you complete a course and pass its final assessment, your certificate will appear here."
          action={
            <Link href="/learner/catalog">
              <Button size="sm">Explore course catalog</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certs.map((cert) => (
            <Card key={cert.id} className="flex flex-col justify-between overflow-hidden relative border border-border">
              <div className="absolute top-0 right-0 bg-navy-50 text-primary px-3 py-1 text-xs font-semibold rounded-bl">
                ACTIVE
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-body-lg text-foreground font-semibold pr-16 leading-snug">
                  {cert.course.title}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Issued: <strong>{new Date(cert.issuedAt).toLocaleDateString()}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground bg-navy-50/20 p-3 rounded border border-border">
                  <div>
                    No: <strong className="text-foreground">{cert.certificateNumber}</strong>
                  </div>
                  <div className="truncate">
                    Hash: <span className="font-mono text-foreground">{cert.verificationToken}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center gap-2 border-t border-border p-3 bg-navy-50/5">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => void handleDownload(cert)}
                  disabled={downloadingId === cert.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="size-4" />
                  {downloadingId === cert.id ? 'Downloading...' : 'Download PDF'}
                </Button>
                <a
                  href={`/verify/certificate/${cert.verificationToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-1/3"
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full inline-flex items-center justify-center gap-1.5"
                  >
                    <Globe className="size-4" />
                    Verify
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
