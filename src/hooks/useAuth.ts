import { useQuery } from "@tanstack/react-query";

import { API_BASE_URL } from "@/lib/api-base";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  nationality?: string | null;
  profilePicture?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
  marketingConsent?: boolean;
  mfaEnabled?: boolean;
}

export function useAuth({ enabled = true }: { enabled?: boolean } = {}) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    enabled,
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" });
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      return response.json();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}