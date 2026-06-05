import { CheckCircle2, AlertTriangle, Star } from 'lucide-react';
import type { SummaryData, SummaryGroup, SummaryItem, Tag } from '@shared/types';

interface Props {
  summary: SummaryData | null;
  selectedTagId: number | null;
  onSelectTag: (tagId: number | null) => void;
  periodLabel: string;
}

interface TaggedItem extends SummaryItem {
  tag: Tag;
}

function getGroups(summary: SummaryData | null, selectedTagId: number | null): SummaryGroup[] {
  const groups = summary?.groups || [];
  if (selectedTagId === null) return groups;
  return groups.filter(group => group.tag.id === selectedTagId);
}

function flattenItems(groups: SummaryGroup[], key: 'completed' | 'risks' | 'focus'): TaggedItem[] {
  return groups.flatMap(group => group[key].map(item => ({ ...item, tag: group.tag })));
}

function itemSubtitle(item: TaggedItem, kind: 'completed' | 'risks' | 'focus'): string {
  const parts = [item.tag.name];
  if (item.isSub && item.parentTitle) parts.push(`所属：${item.parentTitle}`);
  if (item.subCount > 0) parts.push(`${item.subCount} 个子项`);
  if (kind === 'completed' && item.completedAt) {
    parts.push(`完成于 ${item.completedAt.slice(0, 16).replace('T', ' ')}`);
  } else if (kind !== 'completed') {
    parts.push(item.completedAt ? `已完成于 ${item.completedAt.slice(0, 10)}` : '周期内待处理');
  }
  return parts.join(' · ');
}

function AttentionSection({
  title,
  items,
  kind,
}: {
  title: string;
  items: TaggedItem[];
  kind: 'risks' | 'focus';
}) {
  const iconMap = {
    risks: AlertTriangle,
    focus: Star,
  };
  const Icon = iconMap[kind];

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-warm-text">
        <Icon className="w-4 h-4 text-warm-primary" />
        <span>{title}</span>
        <span className="text-xs text-warm-muted">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-warm-border rounded-lg px-4 py-5 text-sm text-warm-muted bg-white">
          暂无内容
        </div>
      ) : (
        <div className="border border-warm-border rounded-lg overflow-hidden bg-white">
          {items.map((item, index) => (
            <div
              key={`${kind}-${item.tag.id}-${index}-${item.title}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-warm-border last:border-b-0 hover:bg-warm-page transition-colors"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.tag.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate text-warm-text">
                  {item.isSub ? `↳ ${item.title}` : item.title}
                </div>
                <div className="text-xs text-warm-muted mt-0.5 truncate">
                  {itemSubtitle(item, kind)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CompletedByTagSection({ groups }: { groups: SummaryGroup[] }) {
  const nonEmptyGroups = groups.filter(group => group.completed.length > 0);
  const completedCount = nonEmptyGroups.reduce((sum, group) => sum + group.completed.length, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-warm-text">
        <CheckCircle2 className="w-4 h-4 text-warm-primary" />
        <span>已完成</span>
        <span className="text-xs text-warm-muted">{completedCount}</span>
      </div>

      {nonEmptyGroups.length === 0 ? (
        <div className="border border-dashed border-warm-border rounded-lg px-4 py-8 text-sm text-warm-muted bg-white">
          当前周期暂无完成事项
        </div>
      ) : (
        <div className="space-y-4">
          {nonEmptyGroups.map(group => (
            <div key={group.tag.id} className="border border-warm-border rounded-lg overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-warm-page border-b border-warm-border">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.tag.color }} />
                <span className="text-sm font-medium text-warm-text">{group.tag.name}</span>
                <span className="text-xs text-warm-muted">{group.completed.length}</span>
              </div>
              {group.completed.map((item, index) => {
                const tagged = { ...item, tag: group.tag };
                return (
                  <div
                    key={`completed-${group.tag.id}-${index}-${item.title}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-warm-border last:border-b-0 hover:bg-warm-page transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-warm-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate line-through text-warm-muted">
                        {item.isSub ? `↳ ${item.title}` : item.title}
                      </div>
                      <div className="text-xs text-warm-muted mt-0.5 truncate">
                        {itemSubtitle(tagged, 'completed')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function PeriodSummaryList({ summary, selectedTagId, onSelectTag, periodLabel }: Props) {
  const groups = getGroups(summary, selectedTagId);
  const completed = flattenItems(groups, 'completed');
  const risks = flattenItems(groups, 'risks');
  const focus = flattenItems(groups, 'focus');

  const tags = summary?.groups || [];
  const selectedTagName = selectedTagId === null
    ? '全部标签'
    : tags.find(group => group.tag.id === selectedTagId)?.tag.name || '当前标签';

  const visibleCount = completed.length + risks.length + focus.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSelectTag(null)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            selectedTagId === null
              ? 'bg-warm-primary text-white border-warm-primary'
              : 'bg-white text-warm-text-secondary border-warm-border hover:bg-warm-secondary'
          }`}
        >
          全部
        </button>
        {tags.map(group => (
          <button
            key={group.tag.id}
            onClick={() => onSelectTag(group.tag.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-2 ${
              selectedTagId === group.tag.id
                ? 'bg-warm-primary text-white border-warm-primary'
                : 'bg-white text-warm-text-secondary border-warm-border hover:bg-warm-secondary'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.tag.color }} />
            {group.tag.name}
            <span className={selectedTagId === group.tag.id ? 'text-white/80' : 'text-warm-muted'}>
              {group.completed.length + group.risks.length + group.focus.length}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-warm-secondary rounded-lg px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>{periodLabel}: <span className="font-medium">{selectedTagName}</span></span>
          <span>已完成: <span className="font-medium">{completed.length}</span></span>
          <span>风险: <span className="font-medium">{risks.length}</span></span>
          <span>重点关注: <span className="font-medium">{focus.length}</span></span>
          <span>可见条目: <span className="font-medium">{visibleCount}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-5 items-start">
        <CompletedByTagSection groups={groups} />
        <div className="space-y-5">
          <AttentionSection title="风险关注" items={risks} kind="risks" />
          <AttentionSection title="重点关注" items={focus} kind="focus" />
        </div>
      </div>
    </div>
  );
}
