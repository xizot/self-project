'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CheckSquare,
  ChevronRight,
  Code,
  Download,
  Droplet,
  FolderKanban,
  GitBranch,
  Key,
  Layers,
  ListTodo,
  Settings,
  StickyNote,
  Tag,
  Timer,
  Zap,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavChild {
  title: string;
  icon: React.ElementType;
  route: string;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  tab?: string;
  route?: string;
  children?: NavChild[];
}

interface SidebarProps {
  collapsed: boolean;
  onNavClick?: () => void;
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  {
    title: 'Công việc',
    icon: CheckSquare,
    tab: 'todos',
    route: undefined,
  },
  {
    title: 'Ghi chú',
    icon: StickyNote,
    route: '/notes',
  },
  {
    title: 'Projects',
    icon: FolderKanban,
    route: '/projects',
  },
  {
    title: 'Trạng thái',
    icon: Settings,
    route: '/statuses',
  },
  {
    title: 'Danh mục',
    icon: Tag,
    route: '/categories',
  },
  {
    title: 'Mật khẩu',
    icon: Key,
    route: '/passwords',
  },
  {
    title: 'Automation',
    icon: Zap,
    route: '/automation',
  },
  {
    title: 'Cron',
    icon: Calendar,
    route: '/cron',
  },
  {
    title: 'Jira',
    icon: GitBranch,
    children: [
      { title: 'Tasks', icon: ListTodo, route: '/jira' },
      { title: 'Sprint', icon: Layers, route: '/sprint' },
    ],
  },
  {
    title: 'Formatter',
    icon: Code,
    route: '/formatter',
  },
  {
    title: 'Pomodoro',
    icon: Timer,
    route: '/pomodoro',
  },
  {
    title: 'Convert',
    icon: Download,
    route: '/convert',
  },
  {
    title: 'Hydration',
    icon: Droplet,
    route: '/hydration',
  },
];

// ─── SidebarContent ───────────────────────────────────────────────────────────

function SidebarContent({ collapsed, onNavClick }: SidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Track which groups are expanded. Auto-open groups whose child is active.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navItems.forEach((item) => {
      if (item.children?.some((c) => pathname === c.route)) {
        initial.add(item.title);
      }
    });
    return initial;
  });

  // Re-evaluate when pathname changes (e.g. external navigation)
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children?.some((c) => pathname === c.route)) {
        setExpandedGroups((prev) => new Set([...prev, item.title]));
      }
    });
  }, [pathname]);

  const handleNavClick = (tab: string, route?: string) => {
    if (route) {
      router.push(route);
    } else {
      router.push(`/?tab=${tab}`, { scroll: false });
    }
    onNavClick?.();
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen border-r bg-background transition-all duration-300 flex flex-col z-30',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed && (
          <h2 className="text-lg font-semibold truncate">Quản lý Cá nhân</h2>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          // ── Group item (has children) ──────────────────────────────────────
          if (item.children) {
            const isAnyChildActive = item.children.some(
              (c) => pathname === c.route
            );
            const isOpen = expandedGroups.has(item.title);

            // Collapsed sidebar: show icon only, navigate to first child
            if (collapsed) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() =>
                        handleNavClick('', item.children![0].route)
                      }
                      className={cn(
                        'flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
                        isAnyChildActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.title}</p>
                    <div className="mt-1 space-y-0.5">
                      {item.children.map((c) => (
                        <button
                          key={c.route}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavClick('', c.route);
                          }}
                          className="block text-xs text-muted-foreground hover:text-foreground w-full text-left px-1"
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            // Expanded sidebar: collapsible group
            return (
              <div key={item.title}>
                {/* Parent button */}
                <button
                  onClick={() => toggleGroup(item.title)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
                    isAnyChildActive
                      ? 'text-primary'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">{item.title}</span>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      isOpen && 'rotate-90'
                    )}
                  />
                </button>

                {/* Children */}
                {isOpen && (
                  <div className="ml-4 pl-3 border-l mt-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = pathname === child.route;
                      return (
                        <button
                          key={child.route}
                          onClick={() => handleNavClick('', child.route)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
                            isChildActive
                              ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                              : 'hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <ChildIcon className="h-4 w-4 shrink-0" />
                          <span>{child.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Regular item ───────────────────────────────────────────────────
          const isActive = item.route
            ? pathname === item.route
            : pathname === '/' && item.tab;

          const button = (
            <button
              key={item.title}
              onClick={() => handleNavClick(item.tab || '', item.route)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                  : 'hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            'fixed left-0 top-0 h-screen border-r bg-background flex flex-col z-30',
            props.collapsed ? 'w-16' : 'w-64'
          )}
        >
          <div className="flex h-16 items-center border-b px-4">
            {!props.collapsed && (
              <h2 className="text-lg font-semibold">Quản lý Cá nhân</h2>
            )}
          </div>
        </div>
      }
    >
      <SidebarContent {...props} />
    </Suspense>
  );
}
