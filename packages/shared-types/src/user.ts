export type UserRole = 'PLAYER' | 'COACH' | 'ADMIN';

export interface ChesswiseUser {
  id: string;
  supabaseId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
