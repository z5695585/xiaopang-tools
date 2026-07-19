import { useState } from 'react';
import type { ClientToolPackage } from '../tools/registry';
import { toolPackages } from '../tools/registry';
import { PasswordInput } from './ui/password-input';
import { BackupSettingsSection } from './BackupSettingsSection';

interface Props {
  onSelectTool: (toolId: string) => void;
  onPasswordChanged: (password: string) => void;
}

const placeholderTools = [
  { id: 'placeholder-1', name: '工具 2', icon: '🔧', desc: '即将推出' },
  { id: 'placeholder-2', name: '工具 3', icon: '📊', desc: '即将推出' },
];

export function HomeScreen({ onSelectTool, onPasswordChanged }: Props) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const realTools = toolPackages.map(pkg => ({
    id: pkg.meta.id,
    name: pkg.meta.name,
    icon: pkg.meta.icon,
    desc: getToolDesc(pkg.meta.id),
  }));

  const allTools = [...realTools, ...placeholderTools];

  return (
    <div className="min-h-screen bg-warm-page flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-warm-text">🧰 小胖工作台</h1>
            <p className="text-[11px] text-warm-muted mt-0.5">{allTools.length} 个工具</p>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-9 h-9 bg-warm-secondary hover:bg-warm-border rounded-full flex items-center justify-center transition-colors text-base"
            title="设置"
          >
            ⚙
          </button>
        </div>

        {/* 图标网格 */}
        <div className="grid grid-cols-3 gap-4">
          {allTools.map((tool, toolIndex) => {
            const isPlaceholder = tool.id.startsWith('placeholder');
            return (
              <button
                key={tool.id}
                onClick={() => !isPlaceholder && onSelectTool(tool.id)}
                disabled={isPlaceholder}
                className={`
                  animate-slide-up bg-warm-card rounded-warm-card p-5 text-center transition-all duration-200
                  ${isPlaceholder
                    ? 'border border-dashed border-warm-border opacity-70 cursor-default'
                    : 'border-2 border-warm-border shadow-warm hover:-translate-y-1 hover:shadow-warm-hover active:scale-95'
                  }
                `}
                style={{ animationDelay: `${toolIndex * 60}ms` }}
              >
                <div className={`
                  w-14 h-14 rounded-warm-icon flex items-center justify-center text-[28px] mx-auto mb-3
                  ${isPlaceholder ? 'bg-warm-secondary' : 'bg-gradient-to-br from-warm-primary to-warm-primary-hover'}
                `}>
                  {tool.icon}
                </div>
                <div className="text-[13px] font-semibold text-warm-text">{tool.name}</div>
                <div className="text-[10px] text-warm-muted mt-1">{tool.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
      {showPasswordModal && (
        <SettingsModal
          onClose={() => setShowPasswordModal(false)}
          onPasswordChanged={(password) => {
            onPasswordChanged(password);
            setShowPasswordModal(false);
          }}
        />
      )}
    </div>
  );
}

function getToolDesc(id: string): string {
  switch (id) {
    case 'todo-summary': return '待处理、风险重点、周期回顾';
    default: return '';
  }
}

function SettingsModal({
  onClose,
  onPasswordChanged,
}: {
  onClose: () => void;
  onPasswordChanged: (password: string) => void;
}) {
  const [mode, setMode] = useState<'change' | 'reset'>('change');
  const [currentPassword, setCurrentPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 4) {
      setError('新密码至少 4 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(mode === 'change' ? '/api/auth/change' : '/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'change'
          ? { currentPassword, newPassword }
          : { resetCode, newPassword }
        ),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '修改失败');
        return;
      }
      onPasswordChanged(newPassword);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 px-6">
      <div className="bg-warm-card rounded-warm-card shadow-warm-hover w-full max-w-sm p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <h3 className="font-semibold text-lg text-warm-text">设置</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-warm-text">密码设置</h4>
            <p className="text-xs text-warm-muted mt-1">
              {mode === 'change' ? '修改后会自动更新当前登录状态。' : '重置密码需要服务器重置码。'}
            </p>
          </div>

          <div className="flex bg-warm-secondary rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('change');
                setError('');
              }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'change' ? 'bg-warm-primary text-white shadow-sm' : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              修改密码
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setError('');
              }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'reset' ? 'bg-warm-primary text-white shadow-sm' : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              重置密码
            </button>
          </div>

          {mode === 'change' ? (
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="当前密码"
              className="w-full px-3 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
            />
          ) : (
            <PasswordInput
              value={resetCode}
              onChange={setResetCode}
              placeholder="重置码"
              className="w-full px-3 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
            />
          )}
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="新密码"
            className="w-full px-3 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
          />
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="再次输入新密码"
            className="w-full px-3 py-2 border border-warm-border rounded-warm-btn text-sm bg-white outline-none focus:ring-2 focus:ring-warm-primary/20 focus:border-warm-primary"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-warm-primary rounded-md hover:bg-warm-primary-hover disabled:opacity-50">
              {mode === 'change' ? '保存密码' : '重置密码'}
            </button>
          </div>
        </form>

        <hr className="border-warm-border" />

        <BackupSettingsSection />

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-warm-secondary hover:bg-warm-border text-warm-text">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
