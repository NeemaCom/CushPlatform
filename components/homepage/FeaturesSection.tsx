import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  Calculator, 
  Users, 
  FileText, 
  MapPin, 
  CreditCard,
  Shield,
  Clock,
  Target
} from 'lucide-react';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlight: string;
}

const features: Feature[] = [
  {
    icon: Brain,
    title: "AI-Powered Guidance",
    description: "Get personalized immigration advice from Imisi, our AI concierge trained on the latest immigration policies and success stories.",
    highlight: "Imisi 2.0 AI Assistant"
  },
  {
    icon: Calculator,
    title: "Financial Planning",
    description: "Calculate immigration costs, plan your budget, and track expenses with integrated financial tools and real-time insights.",
    highlight: "Smart Budgeting Tools"
  },
  {
    icon: Users,
    title: "Expert Mentorship",
    description: "Connect with immigration experts and successful immigrants who can guide you through your specific journey.",
    highlight: "1-on-1 Mentor Matching"
  },
  {
    icon: FileText,
    title: "Document Management",
    description: "Organize, track, and verify all your immigration documents with our secure digital document management system.",
    highlight: "Secure Document Vault"
  },
  {
    icon: MapPin,
    title: "Local Job Discovery",
    description: "Find job opportunities in your target country with location-based job matching and employer connections.",
    highlight: "Job Matching Algorithm"
  },
  {
    icon: CreditCard,
    title: "Loan Referrals",
    description: "Access immigration loans and financing options through our trusted partner network to fund your journey.",
    highlight: "Pre-approved Loans"
  },
  {
    icon: Shield,
    title: "Legal Compliance",
    description: "Stay compliant with changing immigration laws through automated updates and legal requirement tracking.",
    highlight: "Real-time Legal Updates"
  },
  {
    icon: Clock,
    title: "Timeline Tracking",
    description: "Monitor your application progress with milestone tracking and predicted timeline estimates.",
    highlight: "Smart Timeline Predictions"
  },
  {
    icon: Target,
    title: "Success Analytics",
    description: "Track your progress with detailed analytics and personalized recommendations to improve your success rate.",
    highlight: "Success Rate Optimization"
  }
];

export function FeaturesSection() {
  return (
    <section className="py-16 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need for Immigration Success
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            From AI-powered guidance to financial planning, we provide comprehensive tools and support 
            for every step of your immigration journey
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                  {feature.description}
                </p>
                <div className="inline-flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {feature.highlight}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Experience All These Features?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join thousands of successful immigrants who used Cush to achieve their dreams. 
              Start your journey today with our comprehensive platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3 px-8 rounded-lg transition-colors">
                Start Free Trial
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-3 px-8 rounded-lg transition-colors">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}