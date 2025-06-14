import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Sparkles, Zap, Shield, TrendingUp } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: 'if_required'
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Confirm subscription on backend
      try {
        await apiRequest("POST", "/api/confirm-subscription", {
          paymentIntentId: paymentIntent.id
        });
        
        toast({
          title: "Welcome to Imisi Premium!",
          description: "Your subscription is now active. Enjoy unlimited AI responses!",
        });
        
        onSuccess();
      } catch (confirmError) {
        toast({
          title: "Payment Successful",
          description: "Please refresh the page to activate your premium features.",
        });
      }
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        size="lg"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing Payment...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Subscribe to Imisi Premium - $9.99/month
          </div>
        )}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const initializePayment = async () => {
      try {
        // Check if already subscribed
        const statusRes = await apiRequest("GET", "/api/subscription-status");
        const statusData = await statusRes.json();
        
        if (statusData.hasActiveSubscription) {
          setSubscribed(true);
          setLoading(false);
          return;
        }

        // Create payment intent
        const res = await apiRequest("POST", "/api/create-subscription");
        const data = await res.json();
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error("Failed to initialize payment");
        }
      } catch (error: any) {
        console.error("Payment initialization error:", error);
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializePayment();
    }
  }, [user, toast]);

  const handleSuccess = () => {
    setSubscribed(true);
    setTimeout(() => {
      setLocation("/dashboard");
    }, 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to subscribe to Imisi Premium</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Initializing payment...</p>
        </div>
      </div>
    );
  }

  if (subscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">You're Already Premium!</CardTitle>
            <CardDescription>
              Enjoy unlimited AI responses and advanced financial guidance
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600">
            <Sparkles className="w-3 h-3 mr-1" />
            Upgrade to Premium
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Unlock Imisi Premium
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get unlimited AI responses, advanced financial insights, and personalized guidance for your financial journey.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Features */}
          <Card className="lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Premium Features
              </CardTitle>
              <CardDescription>
                Everything you need for advanced financial management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">Unlimited AI Responses</h3>
                  <p className="text-sm text-gray-600">No more word limits - get detailed, comprehensive answers</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">Advanced Financial Analysis</h3>
                  <p className="text-sm text-gray-600">Deep insights into spending patterns and investment opportunities</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">Personalized Immigration Guidance</h3>
                  <p className="text-sm text-gray-600">Tailored advice for Nigerian immigrants moving to Canada</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">Priority Support</h3>
                  <p className="text-sm text-gray-600">Faster response times and priority access during high demand</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Subscription</CardTitle>
              <CardDescription>
                Secure payment powered by Stripe. Cancel anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SubscribeForm onSuccess={handleSuccess} />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Unable to initialize payment. Please try again.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-xs text-gray-500 text-center">
              <p>
                By subscribing, you agree to our terms of service. You can cancel your subscription at any time.
                All payments are processed securely through Stripe.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};