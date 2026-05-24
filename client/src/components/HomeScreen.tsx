import type { ClientToolPackage } from '../tools/registry';
import { toolPackages } from '../tools/registry';

interface Props {
  onSelectTool: (toolId: string) => void;
}

const placeholderTools = [
  { id: 'placeholder-1', name: '工具 2', icon: '🔧', desc: '即将推出' },
  { id: 'placeholder-2', name: '工具 3', icon: '📊', desc: '即将推出' },
];

export function HomeScreen({ onSelectTool }: Props) {
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
            <h1 className="text-[22px] font-bold text-warm-text">🧰 小胖工具</h1>
            <p className="text-[11px] text-warm-muted mt-0.5">{allTools.length} 个工具</p>
          </div>
          <button className="w-9 h-9 bg-warm-secondary hover:bg-warm-border rounded-full flex items-center justify-center transition-colors text-base">
            ⚙
          </button>
        </div>

        {/* 图标网格 */}
        <div className="grid grid-cols-3 gap-4">
          {allTools.map(tool => {
            const isPlaceholder = tool.id.startsWith('placeholder');
            return (
              <button
                key={tool.id}
                onClick={() => !isPlaceholder && onSelectTool(tool.id)}
                disabled={isPlaceholder}
                className={`
                  bg-warm-card rounded-warm-card p-5 text-center transition-all duration-200
                  ${isPlaceholder
                    ? 'border border-dashed border-warm-border opacity-70 cursor-default'
                    : 'border-2 border-warm-border shadow-warm hover:-translate-y-1 hover:shadow-warm-hover active:scale-95'
                  }
                `}
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
    </div>
  );
}

function getToolDesc(id: string): string {
  switch (id) {
    case 'todo-summary': return '任务管理 + AI 周报';
    default: return '';
  }
}
