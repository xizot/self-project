'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckSquare,
  StickyNote,
  FolderKanban,
  Settings,
  Tag,
  Key,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onNavClick?: () => void;
}

const navItems = [
  {
    title: 'Công việc',
    icon: CheckSquare,
    tab: 'todos',
    route: undefined,
  },
  {
    title: 'Ghi chú',
    icon: StickyNote,
    tab: undefined,
    route: '/notes',
  },
  {
    title: 'Projects',
    icon: FolderKanban,
    tab: undefined,
    route: '/projects',
  },
  {
    title: 'Trạng thái',
    icon: Settings,
    tab: undefined,
    route: '/statuses',
  },
  {
    title: 'Danh mục',
    icon: Tag,
    tab: undefined,
    route: '/categories',
  },
  {
    title: 'Mật khẩu',
    icon: Key,
    tab: undefined,
    route: '/passwords',
  },
];

function SidebarContent({ collapsed, onNavClick }: SidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentTab =
    searchParams.get('tab') || (pathname === '/' ? 'todos' : '');

  const handleNavClick = (tab: string, route?: string) => {
    if (route) {
      router.push(route);
    } else {
      router.push(`/?tab=${tab}`, { scroll: false });
    }
    onNavClick?.();
  };

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen border-r bg-background transition-all duration-300 flex flex-col z-30',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed && (
          <h2 className="text-lg font-semibold truncate">Quản lý Cá nhân</h2>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          // For items with route, check if pathname matches
          // For items with tab, check if we're on home page (any tab means active)
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
