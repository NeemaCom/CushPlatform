import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend 
} from "recharts";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Award, 
  Globe,
  Clock,
  Heart,
  Star,
  Target,
  Zap
} from 'lucide-react';

const communityStats = {
  totalMembers: 45672,
  activeMembers: 12834,
  newMembersThisMonth: 1204,
  totalPosts: 8934,
  postsThisWeek: 342,
  totalConnections: 15678,
  mentorshipMatches: 567,
  eventsHosted: 89,
  countriesRepresented: 156,
  successStories: 2341
};

const membershipGrowth = [
  { month: 'Jan', members: 38456, active: 9230 },
  { month: 'Feb', members: 39789, active: 9876 },
  { month: 'Mar', members: 41234, active: 10456 },
  { month: 'Apr', members: 42890, active: 11234 },
  { month: 'May', members: 44123, active: 11789 },
  { month: 'Jun', members: 45672, active: 12834 }
];

const topCountries = [
  { name: 'Canada', members: 12456, color: '#FF6B6B' },
  { name: 'United States', members: 9834, color: '#4ECDC4' },
  { name: 'United Kingdom', members: 7234, color: '#45B7D1' },
  { name: 'Australia', members: 5678, color: '#96CEB4' },
  { name: 'Germany', members: 4321, color: '#FFEAA7' },
  { name: 'Others', members: 6149, color: '#DDA0DD' }
];

const engagementMetrics = [
  { category: 'Forum Posts', value: 2341, change: 12.3, color: '#3B82F6' },
  { category: 'Comments', value: 8934, change: 8.7, color: '#10B981' },
  { category: 'Connections Made', value: 567, change: 15.2, color: '#F59E0B' },
  { category: 'Events Attended', value: 1234, change: 23.1, color: '#EF4444' }
];

const popularTopics = [
  { topic: 'Express Entry', posts: 1234, growth: 15.2 },
  { topic: 'Work Permits', posts: 987, growth: 12.8 },
  { topic: 'Family Sponsorship', posts: 856, growth: 8.4 },
  { topic: 'Student Visas', posts: 743, growth: 22.1 },
  { topic: 'Provincial Nomination', posts: 621, growth: 18.7 },
  { topic: 'Document Preparation', posts: 534, growth: 9.3 }
];

export function CommunityAnalytics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Community Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Insights into community growth and engagement
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Live Data
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">{communityStats.totalMembers.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{communityStats.newMembersThisMonth} this month
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold">{communityStats.activeMembers.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((communityStats.activeMembers / communityStats.totalMembers) * 100)}% engagement rate
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Forum Posts</p>
                <p className="text-2xl font-bold">{communityStats.totalPosts.toLocaleString()}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {communityStats.postsThisWeek} this week
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Stories</p>
                <p className="text-2xl font-bold">{communityStats.successStories.toLocaleString()}</p>
                <p className="text-xs text-yellow-600 flex items-center mt-1">
                  <Star className="h-3 w-3 mr-1" />
                  Inspiring journeys
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Countries</p>
                <p className="text-2xl font-bold">{communityStats.countriesRepresented}</p>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <Globe className="h-3 w-3 mr-1" />
                  Global reach
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Membership Growth</CardTitle>
            <CardDescription>Total and active members over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={membershipGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="members" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Total Members"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="active" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Active Members"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Members by destination country</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCountries}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="members"
                  >
                    {topCountries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Community Engagement</CardTitle>
          <CardDescription>Key engagement metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {engagementMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="mb-2">
                  <p className="text-2xl font-bold" style={{ color: metric.color }}>
                    {metric.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{metric.category}</p>
                </div>
                <div className="flex items-center justify-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{metric.change}%</span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Popular Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Discussion Topics</CardTitle>
          <CardDescription>Most discussed immigration topics this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {popularTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{topic.topic}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {topic.posts} posts
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">+{topic.growth}%</span>
                  </div>
                  <p className="text-xs text-gray-500">growth</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Community Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Community Health Score
          </CardTitle>
          <CardDescription>Overall health and engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.87)}`}
                    className="text-green-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-600">87%</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Overall Health</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Excellent community engagement and growth
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Member Retention</span>
                  <span className="text-sm text-gray-600">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Daily Activity</span>
                  <span className="text-sm text-gray-600">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Content Quality</span>
                  <span className="text-sm text-gray-600">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Key Strengths</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>High member engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Strong mentorship program</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Active forum discussions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Global community reach</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}