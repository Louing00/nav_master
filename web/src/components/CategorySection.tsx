import AppCard from './AppCard';
import type { NavCategory } from '../types/app';

type Props = {
  category: NavCategory;
};

export default function CategorySection({ category }: Props) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl text-mint">{category.icon || '·'}</span>
            <h2 className="text-xl font-semibold text-ink dark:text-white">{category.name}</h2>
          </div>
          {category.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{category.description}</p>}
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">{category.apps.length} 个入口</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {category.apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </section>
  );
}
