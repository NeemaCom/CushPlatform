import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Calendar, TrendingUp, Globe, Heart } from 'lucide-react';

interface ForumPost {
  id: number;
  title: string;
  author: string;
  category: string;
  replies: number;
  likes: number;
  timeAgo: string;
  preview: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  attendees: number;
  type: 'virtual' | 'in-person';
  location: string;
}

const recentPosts: ForumPost[] = [
  {
    id: 1,
    title: "Express Entry Draw #275 - CRS Score 486",
    author: "Sarah M.",
    category: "Canada Immigration",
    replies: 23,
    likes: 45,
    timeAgo: "2 hours ago",
    preview: "Just received an ITA! Sharing my timeline and tips for improving CRS score..."
  },
  {
    id: 2,
    title: "Landing in Melbourne - First Month Experience",
    author: "David R.",
    category: "Australia Settlement",
    replies: 18,
    likes: 32,
    timeAgo: "5 hours ago",
    preview: "Moved to Melbourne last month. Here's what I wish I knew before arriving..."
  },
  {
    id: 3,
    title: "UK Skilled Worker Visa - Document Checklist",
    author: "Priya S.",
    category: "UK Immigration",
    replies: 15,
    likes: 28,
    timeAgo: "1 day ago",
    preview: "Complete document checklist for UK Skilled Worker visa application..."
  }
];

const upcomingEvents: Event[] = [
  {
    id: 1,
    title: "Canada Immigration Webinar",
    date: "Dec 28, 2024",
    attendees: 245,
    type: "virtual",
    location: "Online"
  },
  {
    id: 2,
    title: "Melbourne Networking Meetup",
    date: "Jan 5, 2025",
    attendees: 67,
    type: "in-person",
    location: "Melbourne, AU"
  },
  {
    id: 3,
    title: "UK Settlement Q&A Session",
    date: "Jan 12, 2025",
    attendees: 189,
    type: "virtual",
    location: "Online"
  }
];

const communityStats = [
  { label: "Active Members", value: "50,000+", icon: Users },
  { label: "Countries Represented", value: "180+", icon: Globe },
  { label: "Success Stories", value: "12,500+", icon: Heart },
  { label: "Monthly Discussions", value: "25,000+", icon: MessageSquare }
];

export function CommunityPreview() {
  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Join Our Global Community
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Connect with fellow immigrants, share experiences, and get support from people who understand your journey
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {communityStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <stat.icon className="h-8 w-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Discussions */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Recent Discussions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {post.title}
                    </h4>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {post.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                    {post.preview}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>by {post.author} • {post.timeAgo}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.replies}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4">
                View All Discussions
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </h4>
                    <Badge variant={event.type === 'virtual' ? 'default' : 'secondary'} className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.attendees} attending
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {event.location}
                  </p>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4">
                View All Events
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Connect?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Join our vibrant community of immigrants helping each other succeed. 
              Share your story, get advice, and build lasting connections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Join Community
              </Button>
              <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 px-8">
                Explore Forums
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}