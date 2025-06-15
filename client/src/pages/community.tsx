import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calendar, BookOpen, MessageCircle, Clock, MapPin, User } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Insight {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  featuredImage?: string;
  readTime?: number;
  authorId: number;
  createdAt: string;
}

interface Mentor {
  id: number;
  userId: number;
  specialty: string;
  bio: string;
  experience?: string;
  hourlyRate?: number;
  languages?: string[];
  certifications?: string[];
  linkedinUrl?: string;
  isActive: boolean;
}

interface CommunityEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  duration?: number;
  location?: string;
  isOnline: boolean;
  meetingLink?: string;
  maxAttendees?: number;
  tags?: string[];
  featuredImage?: string;
  organizerId: number;
}

export default function CommunityPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");

  // Fetch insights
  const { data: insights = [] } = useQuery({
    queryKey: ["/api/community/insights", { category: selectedCategory }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      const response = await fetch(`/api/community/insights?${params}`);
      if (!response.ok) throw new Error("Failed to fetch insights");
      return response.json();
    },
  });

  // Fetch mentors
  const { data: mentors = [] } = useQuery({
    queryKey: ["/api/community/mentors", { specialty: selectedSpecialty }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSpecialty) params.append("specialty", selectedSpecialty);
      const response = await fetch(`/api/community/mentors?${params}`);
      if (!response.ok) throw new Error("Failed to fetch mentors");
      return response.json();
    },
  });

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ["/api/community/events"],
    queryFn: async () => {
      const response = await fetch("/api/community/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  // Filter insights based on search
  const filteredInsights = insights.filter((insight: Insight) =>
    insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insight.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter mentors based on search
  const filteredMentors = mentors.filter((mentor: Mentor) =>
    mentor.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter events based on search
  const filteredEvents = events.filter((event: CommunityEvent) =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      migration: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      finance: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      legal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      housing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      employment: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      workshop: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      webinar: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
      networking: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      support_group: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Community Hub
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Connect with fellow migrants, share insights, find mentors, and join events to make your relocation journey smoother.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <Input
            type="text"
            placeholder="Search insights, mentors, or events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 text-lg"
          />
        </div>

        {/* Community Tabs */}
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="mentors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mentors
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>

          {/* Community Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="migration">Migration</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="employment">Employment</SelectItem>
                </SelectContent>
              </Select>
              {isAuthenticated && (
                <Button onClick={() => setLocation("/community/create-insight")}>
                  Share Insight
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInsights.map((insight: Insight) => (
                <Card key={insight.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/community/insights/${insight.id}`)}>
                  {insight.featuredImage && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img 
                        src={insight.featuredImage} 
                        alt={insight.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getCategoryColor(insight.category)}>
                        {insight.category}
                      </Badge>
                      {insight.readTime && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {insight.readTime} min read
                        </div>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2">{insight.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {insight.excerpt || insight.content.substring(0, 150) + "..."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {insight.tags?.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(insight.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Mentors Tab */}
          <TabsContent value="mentors" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Specialties</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="career">Career</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="immigration">Immigration</SelectItem>
                </SelectContent>
              </Select>
              {isAuthenticated && (
                <Button onClick={() => setLocation("/community/become-mentor")}>
                  Become a Mentor
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map((mentor: Mentor) => (
                <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <Badge className={getCategoryColor(mentor.specialty)}>
                          {mentor.specialty}
                        </Badge>
                        {mentor.hourlyRate && (
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${mentor.hourlyRate}/hour
                          </p>
                        )}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-4">
                      {mentor.bio}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {mentor.languages && mentor.languages.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Languages:</p>
                        <div className="flex flex-wrap gap-1">
                          {mentor.languages.slice(0, 3).map((language, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {language}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {mentor.certifications && mentor.certifications.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Certifications:</p>
                        <div className="flex flex-wrap gap-1">
                          {mentor.certifications.slice(0, 2).map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setLocation(`/community/mentors/${mentor.id}`)}
                      >
                        View Profile
                      </Button>
                      {isAuthenticated && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setLocation(`/community/book-session/${mentor.id}`)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-end mb-6">
              {isAuthenticated && (
                <Button onClick={() => setLocation("/community/create-event")}>
                  Create Event
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event: CommunityEvent) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/community/events/${event.id}`)}>
                  {event.featuredImage && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img 
                        src={event.featuredImage} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getCategoryColor(event.category)}>
                        {event.category.replace("_", " ")}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        {event.isOnline ? (
                          <div className="flex items-center">
                            <div className="h-2 w-2 bg-green-500 rounded-full mr-1" />
                            Online
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            In-person
                          </div>
                        )}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(event.date)}
                      </div>
                      {event.duration && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          {event.duration} minutes
                        </div>
                      )}
                      {!event.isOnline && event.location && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {event.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {isAuthenticated && (
                      <Button size="sm" className="w-full">
                        Register for Event
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}