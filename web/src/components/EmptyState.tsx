type Props = {
  title: string;
  description?: string;
};

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="surface rounded-lg px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink dark:text-white">{title}</p>
      {description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}
