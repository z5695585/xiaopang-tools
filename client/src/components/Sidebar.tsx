import type { ClientToolPackage } from '../tools/registry';
import { toolPackages } from '../tools/registry';

interface SidebarProps {
  activeToolId: string;
  onSelectTool: (id: string) => void;
}

export function Sidebar({ activeToolId, onSelectTool }: SidebarProps) {
  return (
    <aside className="w-56 bg-slate-900 text-slate-200 flex flex-col h-screen">
      {/* 品牌区 */}
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="text-base font-bold tracking-tight">🧰 小胖工具</h1>
      </div>

      {/* 工具列表 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {toolPackages.map((pkg: ClientToolPackage) => (
          <button
            key={pkg.meta.id}
            onClick={() => onSelectTool(pkg.meta.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeToolId === pkg.meta.id
                ? 'bg-sky-500 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="mr-2">{pkg.meta.icon}</span>
            {pkg.meta.name}
          </button>
        ))}
      </nav>

      {/* 底部 */}
      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">更多工具即将上线</p>
      </div>
    </aside>
  );
}
