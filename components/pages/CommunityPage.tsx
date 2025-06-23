import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  ThumbsUp, 
  Share, 
  Users, 
  TrendingUp,
  BookOpen,
  HelpCircle,
  Star,
  Search,
  Filter,
  Plus,
  MapPin,
  Calendar,
  Eye
} from 'lucide-react';

const posts = [
  {
    id: 1,
    author: 'Sarah Johnson',
    avatar: 'SJ',
    location: 'Toronto, Canada',
    timestamp: '2 hours ago',
    content: 'Just completed my first successful visa application through Cush! The process was so much smoother than I expected. Special thanks to the community for all the helpful tips! 🎉',
    likes: 24,
    comments: 8,
    tags: ['success', 'visa', 'canada'],
    category: 'Success Story'
  },
  {
    id: 2,
    author: 'Michael Chen',
    avatar: 'MC',
    location: 'Sydney, Australia',
    timestamp: '5 hours ago',
    content: 'Has anyone recently applied for a student visa to Australia? I\'m looking for advice on document preparation and timeline expectations. Any insights would be greatly appreciated!',
    likes: 12,
    comments: 15,
    tags: ['help', 'student-visa', 'australia'],
    category: 'Q&A'
  },
  {
    id: 3,
    author: 'Emma Davis',
    avatar: 'ED',
    location: 'London, UK',
    timestamp: '1 day ago',
    content: 'Hosting a virtual meetup this Saturday at 3 PM GMT for anyone interested in UK immigration processes. We\'ll cover recent policy changes and share experiences. Link in comments!',
    likes: 35,
    comments: 22,
    tags: ['meetup', 'uk', 'community'],
    category: 'Event'
  },
  {
    id: 4,
    author: 'Alex Rodriguez',
    avatar: 'AR',
    location: 'Madrid, Spain',
    timestamp: '2 days ago',
    content: 'Pro tip: When preparing your financial documents, make sure to get official translations well in advance. Some countries require certified translations that can take 2-3 weeks to process.',
    likes: 18,
    comments: 6,
    tags: ['tip', 'documents', 'translation'],
    category: 'Tip'
  }
];

const communities = [
  {
    id: 1,
    name: 'Visa Success Stories',
    members: 15420,
    description: 'Share your immigration success stories and inspire others',
    category: 'Success',
    isJoined: true
  },
  {
    id: 2,
    name: 'Document Preparation Help',
    members: 8930,
    description: 'Get help with document preparation and requirements',
    category: 'Help',
    isJoined: true
  },
  {
    id: 3,
    name: 'Country-Specific Guides',
    members: 12340,
    description: 'Country-specific immigration information and guides',
    category: 'Guides',
    isJoined: false
  },
  {
    id: 4,
    name: 'Financial Planning for Immigration',
    members: 6780,
    description: 'Tips and advice on financial planning for your move',
    category: 'Finance',
    isJoined: false
  }
];

const trendingTopics = [
  { tag: 'visa-updates', count: 234 },
  { tag: 'canada-immigration', count: 189 },
  { tag: 'document-tips', count: 156 },
  { tag: 'success-stories', count: 145 },
  { tag: 'australia-visa', count: 123 }
];

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'communities' | 'events'>('feed');
  const [newPost, setNewPost] = useState('');

  const CommunityFeed = () => (
    <div className="space-y-6">
      {/* Create Post */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Share with the Community</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Share your experience, ask a question, or provide helpful tips..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows={3}
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Add Location
              </Button>
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Add Tags
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{post.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{post.author}</p>
                      <Badge variant="outline" className="text-xs">
                        {post.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{post.location}</span>
                      <span>•</span>
                      <span>{post.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">{post.content}</p>
              
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{post.likes}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.comments}</span>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const CommunitiesTab = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search communities..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Communities */}
      <Card>
        <CardHeader>
          <CardTitle>My Communities</CardTitle>
          <CardDescription>Communities you've joined</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communities.filter(c => c.isJoined).map((community) => (
              <Card key={community.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{community.name}</h3>
                    <Badge variant="secondary">{community.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {community.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{community.members.toLocaleString()} members</span>
                    </div>
                    <Button size="sm">View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Discover Communities */}
      <Card>
        <CardHeader>
          <CardTitle>Discover New Communities</CardTitle>
          <CardDescription>Find communities that match your interests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communities.filter(c => !c.isJoined).map((community) => (
              <Card key={community.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{community.name}</h3>
                    <Badge variant="outline">{community.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {community.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{community.members.toLocaleString()} members</span>
                    </div>
                    <Button size="sm" variant="outline">Join</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const EventsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
          <CardDescription>Community events and meetups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">UK Immigration Policy Updates</h3>
                  <p className="text-sm text-gray-600">Virtual Meetup</p>
                </div>
                <Badge>This Saturday</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Join us for a discussion on recent UK immigration policy changes and their impact on visa applications.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>📅 June 28, 3:00 PM GMT</span>
                  <span>👥 45 attending</span>
                </div>
                <Button size="sm">Join Event</Button>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">Document Preparation Workshop</h3>
                  <p className="text-sm text-gray-600">Online Workshop</p>
                </div>
                <Badge variant="outline">Next Week</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Learn how to properly prepare and organize your immigration documents for a successful application.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>📅 July 2, 7:00 PM EST</span>
                  <span>👥 32 attending</span>
                </div>
                <Button size="sm" variant="outline">Register</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'feed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('feed')}
            className="rounded-md"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Feed
          </Button>
          <Button
            variant={activeTab === 'communities' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('communities')}
            className="rounded-md"
          >
            <Users className="h-4 w-4 mr-2" />
            Communities
          </Button>
          <Button
            variant={activeTab === 'events' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('events')}
            className="rounded-md"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Events
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'feed' && <CommunityFeed />}
        {activeTab === 'communities' && <CommunitiesTab />}
        {activeTab === 'events' && <EventsTab />}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Trending Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Trending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendingTopics.map((topic) => (
                <div key={topic.tag} className="flex items-center justify-between">
                  <span className="text-sm">#{topic.tag}</span>
                  <span className="text-xs text-gray-500">{topic.count} posts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Community Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Community Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">45K+</p>
              <p className="text-sm text-gray-500">Active Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">2.3K</p>
              <p className="text-sm text-gray-500">Success Stories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">156</p>
              <p className="text-sm text-gray-500">Countries Covered</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <HelpCircle className="h-4 w-4 mr-2" />
              Ask a Question
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Star className="h-4 w-4 mr-2" />
              Share Success Story
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Guides
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}