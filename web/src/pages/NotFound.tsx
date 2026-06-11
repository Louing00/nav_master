import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import notFoundIllustration from '../assets/illustrations/not-found.svg';
import BrandMark from '../components/BrandMark';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6f8] px-4 py-10 dark:bg-slate-950">
      <section className="surface grid w-full max-w-4xl items-center gap-8 rounded-xl p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <div className="order-2 md:order-1">
          <BrandMark className="h-12 w-12" />
          <p className="mt-6 text-sm font-semibold text-mint">404</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-white sm:text-4xl">页面没有找到</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
            当前地址不存在或已经移动。你可以返回导航首页，继续访问已有系统入口。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/"
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
            >
              <Home size={17} />
              返回首页
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-mint hover:text-mint dark:border-slate-700 dark:text-slate-300"
            >
              <ArrowLeft size={17} />
              返回上一页
            </button>
          </div>
        </div>
        <img
          src={notFoundIllustration}
          alt=""
          className="order-1 mx-auto h-auto w-full max-w-sm object-contain md:order-2"
          aria-hidden="true"
        />
      </section>
    </main>
  );
}
