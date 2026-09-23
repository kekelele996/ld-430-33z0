import { UserRole } from './enums';

export interface AuthUser {
  id: string;
  role: UserRole;
  canDownloadCommercial?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ClaimStatus {
  assetId: string;
  claimed: boolean;
  claimedBy?: string;
  claimedAt?: Date;
  expiresAt?: Date;
  remainingMs?: number;
}
