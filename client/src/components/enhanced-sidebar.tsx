import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  Home, 
  TrendingUp, 
  ArrowLeftRight, 
  Wallet, 
  Settings, 
  LogOut,
  MessageCircle,
  Users,
  CreditCard,
  Briefcase,
  Building,
  Package,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  DollarSign,
  User,
  Shield
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import cushLogo from "@assets/Logo + Typeface_PNG (4)_1749870664804.png";

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  items: Array<{
    icon: any;
    label: string;
    href: string;
    disabled?: boolean;
    badge?: string;
  }>;
}

const navigationGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Home,
    items: [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
      { icon: TrendingUp, label: "Analytics", href: "/analytics" },
    ]
  },
  {
    id: "financial",
    label: "Financial Services",
    icon: DollarSign,
    items: [
      { icon: CreditCard, label: "Virtual Wallet", href: "#", disabled: true, badge: "Coming Soon" },
      { icon: Wallet, label: "Accounts", href: "/accounts" },
      { icon: ArrowLeftRight, label: "Transactions", href: "/transactions" },
      { icon: CreditCard, label: "Loans", href: "/loans" },
    ]
  },
  {
    id: "services",
    label: "Immigration Services",
    icon: Briefcase,
    items: [
      { icon: Briefcase, label: "Jobs", href: "/jobs" },
      { icon: Building, label: "Housing", href: "/housing" },
      { icon: MessageCircle, label: "Imisi 2.0 AI", href: "/imisi", badge: "AI" },
    ]
  },
  {
    id: "community",
    label: "Community & Tools",
    icon: Users,
    items: [
      { icon: Users, label: "Community", href: "/community" },
      { icon: Package, label: "Widget Store", href: "/widget-marketplace", badge: "New" },
    ]
  },
  {
    id: "account",
    label: "Account & Support",
    icon: User,
    items: [
      { icon: Settings, label: "Settings", href: "/settings" },
    ]
  }
];

export function EnhancedSidebar() {
  const [location, navigate] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["overview", "financial", "services", "community"]);

  const { data: currentUser } = useQuery<{ id: number; role: string; email: string }>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      navigate("/");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isGroupExpanded = (groupId: string) => expandedGroups.includes(groupId);

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <img 
            src={cushLogo} 
            alt="Cush Logo" 
            className="h-8 w-auto"
          />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-white/10 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Navigation Groups */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationGroups.map((group) => {
          const GroupIcon = group.icon;
          const isExpanded = isGroupExpanded(group.id);
          const hasActiveItems = group.items.some(item => location === item.href);
          
          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200",
                  hasActiveItems
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center">
                  <GroupIcon className="w-4 h-4 mr-3" />
                  <span className="font-medium text-sm">{group.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="pl-7 space-y-1">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = location === item.href;
                    
                    if (item.disabled) {
                      return (
                        <div
                          key={item.href}
                          className="flex items-center justify-between py-2 px-3 rounded-md text-white/40 cursor-not-allowed"
                        >
                          <div className="flex items-center">
                            <ItemIcon className="w-4 h-4 mr-3" />
                            <span className="text-sm">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-white/20 text-white/60 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center justify-between py-2 px-3 rounded-md transition-all duration-200 cursor-pointer",
                            isActive
                              ? "bg-white/20 text-white shadow-lg ring-1 ring-white/20"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          )}
                          onClick={() => setIsMobileOpen(false)}
                        >
                          <div className="flex items-center">
                            <ItemIcon className="w-4 h-4 mr-3" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className={cn(
                              "px-2 py-0.5 text-xs rounded-full font-medium",
                              item.badge === "AI" 
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                : item.badge === "New"
                                ? "bg-green-500/80 text-white"
                                : "bg-white/20 text-white/80"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Admin Section */}
        {currentUser?.role === "admin" && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="space-y-1">
              <div className="flex items-center py-2 px-3 text-white/60 text-xs uppercase tracking-wide font-semibold">
                <Shield className="w-4 h-4 mr-3" />
                Admin Tools
              </div>
              <Link href="/admin">
                <div 
                  className={cn(
                    "flex items-center py-2 px-3 ml-7 rounded-md transition-all duration-200 cursor-pointer",
                    location === "/admin"
                      ? "bg-white/20 text-white shadow-lg ring-1 ring-white/20"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Shield className="w-4 h-4 mr-3" />
                  <span className="text-sm font-medium">Admin Panel</span>
                </div>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-white/10">
        <Button
          onClick={handleLogout}
          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300"
          variant="outline"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed left-0 top-0 h-screen w-64 flex flex-col backdrop-blur-sm shadow-xl border-r border-white/20 z-40 transition-transform duration-300",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 25%, #8b5cf6 50%, #1e40af 75%, #3730a3 100%)',
          backgroundSize: '300% 300%',
          animation: 'sidebar-gradient 12s ease infinite'
        }}
      >
        <SidebarContent />
      </div>
    </>
  );
}