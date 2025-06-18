"use client"

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, type LoginForm as LoginFormType } from "@/shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, CheckCircle, Sparkles } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
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
      const response = await apiRequest("POST", "/api/auth/login", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      return response.json();
    },
    onSuccess: (userData) => {
      setShowSuccess(true);
      
      toast({
        title: `Welcome back, ${userData.username}!`,
        description: "Successfully signed in to your account. Redirecting to your dashboard...",
        duration: 3000,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message || "Please check your credentials and try again.",
        duration: 5000,
      });
    },
  });

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  const onSubmit = (data: LoginFormType) => {
    loginMutation.mutate(data);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="text-center space-y-6 p-8">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back!</h2>
          <p className="text-gray-600 dark:text-gray-300">Redirecting to your dashboard...</p>
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <Image
              src="/attached_assets/Logo + Typeface_PNG (4)_1749870664804.png"
              alt="Cush Logo"
              width={200}
              height={60}
              className="mb-8"
            />
          </div>
          
          <h1 className="text-4xl font-bold mb-6">
            Welcome back to your financial journey
          </h1>
          
          <p className="text-xl mb-8 text-blue-100">
            Smart financial management with AI-powered insights for your global immigration goals.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <span>AI-powered financial insights</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>Secure loan referral system</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>Global job discovery platform</span>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-8 right-8">
          <Image
            src="/attached_assets/guy smiling2_1749866663339.jpg"
            alt="Happy user"
            width={300}
            height={300}
            className="rounded-lg shadow-2xl"
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Sign In</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Access your Cush financial dashboard
            </p>
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
                        type="text"
                        placeholder="Enter your username or email"
                        className="h-12"
                        autoComplete="username"
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
                          className="h-12 pr-12"
                          autoComplete="current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-12 px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
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
                    onCheckedChange={setRememberMe}
                  />
                  <Label htmlFor="remember" className="text-sm">
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={isGoogleLoading}
                onClick={handleGoogleLogin}
                className="w-full h-12 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SiGoogle className="mr-2 h-4 w-4" />
                )}
                Google
              </Button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}