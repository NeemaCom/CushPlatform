import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Extend window interface for Firebase
declare global {
  interface Window {
    firebaseAuth?: any;
  }
}
import { 
  Home, 
  BarChart3, 
  ArrowLeftRight, 
  Wallet, 
  Settings, 
  LogOut,
  Crown,
  MessageCircle,
  Users,
  CreditCard,
  Briefcase,
  Building,
  CreditCard as VirtualWallet,
  Shield,
  Trophy
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import cushLogo from "@assets/Logo + Typeface_PNG (4)_1749870664804.png";

const sidebarItems = [
  { icon: VirtualWallet, label: "Virtual Wallet", href: "#", disabled: true },
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: MessageCircle, label: "Imisi 2.0", href: "/imisi" },
  { icon: Trophy, label: "Achievements", href: "/achievements" },
  { icon: Users, label: "Community", href: "/community" },
  { icon: CreditCard, label: "Loans", href: "/loans" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: Building, label: "Housing", href: "/housing" },
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

  // Fetch current user to check if they're an admin
  const { data: currentUser } = useQuery<{ id: number; role: string; email: string }>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch user profile for avatar display
  const { data: userProfile } = useQuery<{ 
    id: number; 
    firstName: string; 
    lastName: string; 
    email: string; 
    profilePicture?: string; 
    role: string; 
  }>({
    queryKey: ["/api/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Clear Firebase authentication first
        if (window.firebaseAuth) {
          try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(window.firebaseAuth);
          } catch (firebaseError) {
            console.error('Firebase logout error:', firebaseError);
          }
        }
        
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all cookies
        if (typeof window !== 'undefined') {
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
        }
        
        // Call backend logout endpoint
        const response = await apiRequest("POST", "/api/auth/logout");
        
        return response;
      } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, clear local state
        localStorage.clear();
        sessionStorage.clear();
        throw error;
      }
    },
    onSuccess: () => {
      // Force redirect to homepage
      window.location.href = '/';
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // Force redirect even on error
      window.location.href = '/';
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div 
      className="w-64 h-screen fixed left-0 top-0 backdrop-blur-sm shadow-xl border-r border-white/20"
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 25%, #8b5cf6 50%, #1e40af 75%, #3730a3 100%)',
        backgroundSize: '300% 300%',
        animation: 'sidebar-gradient 12s ease infinite'
      }}
    >
      <div className="p-6">
        <div className="flex items-center">
          <img 
            src={cushLogo} 
            alt="Cush Logo" 
            className="h-8 w-auto"
          />
        </div>
      </div>

      {/* User Profile Section */}
      {userProfile && (
        <div className="px-6 py-4 mb-6 bg-white/10 backdrop-blur-sm rounded-lg mx-6 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              {userProfile.profilePicture ? (
                <img 
                  src={userProfile.profilePicture} 
                  alt={`${userProfile.firstName} ${userProfile.lastName}`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                  <span className="text-white font-semibold text-lg">
                    {userProfile.firstName?.[0]}{userProfile.lastName?.[0]}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm truncate">
                {userProfile.firstName} {userProfile.lastName}
              </h3>
              <p className="text-white/70 text-xs truncate">
                {userProfile.email}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="mt-6">
        <div className="px-6">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className={cn(
                    "flex items-center py-3 px-4 rounded-lg mb-2 transition-all duration-300 backdrop-blur-sm",
                    "text-white/50 cursor-default opacity-60"
                  )}
                  onClick={(e) => e.preventDefault()}
                >
                  <Icon className="w-5 h-5" />
                  <span className="ml-3 font-medium">{item.label}</span>
                </div>
              );
            }
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center py-3 px-4 rounded-lg mb-2 transition-all duration-300 cursor-pointer backdrop-blur-sm",
                    isActive
                      ? "bg-white/20 text-white border-r-4 border-white/60 shadow-lg transform scale-105"
                      : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md hover:transform hover:scale-102"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="ml-3 font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}

          {/* Admin Link - Only show for admin users */}
          {currentUser?.role === 'admin' && (
            <Link href="/admin">
              <div
                className={cn(
                  "flex items-center py-3 px-4 rounded-lg mb-2 transition-all duration-300 cursor-pointer backdrop-blur-sm",
                  location === "/admin"
                    ? "bg-white/20 text-white border-r-4 border-white/60 shadow-lg transform scale-105"
                    : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md hover:transform hover:scale-102"
                )}
              >
                <Shield className="w-5 h-5" />
                <span className="ml-3 font-medium">Admin</span>
              </div>
            </Link>
          )}
        </div>
      </nav>
      
      <div className="absolute bottom-6 left-6 right-6">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300 backdrop-blur-sm"
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
