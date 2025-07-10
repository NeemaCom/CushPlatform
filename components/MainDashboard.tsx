import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  CreditCard, 
  Wallet, 
  Users, 
  Bot, 
  MapPin, 
  Menu, 
  X,
  Bell,
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EnhancedDashboard } from './EnhancedDashboard';
import { LoansPage } from './pages/LoansPage';
import { PayPage } from './pages/PayPage';
import { CommunityPage } from './pages/CommunityPage';
import { ImisiPage } from './pages/ImisiPage';
import { LocalJobsPage } from './pages/LocalJobsPage';
import RailsrPay from '@/pages/RailsrPay';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'loans', label: 'Loans', icon: CreditCard, path: '/loans' },
  { id: 'pay', label: 'Pay', icon: Wallet, path: '/pay' },
  { id: 'railsr-pay', label: 'Railsr Pay', icon: Wallet, path: '/railsr-pay' },
  { id: 'community', label: 'Community', icon: Users, path: '/community', badge: 3 },
  { id: 'imisi', label: 'Imisi 2.0', icon: Bot, path: '/imisi' },
  { id: 'jobs', label: 'Local Jobs', icon: MapPin, path: '/jobs', badge: 12 },
];

export function MainDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    logout();
  };

  const renderPageContent = () => {
    switch (location) {
      case '/loans':
        return <LoansPage />;
      case '/pay':
        return <PayPage />;
      case '/railsr-pay':
        return <RailsrPay />;
      case '/community':
        return <CommunityPage />;
      case '/imisi':
        return <ImisiPage />;
      case '/jobs':
        return <LocalJobsPage />;
      default:
        return <EnhancedDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">Cush</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {sidebarItems.map((item) => {
              const isActive = location === item.path || (item.path === '/dashboard' && location === '/');
              const Icon = item.icon;
              
              return (
                <Link key={item.id} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start h-12 text-left font-normal",
                      isActive && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600"
                    )}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <Button variant="ghost" className="w-full justify-start h-10">
              <Settings className="h-4 w-4 mr-3" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Navigation Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={toggleSidebar}
              >
                <Menu className="h-6 w-6" />
              </Button>
              
              {/* Page Title */}
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {sidebarItems.find(item => location === item.path || (item.path === '/dashboard' && location === '/'))?.label || 'Dashboard'}
              </h1>
            </div>

            {/* Top Actions */}
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
              
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 min-h-[calc(100vh-73px)]">
          {renderPageContent()}
        </main>
      </div>
    </div>
  );
}