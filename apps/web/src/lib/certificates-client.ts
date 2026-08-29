'use client';

import { apiFetch } from './api-client';

export interface CertificateView {
  id: string;
  certificateNumber: string;
  verificationToken: string;
  status: 'ACTIVE' | 'REVOKED';
  issuedAt: string;
  expiresAt: string | null;
  course: {
    id: string;
    title: string;
  };
}

export interface VerificationResult {
  valid: boolean;
  certificateNumber: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: string;
  expiresAt: string | null;
  status: string;
}

export function listCertificates(): Promise<CertificateView[]> {
  return apiFetch('/organizations/me/certificates');
}

export function getCertificate(id: string): Promise<CertificateView> {
  return apiFetch(`/organizations/me/certificates/${id}`);
}

export function verifyCertificate(token: string): Promise<VerificationResult> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1';
  return fetch(`${API_BASE_URL}/certificate-verifications/${token}`)
    .then((res) => {
      if (!res.ok) throw new Error('Invalid certificate token');
      return res.json();
    });
}

// Downloads the PDF by fetching with auth headers and creating a blob URL
export async function downloadCertificatePdf(id: string): Promise<Blob> {
  // Use session cookie / token indirectly. If we want token, we call apiFetch with a endpoint, or fetch
  // Let's get the token by importing the cache or refreshing.
  // Wait, let's call a endpoint `/auth/refresh` or get cached token.
  // In api-client.ts, we can export a way or perform the fetch.
  // Actually, we can just fetch using credentials include to let the cookie authorize it,
  // or fetch it directly.
  // But wait! What if we export getAccessToken in api-client.ts? It is not exported.
  // But we can check: if we just call fetch with credentials: 'include', the HTTP session cookie (which is HttpOnly)
  // is automatically sent by the browser!
  // However, the NestJS API expects the Bearer header.
  // Let's see: can we write an endpoint or function in api-client.ts to fetch blobs, or export getAccessToken?
  // Let's modify api-client.ts to export apiFetchBlob or getAccessToken.
  // Actually, let's add `apiFetchBlob` to `api-client.ts`! That is the cleanest way.
  // Let's do that!
  return apiFetchBlob(`/organizations/me/certificates/${id}/download`);
}

// We'll declare apiFetchBlob here but we'll import it from api-client once modified.
import { apiFetchBlob } from './api-client';
