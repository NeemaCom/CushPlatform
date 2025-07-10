import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Wallet, Send, CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WalletData {
  id: number;
  userId: number;
  currency: string;
  balance: string;
  availableBalance: string;
  pendingBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RemittanceRecipient {
  id: number;
  userId: number;
  name: string;
  email?: string;
  phone?: string;
  country: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  lastUsed?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RemittanceQuote {
  sendAmount: string;
  sendCurrency: string;
  receiveCurrency: string;
  receiveAmount: string;
  exchangeRate: string;
  fees: string;
  totalAmount: string;
  estimatedDeliveryTime: string;
  validUntil: string;
}

interface RemittanceTransaction {
  id: number;
  userId: number;
  cymonzTransactionId?: string;
  status: string;
  sendAmount: string;
  sendCurrency: string;
  receiveAmount?: string;
  receiveCurrency: string;
  exchangeRate?: string;
  fees: string;
  totalAmount: string;
  senderName: string;
  recipientName: string;
  recipientCountry: string;
  deliveryMethod: string;
  initiatedAt: string;
  completedAt?: string;
  trackingNumber?: string;
  error?: string;
}

export default function Pay() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'wallet' | 'remittance'>('wallet');
  const [showBalance, setShowBalance] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [remittanceForm, setRemittanceForm] = useState({
    sendAmount: '',
    sendCurrency: 'USD',
    receiveCurrency: 'NGN',
    recipientId: '',
    deliveryMethod: 'bank_transfer' as const
  });
  const [quoteData, setQuoteData] = useState<RemittanceQuote | null>(null);

  // Fetch user wallets
  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['/api/wallet/wallets'],
    enabled: activeTab === 'wallet'
  });

  // Fetch remittance recipients
  const { data: recipients = [], isLoading: recipientsLoading } = useQuery({
    queryKey: ['/api/remittance/recipients'],
    enabled: activeTab === 'remittance'
  });

  // Fetch remittance history
  const { data: remittanceHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/remittance/history'],
    enabled: activeTab === 'remittance'
  });

  // Fetch supported countries and currencies
  const { data: supportedCountries = [] } = useQuery({
    queryKey: ['/api/remittance/countries']
  });

  const { data: supportedCurrencies = [] } = useQuery({
    queryKey: ['/api/remittance/currencies']
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async (currency: string) => {
      return await apiRequest('/api/wallet/create', {
        method: 'POST',
        body: { currency }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/wallets'] });
      toast({
        title: "Wallet Created",
        description: "Your new wallet has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      });
    }
  });

  // Get remittance quote mutation
  const getQuoteMutation = useMutation({
    mutationFn: async (quoteRequest: any) => {
      return await apiRequest('/api/remittance/quote', {
        method: 'POST',
        body: quoteRequest
      });
    },
    onSuccess: (data) => {
      setQuoteData(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get quote",
        variant: "destructive",
      });
    }
  });

  // Initiate remittance mutation
  const initiateRemittanceMutation = useMutation({
    mutationFn: async (remittanceData: any) => {
      return await apiRequest('/api/remittance/initiate', {
        method: 'POST',
        body: remittanceData
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/remittance/history'] });
      toast({
        title: "Remittance Initiated",
        description: `Your remittance has been initiated. Transaction ID: ${data.transactionId}`,
      });
      // Reset form
      setRemittanceForm({
        sendAmount: '',
        sendCurrency: 'USD',
        receiveCurrency: 'NGN',
        recipientId: '',
        deliveryMethod: 'bank_transfer'
      });
      setQuoteData(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate remittance",
        variant: "destructive",
      });
    }
  });

  const handleGetQuote = () => {
    if (!remittanceForm.sendAmount || !remittanceForm.sendCurrency || !remittanceForm.receiveCurrency) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    getQuoteMutation.mutate({
      sendAmount: remittanceForm.sendAmount,
      sendCurrency: remittanceForm.sendCurrency,
      receiveCurrency: remittanceForm.receiveCurrency,
      deliveryMethod: remittanceForm.deliveryMethod
    });
  };

  const handleInitiateRemittance = () => {
    if (!quoteData || !remittanceForm.recipientId) {
      toast({
        title: "Error",
        description: "Please get a quote and select a recipient first",
        variant: "destructive",
      });
      return;
    }

    const selectedRecipient = recipients.find(r => r.id.toString() === remittanceForm.recipientId);
    if (!selectedRecipient) {
      toast({
        title: "Error",
        description: "Selected recipient not found",
        variant: "destructive",
      });
      return;
    }

    initiateRemittanceMutation.mutate({
      sendAmount: quoteData.sendAmount,
      sendCurrency: quoteData.sendCurrency,
      receiveCurrency: quoteData.receiveCurrency,
      receiveAmount: quoteData.receiveAmount,
      exchangeRate: quoteData.exchangeRate,
      fees: quoteData.fees,
      totalAmount: quoteData.totalAmount,
      recipientId: remittanceForm.recipientId,
      recipientName: selectedRecipient.name,
      recipientCountry: selectedRecipient.country,
      recipientBankName: selectedRecipient.bankName,
      recipientAccountNumber: selectedRecipient.accountNumber,
      recipientAccountName: selectedRecipient.accountName,
      deliveryMethod: remittanceForm.deliveryMethod
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cush Pay</h1>
          <p className="text-gray-600">Manage your wallet and send money globally</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'wallet'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Wallet className="w-5 h-5 mr-2" />
            Wallet
          </button>
          <button
            onClick={() => setActiveTab('remittance')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'remittance'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Send className="w-5 h-5 mr-2" />
            Send Money
          </button>
        </div>

        {/* Wallet Tab Content */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Wallet Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Wallets</h2>
                <button
                  onClick={() => createWalletMutation.mutate('USD')}
                  disabled={createWalletMutation.isPending}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wallet
                </button>
              </div>

              {walletsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : wallets.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No wallets found. Create your first wallet to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wallets.map((wallet: WalletData) => (
                    <div
                      key={wallet.id}
                      className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
                      onClick={() => setSelectedWallet(wallet)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <CreditCard className="w-6 h-6 mr-2" />
                          <span className="font-medium">{wallet.currency} Wallet</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBalance(!showBalance);
                          }}
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-blue-100">Available Balance</span>
                          <span className="font-semibold">
                            {showBalance ? `${wallet.currency} ${parseFloat(wallet.availableBalance || '0').toLocaleString()}` : '••••••'}
                          </span>
                        </div>
                        {wallet.pendingBalance && parseFloat(wallet.pendingBalance) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-blue-100">Pending</span>
                            <span className="font-semibold">
                              {showBalance ? `${wallet.currency} ${parseFloat(wallet.pendingBalance).toLocaleString()}` : '••••••'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <ArrowDownRight className="w-5 h-5 mr-2 text-green-500" />
                  <span className="font-medium">Add Money</span>
                </button>
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <ArrowUpRight className="w-5 h-5 mr-2 text-blue-500" />
                  <span className="font-medium">Send Money</span>
                </button>
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                  <span className="font-medium">View History</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remittance Tab Content */}
        {activeTab === 'remittance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send Money Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Send Money</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Send
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={remittanceForm.sendAmount}
                      onChange={(e) => setRemittanceForm({ ...remittanceForm, sendAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Send Currency
                    </label>
                    <select
                      value={remittanceForm.sendCurrency}
                      onChange={(e) => setRemittanceForm({ ...remittanceForm, sendCurrency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receive Currency
                    </label>
                    <select
                      value={remittanceForm.receiveCurrency}
                      onChange={(e) => setRemittanceForm({ ...remittanceForm, receiveCurrency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="NGN">NGN</option>
                      <option value="GHS">GHS</option>
                      <option value="KES">KES</option>
                      <option value="ZAR">ZAR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Method
                  </label>
                  <select
                    value={remittanceForm.deliveryMethod}
                    onChange={(e) => setRemittanceForm({ ...remittanceForm, deliveryMethod: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash_pickup">Cash Pickup</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient
                  </label>
                  <select
                    value={remittanceForm.recipientId}
                    onChange={(e) => setRemittanceForm({ ...remittanceForm, recipientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a recipient</option>
                    {recipients.map((recipient: RemittanceRecipient) => (
                      <option key={recipient.id} value={recipient.id.toString()}>
                        {recipient.name} ({recipient.country})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleGetQuote}
                  disabled={getQuoteMutation.isPending}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {getQuoteMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Get Quote
                </button>

                {/* Quote Display */}
                {quoteData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Quote Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Send Amount:</span>
                        <span className="font-semibold">{quoteData.sendCurrency} {parseFloat(quoteData.sendAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exchange Rate:</span>
                        <span className="font-semibold">1 {quoteData.sendCurrency} = {quoteData.exchangeRate} {quoteData.receiveCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fees:</span>
                        <span className="font-semibold">{quoteData.sendCurrency} {parseFloat(quoteData.fees).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="font-semibold">{quoteData.sendCurrency} {parseFloat(quoteData.totalAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recipient Gets:</span>
                        <span className="font-semibold text-green-600">{quoteData.receiveCurrency} {parseFloat(quoteData.receiveAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Time:</span>
                        <span className="font-semibold">{quoteData.estimatedDeliveryTime}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleInitiateRemittance}
                      disabled={initiateRemittanceMutation.isPending}
                      className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                    >
                      {initiateRemittanceMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                      Send Money
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Transactions</h2>
              
              {historyLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : remittanceHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions yet. Send your first remittance to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {remittanceHistory.map((transaction: RemittanceTransaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-600' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          transaction.status === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.recipientName}</p>
                          <p className="text-sm text-gray-600">{transaction.recipientCountry}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {transaction.sendCurrency} {parseFloat(transaction.sendAmount).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">{transaction.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}