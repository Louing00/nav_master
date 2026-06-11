import {
  Bot,
  BookOpen,
  Cloud,
  Code2,
  Database,
  Globe2,
  House,
  Link2,
  Mail,
  Monitor,
  Server,
  Shield,
  Video,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { NavApp } from '../types/app';

type Props = {
  app: Pick<NavApp, 'icon' | 'iconUrl' | 'name' | 'resolvedIconUrl'>;
  compact?: boolean;
};

export function isUsableTextIcon(value?: string | null) {
  return /^[A-Za-z0-9\u3400-\u9fff]{1,3}$/u.test(value?.trim() || '');
}

function resolveFallbackIcon(app: Props['app']): LucideIcon {
  const value = `${app.name || ''} ${app.icon || ''}`.toLowerCase();

  if (/mail|邮箱|邮件|gmail/.test(value)) return Mail;
  if (/ai|chat|gpt|gemini|deepseek|模型|对话/.test(value)) return Bot;
  if (/vps|server|服务器|主机|云枢/.test(value)) return Server;
  if (/openwrt|ikuai|router|路由|网络|内网/.test(value)) return Wifi;
  if (/cloud|云服务|云平台/.test(value)) return Cloud;
  if (/video|youtube|b站|bilibili|视频/.test(value)) return Video;
  if (/book|library|图书|阅读/.test(value)) return BookOpen;
  if (/database|数据库|数据/.test(value)) return Database;
  if (/security|安全|shield/.test(value)) return Shield;
  if (/home|家庭|家居/.test(value)) return House;
  if (/code|开发|自研|git/.test(value)) return Code2;
  if (/console|控制台|面板|监控/.test(value)) return Monitor;
  if (/link|share|邻渡|传输/.test(value)) return Link2;
  return Globe2;
}

export default function AppIcon({ app, compact = false }: Props) {
  const [manualIconFailed, setManualIconFailed] = useState(false);
  const [remoteIconFailed, setRemoteIconFailed] = useState(false);
  const rawIcon = app.icon?.trim();
  const textIcon = isUsableTextIcon(rawIcon) ? rawIcon : '';
  const manualIconUrl = useMemo(() => app.iconUrl?.trim() || '', [app.iconUrl]);
  const remoteIconUrl = useMemo(() => app.resolvedIconUrl?.trim() || '', [app.resolvedIconUrl]);
  const showManualIcon = Boolean(manualIconUrl && !manualIconFailed);
  const showTextIcon = Boolean(textIcon);
  const showRemoteIcon = Boolean(remoteIconUrl && !remoteIconFailed);
  const FallbackIcon = resolveFallbackIcon(app);

  useEffect(() => {
    setManualIconFailed(false);
  }, [manualIconUrl]);

  useEffect(() => {
    setRemoteIconFailed(false);
  }, [remoteIconUrl]);

  return (
    <span
      className={`home-icon flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 ${
        compact ? 'h-9 w-9 text-xl' : 'h-10 w-10 text-xl sm:h-12 sm:w-12 sm:text-2xl'
      }`}
      aria-hidden="true"
    >
      {showManualIcon ? (
        <img
          src={manualIconUrl}
          alt=""
          className={compact ? 'h-5 w-5 object-contain' : 'h-6 w-6 object-contain sm:h-7 sm:w-7'}
          referrerPolicy="no-referrer"
          onError={() => setManualIconFailed(true)}
        />
      ) : showTextIcon ? (
        <span className="leading-none">{textIcon}</span>
      ) : showRemoteIcon ? (
        <img
          src={remoteIconUrl}
          alt=""
          className={compact ? 'h-5 w-5 object-contain' : 'h-6 w-6 object-contain sm:h-7 sm:w-7'}
          referrerPolicy="no-referrer"
          onError={() => setRemoteIconFailed(true)}
        />
      ) : (
        <FallbackIcon size={compact ? 18 : 22} strokeWidth={1.8} />
      )}
    </span>
  );
}
