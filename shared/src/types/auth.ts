export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatarUrl: string | null;
}
