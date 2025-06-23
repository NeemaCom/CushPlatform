import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  Reply,
  Share,
  Bookmark,
  Pin,
  Award,
  Flag,
  Search,
  Filter,
  Plus,
  Eye,
  Clock,
  Users,
  TrendingUp,
  Star
} from 'lucide-react';

interface ForumPost {
  id: number;
  title: string;
  content: string;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  category: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  replies: number;
  views: number;
  isPinned: boolean;
  isSolved: boolean;
  createdAt: string;
  updatedAt: string;
  userVote?: 'up' | 'down' | null;
  isBookmarked: boolean;
}

interface ForumReply {
  id: number;
  postId: number;
  content: string;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  upvotes: number;
  downvotes: number;
  isSolution: boolean;
  createdAt: string;
  userVote?: 'up' | 'down' | null;
  replies?: ForumReply[];
}

const categories = [
  { id: 'visa-help', name: 'Visa Help', icon: '📋', description: 'Get help with visa applications' },
  { id: 'immigration-law', name: 'Immigration Law', icon: '⚖️', description: 'Legal questions and advice' },
  { id: 'document-prep', name: 'Document Preparation', icon: '📄', description: 'Document requirements and tips' },
  { id: 'success-stories', name: 'Success Stories', icon: '🎉', description: 'Share your immigration journey' },
  { id: 'country-specific', name: 'Country-Specific', icon: '🌍', description: 'Discussions by destination country' },
  { id: 'general', name: 'General Discussion', icon: '💬', description: 'General immigration topics' }
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most-replies', label: 'Most Replies' },
  { value: 'most-votes', label: 'Most Upvotes' },
  { value: 'trending', label: 'Trending' }
];

export function ForumDiscussion() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

  const queryClient = useQueryClient();

  // Mock data - in real app this would come from API
  const mockPosts: ForumPost[] = [
    {
      id: 1,
      title: 'How long does Canadian Express Entry processing take?',
      content: 'I submitted my Express Entry application 3 months ago and haven\'t heard back. Is this normal? What has been your experience with processing times?',
      authorId: 101,
      authorName: 'Sarah Chen',
      authorAvatar: 'SC',
      authorRole: 'Member',
      category: 'visa-help',
      tags: ['canada', 'express-entry', 'processing-time'],
      upvotes: 24,
      downvotes: 2,
      replies: 15,
      views: 342,
      isPinned: false,
      isSolved: true,
      createdAt: '2025-06-20T10:30:00Z',
      updatedAt: '2025-06-22T14:20:00Z',
      userVote: null,
      isBookmarked: false
    },
    {
      id: 2,
      title: 'Successfully obtained UK Skilled Worker Visa - AMA!',
      content: 'After 8 months of preparation and application, I finally got my UK Skilled Worker Visa approved! Happy to answer any questions about the process, timeline, and documents required.',
      authorId: 102,
      authorName: 'Michael Rodriguez',
      authorAvatar: 'MR',
      authorRole: 'Verified Success',
      category: 'success-stories',
      tags: ['uk', 'skilled-worker', 'success', 'ama'],
      upvotes: 156,
      downvotes: 3,
      replies: 42,
      views: 1205,
      isPinned: true,
      isSolved: false,
      createdAt: '2025-06-18T16:45:00Z',
      updatedAt: '2025-06-23T09:15:00Z',
      userVote: 'up',
      isBookmarked: true
    },
    {
      id: 3,
      title: 'Document translation requirements - which countries need certified translations?',
      content: 'I\'m preparing documents for multiple country applications. Can someone clarify which countries require certified translations vs regular translations? Also, any recommendations for translation services?',
      authorId: 103,
      authorName: 'Emma Johnson',
      authorAvatar: 'EJ',
      authorRole: 'Active Contributor',
      category: 'document-prep',
      tags: ['documents', 'translation', 'certification'],
      upvotes: 31,
      downvotes: 1,
      replies: 8,
      views: 189,
      isPinned: false,
      isSolved: false,
      createdAt: '2025-06-23T08:20:00Z',
      updatedAt: '2025-06-23T11:30:00Z',
      userVote: null,
      isBookmarked: false
    }
  ];

  const { data: posts = mockPosts, isLoading } = useQuery({
    queryKey: ['/api/community/forum/posts', selectedCategory, sortBy, searchQuery],
    queryFn: () => Promise.resolve(mockPosts), // Replace with actual API call
    refetchInterval: 30000
  });

  const createPostMutation = useMutation({
    mutationFn: async (newPost: Partial<ForumPost>) => {
      // API call to create post
      return Promise.resolve({ ...newPost, id: Date.now() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/forum/posts'] });
      setShowCreatePost(false);
    }
  });

  const votePostMutation = useMutation({
    mutationFn: async ({ postId, voteType }: { postId: number; voteType: 'up' | 'down' }) => {
      // API call to vote on post
      return Promise.resolve({ postId, voteType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/forum/posts'] });
    }
  });

  const getAuthorBadgeColor = (role: string) => {
    switch (role) {
      case 'Verified Success': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Active Contributor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Moderator': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const CreatePostForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Create New Discussion</CardTitle>
        <CardDescription>Share your question or start a discussion with the community</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="What's your question or topic?" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Tags</label>
            <Input placeholder="Add tags (comma separated)" />
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Content</label>
          <Textarea 
            placeholder="Describe your question or topic in detail..."
            rows={6}
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowCreatePost(false)} variant="outline">
            Cancel
          </Button>
          <Button>Post Discussion</Button>
        </div>
      </CardContent>
    </Card>
  );

  const PostCard = ({ post }: { post: ForumPost }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPost(post)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{post.authorAvatar}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {post.isPinned && <Pin className="h-4 w-4 text-blue-600" />}
                  {post.isSolved && <Award className="h-4 w-4 text-green-600" />}
                  <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{post.authorName}</span>
                  <Badge className={`text-xs ${getAuthorBadgeColor(post.authorRole)}`}>
                    {post.authorRole}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3">
                  {post.content}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="text-right">
                <Badge variant="outline" className="mb-2">
                  {categories.find(c => c.id === post.category)?.icon} {categories.find(c => c.id === post.category)?.name}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{post.upvotes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{post.replies} replies</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{post.views} views</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    votePostMutation.mutate({ postId: post.id, voteType: 'up' });
                  }}
                  className={post.userVote === 'up' ? 'text-blue-600' : ''}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <Bookmark className={`h-4 w-4 ${post.isBookmarked ? 'fill-current text-yellow-600' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Community Forum</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with fellow immigrants, share experiences, and get help
          </p>
        </div>
        <Button onClick={() => setShowCreatePost(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Discussion
        </Button>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className={`cursor-pointer transition-colors ${selectedCategory === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">🌟</div>
            <h3 className="font-medium text-sm">All Topics</h3>
          </CardContent>
        </Card>
        {categories.map(category => (
          <Card 
            key={category.id}
            className={`cursor-pointer transition-colors ${selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">{category.icon}</div>
              <h3 className="font-medium text-sm">{category.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Create Post Form */}
      {showCreatePost && <CreatePostForm />}

      {/* Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          filteredPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>

      {filteredPosts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No discussions found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Be the first to start a discussion in this category
            </p>
            <Button onClick={() => setShowCreatePost(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start Discussion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}