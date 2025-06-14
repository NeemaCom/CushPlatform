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
import { Shield, CheckCircle } from "lucide-react";
import heroImage from "@assets/lady smiling_1749866663341.jpg";

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
                src="/attached_assets/Logo + Typeface_PNG (4)_1749870664804.png" 
                alt="Cush Logo" 
                className="h-8 w-auto"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600">Let's get you started with your financial journey</p>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Create a strong password"
                        className="h-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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