export interface UploadTarget {
  /** Opaque key the caller stores (e.g. on a ContentItem) and later resolves via getDownloadUrl. */
  key: string;
  /** Where the client PUTs the file body. */
  uploadUrl: string;
  /** Any additional headers the client must send with the PUT (e.g. Content-Type for S3). */
  headers: Record<string, string>;
}

/**
 * Everything the app needs from object storage, named around our domain
 * (upload a course asset, resolve it for playback/download) rather than any
 * vendor's SDK shape. `Local`FileStorageProvider (dev) and S3StorageProvider
 * (prod, any S3-compatible endpoint) are the only two things that know an
 * actual storage API — every caller depends on this interface only.
 */
export interface StoragePort {
  createUploadTarget(key: string, contentType: string): Promise<UploadTarget>;
  getDownloadUrl(key: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
