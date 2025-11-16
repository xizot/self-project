'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  LogOut,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';

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
  const router = useRouter();
  const [user, setUser] = useState<{
    email: string;
    name: string | null;
  } | null>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      await fetchUser();
    };
    loadUser();
  }, []);

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
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelRight className="h-5 w-5" />
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

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name
                        ? user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        : user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    {user.name && (
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                    )}
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
