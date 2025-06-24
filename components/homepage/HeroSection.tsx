import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, Users, Shield } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white py-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Simplify Your 
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  {" "}Migration Journey
                </span>
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                Transform your global immigration experience with AI-powered guidance, 
                financial planning, and expert community support.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8">
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-8 pt-8">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-400" />
                <span className="text-sm">50K+ Users</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-yellow-400" />
                <span className="text-sm">180+ Countries</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-400" />
                <span className="text-sm">Secure & Trusted</span>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Preview */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Imisi AI Assistant</h3>
                    <p className="text-sm text-blue-100">Your personal migration concierge</p>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 space-y-3">
                  <div className="text-sm">
                    <strong>Assessment Complete!</strong>
                  </div>
                  <div className="text-sm text-blue-100">
                    Based on your profile, you have a 89% match for Express Entry to Canada. 
                    Estimated timeline: 8-12 months.
                  </div>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                    View Full Report
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  );
}