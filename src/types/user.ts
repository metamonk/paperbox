/**
 * User and profile types
 */

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  profile?: Profile;
}

export interface CursorPosition {
  userId: string;
  displayName: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  color: string;
  isActive: boolean;
  lastActivity: number;
}

