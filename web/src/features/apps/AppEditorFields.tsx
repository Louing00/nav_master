import type { Dispatch, SetStateAction } from 'react';
import type { AppMetadataPreview as MetadataPreview } from '../../api/admin';
import AppMetadataPreview from '../../components/AppMetadataPreview';
import type { AdminCategory } from '../../types/category';
import type { AppFormState } from './appEditor';

type Props = {
  form: AppFormState;
  setForm: Dispatch<SetStateAction<AppFormState>>;
  categories: AdminCategory[];
  descriptionIsAuto: boolean;
  onDescriptionChange: (description: string) => void;
  preview: {
    data: MetadataPreview | null;
    loading: boolean;
    error: string;
    validUrl: boolean;
    refresh: () => void;
  };
  error?: string;
  autoBadgeClassName?: string;
};

export default function AppEditorFields({
  form,
  setForm,
  categories,
  descriptionIsAuto,
  onDescriptionChange,
  preview,
  error,
  autoBadgeClassName = 'rounded-full bg-mint/10 px-2 py-0.5 text-xs font-semibold text-mint dark:bg-mint/20',
}: Props) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="admin-label">访问地址</span>
        <input
          className="admin-input mt-1"
          required
          value={form.url}
          onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
          placeholder="https://example.com"
          autoFocus
        />
      </label>
      <div className="sm:col-span-2">
        <AppMetadataPreview
          url={form.url}
          name={form.name}
          icon={form.icon}
          iconUrl={form.iconUrl}
          metadata={preview.data}
          loading={preview.loading}
          error={preview.error}
          validUrl={preview.validUrl}
          onRetry={preview.refresh}
        />
      </div>
      <label className="sm:col-span-2">
        <span className="admin-label">系统名称</span>
        <input
          className="admin-input mt-1"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="留空使用自动名称"
        />
      </label>
      <label className="sm:col-span-2">
        <span className="flex items-center gap-2">
          <span className="admin-label">描述</span>
          {descriptionIsAuto ? <span className={autoBadgeClassName}>自动简介</span> : null}
        </span>
        <textarea
          className="admin-input mt-1 min-h-20"
          value={form.description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="留空自动读取站点简介"
        />
      </label>
      <label>
        <span className="admin-label">图标字符（字母或数字）</span>
        <input
          className="admin-input mt-1"
          value={form.icon}
          onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
        />
      </label>
      <label>
        <span className="admin-label">图标 URL</span>
        <input
          className="admin-input mt-1"
          value={form.iconUrl}
          onChange={(event) => setForm((current) => ({ ...current, iconUrl: event.target.value }))}
          placeholder="https://example.com/icon.png"
        />
      </label>
      <label>
        <span className="admin-label">分类</span>
        <select
          className="admin-input mt-1"
          value={form.categoryId || ''}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              categoryId: event.target.value ? Number(event.target.value) : undefined,
            }))
          }
        >
          <option value="">未分类</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="admin-label">标签</span>
        <input
          className="admin-input mt-1"
          value={form.tags}
          onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
          placeholder="用英文逗号分隔"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(event) => setForm((current) => ({ ...current, visible: event.target.checked }))}
          />
          前台显示
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.openInNewTab}
            onChange={(event) =>
              setForm((current) => ({ ...current, openInNewTab: event.target.checked }))
            }
          />
          新窗口打开
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.healthEnabled}
            onChange={(event) =>
              setForm((current) => ({ ...current, healthEnabled: event.target.checked }))
            }
          />
          启用健康检查
        </label>
      </div>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200 sm:col-span-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
