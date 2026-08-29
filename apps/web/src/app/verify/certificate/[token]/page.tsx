'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Award, CircleAlert, CircleCheck, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, FullPageLoader } from '@lms/ui';
import { verifyCertificate, type VerificationResult } from '../../../../lib/certificates-client';

export default function PublicCertificateVerifyPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [result, setResult] = React.useState<VerificationResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<boolean>(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await verifyCertificate(token);
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <FullPageLoader label="Verifying credential..." />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <ShieldCheck className="size-12 text-primary mx-auto" />
          <h1 className="text-h3 font-bold text-foreground mt-2">Credential Verification System</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Independent validation of Corporate LMS credentials
          </p>
        </div>

        {error || !result || !result.valid ? (
          <Card className="border-t-4 border-t-error-600">
            <CardHeader className="text-center">
              <CircleAlert className="size-12 text-error-600 mx-auto mb-2" />
              <CardTitle className="text-body-lg text-foreground">Invalid Verification Token</CardTitle>
              <CardDescription>
                This certificate verification code is invalid, expired, or revoked.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-body-sm text-muted-foreground">
              Please double check the verification URL or contact your platform administrator.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-t-4 border-t-success-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-success-600 text-white px-3 py-1 text-xs font-semibold rounded-bl inline-flex items-center gap-1">
              <CircleCheck className="size-3.5" /> VERIFIED
            </div>

            <CardHeader className="text-center pb-2">
              <Award className="size-14 text-success-600 mx-auto mb-2" />
              <CardTitle className="text-h4">Certificate is Authentic</CardTitle>
              <CardDescription className="text-xs">
                Serial Number: <strong>{result.certificateNumber}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 border-b border-border pb-3 text-body-sm">
                <span className="text-muted-foreground font-medium">Recipient:</span>
                <span className="col-span-2 text-foreground font-semibold">{result.learnerName}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-border pb-3 text-body-sm">
                <span className="text-muted-foreground font-medium">Course:</span>
                <span className="col-span-2 text-foreground font-semibold">{result.courseTitle}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-body-sm">
                <span className="text-muted-foreground font-medium">Issued Date:</span>
                <span className="col-span-2 text-foreground font-semibold">
                  {new Date(result.issuedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>

            <CardFooter className="bg-navy-50/10 p-4 border-t border-border text-center text-xs text-muted-foreground justify-center">
              Verified on {new Date(result.issuedAt).toLocaleDateString()} at {new Date(result.issuedAt).toLocaleTimeString()}
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
