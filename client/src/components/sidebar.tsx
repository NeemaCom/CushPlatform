import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Home, 
  BarChart3, 
  ArrowLeftRight, 
  Wallet, 
  Settings, 
  LogOut 
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const sidebarItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: ArrowLeftRight, label: "Transactions", href: "/transactions" },
  { icon: Wallet, label: "Accounts", href: "/accounts" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const [location, navigate] = useLocation();

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
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3"></div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Cush</span>
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
                      ? "bg-cush-blue-50 text-cush-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
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
