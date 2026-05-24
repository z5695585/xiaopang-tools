import type { ReactNode } from 'react';

interface Props {
  title: string;
  icon: string;
  onBack: () => void;
  children: ReactNode;
}

export function ToolWorkspace({ title, icon, onBack, children }: Props) {
  return (
    <div className="min-h-screen bg-warm-page flex flex-col">
      {/* 顶部导航栏 */}
      <header className="h-12 flex items-center gap-3 px-6 bg-warm-card border-b border-warm-border shrink-0">
        <button
          onClick={onBack}
          className="text-[11px] text-warm-muted hover:text-warm-text transition-colors"
        >
          ← 返回
        </button>
        <span className="text-[15px] font-semibold text-warm-text">
          {icon} {title}
        </span>
      </header>

      {/* 工具内容区 */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
