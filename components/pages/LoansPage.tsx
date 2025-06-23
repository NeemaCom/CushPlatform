import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calculator,
  FileText,
  Users,
  Star
} from 'lucide-react';

const loanPartners = [
  {
    id: 1,
    name: 'QuickLoans Pro',
    logo: '💰',
    rating: 4.8,
    minAmount: 1000,
    maxAmount: 50000,
    interestRate: '5.99% - 24.99%',
    processingTime: '24 hours',
    description: 'Fast personal loans with competitive rates',
    features: ['No collateral required', 'Quick approval', '24/7 support']
  },
  {
    id: 2,
    name: 'SecureCredit',
    logo: '🏦',
    rating: 4.6,
    minAmount: 5000,
    maxAmount: 100000,
    interestRate: '4.99% - 19.99%',
    processingTime: '2-3 days',
    description: 'Secure loans for major purchases',
    features: ['Lower interest rates', 'Flexible terms', 'Credit building']
  },
  {
    id: 3,
    name: 'FlexiFunds',
    logo: '🚀',
    rating: 4.7,
    minAmount: 500,
    maxAmount: 25000,
    interestRate: '7.99% - 29.99%',
    processingTime: '1 hour',
    description: 'Flexible loans for any purpose',
    features: ['Instant approval', 'Mobile-first', 'No hidden fees']
  }
];

const userLoans = [
  {
    id: 1,
    lender: 'QuickLoans Pro',
    amount: 15000,
    remaining: 12500,
    monthlyPayment: 450,
    nextDue: '2025-07-01',
    status: 'active',
    progress: 17
  },
  {
    id: 2,
    lender: 'SecureCredit',
    amount: 8000,
    remaining: 2400,
    monthlyPayment: 320,
    nextDue: '2025-07-15',
    status: 'active',
    progress: 70
  }
];

export function LoansPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-loans' | 'apply'>('browse');
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null);

  const LoanCalculator = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Loan Calculator
        </CardTitle>
        <CardDescription>
          Calculate your monthly payments and see what you can afford
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="loan-amount">Loan Amount</Label>
            <Input id="loan-amount" placeholder="$10,000" />
          </div>
          <div>
            <Label htmlFor="interest-rate">Interest Rate (%)</Label>
            <Input id="interest-rate" placeholder="8.5" />
          </div>
          <div>
            <Label htmlFor="loan-term">Term (months)</Label>
            <Input id="loan-term" placeholder="36" />
          </div>
          <div className="flex items-end">
            <Button className="w-full">Calculate</Button>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">$312/month</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estimated monthly payment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const BrowseLoans = () => (
    <div className="space-y-6">
      <LoanCalculator />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loanPartners.map((partner) => (
          <Card key={partner.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{partner.logo}</div>
                  <div>
                    <CardTitle className="text-lg">{partner.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{partner.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription>{partner.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Loan Range</p>
                  <p className="font-medium">${partner.minAmount.toLocaleString()} - ${partner.maxAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Interest Rate</p>
                  <p className="font-medium">{partner.interestRate}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Processing</p>
                  <p className="font-medium">{partner.processingTime}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Rating</p>
                  <p className="font-medium">{partner.rating}/5.0</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {partner.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => {
                  setSelectedLoan(partner.id);
                  setActiveTab('apply');
                }}
              >
                Apply Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const MyLoans = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Borrowed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">$23,000</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Remaining Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">$14,900</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Monthly Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">$770</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {userLoans.map((loan) => (
          <Card key={loan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{loan.lender}</CardTitle>
                  <CardDescription>
                    ${loan.amount.toLocaleString()} loan • Next payment due {loan.nextDue}
                  </CardDescription>
                </div>
                <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                  {loan.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remaining Balance</p>
                  <p className="text-lg font-semibold">${loan.remaining.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Payment</p>
                  <p className="text-lg font-semibold">${loan.monthlyPayment}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
                  <div className="flex items-center gap-2">
                    <Progress value={loan.progress} className="flex-1" />
                    <span className="text-sm font-medium">{loan.progress}%</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Make Payment</Button>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const ApplyForLoan = () => {
    const partner = loanPartners.find(p => p.id === selectedLoan);
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {partner && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">{partner.logo}</span>
                Apply for {partner.name} Loan
              </CardTitle>
              <CardDescription>
                Complete the application below to get pre-qualified
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+1 (555) 123-4567" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loanAmount">Requested Amount</Label>
                <Input id="loanAmount" placeholder="$10,000" />
              </div>
              <div>
                <Label htmlFor="loanPurpose">Loan Purpose</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debt-consolidation">Debt Consolidation</SelectItem>
                    <SelectItem value="home-improvement">Home Improvement</SelectItem>
                    <SelectItem value="major-purchase">Major Purchase</SelectItem>
                    <SelectItem value="emergency">Emergency Expenses</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="monthlyIncome">Monthly Income</Label>
                <Input id="monthlyIncome" placeholder="$5,000" />
              </div>
              <div>
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="self-employed">Self-Employed</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="additionalInfo">Additional Comments (Optional)</Label>
              <Textarea 
                id="additionalInfo" 
                placeholder="Any additional information that might help with your application..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setActiveTab('browse')}
          >
            Back to Browse
          </Button>
          <Button className="flex-1">
            Submit Application
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'browse' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('browse')}
          className="rounded-md"
        >
          Browse Loans
        </Button>
        <Button
          variant={activeTab === 'my-loans' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('my-loans')}
          className="rounded-md"
        >
          My Loans
        </Button>
        <Button
          variant={activeTab === 'apply' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('apply')}
          className="rounded-md"
        >
          Apply
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'browse' && <BrowseLoans />}
      {activeTab === 'my-loans' && <MyLoans />}
      {activeTab === 'apply' && <ApplyForLoan />}
    </div>
  );
}