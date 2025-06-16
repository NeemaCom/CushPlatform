import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, Building, Search, Filter } from 'lucide-react';
import { JobListing, SearchJobsQuery } from '@shared/schema';

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState<SearchJobsQuery>({
    location: '',
    keywords: '',
    jobType: 'full-time',
    salaryMin: undefined,
    salaryMax: undefined,
    page: 1,
    limit: 10
  });

  const { data: jobs, isLoading, error } = useQuery<JobListing[]>({
    queryKey: ['/api/jobs/search', searchQuery],
    enabled: true
  });

  const handleSearch = (updates: Partial<SearchJobsQuery>) => {
    setSearchQuery(prev => ({ ...prev, ...updates, page: 1 }));
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return 'Salary not specified';
  };

  const formatJobType = (type: string) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Discovery</h1>
            <p className="text-gray-600 dark:text-gray-400">Find your next opportunity</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Keywords</label>
                <Input
                  placeholder="e.g. Software Engineer, Marketing"
                  value={searchQuery.keywords || ''}
                  onChange={(e) => handleSearch({ keywords: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  placeholder="e.g. New York, NY"
                  value={searchQuery.location || ''}
                  onChange={(e) => handleSearch({ location: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Job Type</label>
                <Select
                  value={searchQuery.jobType}
                  onValueChange={(value) => handleSearch({ jobType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Min Salary</label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={searchQuery.salaryMin || ''}
                  onChange={(e) => handleSearch({ 
                    salaryMin: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Searching for jobs...</p>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Error loading jobs. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {jobs && jobs.length === 0 && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No jobs found matching your criteria. Try adjusting your search.
              </p>
            </CardContent>
          </Card>
        )}

        {jobs && jobs.length > 0 && (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {job.company}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatJobType(job.jobType)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {job.remote ? 'Remote' : 'On-site'}
                    </Badge>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                    {job.description}
                  </p>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                      <DollarSign className="h-4 w-4" />
                      {formatSalary(job.salaryMin, job.salaryMax)}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(job.applicationLink, '_blank')}
                      >
                        View Details
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => window.open(job.applicationLink, '_blank')}
                      >
                        Apply Now
                      </Button>
                    </div>
                  </div>

                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Key Requirements:
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {job.requirements.slice(0, 5).map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {job.requirements.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.requirements.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}