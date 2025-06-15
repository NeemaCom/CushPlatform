import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Home, 
  BarChart3, 
  ArrowLeftRight, 
  Wallet, 
  Settings, 
  LogOut,
  Crown,
  MessageCircle,
  Users
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import cushLogo from "@assets/Logo + Typeface_PNG (4)_1749870664804.png";

const sidebarItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: MessageCircle, label: "Imisi 2.0", href: "/imisi" },
  { icon: Users, label: "Community", href: "/community" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: ArrowLeftRight, label: "Transactions", href: "/transactions" },
  { icon: Wallet, label: "Accounts", href: "/accounts" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const [location, navigate] = useLocation();

  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; status: string }>({
    queryKey: ["/api/subscription-status"],
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

  return (
    <div className="w-64 bg-white/95 backdrop-blur-sm shadow-sm h-screen fixed left-0 top-0 border-r border-blue-100">
      <div className="p-6">
        <div className="flex items-center">
          <img 
            src={cushLogo} 
            alt="Cush Logo" 
            className="h-8 w-auto"
          />
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-6">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center py-3 px-4 rounded-lg mb-2 transition-colors cursor-pointer",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="ml-3 font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <div className="absolute bottom-6 left-6 right-6">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:bg-gray-50"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="w-5 h-5" />
          <span className="ml-3">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
