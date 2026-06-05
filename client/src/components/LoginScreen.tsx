import { useState } from 'react';
import { PasswordInput } from './ui/password-input';

interface Props {
  onLogin: (password: string) => void;
  error?: string;
}

export function LoginScreen({ onLogin, error }: Props) {
  const [password, setPassword] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onLogin(password.trim());
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newPassword.length < 4) {
      setResetError('新密码至少 4 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('两次输入的新密码不一致');
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetCode, newPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setResetError(data.error || '重置失败');
        return;
      }
      onLogin(newPassword);
    } catch {
      setResetError('网络错误，请重试');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-page flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🧰</div>
          <h1 className="text-[22px] font-bold text-warm-text">小胖工作台</h1>
          <p className="text-xs text-warm-muted mt-1">请输入访问密码</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-warm-card rounded-warm-card shadow-warm p-6 space-y-4">
          <PasswordInput
            value={password}
            onChange={setPassword}
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
          <button
            type="button"
            onClick={() => setShowReset(v => !v)}
            className="w-full text-xs text-warm-muted hover:text-warm-primary transition-colors"
          >
            忘记密码 / 重置密码
          </button>
        </form>

        {showReset && (
          <form onSubmit={handleReset} className="bg-warm-card rounded-warm-card shadow-warm p-6 space-y-3 mt-4">
            <div>
              <h2 className="text-sm font-semibold text-warm-text">重置密码</h2>
              <p className="text-xs text-warm-muted mt-1">需要服务器重置码。</p>
            </div>
            <PasswordInput
              value={resetCode}
              onChange={setResetCode}
              placeholder="重置码"
              className="w-full px-4 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
            />
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="新密码"
              className="w-full px-4 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
            />
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="再次输入新密码"
              className="w-full px-4 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
            />
            {resetError && <p className="text-xs text-red-500 text-center">{resetError}</p>}
            <button
              type="submit"
              disabled={resetting || !resetCode.trim() || !newPassword.trim()}
              className="w-full py-2.5 bg-warm-primary hover:bg-warm-primary-hover text-white rounded-warm-btn text-sm font-medium transition-colors disabled:opacity-50"
            >
              重置并进入
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
