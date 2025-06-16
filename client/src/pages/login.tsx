import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, type LoginForm as LoginFormType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, CheckCircle, Sparkles } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import heroImage from "@assets/guy smiling2_1749866663339.jpg";
import cushLogo from "@assets/Logo + Typeface_PNG (4)_1749870664804.png";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<LoginFormType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormType) => {
      const response = await apiRequest("POST", "/api/auth/signin", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: (userData) => {
      setShowSuccess(true);
      
      // Enhanced success toast with user details
      toast({
        title: `Welcome back, ${userData.username}!`,
        description: "Successfully signed in to your account. Redirecting to your dashboard...",
        duration: 3000,
      });

      // Add a slight delay for better UX before navigation
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Sign In Failed",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormType) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-green-200/50 animate-in fade-in-0 zoom-in-95 duration-500">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-600 animate-pulse" />
                <div className="absolute inset-0 h-16 w-16 bg-green-400/20 rounded-full animate-ping"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome Back!</h3>
                <p className="text-gray-600">Taking you to your dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <img 
          src={heroImage} 
          alt="Happy user with financial app"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl mb-6 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-lg"></div>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Welcome Back to Cush</h1>
          <p className="text-xl text-center opacity-90">Your financial journey continues here</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <img 
                src={cushLogo} 
                alt="Cush Logo" 
                className="h-8 w-auto transition-transform hover:scale-105"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">Sign In</h2>
            <p className="text-gray-600 animate-in fade-in-50 slide-in-from-bottom-4 duration-700 delay-100">Welcome back! Please enter your details.</p>
          </div>

          {/* Gmail Sign In Option */}
          <div className="mb-6">
            <div className="relative group gmail-float">
              <Button
                type="button"
                variant="outline"
                disabled={isGoogleLoading}
                className="w-full h-16 border-2 border-gray-200 hover:border-transparent bg-white hover:bg-gradient-to-r hover:from-white hover:via-red-50 hover:to-blue-50 transition-all duration-500 ease-out flex items-center justify-center gap-4 shadow-lg hover:shadow-xl gmail-glow transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden relative"
                onClick={() => {
                  setIsGoogleLoading(true);
                  toast({
                    title: "Google OAuth Setup Required",
                    description: "Google login is temporarily unavailable. Please use email login below.",
                    variant: "destructive",
                  });
                  setIsGoogleLoading(false);
                }}
              >
                {/* Animated rainbow background */}
                <div className="absolute inset-0 gmail-rainbow opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 gmail-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100"></div>
                
                <div className="relative flex items-center gap-4 z-10">
                  <div className="relative">
                    {isGoogleLoading ? (
                      <div className="relative">
                        <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
                        <div className="absolute inset-0 w-7 h-7 bg-red-500 rounded-full opacity-20 animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="relative">
                        <SiGoogle className="w-7 h-7 text-red-500 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                        <div className="absolute inset-0 w-7 h-7 bg-red-500 opacity-0 group-hover:opacity-15" style={{
                          clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
                          animation: 'bubble-pulse 2s ease-in-out infinite'
                        }}></div>
                        <div className="absolute -inset-1 w-9 h-9 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-0 group-hover:opacity-8 animate-pulse rounded-lg blur-sm"></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg text-gray-800 group-hover:text-gray-900 transition-colors duration-200">
                      {isGoogleLoading ? "Connecting..." : "Sign in with Google"}
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                      Quick & secure access
                    </span>
                  </div>
                  
                  {!isGoogleLoading && (
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
                      <div className="relative">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-blue-500 rounded-full opacity-0 group-hover:opacity-20 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </div>
              </Button>
              
              {/* Enhanced floating particles effect */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute top-2 left-4 w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce delay-75 shadow-sm"></div>
                <div className="absolute top-4 right-8 w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-150 shadow-sm"></div>
                <div className="absolute bottom-3 left-8 w-1 h-1 bg-green-400 rounded-full animate-bounce delay-300 shadow-sm"></div>
                <div className="absolute top-6 right-4 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-pulse delay-500"></div>
              </div>
            </div>
            
            <div className="flex items-center my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <div className="relative px-6">
                <div className="relative bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                  <span className="text-sm text-gray-500 font-medium">or sign in with email</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-blue-50 rounded-full opacity-0 hover:opacity-50 transition-opacity duration-300"></div>
                </div>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your username or email"
                        className="h-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="h-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    className="focus:ring-blue-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600">
                    Remember me
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-blue-600 hover:text-blue-700 p-0"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </Button>
              </div>

              <Button
                type="submit"
                className={`w-full font-medium py-3 h-12 transition-all duration-300 ${
                  showSuccess 
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" 
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                } text-white transform hover:scale-[1.02] active:scale-[0.98]`}
                disabled={loginMutation.isPending || showSuccess}
              >
                <div className="flex items-center justify-center space-x-2">
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : showSuccess ? (
                    <>
                      <CheckCircle className="h-5 w-5 animate-pulse" />
                      <span>Success! Redirecting...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </div>
              </Button>
            </form>
          </Form>

          <div className="text-center mt-6">
            <span className="text-gray-600">Don't have an account? </span>
            <Button
              variant="link"
              className="text-blue-600 hover:text-blue-700 font-medium p-0"
              onClick={() => navigate("/register")}
            >
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}