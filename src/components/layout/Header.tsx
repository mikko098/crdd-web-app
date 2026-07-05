import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ROADVISION_LOGO_SRC } from '@/assets/brand';
import { 
  LogOut, 
  User, 
  Settings, 
  Menu,
  Users
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManageUsers = hasPermission(user, 'users:manage');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="h-16 border-b border-border bg-card/95 px-4 flex items-center justify-between sticky top-0 z-50 shadow-sm backdrop-blur">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden">
          <Menu className="w-5 h-5 text-primary" />
        </Button>
        
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 rounded-lg text-left transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          <img
            src={ROADVISION_LOGO_SRC}
            alt="RoadVision AI temporary logo"
            className="h-10 w-10 rounded-lg object-contain dark:brightness-0 dark:invert"
          />
          <div className="hidden sm:block">
            <h1 className="font-semibold text-foreground">RoadVision AI</h1>
            <p className="text-xs text-muted-foreground">Damage Detection System</p>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Badge variant="outline" className="hidden border-primary/40 bg-primary/10 text-foreground sm:flex">
          {user?.role === 'manager' ? 'Manager' : 'User'}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-foreground text-primary">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 z-[100] bg-popover" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-primary" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-primary" />
              <span>Settings</span>
            </DropdownMenuItem>
            {canManageUsers && (
              <DropdownMenuItem onClick={() => navigate('/users')} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4 text-primary" />
                <span>User Access</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive dark:text-red-300 dark:focus:text-red-200 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4 text-destructive dark:text-red-300" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
