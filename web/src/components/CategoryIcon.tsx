import {
  Bot,
  Cloud,
  Code2,
  Database,
  FolderKanban,
  Globe2,
  Home,
  LayoutGrid,
  Mail,
  Network,
  Plane,
  Server,
  Shield,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON_OPTIONS = [
  { value: 'folder', label: '通用分类', icon: FolderKanban },
  { value: 'grid', label: '常用入口', icon: LayoutGrid },
  { value: 'sparkles', label: '精选服务', icon: Sparkles },
  { value: 'code', label: '开发与自研', icon: Code2 },
  { value: 'wrench', label: '运维工具', icon: Wrench },
  { value: 'server', label: '服务器', icon: Server },
  { value: 'network', label: '网络服务', icon: Network },
  { value: 'cloud', label: '云服务', icon: Cloud },
  { value: 'database', label: '数据服务', icon: Database },
  { value: 'bot', label: 'AI 平台', icon: Bot },
  { value: 'mail', label: '邮件服务', icon: Mail },
  { value: 'home', label: '家庭服务', icon: Home },
  { value: 'plane', label: '机场与代理', icon: Plane },
  { value: 'shield', label: '安全服务', icon: Shield },
  { value: 'globe', label: '互联网服务', icon: Globe2 },
] as const;

const iconMap = Object.fromEntries(CATEGORY_ICON_OPTIONS.map((item) => [item.value, item.icon])) as Record<
  string,
  LucideIcon
>;

const legacyIconMap: Record<string, string> = {
  '◇': 'code',
  '⌘': 'wrench',
  '\u2708': 'plane',
  '\u2708\uFE0F': 'plane',
  '\u{1F440}': 'grid',
  '\u{1F916}': 'bot',
  '\u{1F3E0}': 'home',
  '\u2601': 'cloud',
  '\u2601\uFE0F': 'cloud',
};

export function resolveCategoryIconKey(icon?: string | null, name = '') {
  const raw = icon?.trim() || '';
  if (iconMap[raw]) {
    return raw;
  }
  if (legacyIconMap[raw]) {
    return legacyIconMap[raw];
  }

  const normalized = name.toLowerCase();
  if (/ai|人工智能|模型|对话/.test(normalized)) return 'bot';
  if (/运维|工具|中枢|控制/.test(normalized)) return 'wrench';
  if (/服务器|vps|主机|容器/.test(normalized)) return 'server';
  if (/网络|路由|内网/.test(normalized)) return 'network';
  if (/云|cloud/.test(normalized)) return 'cloud';
  if (/数据库|数据/.test(normalized)) return 'database';
  if (/邮件|邮箱|mail/.test(normalized)) return 'mail';
  if (/家庭|home/.test(normalized)) return 'home';
  if (/机场|代理|vpn/.test(normalized)) return 'plane';
  if (/安全|security/.test(normalized)) return 'shield';
  if (/自研|开发|代码/.test(normalized)) return 'code';
  if (/常用|收藏|精选/.test(normalized)) return 'grid';
  return 'folder';
}

type Props = {
  icon?: string | null;
  name?: string;
  size?: number;
  className?: string;
};

export default function CategoryIcon({ icon, name = '', size = 20, className = '' }: Props) {
  const Icon = iconMap[resolveCategoryIconKey(icon, name)] || FolderKanban;
  return <Icon size={size} strokeWidth={1.8} className={className} aria-hidden="true" />;
}
