import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CreditCard, 
  Send, 
  QrCode, 
  Smartphone,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Wallet,
  Users,
  Receipt
} from 'lucide-react';

const recentTransactions = [
  {
    id: 1,
    type: 'sent',
    recipient: 'Sarah Johnson',
    amount: 125.50,
    date: '2025-06-23',
    status: 'completed',
    description: 'Dinner split'
  },
  {
    id: 2,
    type: 'received',
    sender: 'Michael Chen',
    amount: 75.00,
    date: '2025-06-22',
    status: 'completed',
    description: 'Movie tickets'
  },
  {
    id: 3,
    type: 'sent',
    recipient: 'Emma Davis',
    amount: 200.00,
    date: '2025-06-21',
    status: 'pending',
    description: 'Rent contribution'
  }
];

const quickContacts = [
  { id: 1, name: 'Sarah Johnson', avatar: 'SJ', lastPaid: '2 days ago' },
  { id: 2, name: 'Michael Chen', avatar: 'MC', lastPaid: '1 week ago' },
  { id: 3, name: 'Emma Davis', avatar: 'ED', lastPaid: '3 days ago' },
  { id: 4, name: 'Alex Smith', avatar: 'AS', lastPaid: '1 month ago' }
];

export function PayPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'request' | 'history'>('send');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  const SendMoney = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Money
          </CardTitle>
          <CardDescription>
            Send money instantly to friends, family, or businesses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipient">Recipient</Label>
            <Input 
              id="recipient"
              placeholder="Enter email, phone, or username"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input 
                id="amount"
                placeholder="0.00"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Input 
              id="note"
              placeholder="What's this for?"
            />
          </div>

          <div>
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking Account ••••1234</SelectItem>
                <SelectItem value="savings">Savings Account ••••5678</SelectItem>
                <SelectItem value="card">Debit Card ••••9012</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" size="lg">
            Send ${amount || '0.00'}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <QrCode className="h-6 w-6 mb-2" />
              <span className="text-sm">QR Code</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Smartphone className="h-6 w-6 mb-2" />
              <span className="text-sm">Near You</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Split Bill</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Receipt className="h-6 w-6 mb-2" />
              <span className="text-sm">Pay Bills</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Send</CardTitle>
          <CardDescription>Send to people you've paid before</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickContacts.map((contact) => (
              <Button
                key={contact.id}
                variant="outline"
                className="flex flex-col items-center p-4 h-auto"
                onClick={() => setRecipient(contact.name)}
              >
                <Avatar className="mb-2">
                  <AvatarFallback>{contact.avatar}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{contact.name}</span>
                <span className="text-xs text-gray-500">{contact.lastPaid}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const RequestMoney = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5" />
            Request Money
          </CardTitle>
          <CardDescription>
            Request payment from friends, family, or clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="request-from">Request From</Label>
            <Input 
              id="request-from"
              placeholder="Enter email, phone, or username"
            />
          </div>
          
          <div>
            <Label htmlFor="request-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input 
                id="request-amount"
                placeholder="0.00"
                className="pl-8"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="request-note">What's this for?</Label>
            <Input 
              id="request-note"
              placeholder="Describe the request"
            />
          </div>

          <div>
            <Label htmlFor="due-date">Due Date (Optional)</Label>
            <Input 
              id="due-date"
              type="date"
            />
          </div>

          <Button className="w-full" size="lg">
            Send Request
          </Button>
        </CardContent>
      </Card>

      {/* Active Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Active Requests</CardTitle>
          <CardDescription>Money you've requested from others</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">John Doe</p>
                  <p className="text-sm text-gray-500">Requested 3 days ago</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">$50.00</p>
                <Badge variant="outline">Pending</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>AM</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Anna Miller</p>
                  <p className="text-sm text-gray-500">Requested 1 week ago</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">$125.00</p>
                <Badge variant="secondary">Overdue</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const TransactionHistory = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>
          Your recent payment activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'sent' 
                    ? 'bg-red-100 dark:bg-red-900/20' 
                    : 'bg-green-100 dark:bg-green-900/20'
                }`}>
                  {transaction.type === 'sent' ? (
                    <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {transaction.type === 'sent' 
                      ? `To ${transaction.recipient}` 
                      : `From ${transaction.sender}`
                    }
                  </p>
                  <p className="text-sm text-gray-500">{transaction.description}</p>
                  <p className="text-xs text-gray-400">{transaction.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.type === 'sent' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {transaction.type === 'sent' ? '-' : '+'}${transaction.amount.toFixed(2)}
                </p>
                <Badge 
                  variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {transaction.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Account Balance Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Available Balance</p>
              <p className="text-3xl font-bold">$26,721.40</p>
            </div>
            <Wallet className="h-12 w-12 text-blue-200" />
          </div>
          <div className="flex gap-4 mt-4">
            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Money
            </Button>
            <Button variant="outline" size="sm" className="text-white border-white hover:bg-white/10">
              <CreditCard className="h-4 w-4 mr-2" />
              Link Card
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'send' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('send')}
          className="rounded-md"
        >
          Send Money
        </Button>
        <Button
          variant={activeTab === 'request' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('request')}
          className="rounded-md"
        >
          Request Money
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          className="rounded-md"
        >
          History
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'send' && <SendMoney />}
      {activeTab === 'request' && <RequestMoney />}
      {activeTab === 'history' && <TransactionHistory />}
    </div>
  );
}