import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer } from "@/components/ui/chart-container";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Balance Overview</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="bg-cush-blue-100 text-cush-blue-600 border-cush-blue-200">
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
        <ChartContainer className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis 
                dataKey="period" 
                className="text-gray-600"
                fontSize={12}
              />
              <YAxis 
                className="text-gray-600"
                fontSize={12}
                tickFormatter={(value) => `£${value}`}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--cush-blue-600))"
                strokeWidth={3}
                fill="hsl(var(--cush-blue-600))"
                dot={{ fill: "hsl(var(--cush-blue-600))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--cush-blue-600))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
