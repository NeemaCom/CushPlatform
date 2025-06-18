import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const defaultChartData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 200 },
  { name: 'Apr', value: 278 },
  { name: 'May', value: 189 },
  { name: 'Jun', value: 239 },
];

interface BarChart3Props {
  width?: number;
  height?: number;
  data?: any[];
}

const BarChart3: React.FC<BarChart3Props> = ({ width = 500, height = 300, data }) => {
  const chartData = data && data.length > 0 ? data : defaultChartData;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#3B82F6" name="Value" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChart3;