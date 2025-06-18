import React from "react";
import { TrendingUp } from "lucide-react";

export default function TestDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Dashboard - Cache Cleared</h1>
      <div className="flex items-center space-x-2">
        <TrendingUp className="w-6 h-6 text-blue-500" />
        <span>Icon loaded successfully</span>
      </div>
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p>If you see this message, the caching issue is resolved.</p>
        <p>Timestamp: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}