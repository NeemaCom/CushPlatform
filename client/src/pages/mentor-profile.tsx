import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Clock, Globe, MessageCircle, Star, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

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
  availability?: {
    isActive: boolean;
    timezone: string;
    weekdays: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  };
}

export default function MentorProfilePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mentor, isLoading, error } = useQuery({
    queryKey: ["/api/community/mentors", id],
    queryFn: async () => {
      const response = await fetch(`/api/community/mentors/${id}`);
      if (!response.ok) throw new Error("Failed to fetch mentor");
      return response.json();
    },
  });

  const bookSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      return await apiRequest("/api/community/mentor-sessions", {
        method: "POST",
        body: JSON.stringify(sessionData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Booked",
        description: "Your mentoring session has been successfully booked!",
      });
      setLocation("/community/my-sessions");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book mentoring session",
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      finance: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      legal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      career: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      housing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      immigration: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    };
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  const handleBookSession = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to book a mentoring session",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/community/book-session/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading mentor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Mentor Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The mentor profile you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/community">
              <Button>Back to Community</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/community">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Community
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Profile */}
            <div className="lg:col-span-2">
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {mentor.specialty.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(mentor.specialty)}>
                            {mentor.specialty}
                          </Badge>
                          {mentor.hourlyRate && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${mentor.hourlyRate}/hour
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">5.0 (24 reviews)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleBookSession} disabled={bookSessionMutation.isPending}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {bookSessionMutation.isPending ? "Booking..." : "Book Session"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Bio */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">About</h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {mentor.bio}
                      </p>
                    </div>

                    {/* Experience */}
                    {mentor.experience && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Experience</h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {mentor.experience}
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Languages */}
                    {mentor.languages && mentor.languages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Languages</h3>
                        <div className="flex flex-wrap gap-2">
                          {mentor.languages.map((language, index) => (
                            <Badge key={index} variant="outline" className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {language}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {mentor.certifications && mentor.certifications.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Certifications</h3>
                        <div className="space-y-2">
                          {mentor.certifications.map((cert, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                              <span className="text-gray-700 dark:text-gray-300">{cert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LinkedIn */}
                    {mentor.linkedinUrl && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Professional Profile</h3>
                        <a 
                          href={mentor.linkedinUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Globe className="h-4 w-4" />
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Availability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mentor.availability?.isActive ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600 dark:text-green-400">Available</span>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Timezone</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {mentor.availability.timezone}
                        </p>
                      </div>

                      {mentor.availability.weekdays && mentor.availability.weekdays.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Schedule</p>
                          <div className="space-y-1">
                            {mentor.availability.weekdays.map((schedule, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {schedule.day}
                                </span>
                                <span className="text-gray-900 dark:text-gray-100">
                                  {schedule.startTime} - {schedule.endTime}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="h-2 w-2 bg-gray-400 rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Currently unavailable</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Connect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={handleBookSession} 
                    className="w-full"
                    disabled={!mentor.availability?.isActive || bookSessionMutation.isPending}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Book 1-on-1 Session
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    View Availability
                  </Button>
                </CardContent>
              </Card>

              {/* Pricing */}
              {mentor.hourlyRate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Session Pricing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${mentor.hourlyRate}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">per hour</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>30 min session</span>
                        <span>${(mentor.hourlyRate / 2).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>60 min session</span>
                        <span>${mentor.hourlyRate}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}