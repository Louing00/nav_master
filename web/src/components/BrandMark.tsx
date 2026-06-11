import { Sparkles } from 'lucide-react';

type Props = {
  logo?: string | null;
  className?: string;
  iconSize?: number;
};

function isShortTextMark(value: string) {
  return /^[A-Za-z0-9\u3400-\u9fff]{1,2}$/u.test(value);
}

export default function BrandMark({ logo, className = '', iconSize = 22 }: Props) {
  const mark = logo?.trim() || '';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint dark:bg-mint/20 ${className}`}
      aria-hidden="true"
    >
      {isShortTextMark(mark) ? (
        <span className="text-sm font-bold uppercase leading-none">{mark}</span>
      ) : (
        <Sparkles size={iconSize} strokeWidth={1.8} />
      )}
    </span>
  );
}
