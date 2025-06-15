import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { registerSchema, type RegisterForm as RegisterFormType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Shield, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import heroImage from "@assets/lady smiling_1749866663341.jpg";
import cushLogo from "@assets/Logo + Typeface_PNG (4)_1749870664804.png";

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("8+ characters");
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("uppercase letter");
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("lowercase letter");
    }
    
    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("number");
    }
    
    // Special character check - must contain at least one of: @ $ ! % * ? &
    const specialCharRegex = /[@$!%*?&]/;
    if (specialCharRegex.test(password)) {
      score += 1;
    } else {
      feedback.push("special character (@$!%*?&)");
    }
    
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
    
    // Debug logging for testing
    if (password) {
      console.log(`Password strength debug for "${password}":`, {
        length: password.length >= 8,
        lengthScore: password.length >= 8 ? 1 : 0,
        uppercase: /[A-Z]/.test(password),
        uppercaseScore: /[A-Z]/.test(password) ? 1 : 0,
        lowercase: /[a-z]/.test(password),
        lowercaseScore: /[a-z]/.test(password) ? 1 : 0,
        number: /\d/.test(password),
        numberScore: /\d/.test(password) ? 1 : 0,
        special: specialCharRegex.test(password),
        specialScore: specialCharRegex.test(password) ? 1 : 0,
        totalScore: score,
        expectedScore: 
          (password.length >= 8 ? 1 : 0) +
          (/[A-Z]/.test(password) ? 1 : 0) +
          (/[a-z]/.test(password) ? 1 : 0) +
          (/\d/.test(password) ? 1 : 0) +
          (specialCharRegex.test(password) ? 1 : 0),
        label: labels[score] || "Very Weak",
        feedback: feedback
      });
    }
    
    return {
      score,
      label: labels[score] || "Very Weak",
      color: colors[score] || "bg-red-500",
      feedback: feedback.length > 0 ? `Missing: ${feedback.join(", ")}` : "Password meets all requirements"
    };
  };

  const form = useForm<RegisterFormType>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      acceptTerms: false,
      acceptPrivacy: false,
      marketingConsent: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormType) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Cush!",
        description: "Your account has been created successfully.",
      });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      const errorMessage = error.details 
        ? error.details.join(", ")
        : error.message || "Registration failed";
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormType) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-500 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <img 
          src={heroImage} 
          alt="Happy professional using financial app"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl mb-6 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-lg"></div>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Start Your Financial Journey</h1>
          <p className="text-xl text-center opacity-90 mb-8">Join thousands managing their finances with Cush</p>
          
          <div className="space-y-3 text-left">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>Secure financial tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>AI-powered insights</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>Smart budgeting tools</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <img 
                src={cushLogo} 
                alt="Cush Logo" 
                className="h-8 w-auto"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600">Let's get you started with your financial journey</p>
          </div>

          {/* Gmail Sign Up Option */}
          <div className="mb-6">
            <div className="relative group gmail-float">
              <Button
                type="button"
                variant="outline"
                disabled={isGoogleLoading}
                className="w-full h-16 border-2 border-gray-200 hover:border-transparent bg-white hover:bg-gradient-to-r hover:from-white hover:via-red-50 hover:to-blue-50 transition-all duration-500 ease-out flex items-center justify-center gap-4 shadow-lg hover:shadow-xl gmail-glow transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden relative"
                onClick={() => {
                  setIsGoogleLoading(true);
                  window.location.href = "/api/auth/google";
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
                      {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                      Quick & secure sign up
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
                  <span className="text-sm text-gray-500 font-medium">or continue with email</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-blue-50 rounded-full opacity-0 hover:opacity-50 transition-opacity duration-300"></div>
                </div>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Daniel"
                          className="h-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ajibola"
                          className="h-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Choose a username"
                        className="h-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="johndoe@gmail.com"
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
                render={({ field }) => {
                  const passwordStrength = getPasswordStrength(field.value || "");
                  return (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
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
                      
                      {/* Password Strength Indicator */}
                      {field.value && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Password strength:</span>
                            <span className={`font-medium ${
                              passwordStrength.score >= 4 ? 'text-green-600' :
                              passwordStrength.score >= 3 ? 'text-blue-600' :
                              passwordStrength.score >= 2 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <div
                                key={index}
                                className={`h-2 flex-1 rounded-full transition-colors duration-200 ${
                                  index < passwordStrength.score
                                    ? passwordStrength.color
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {passwordStrength.feedback}
                          </p>
                        </div>
                      )}
                      
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />



              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 h-12"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </Form>

          <div className="text-center mt-6">
            <span className="text-gray-600">Already have an account? </span>
            <Button
              variant="link"
              className="text-blue-600 hover:text-blue-700 font-medium p-0"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Your data is protected with bank-level security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}