import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  MessageCircle,
  MapPin,
  Briefcase,
  GraduationCap,
  Star,
  Calendar,
  Video,
  Coffee,
  Globe,
  Filter,
  Search,
  Heart,
  Award,
  Zap,
  Target
} from 'lucide-react';

interface NetworkingProfile {
  id: number;
  name: string;
  avatar?: string;
  title: string;
  company: string;
  location: string;
  country: string;
  immigrationStatus: string;
  expertise: string[];
  interests: string[];
  languages: string[];
  experience: string;
  connectionStatus: 'connected' | 'pending' | 'none';
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  lastActive: string;
  bio: string;
  achievements: string[];
  willMentor: boolean;
  seekingMentor: boolean;
}

interface NetworkingEvent {
  id: number;
  title: string;
  description: string;
  type: 'virtual' | 'in-person' | 'hybrid';
  date: string;
  time: string;
  location?: string;
  maxAttendees: number;
  currentAttendees: number;
  organizer: string;
  category: string;
  tags: string[];
  isRegistered: boolean;
  isPaid: boolean;
  price?: number;
}

const mockProfiles: NetworkingProfile[] = [
  {
    id: 1,
    name: 'Dr. Sarah Kim',
    avatar: 'SK',
    title: 'Software Engineer',
    company: 'Google Canada',
    location: 'Toronto, ON',
    country: 'Canada',
    immigrationStatus: 'Permanent Resident',
    expertise: ['Express Entry', 'Tech Immigration', 'PNP'],
    interests: ['Career Development', 'Coding', 'Mentorship'],
    languages: ['English', 'Korean', 'French'],
    experience: '5+ years in tech immigration',
    connectionStatus: 'none',
    rating: 4.9,
    reviewCount: 45,
    isOnline: true,
    lastActive: '2 minutes ago',
    bio: 'Helped 200+ tech professionals immigrate to Canada. Happy to share my experience and provide guidance.',
    achievements: ['Top Contributor', 'Verified Success', 'Mentor of the Year'],
    willMentor: true,
    seekingMentor: false
  },
  {
    id: 2,
    name: 'Ahmed Hassan',
    avatar: 'AH',
    title: 'Immigration Lawyer',
    company: 'Hassan & Associates',
    location: 'Vancouver, BC',
    country: 'Canada',
    immigrationStatus: 'Citizen',
    expertise: ['Family Sponsorship', 'Business Immigration', 'Appeals'],
    interests: ['Legal Advocacy', 'Community Service', 'Public Speaking'],
    languages: ['English', 'Arabic', 'French'],
    experience: '10+ years immigration law',
    connectionStatus: 'connected',
    rating: 4.8,
    reviewCount: 128,
    isOnline: false,
    lastActive: '1 hour ago',
    bio: 'Specialized immigration lawyer with expertise in complex cases. Committed to helping immigrants achieve their dreams.',
    achievements: ['Legal Expert', 'Community Leader', 'Top Rated'],
    willMentor: true,
    seekingMentor: false
  },
  {
    id: 3,
    name: 'Maria González',
    avatar: 'MG',
    title: 'Marketing Manager',
    company: 'Shopify',
    location: 'Ottawa, ON',
    country: 'Canada',
    immigrationStatus: 'Work Permit Holder',
    expertise: ['LMIA Process', 'Work Permits', 'Provincial Nomination'],
    interests: ['Digital Marketing', 'Networking', 'Cultural Exchange'],
    languages: ['English', 'Spanish', 'Portuguese'],
    experience: '3 years Canadian work experience',
    connectionStatus: 'pending',
    rating: 4.7,
    reviewCount: 23,
    isOnline: true,
    lastActive: 'Just now',
    bio: 'Currently on work permit, applying for PR. Love connecting with other professionals in similar situations.',
    achievements: ['Rising Star', 'Active Contributor'],
    willMentor: false,
    seekingMentor: true
  }
];

const mockEvents: NetworkingEvent[] = [
  {
    id: 1,
    title: 'Tech Immigration Networking Night',
    description: 'Connect with tech professionals who have successfully immigrated to Canada. Share experiences, tips, and build your network.',
    type: 'virtual',
    date: '2025-06-28',
    time: '19:00 EST',
    maxAttendees: 50,
    currentAttendees: 23,
    organizer: 'Canadian Tech Immigration Group',
    category: 'networking',
    tags: ['tech', 'immigration', 'canada', 'networking'],
    isRegistered: false,
    isPaid: false
  },
  {
    id: 2,
    title: 'Express Entry Application Workshop',
    description: 'Hands-on workshop covering Express Entry application process, document preparation, and common mistakes to avoid.',
    type: 'hybrid',
    date: '2025-07-02',
    time: '14:00 EST',
    location: 'Toronto Public Library',
    maxAttendees: 30,
    currentAttendees: 18,
    organizer: 'Immigration Success Network',
    category: 'workshop',
    tags: ['express-entry', 'workshop', 'documents'],
    isRegistered: true,
    isPaid: true,
    price: 25
  },
  {
    id: 3,
    title: 'Coffee Chat: Life in Canada',
    description: 'Casual coffee chat for newcomers to Canada. Share experiences, ask questions, and make friends.',
    type: 'in-person',
    date: '2025-06-25',
    time: '10:00 EST',
    location: 'Starbucks, King Street Toronto',
    maxAttendees: 15,
    currentAttendees: 8,
    organizer: 'Toronto Newcomers Circle',
    category: 'social',
    tags: ['newcomers', 'social', 'toronto', 'coffee'],
    isRegistered: false,
    isPaid: false
  }
];

