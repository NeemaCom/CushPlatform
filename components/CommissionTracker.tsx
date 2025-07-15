import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download
} from 'lucide-react';

interface CommissionData {
  totalCommissionGenerated: number;
  totalCommissionPaid: number;
  pendingCommissions: number;
  statusBreakdown: Record<string, number>;
  topPartners: Array<{
    partnerId: number;
    partnerName: string;
    referralCount: number;
    commissionEarned: number;
  }>;
}

interface LoanJourney {
  prequalifications: any[];
  applications: any[];
  referrals: Array<{
    referral: any;
    partner: any;
    application?: any;
  }>;
  totalCommissionEarned: number;
  totalCommissionPending: number;
}

const CommissionTracker: React.FC = () => {
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [userJourney, setUserJourney] = useState<LoanJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'partners'>('overview');

  useEffect(() => {
    fetchCommissionData();
    fetchUserJourney();
  }, []);

  const fetchCommissionData = async () => {
    try {
      const response = await fetch('/api/admin/loans/commission-analytics');
      if (response.ok) {
        const data = await response.json();
        setCommissionData(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching commission data:', error);
    }
  };

  const fetchUserJourney = async () => {
    try {
      const response = await fetch('/api/loans/user-journey');
      if (response.ok) {
        const data = await response.json();
        setUserJourney(data.journey);
      }
    } catch (error) {
      console.error('Error fetching user journey:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'referred': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'applied': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'referred': return <Target className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commission Tracking</h1>
          <p className="text-gray-600">Monitor loan referrals and commission earnings</p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'journey', label: 'My Journey', icon: Users },
          { id: 'partners', label: 'Partners', icon: Target }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && commissionData && (
        <div className="space-y-6">
          {/* Commission Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Generated</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(commissionData.totalCommissionGenerated)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commission Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(commissionData.totalCommissionPaid)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(commissionData.pendingCommissions)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {commissionData.totalCommissionPaid > 0 
                        ? ((commissionData.totalCommissionPaid / commissionData.totalCommissionGenerated) * 100).toFixed(1)
                        : '0.0'}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(commissionData.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getStatusIcon(status)}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Partners */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionData.topPartners.map((partner, index) => (
                  <div key={partner.partnerId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{partner.partnerName}</p>
                        <p className="text-sm text-gray-600">{partner.referralCount} referrals</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(partner.commissionEarned)}
                      </p>
                      <p className="text-sm text-gray-600">earned</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Journey Tab */}
      {activeTab === 'journey' && userJourney && (
        <div className="space-y-6">
          {/* User Journey Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Earned</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(userJourney.totalCommissionEarned)}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(userJourney.totalCommissionPending)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Referrals</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {userJourney.referrals.length}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userJourney.referrals.map((item, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {getStatusIcon(item.referral.referralStatus)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{item.partner.name}</h4>
                        <Badge className={getStatusColor(item.referral.referralStatus)}>
                          {item.referral.referralStatus}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Referral Code: {item.referral.referralCode}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-gray-600">
                          Referred: {new Date(item.referral.referredAt).toLocaleDateString()}
                        </p>
                        {item.referral.commissionEarned > 0 && (
                          <p className="text-sm font-medium text-green-600">
                            Commission: {formatCurrency(item.referral.commissionEarned)}
                          </p>
                        )}
                      </div>
                      {item.referral.referralLink && (
                        <div className="mt-2">
                          <a
                            href={item.referral.referralLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            View Application
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Partners Tab */}
      {activeTab === 'partners' && commissionData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Partner Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Partner</th>
                      <th className="text-left py-2">Referrals</th>
                      <th className="text-left py-2">Commission Earned</th>
                      <th className="text-left py-2">Conversion Rate</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionData.topPartners.map((partner) => (
                      <tr key={partner.partnerId} className="border-b">
                        <td className="py-3">
                          <div className="font-medium text-gray-900">{partner.partnerName}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-gray-600">{partner.referralCount}</div>
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-green-600">
                            {formatCurrency(partner.commissionEarned)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="text-gray-600">
                            {partner.referralCount > 0 ? '25%' : '0%'}
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CommissionTracker;