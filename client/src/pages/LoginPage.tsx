import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    navigate(email.includes('admin') ? '/admin' : '/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-forge-950 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm bg-forge-900 border border-forge-700 rounded-md p-8">
        <h1 className="text-xl font-semibold text-forge-50 mb-6">Sign in to MapForge</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-forge-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-forge-850 border border-forge-700 rounded text-forge-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-forge-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-forge-850 border border-forge-700 rounded text-forge-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-forge-950 font-semibold rounded text-sm transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-xs text-forge-500 text-center">
          Use any email to sign in. Include "admin" in the email for admin role.
        </p>
      </div>
    </div>
  );
}
