import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Activity,
  DollarSign
} from 'lucide-react';

interface RailsrWallet {
  id: string;
  railsrWalletId: string;
  railsrEnduserId: string;
  currency: string;
  balance: string;
  status: string;
  type: string;
  createdAt: string;
}

interface RailsrCard {
  id: string;
  railsrCardId: string;
  railsrWalletId: string;
  type: 'virtual' | 'physical';
  status: string;
  cardholderName: string;
  lastFourDigits?: string;
  expiryDate?: string;
  createdAt: string;
}

interface RailsrTransaction {
  id: string;
  railsrTransactionId: string;
  railsrWalletId: string;
  amount: string;
  currency: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
}

interface RailsrDashboardData {
  summary: {
    totalWallets: number;
    totalCards: number;
    totalBalance: number;
    activeWallets: number;
    activeCards: number;
  };
  wallets: RailsrWallet[];
  cards: RailsrCard[];
  recentTransactions: RailsrTransaction[];
}

export default function RailsrPay() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [newWalletCurrency, setNewWalletCurrency] = useState('GBP');
  const [newCardType, setNewCardType] = useState<'virtual' | 'physical'>('virtual');

  // Fetch Railsr dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery<RailsrDashboardData>({
    queryKey: ['/api/railsr/dashboard'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async (walletData: { currency: string; type: string }) => {
      return await apiRequest('/api/railsr/wallets', 'POST', walletData);
    },
    onSuccess: (data) => {
      toast({
        title: "Wallet Created",
        description: `Your ${newWalletCurrency} wallet has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/railsr/dashboard'] });
      setIsCreatingWallet(false);
      setNewWalletCurrency('GBP');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      });
    },
  });

  // Create card mutation
  const createCardMutation = useMutation({
    mutationFn: async (cardData: { walletId: string; type: 'virtual' | 'physical' }) => {
      return await apiRequest('/api/railsr/cards', 'POST', cardData);
    },
    onSuccess: (data) => {
      toast({
        title: "Card Created",
        description: `Your ${newCardType} card has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/railsr/dashboard'] });
      setIsCreatingCard(false);
      setNewCardType('virtual');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create card",
        variant: "destructive",
      });
    },
  });

  // Transfer/payment mutation
  const transferMutation = useMutation({
    mutationFn: async (transferData: {
      fromWalletId: string;
      amount: number;
      currency: string;
      description: string;
    }) => {
      return await apiRequest('/api/railsr/transactions', 'POST', transferData);
    },
    onSuccess: (data) => {
      toast({
        title: "Transfer Successful",
        description: `Transfer of ${transferAmount} ${dashboardData?.wallets.find(w => w.railsrWalletId === selectedWallet)?.currency} completed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/railsr/dashboard'] });
      setTransferAmount('');
      setTransferDescription('');
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to process transfer",
        variant: "destructive",
      });
    },
  });

  // Handle wallet creation
  const handleCreateWallet = () => {
    createWalletMutation.mutate({
      currency: newWalletCurrency,
      type: 'ledger'
    });
  };

  // Handle card creation
  const handleCreateCard = () => {
    if (!selectedWallet) {
      toast({
        title: "Error",
        description: "Please select a wallet first",
        variant: "destructive",
      });
      return;
    }

    createCardMutation.mutate({
      walletId: selectedWallet,
      type: newCardType
    });
  };

  // Handle transfer
  const handleTransfer = () => {
    if (!selectedWallet || !transferAmount || !transferDescription) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const wallet = dashboardData?.wallets.find(w => w.railsrWalletId === selectedWallet);
    if (!wallet) {
      toast({
        title: "Error",
        description: "Selected wallet not found",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate({
      fromWalletId: selectedWallet,
      amount: parseFloat(transferAmount),
      currency: wallet.currency,
      description: transferDescription
    });
  };

  // Format currency
  const formatCurrency = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (isDashboardLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading Railsr dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {dashboardError.message || 'Failed to load Railsr dashboard. Please try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Railsr Embedded Finance</h1>
        <p className="text-gray-600">Manage your digital wallets, cards, and payments powered by Railsr</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardData?.summary.totalBalance || 0, 'GBP')}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Wallets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.summary.activeWallets || 0}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Cards</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.summary.activeCards || 0}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Wallets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.summary.totalWallets || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cards</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.summary.totalCards || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="wallets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Your Wallets</h2>
            <Button 
              onClick={() => setIsCreatingWallet(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Wallet
            </Button>
          </div>

          {isCreatingWallet && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Wallet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={newWalletCurrency} onValueChange={setNewWalletCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={handleCreateWallet}
                    disabled={createWalletMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createWalletMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Wallet'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreatingWallet(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData?.wallets.map((wallet) => (
              <Card key={wallet.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Wallet className="w-8 h-8 text-blue-600" />
                    <Badge className={getStatusColor(wallet.status)}>
                      {wallet.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(wallet.balance, wallet.currency)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {wallet.currency} • {wallet.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(wallet.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {dashboardData?.wallets.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No wallets yet</h3>
                <p className="text-gray-600 mb-4">Create your first wallet to get started with Railsr</p>
                <Button 
                  onClick={() => setIsCreatingWallet(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Wallet
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Your Cards</h2>
            <Button 
              onClick={() => setIsCreatingCard(true)}
              disabled={!dashboardData?.wallets.length}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Card
            </Button>
          </div>

          {isCreatingCard && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="wallet">Select Wallet</Label>
                  <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboardData?.wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.railsrWalletId}>
                          {wallet.currency} Wallet - {formatCurrency(wallet.balance, wallet.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cardType">Card Type</Label>
                  <Select value={newCardType} onValueChange={(value: 'virtual' | 'physical') => setNewCardType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select card type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual">Virtual Card</SelectItem>
                      <SelectItem value="physical">Physical Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={handleCreateCard}
                    disabled={createCardMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createCardMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Card'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreatingCard(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData?.cards.map((card) => (
              <Card key={card.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <CreditCard className="w-8 h-8 text-purple-600" />
                    <Badge className={getStatusColor(card.status)}>
                      {card.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Cardholder</p>
                    <p className="text-lg font-bold text-gray-900">
                      {card.cardholderName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {card.type} • {card.lastFourDigits ? `****${card.lastFourDigits}` : 'Processing...'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(card.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {dashboardData?.cards.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No cards yet</h3>
                <p className="text-gray-600 mb-4">Create your first card to start making payments</p>
                {dashboardData?.wallets.length === 0 ? (
                  <p className="text-sm text-gray-500">You need to create a wallet first</p>
                ) : (
                  <Button 
                    onClick={() => setIsCreatingCard(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Card
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Send Money</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Funds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fromWallet">From Wallet</Label>
                  <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {dashboardData?.wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.railsrWalletId}>
                          {wallet.currency} Wallet - {formatCurrency(wallet.balance, wallet.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="What is this payment for?"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleTransfer}
                  disabled={transferMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {transferMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Send Money
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transfer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Transfers are processed instantly</li>
                    <li>• All transactions are secured by Railsr</li>
                    <li>• You can track all transfers in the transactions tab</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Security</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Bank-level encryption</li>
                    <li>• FCA regulated platform</li>
                    <li>• Real-time fraud monitoring</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/railsr/dashboard'] })}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {dashboardData?.recentTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600">Your transaction history will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {dashboardData?.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {transaction.type === 'payment' || transaction.type === 'transfer' ? (
                              <ArrowUpRight className="w-5 h-5 text-blue-600" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{transaction.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}