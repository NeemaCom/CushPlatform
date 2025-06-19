import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "./queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
