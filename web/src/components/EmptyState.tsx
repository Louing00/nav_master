import { SearchX } from 'lucide-react';
import emptySearchIllustration from '../assets/illustrations/empty-search.svg';

type Props = {
  title: string;
  description?: string;
  illustration?: string;
};

export default function EmptyState({ title, description, illustration = emptySearchIllustration }: Props) {
  return (
    <div className="surface flex flex-col items-center rounded-lg px-6 py-10 text-center">
      <img
        src={illustration}
        alt=""
        className="h-auto w-full max-w-52 object-contain sm:max-w-60"
        aria-hidden="true"
      />
      <span className="-mt-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-mint/10 text-mint dark:bg-mint/20">
        <SearchX size={20} strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-base font-semibold text-ink dark:text-white">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}
