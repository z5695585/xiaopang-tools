import { useState } from 'react';

interface Props {
  onLogin: (password: string) => void;
  error?: string;
}

export function LoginScreen({ onLogin, error }: Props) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onLogin(password.trim());
    }
  };

  return (
    <div className="min-h-screen bg-warm-page flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🧰</div>
          <h1 className="text-[22px] font-bold text-warm-text">小胖工具</h1>
          <p className="text-xs text-warm-muted mt-1">请输入访问密码</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-warm-card rounded-warm-card shadow-warm p-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码"
            autoFocus
            className="w-full px-4 py-3 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary text-center"
          />
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={!password.trim()}
            className="w-full py-3 bg-warm-primary hover:bg-warm-primary-hover text-white rounded-warm-btn text-sm font-medium transition-colors disabled:opacity-50"
          >
            进入
          </button>
        </form>
      </div>
    </div>
  );
}
