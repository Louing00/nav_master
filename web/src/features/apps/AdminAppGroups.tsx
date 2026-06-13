import { ChevronDown, ChevronRight, GripVertical, Image, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import AppIcon from '../../components/AppIcon';
import CategoryIcon from '../../components/CategoryIcon';
import EmptyState from '../../components/EmptyState';
import HealthBadge from '../../components/HealthBadge';
import { getAppDisplayName } from '../../lib/appName';
import type { NavApp } from '../../types/app';

export type AppGroup = {
  id: number | null;
  name: string;
  icon?: string | null;
  description?: string | null;
  apps: NavApp[];
};

type Props = {
  groups: AppGroup[];
  keyword: string;
  collapsedGroupKeys: Set<string>;
  canDragSort: boolean;
  draggingAppId: number | null;
  checkingAllHealth: boolean;
  checkingAppIds: Set<number>;
  refreshingIconIds: Set<number>;
  onToggleGroup: (group: AppGroup) => void;
  onToggleVisible: (app: NavApp) => void;
  onRefreshIcon: (app: NavApp) => void;
  onHealthCheck: (app: NavApp) => void;
  onEdit: (app: NavApp) => void;
  onRemove: (id: number) => void;
  onReorder: (group: AppGroup, sourceAppId: number, targetAppId: number) => void;
  onDraggingAppChange: (appId: number | null) => void;
};

function groupKey(group: AppGroup) {
  return group.id === null ? 'uncategorized' : String(group.id);
}

function VisibilityToggle({
  app,
  onToggle,
}: {
  app: NavApp;
  onToggle: (app: NavApp) => void;
}) {
  const visible = app.visible ?? true;
  return (
    <button
      type="button"
      onClick={() => onToggle(app)}
      className={`focus-ring inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
        visible ? 'bg-mint' : 'bg-slate-300 dark:bg-slate-700'
      }`}
      title={visible ? '点击隐藏' : '点击显示'}
      data-tooltip={visible ? '点击隐藏' : '点击显示'}
      aria-pressed={visible}
    >
      <span className="sr-only">{visible ? '显示' : '隐藏'}</span>
      <span
        className={`h-5 w-5 rounded-full bg-white shadow transition ${
          visible ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function AppActions({
  app,
  checkingAllHealth,
  checkingAppIds,
  refreshingIconIds,
  onRefreshIcon,
  onHealthCheck,
  onEdit,
  onRemove,
}: Pick<
  Props,
  | 'checkingAllHealth'
  | 'checkingAppIds'
  | 'refreshingIconIds'
  | 'onRefreshIcon'
  | 'onHealthCheck'
  | 'onEdit'
  | 'onRemove'
> & { app: NavApp }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="admin-icon-button disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onRefreshIcon(app)}
        title="重新获取图标"
        data-tooltip="重新获取图标"
        disabled={refreshingIconIds.has(app.id)}
      >
        <Image size={16} className={refreshingIconIds.has(app.id) ? 'animate-pulse' : ''} />
      </button>
      <button
        type="button"
        className="admin-icon-button disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onHealthCheck(app)}
        title={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
        data-tooltip={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
        disabled={app.healthEnabled === false || checkingAllHealth || checkingAppIds.has(app.id)}
      >
        <RefreshCw size={16} className={checkingAppIds.has(app.id) ? 'animate-spin' : ''} />
      </button>
      <button
        className="admin-icon-button"
        onClick={() => onEdit(app)}
        title="编辑"
        data-tooltip="编辑"
      >
        <Pencil size={16} />
      </button>
      <button
        className="admin-danger-button"
        onClick={() => onRemove(app.id)}
        title="删除"
        data-tooltip="删除"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function AdminAppGroups(props: Props) {
  return (
    <div className="grid gap-5 p-5">
      {props.groups.map((group) => {
        const collapsed = props.collapsedGroupKeys.has(groupKey(group));

        return (
          <section key={group.id ?? 'uncategorized'} className="admin-section">
            <div className="admin-section-header">
              <div>
                <div className="flex items-center gap-2">
                  <span className="admin-icon-tile h-9 w-9">
                    <CategoryIcon icon={group.icon} name={group.name} size={17} />
                  </span>
                  <h2 className="font-semibold text-[var(--admin-text)]">{group.name}</h2>
                  <button
                    type="button"
                    onClick={() => props.onToggleGroup(group)}
                    className="admin-icon-button h-7 w-7"
                    title={collapsed ? '展开分类' : '折叠分类'}
                    data-tooltip={collapsed ? '展开分类' : '折叠分类'}
                    aria-expanded={!collapsed}
                  >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {group.description && !collapsed ? (
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">{group.description}</p>
                ) : null}
              </div>
              <span className="admin-status-neutral shrink-0 px-2.5 py-1 text-xs font-medium">
                {group.apps.length} 个应用
              </span>
            </div>

            {!collapsed ? (
              <>
                <div className="grid gap-3 p-3 md:hidden">
                  {group.apps.map((app) => (
                    <article key={app.id} className="admin-mobile-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <AppIcon app={app} compact />
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">{getAppDisplayName(app)}</h3>
                            <p className="mt-1 truncate text-sm text-[var(--admin-muted)]">{app.url}</p>
                          </div>
                        </div>
                        <HealthBadge app={app} />
                      </div>
                      {app.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {app.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="admin-status-neutral px-2.5 py-1 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <VisibilityToggle app={app} onToggle={props.onToggleVisible} />
                        <AppActions app={app} {...props} />
                      </div>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="admin-table min-w-[860px]">
                    <thead>
                      <tr>
                        <th className="w-12 px-4 py-3"></th>
                        <th className="px-4 py-3">名称</th>
                        <th className="px-4 py-3">地址</th>
                        <th className="px-4 py-3">健康</th>
                        <th className="px-4 py-3">状态</th>
                        <th className="px-4 py-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.apps.map((app) => (
                        <tr
                          key={app.id}
                          draggable={props.canDragSort}
                          onDragStart={(event) => {
                            if (!props.canDragSort) {
                              event.preventDefault();
                              return;
                            }
                            props.onDraggingAppChange(app.id);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', String(app.id));
                          }}
                          onDragOver={(event) => {
                            if (
                              props.canDragSort &&
                              props.draggingAppId &&
                              props.draggingAppId !== app.id
                            ) {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = 'move';
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const sourceId = Number(
                              event.dataTransfer.getData('text/plain') || props.draggingAppId,
                            );
                            props.onReorder(group, sourceId, app.id);
                          }}
                          onDragEnd={() => props.onDraggingAppChange(null)}
                          className={`${
                            props.draggingAppId === app.id
                              ? 'bg-[var(--admin-accent-soft)] opacity-70'
                              : 'bg-transparent'
                          } ${props.canDragSort ? 'cursor-move' : ''}`}
                        >
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 ${
                                props.canDragSort
                                  ? 'cursor-grab hover:bg-[var(--admin-secondary)] hover:text-[var(--admin-accent)] active:cursor-grabbing'
                                  : 'opacity-40'
                              }`}
                              title={props.canDragSort ? '拖拽排序' : '清空搜索后可排序'}
                              data-tooltip={props.canDragSort ? '拖拽排序' : '清空搜索后可排序'}
                            >
                              <GripVertical size={17} />
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium">
                            <div className="flex items-center gap-3">
                              <AppIcon app={app} compact />
                              <span className="truncate">{getAppDisplayName(app)}</span>
                            </div>
                          </td>
                          <td className="max-w-xs truncate px-4 py-4 text-[var(--admin-muted)]">
                            {app.url}
                          </td>
                          <td className="px-4 py-4">
                            <HealthBadge app={app} />
                          </td>
                          <td className="px-4 py-4">
                            <VisibilityToggle app={app} onToggle={props.onToggleVisible} />
                          </td>
                          <td className="px-4 py-4">
                            <AppActions app={app} {...props} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </section>
        );
      })}
      {props.groups.length === 0 ? (
        <EmptyState
          title={props.keyword.trim() ? '没有匹配的应用' : '暂无应用'}
          description={
            props.keyword.trim()
              ? '清空搜索或尝试其他关键词。'
              : '创建第一个应用入口，开始搭建导航页。'
          }
        />
      ) : null}
    </div>
  );
}
