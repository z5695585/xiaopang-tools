import { useState, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { ToolWorkspace } from './components/ToolWorkspace';
import { LoginScreen } from './components/LoginScreen';
import { toolPackages } from './tools/registry';
import type { ClientToolPackage } from './tools/registry';

function App() {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [checking, setChecking] = useState(true);

  // 启动时检查是否已有密码
  useEffect(() => {
    const saved = sessionStorage.getItem('auth_password');
    if (saved) {
      // 用已保存的密码快速验证
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: saved }),
      }).then(r => r.json()).then((data: any) => {
        if (data.success) {
          setAuthed(true);
        } else {
          sessionStorage.removeItem('auth_password');
        }
      }).catch(() => {
        sessionStorage.removeItem('auth_password');
      }).finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = async (password: string) => {
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('auth_password', password);
        setAuthed(true);
      } else {
        setLoginError(data.error || '密码错误');
      }
    } catch {
      setLoginError('网络错误，请重试');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-warm-page flex items-center justify-center">
        <p className="text-warm-muted text-sm">加载中...</p>
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  const activeTool: ClientToolPackage | undefined = activeToolId
    ? toolPackages.find(p => p.meta.id === activeToolId)
    : undefined;

  if (activeToolId && activeTool) {
    return (
      <div className="animate-fade-in">
        <ToolWorkspace
          title={activeTool.meta.name}
          icon={activeTool.meta.icon}
          onBack={() => setActiveToolId(null)}
        >
          <activeTool.component />
        </ToolWorkspace>
      </div>
    );
  }

  return (
    <HomeScreen
      onSelectTool={setActiveToolId}
      onPasswordChanged={(password) => {
        sessionStorage.setItem('auth_password', password);
      }}
    />
  );
}

export default App;
