/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for file storage across multiple providers.
 * Phase 1 implements the interface and provider registry only — no provider
 * business logic is wired. Future phases will implement individual adapters.
 *
 * Supported future providers:
 *   - LocalStorage     — filesystem (development)
 *   - S3Compatible     — AWS S3, Cloudflare R2, MinIO
 *   - CloudStorage     — Google Cloud Storage, Azure Blob
 *   - GitStorage       — Git-based versioned file storage
 *   - HuggingFace      — Hugging Face Datasets / model storage
 */

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
  expiresIn?: number; // seconds
}

export interface StorageObject {
  key: string;
  size: number;
  contentType?: string;
  metadata?: Record<string, string>;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageListOptions {
  prefix?: string;
  maxKeys?: number;
  cursor?: string;
}

export interface StorageListResult {
  objects: StorageObject[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface IStorageProvider {
  readonly name: string;

  /** Upload a file and return a public/presigned URL */
  upload(key: string, data: Buffer | Uint8Array | string, options?: StorageUploadOptions): Promise<StorageObject>;

  /** Download a file as a Buffer */
  download(key: string): Promise<Buffer>;

  /** Delete a file */
  delete(key: string): Promise<void>;

  /** Check if a file exists */
  exists(key: string): Promise<boolean>;

  /** Get object metadata without downloading content */
  stat(key: string): Promise<StorageObject | null>;

  /** List objects under a prefix */
  list(options?: StorageListOptions): Promise<StorageListResult>;

  /** Generate a presigned URL for temporary access */
  presignedUrl(key: string, expiresIn?: number): Promise<string>;
}

// ─── Provider Registry ────────────────────────────────────────────────────────

export type StorageProviderName = "local" | "s3" | "gcs" | "azure" | "git" | "huggingface";

class StorageRegistry {
  private providers = new Map<StorageProviderName, IStorageProvider>();
  private defaultProvider?: StorageProviderName;

  register(name: StorageProviderName, provider: IStorageProvider): void {
    this.providers.set(name, provider);
  }

  setDefault(name: StorageProviderName): void {
    if (!this.providers.has(name)) {
      throw new Error(`Storage provider '${name}' is not registered`);
    }
    this.defaultProvider = name;
  }

  get(name?: StorageProviderName): IStorageProvider {
    const providerName = name ?? this.defaultProvider;
    if (!providerName) {
      throw new Error("No storage provider specified and no default is set");
    }
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' is not registered`);
    }
    return provider;
  }

  isRegistered(name: StorageProviderName): boolean {
    return this.providers.has(name);
  }

  listRegistered(): StorageProviderName[] {
    return Array.from(this.providers.keys());
  }
}

export const storageRegistry = new StorageRegistry();

// ─── Storage Service (facade) ─────────────────────────────────────────────────

export const storage = {
  upload: (key: string, data: Buffer | Uint8Array | string, options?: StorageUploadOptions, provider?: StorageProviderName) =>
    storageRegistry.get(provider).upload(key, data, options),

  download: (key: string, provider?: StorageProviderName) =>
    storageRegistry.get(provider).download(key),

  delete: (key: string, provider?: StorageProviderName) =>
    storageRegistry.get(provider).delete(key),

  exists: (key: string, provider?: StorageProviderName) =>
    storageRegistry.get(provider).exists(key),

  stat: (key: string, provider?: StorageProviderName) =>
    storageRegistry.get(provider).stat(key),

  list: (options?: StorageListOptions, provider?: StorageProviderName) =>
    storageRegistry.get(provider).list(options),

  presignedUrl: (key: string, expiresIn?: number, provider?: StorageProviderName) =>
    storageRegistry.get(provider).presignedUrl(key, expiresIn),
};
