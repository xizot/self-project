'use client';

import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export default function Header({
  onMenuClick,
  onToggleSidebar,
  sidebarCollapsed,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop toggle sidebar button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden md:flex"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>

        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Quản lý Cá nhân
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Quản lý công việc và dự án của bạn
          </p>
        </div>
      </div>
    </header>
  );
}
