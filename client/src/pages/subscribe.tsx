import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, MessageSquare, TrendingUp, Clock } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/dashboard?upgraded=true",
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to Imisi Premium!",
        description: "Your subscription is now active. Enjoy unlimited AI assistance!",
      });
    }
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        disabled={!stripe || !elements || isLoading}
      >
        {isLoading ? "Processing..." : "Subscribe to Imisi Premium"}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Create subscription as soon as the page loads
    fetch("/api/create-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to create subscription");
        }
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        toast({
          title: "Subscription Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      });
  }, [toast]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            AI Concierge Service
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to Imisi Premium
          </h1>
          <p className="text-xl text-gray-600">
            Unlock unlimited AI assistance for your financial and immigration journey
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Features Card */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-600" />
                Premium Features
              </CardTitle>
              <CardDescription>
                Everything you need for comprehensive financial and immigration guidance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Unlimited AI Conversations</h4>
                  <p className="text-sm text-gray-600">No daily limits on questions or responses</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Detailed Financial Analysis</h4>
                  <p className="text-sm text-gray-600">Comprehensive budgeting and investment strategies</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Personalized Immigration Guidance</h4>
                  <p className="text-sm text-gray-600">Step-by-step visa and documentation assistance</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Priority Support</h4>
                  <p className="text-sm text-gray-600">Faster response times and priority assistance</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">$29.99</div>
                  <div className="text-sm text-gray-600">per month</div>
                  <div className="text-xs text-gray-500 mt-1">Cancel anytime</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Subscribe Now</CardTitle>
              <CardDescription>
                Start your premium AI concierge experience today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm />
              </Elements>
            </CardContent>
          </Card>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>🔒 Secure payment processing by Stripe</p>
          <p>✨ Cancel anytime • 💳 All major cards accepted</p>
        </div>
      </div>
    </div>
  );
}