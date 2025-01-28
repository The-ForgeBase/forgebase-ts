import { User } from '../types';

export interface AppUser extends User {
  name?: string;
  picture?: string;
  phone?: string;
  email_verified: boolean;
  phone_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret?: string;
  mfa_recovery_codes?: string[];
}
