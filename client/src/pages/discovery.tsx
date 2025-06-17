import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MapPin, DollarSign, Calendar, Users, Home, Briefcase, Search, Filter, ExternalLink, Phone, Mail } from "lucide-react";

interface JobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  country: string;
  city: string;
  description: string;
  jobType: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  applicationLink: string;
  requirements: string[];
  benefits: string[];
  remote: boolean;
  experience: string;
  industry: string;
  companySize: string;
  postedDate: string;
}

interface HousingListing {
  id: number;
  title: string;
  address: string;
  city: string;
  country: string;
  rentAmount: number;
  currency: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  utilitiesIncluded: boolean;
  petsAllowed: boolean;
  availabilityDate: string;
  description: string;
  amenities: string[];
  photos: string[];
  contactEmail: string;
  contactPhone?: string;
  area: number;
  deposit: number;
  minimumStay: number;
  createdAt: string;
}

export default function DiscoveryBoard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [activeTab, setActiveTab] = useState("jobs");

  // Fetch jobs data
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobListing[]>({
    queryKey: ["/api/jobs"],
    queryFn: getQueryFn(),
  });

  // Fetch housing data
  const { data: housing = [], isLoading: housingLoading } = useQuery<HousingListing[]>({
    queryKey: ["/api/housing"],
    queryFn: getQueryFn(),
  });

  // Filter jobs based on search criteria
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = !locationFilter || 
      job.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
      job.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
      job.country.toLowerCase().includes(locationFilter.toLowerCase());
    
    return matchesSearch && matchesLocation;
  });

  // Filter housing based on search criteria
  const filteredHousing = housing.filter(listing => {
    const matchesSearch = !searchTerm || 
      listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = !locationFilter || 
      listing.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
      listing.country.toLowerCase().includes(locationFilter.toLowerCase()) ||
      listing.address.toLowerCase().includes(locationFilter.toLowerCase());
    
    return matchesSearch && matchesLocation;
  });

  const formatSalary = (min: number, max: number, currency: string) => {
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getExperienceColor = (experience: string) => {
    switch (experience) {
      case 'entry': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'mid': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'senior': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Housing & Jobs Discovery Board
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Find your next opportunity and home in one place
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs or housing..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Location (city, country)..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setSearchTerm("");
                setLocationFilter("");
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Tabs for Jobs and Housing */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs ({filteredJobs.length})
            </TabsTrigger>
            <TabsTrigger value="housing" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Housing ({filteredHousing.length})
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            {jobsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No jobs found matching your criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <CardDescription className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {job.company}
                          </CardDescription>
                        </div>
                        <Badge className={getExperienceColor(job.experience)}>
                          {job.experience}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                        {job.remote && <Badge variant="secondary" className="ml-2">Remote</Badge>}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {job.requirements.slice(0, 3).map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {job.requirements.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.requirements.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(job.postedDate)}
                        </div>
                        <Button size="sm" asChild>
                          <a href={job.applicationLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Apply
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Housing Tab */}
          <TabsContent value="housing" className="space-y-6">
            {housingLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading housing...</p>
              </div>
            ) : filteredHousing.length === 0 ? (
              <div className="text-center py-8">
                <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No housing found matching your criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHousing.map((listing) => (
                  <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{listing.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {listing.address}, {listing.city}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {listing.propertyType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-lg font-semibold text-green-600 dark:text-green-400">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {listing.currency} {listing.rentAmount.toLocaleString()}/month
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {listing.area}m²
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {listing.bedrooms} bed, {listing.bathrooms} bath
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Available {formatDate(listing.availabilityDate)}
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                        {listing.description}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {listing.furnished && <Badge variant="outline" className="text-xs">Furnished</Badge>}
                        {listing.utilitiesIncluded && <Badge variant="outline" className="text-xs">Utilities Included</Badge>}
                        {listing.petsAllowed && <Badge variant="outline" className="text-xs">Pet-Friendly</Badge>}
                        {listing.amenities.slice(0, 2).map((amenity, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <a href={`mailto:${listing.contactEmail}`}>
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </a>
                          </Button>
                          {listing.contactPhone && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`tel:${listing.contactPhone}`}>
                                <Phone className="h-3 w-3 mr-1" />
                                Call
                              </a>
                            </Button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Deposit: {listing.currency} {listing.deposit.toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}