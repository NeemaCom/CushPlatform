import { db } from "./db";
import { widgetTypes } from "@shared/schema";

const sampleWidgets = [
  {
    name: "financial-overview",
    displayName: "Financial Overview",
    description: "Get a comprehensive view of your accounts, balances, and recent transactions in one convenient dashboard widget.",
    category: "financial",
    version: "1.0.0",
    developer: "Cush Team",
    icon: "DollarSign",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 1250,
    rating: "4.8",
    ratingCount: 89,
    configSchema: {
      type: "object",
      properties: {
        showAccounts: { type: "boolean", default: true },
        showTransactions: { type: "boolean", default: true },
        transactionLimit: { type: "number", default: 5, min: 1, max: 20 }
      }
    },
    permissions: ["read:accounts", "read:transactions"]
  },
  {
    name: "expense-tracker",
    displayName: "Expense Tracker",
    description: "Track your daily expenses and categorize spending with visual charts and insights to help manage your budget.",
    category: "financial",
    version: "1.2.1",
    developer: "Cush Team",
    icon: "TrendingDown",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 2100,
    rating: "4.6",
    ratingCount: 156,
    configSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["week", "month", "quarter"], default: "month" },
        showCategories: { type: "boolean", default: true },
        currency: { type: "string", default: "USD" }
      }
    },
    permissions: ["read:transactions", "write:transactions"]
  },
  {
    name: "savings-goals",
    displayName: "Savings Goals",
    description: "Monitor your progress toward financial goals with visual progress bars and milestone tracking.",
    category: "financial",
    version: "1.1.0",
    developer: "Cush Team",
    icon: "Target",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 980,
    rating: "4.9",
    ratingCount: 67,
    configSchema: {
      type: "object",
      properties: {
        showProgress: { type: "boolean", default: true },
        showMilestones: { type: "boolean", default: true },
        goalLimit: { type: "number", default: 3, min: 1, max: 10 }
      }
    },
    permissions: ["read:goals", "write:goals"]
  },
  {
    name: "investment-portfolio",
    displayName: "Investment Portfolio",
    description: "Track your investment performance with real-time market data, portfolio allocation, and performance metrics.",
    category: "financial",
    version: "2.0.0",
    developer: "Investment Pro",
    icon: "TrendingUp",
    isActive: true,
    isPremium: true,
    price: "9.99",
    downloadCount: 450,
    rating: "4.7",
    ratingCount: 23,
    configSchema: {
      type: "object",
      properties: {
        portfolioView: { type: "string", enum: ["summary", "detailed"], default: "summary" },
        showPerformance: { type: "boolean", default: true },
        refreshInterval: { type: "number", default: 300, min: 60, max: 3600 }
      }
    },
    permissions: ["read:investments", "read:market-data"]
  },
  {
    name: "task-manager",
    displayName: "Task Manager",
    description: "Stay organized with a simple task management widget featuring todo lists, priorities, and due dates.",
    category: "productivity",
    version: "1.3.2",
    developer: "Productivity Hub",
    icon: "CheckSquare",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 3200,
    rating: "4.5",
    ratingCount: 234,
    configSchema: {
      type: "object",
      properties: {
        maxTasks: { type: "number", default: 10, min: 5, max: 50 },
        showCompleted: { type: "boolean", default: false },
        sortBy: { type: "string", enum: ["priority", "date", "alphabetical"], default: "priority" }
      }
    },
    permissions: ["read:tasks", "write:tasks"]
  },
  {
    name: "weather-forecast",
    displayName: "Weather Forecast",
    description: "Get current weather conditions and 5-day forecast for your location with beautiful weather icons.",
    category: "weather",
    version: "1.0.5",
    developer: "Weather Widgets Inc",
    icon: "Cloud",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 5670,
    rating: "4.4",
    ratingCount: 412,
    configSchema: {
      type: "object",
      properties: {
        units: { type: "string", enum: ["celsius", "fahrenheit"], default: "celsius" },
        showForecast: { type: "boolean", default: true },
        location: { type: "string", default: "auto" }
      }
    },
    permissions: ["read:location"]
  },
  {
    name: "calendar-events",
    displayName: "Calendar Events",
    description: "View your upcoming calendar events and appointments with smart scheduling suggestions.",
    category: "calendar",
    version: "1.1.3",
    developer: "Calendar Pro",
    icon: "Calendar",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 1890,
    rating: "4.3",
    ratingCount: 145,
    configSchema: {
      type: "object",
      properties: {
        daysAhead: { type: "number", default: 7, min: 1, max: 30 },
        showAllDay: { type: "boolean", default: true },
        timeFormat: { type: "string", enum: ["12h", "24h"], default: "12h" }
      }
    },
    permissions: ["read:calendar"]
  },
  {
    name: "crypto-tracker",
    displayName: "Crypto Tracker",
    description: "Monitor cryptocurrency prices and portfolio performance with real-time market data and alerts.",
    category: "financial",
    version: "1.4.0",
    developer: "Crypto Insights",
    icon: "Bitcoin",
    isActive: true,
    isPremium: true,
    price: "4.99",
    downloadCount: 780,
    rating: "4.6",
    ratingCount: 89,
    configSchema: {
      type: "object",
      properties: {
        watchlist: { type: "array", items: { type: "string" }, default: ["BTC", "ETH"] },
        showPortfolio: { type: "boolean", default: true },
        priceAlerts: { type: "boolean", default: false }
      }
    },
    permissions: ["read:crypto-data", "notifications"]
  },
  {
    name: "news-feed",
    displayName: "News Feed",
    description: "Stay informed with personalized news headlines from trusted sources, filtered by your interests.",
    category: "news",
    version: "1.2.0",
    developer: "News Central",
    icon: "Newspaper",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 2340,
    rating: "4.2",
    ratingCount: 178,
    configSchema: {
      type: "object",
      properties: {
        categories: { type: "array", items: { type: "string" }, default: ["technology", "finance"] },
        articleCount: { type: "number", default: 5, min: 3, max: 15 },
        showImages: { type: "boolean", default: true }
      }
    },
    permissions: ["read:news-data"]
  },
  {
    name: "social-feed",
    displayName: "Social Feed",
    description: "Connect with the Cush community through a social feed showing updates, achievements, and discussions.",
    category: "social",
    version: "1.0.2",
    developer: "Cush Team",
    icon: "Users",
    isActive: true,
    isPremium: false,
    price: "0.00",
    downloadCount: 1567,
    rating: "4.1",
    ratingCount: 92,
    configSchema: {
      type: "object",
      properties: {
        feedType: { type: "string", enum: ["following", "trending", "all"], default: "following" },
        postCount: { type: "number", default: 10, min: 5, max: 25 },
        showMedia: { type: "boolean", default: true }
      }
    },
    permissions: ["read:social", "write:social"]
  }
];

export async function seedWidgets() {
  try {
    console.log('Seeding widget types...');
    
    for (const widget of sampleWidgets) {
      await db.insert(widgetTypes).values(widget).onConflictDoNothing();
    }
    
    console.log(`Seeded ${sampleWidgets.length} widget types successfully`);
  } catch (error) {
    console.error('Error seeding widgets:', error);
  }
}

if (require.main === module) {
  seedWidgets().then(() => process.exit(0));
}