import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, Shield, Smartphone, ChevronRight } from "lucide-react";
import cushLogo from "@assets/Logo + Typeface_PNG (4)_1749870664804.png";

export default function Homepage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src={cushLogo} 
                  alt="Cush Logo" 
                  className="h-8 w-auto mr-3"
                />
              </div>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <a href="#features" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">Services</a>
                  <Link href="/community" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Community
                  </Link>
                  <a href="#stats" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">About</a>
                  <a href="#" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">Success Stories</a>
                  <a href="#" className="text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium">Contact</a>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium">
                  Start Your Journey
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Financial Solutions for{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Expatriates & Digital Nomads</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                Seamlessly manage your finances across borders with multi-currency wallets, virtual cards, and expert financial guidance designed for location-independent professionals.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg">
                    Get Started Free
                  </Button>
                </Link>
                <Button variant="outline" className="border-blue-300 hover:border-blue-400 text-blue-600 px-8 py-3 text-lg">
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              {/* Financial dashboard preview */}
              <Card className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Account Overview</h3>
                  <span className="text-sm text-gray-500">Last updated: Today</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-cush-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-cush-blue-600 font-medium">Total Balance</p>
                    <p className="text-2xl font-bold text-cush-blue-800">£1,320.00</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Monthly Growth</p>
                    <p className="text-2xl font-bold text-green-800">+£25.20</p>
                  </div>
                </div>
                <div className="h-32 bg-gradient-to-r from-cush-blue-100 to-cush-blue-50 rounded-lg flex items-end p-4">
                  <div className="flex items-end space-x-2 w-full">
                    <div className="bg-cush-blue-600 h-8 w-4 rounded-t"></div>
                    <div className="bg-cush-blue-500 h-12 w-4 rounded-t"></div>
                    <div className="bg-cush-blue-600 h-16 w-4 rounded-t"></div>
                    <div className="bg-cush-blue-700 h-20 w-4 rounded-t"></div>
                    <div className="bg-cush-blue-600 h-14 w-4 rounded-t"></div>
                    <div className="bg-cush-blue-500 h-10 w-4 rounded-t"></div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Powerful Features for Modern Finance</h2>
            <p className="mt-4 text-xl text-gray-600">Everything you need to manage your financial life effectively</p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-cush-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="text-cush-blue-600 w-8 h-8" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Smart Analytics</h3>
              <p className="mt-4 text-gray-600">Get intelligent insights into your spending patterns and financial trends with advanced analytics.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-cush-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Shield className="text-cush-blue-600 w-8 h-8" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Bank-Level Security</h3>
              <p className="mt-4 text-gray-600">Your data is protected with enterprise-grade security and encryption protocols.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-cush-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="text-cush-blue-600 w-8 h-8" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Mobile Ready</h3>
              <p className="mt-4 text-gray-600">Access your finances anywhere with our responsive design and mobile optimization.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div id="stats" className="py-20 bg-cush-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">10K+</div>
              <div className="text-cush-blue-100 mt-2">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">£50M+</div>
              <div className="text-cush-blue-100 mt-2">Managed Assets</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">99.9%</div>
              <div className="text-cush-blue-100 mt-2">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">24/7</div>
              <div className="text-cush-blue-100 mt-2">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Mentors Carousel */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Meet Our Global Mentors
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with experienced professionals who've successfully navigated cross-border relocations and financial transitions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  SA
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Sarah Anderson</h3>
                  <p className="text-blue-600 font-medium">UK → Canada Migration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">Investment banker who relocated to Toronto. Specializes in international banking transitions and tax optimization.</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Banking</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-2">Tax Planning</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  RP
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Raj Patel</h3>
                  <p className="text-purple-600 font-medium">India → USA Migration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">Tech entrepreneur who built a fintech startup after relocating. Expert in H-1B visa financial planning.</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Startups</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">Visa Finance</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  MJ
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Maria Jose</h3>
                  <p className="text-blue-600 font-medium">Brazil → Germany Migration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">Healthcare professional specializing in EU migration processes and international insurance transfers.</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Healthcare</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-2">EU Migration</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  DL
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">David Liu</h3>
                  <p className="text-purple-600 font-medium">China → Australia Migration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">Financial advisor with expertise in Asia-Pacific relocations and international investment portfolios.</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Investments</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">APAC</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  AK
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Amara Kone</h3>
                  <p className="text-blue-600 font-medium">Nigeria → France Migration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">Legal-tech consultant specializing in African diaspora financial services and remittance optimization.</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Legal-Tech</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-2">Remittance</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  LT
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Luis Torres</h3>
                  <p className="text-purple-600 font-medium">Mexico → Spain Migration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">Real estate investor with deep knowledge of property acquisition and mortgage processes across borders.</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Real Estate</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">Mortgages</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Success Stories
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Real experiences from people who've transformed their financial journey with Cush
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  E
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Elena Rodriguez</h4>
                  <p className="text-gray-600 text-sm">Software Engineer, Toronto</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "Cush made my transition from Spain to Canada seamless. The AI advisor helped me understand the tax implications before I even landed, and I had my Canadian bank account set up within days."
              </p>
              <div className="flex items-center text-yellow-500">
                <span>★★★★★</span>
                <span className="text-gray-600 text-sm ml-2">5.0</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-purple-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  K
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Kwame Asante</h4>
                  <p className="text-gray-600 text-sm">Medical Resident, London</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "The mentorship program connected me with someone who went through the exact same journey. Having that guidance while setting up my UK finances was invaluable."
              </p>
              <div className="flex items-center text-yellow-500">
                <span>★★★★★</span>
                <span className="text-gray-600 text-sm ml-2">5.0</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  P
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Priya Sharma</h4>
                  <p className="text-gray-600 text-sm">Startup Founder, Berlin</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "From visa documentation to business banking, Cush streamlined everything. I saved months of research and avoided costly mistakes in my Germany setup."
              </p>
              <div className="flex items-center text-yellow-500">
                <span>★★★★★</span>
                <span className="text-gray-600 text-sm ml-2">5.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Migration Journey?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands who have successfully relocated with expert financial guidance.</p>
          <Link href="/register">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold">
              Start Your Journey Today
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <img 
                  src={cushLogo} 
                  alt="Cush Logo" 
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-gray-400 mb-4">
                Migration-focused financial technology platform helping individuals navigate cross-border relocation.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <span className="text-xs">f</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors cursor-pointer">
                  <span className="text-xs">t</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer">
                  <span className="text-xs">in</span>
                </div>
              </div>
            </div>

            {/* Products Column */}
            <div>
              <h3 className="text-white font-semibold mb-4">Products</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Virtual Wallet</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">International Cards</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Loan Referrals</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">AI Financial Advisor</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Migration Tools</a></li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Global Mentors</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Contact Us</a></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Use</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Service Agreements</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Compliance</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Regulatory</a></li>
              </ul>
            </div>
          </div>

          {/* Legal Disclaimers */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="space-y-4 text-sm text-gray-400">
              <p>
                <strong className="text-gray-300">About Cush:</strong> Cush is a migration-focused financial technology platform helping individuals navigate cross-border relocation with access to financial services, documentation support, and advisory tools. We operate in partnership with licensed financial institutions, money transmitters, and technology providers in their respective jurisdictions. All trademarks, logos, and brand names are the property of their respective owners and are used strictly for identification purposes. Use of such names, trademarks, and brands does not imply endorsement.
              </p>
              
              <p>
                <strong className="text-gray-300">Financial Services:</strong> Virtual wallet and card services are provided through our partnerships with licensed financial institutions and fintech partners, operating under applicable Visa and Mastercard licensing agreements. All associated brand elements are the intellectual property of their respective trademark holders.
              </p>
              
              <p>
                <strong className="text-gray-300">Loan Services:</strong> Loan referral services are offered in compliance with relevant financial regulations through approved lending partners and licensed institutions. Cush does not directly issue loans but facilitates secure and responsible access to credit through qualified third-party providers.
              </p>
              
              <p>
                <strong className="text-gray-300">Important Disclaimer:</strong> Cush, including any subsidiaries or affiliates, does not offer legal, immigration, tax, or financial advisory services. Our tools and concierge support are informational in nature and do not replace professional advice. For legal, tax, or financial matters, we strongly recommend consulting with a licensed professional. Please review our Privacy Policy, Terms of Use, and Service Agreements before using our platform.
              </p>
              
              <p>
                <strong className="text-gray-300">Regional Restrictions:</strong> Certain Cush features may be restricted or unavailable in some regions due to local licensing and regulatory requirements.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center mt-8 pt-4 border-t border-gray-800">
              <p className="text-gray-400">© 2025 Cush. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Terms</a>
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
