export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Nothing in this app sends HTML mail yet. */
  body: string;
}

/**
 * Everything the app needs from an external email provider, named around
 * our domain rather than any vendor's SDK. Only the providers under
 * ./providers know an actual mail API; every caller depends on this
 * interface, exactly as StoragePort does for object storage.
 */
export interface EmailPort {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PORT = Symbol('EMAIL_PORT');