export function NetworkingHub() {
  const [activeTab, setActiveTab] = useState<'profiles' | 'events' | 'mentorship'>('profiles');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [expertiseFilter, setExpertiseFilter] = useState<string>('all');

  const ProfileCard = ({ profile }: { profile: NetworkingProfile }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarFallback>{profile.avatar}</AvatarFallback>
            </Avatar>
            {profile.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{profile.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{profile.title} at {profile.company}</p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-500">{profile.location}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{profile.rating}</span>
                <span className="text-xs text-gray-500">({profile.reviewCount})</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
              {profile.bio}
            </p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {profile.expertise.slice(0, 3).map(skill => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {profile.expertise.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.expertise.length - 3} more
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              {profile.willMentor && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  <Award className="h-3 w-3 mr-1" />
                  Mentor
                </Badge>
              )}
              {profile.seekingMentor && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Target className="h-3 w-3 mr-1" />
                  Seeking Mentor
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {profile.immigrationStatus}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {profile.connectionStatus === 'none' && (
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Connect
                </Button>
              )}
              {profile.connectionStatus === 'pending' && (
                <Button size="sm" variant="outline" disabled>
                  Request Sent
                </Button>
              )}
              {profile.connectionStatus === 'connected' && (
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              )}
              
              <Button size="sm" variant="outline">
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EventCard = ({ event }: { event: NetworkingEvent }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{event.title}</h3>
              {event.type === 'virtual' && <Video className="h-4 w-4 text-blue-600" />}
              {event.type === 'in-person' && <Coffee className="h-4 w-4 text-orange-600" />}
              {event.type === 'hybrid' && <Globe className="h-4 w-4 text-purple-600" />}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {event.description}
            </p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {event.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
          
          {event.isPaid && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              ${event.price}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{event.currentAttendees}/{event.maxAttendees} attending</span>
            </div>
            <span>by {event.organizer}</span>
          </div>
          
          <div className="flex gap-2">
            {event.isRegistered ? (
              <Button size="sm" variant="outline">
                Registered
              </Button>
            ) : (
              <Button size="sm">
                {event.isPaid ? 'Register & Pay' : 'Register Free'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MentorshipMatching = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI-Powered Mentorship Matching
          </CardTitle>
          <CardDescription>
            Find the perfect mentor or mentee based on your profile and goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Looking for a Mentor?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect with experienced professionals who can guide your immigration journey
              </p>
              <Button className="w-full">
                <Target className="h-4 w-4 mr-2" />
                Find Mentors
              </Button>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Want to Become a Mentor?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share your knowledge and help others on their immigration journey
              </p>
              <Button variant="outline" className="w-full">
                <Award className="h-4 w-4 mr-2" />
                Become a Mentor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recommended Mentors</CardTitle>
            <CardDescription>Based on your profile and interests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockProfiles.filter(p => p.willMentor).map(profile => (
              <div key={profile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{profile.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{profile.name}</p>
                  <p className="text-xs text-gray-500">{profile.title}</p>
                </div>
                <Button size="sm" variant="outline">Connect</Button>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Potential Mentees</CardTitle>
            <CardDescription>People who could benefit from your expertise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockProfiles.filter(p => p.seekingMentor).map(profile => (
              <div key={profile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{profile.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{profile.name}</p>
                  <p className="text-xs text-gray-500">{profile.title}</p>
                </div>
                <Button size="sm" variant="outline">Offer Help</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Networking Hub</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with professionals, find mentors, and attend networking events
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="mentorship" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Mentorship
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search professionals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="toronto">Toronto</SelectItem>
                <SelectItem value="vancouver">Vancouver</SelectItem>
                <SelectItem value="montreal">Montreal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Expertise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expertise</SelectItem>
                <SelectItem value="express-entry">Express Entry</SelectItem>
                <SelectItem value="family-sponsorship">Family Sponsorship</SelectItem>
                <SelectItem value="work-permits">Work Permits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Profiles Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockProfiles.map(profile => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          {/* Events Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mentorship">
          <MentorshipMatching />
        </TabsContent>
      </Tabs>
    </div>
  );
}