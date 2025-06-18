import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BalanceData {
  period: string;
  balance: number;
}

export function BalanceChart() {
  const { data: balanceData, isLoading } = useQuery<BalanceData[]>({
    queryKey: ["/api/balance-history"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = balanceData || [];
  const currentBalance = data[data.length - 1]?.balance || 0;
  const previousBalance = data[data.length - 2]?.balance || 0;
  const balanceChange = currentBalance - previousBalance;
  const isPositive = balanceChange >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Balance Overview</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="bg-blue-100 text-blue-600 border-blue-200">
              7D
            </Button>
            <Button variant="outline" size="sm" className="text-gray-600">
              30D
            </Button>
            <Button variant="outline" size="sm" className="text-gray-600">
              90D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">£{currentBalance.toLocaleString()}</p>
            </div>
            <div className="flex items-center space-x-2">
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}£{balanceChange.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Recent History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.slice(-5).reverse().map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white border rounded">
                  <span className="text-sm text-gray-600">{item.period}</span>
                  <span className="text-sm font-medium">£{item.balance.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
