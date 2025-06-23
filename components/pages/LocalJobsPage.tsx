import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Search, 
  Filter,
  Briefcase,
  Clock,
  DollarSign,
  Users,
  Star,
  BookOpen,
  TrendingUp,
  Heart,
  Share,
  Eye,
  Building
} from 'lucide-react';

const jobListings = [
  {
    id: 1,
    title: 'Software Developer',
    company: 'TechCorp Inc.',
    location: 'Toronto, ON',
    type: 'Full-time',
    salary: '$70,000 - $90,000',
    posted: '2 days ago',
    description: 'We are looking for a skilled software developer to join our growing team. Experience with React, Node.js, and cloud technologies preferred.',
    requirements: ['2+ years experience', 'React.js', 'Node.js', 'Git'],
    benefits: ['Health insurance', 'Remote work options', 'Professional development'],
    sponsorsVisa: true,
    saved: false,
    logo: '💻'
  },
  {
    id: 2,
    title: 'Marketing Coordinator',
    company: 'Global Marketing Solutions',
    location: 'Vancouver, BC',
    type: 'Full-time',
    salary: '$45,000 - $55,000',
    posted: '1 day ago',
    description: 'Join our dynamic marketing team! Help develop and execute marketing campaigns for international clients.',
    requirements: ['Bachelor\'s degree', 'Social media experience', 'Communication skills'],
    benefits: ['Flexible hours', 'Training programs', 'Career advancement'],
    sponsorsVisa: true,
    saved: true,
    logo: '📈'
  },
  {
    id: 3,
    title: 'Data Analyst',
    company: 'FinanceFirst Ltd.',
    location: 'Montreal, QC',
    type: 'Contract',
    salary: '$35/hour',
    posted: '3 days ago',
    description: 'Analyze financial data and create reports for senior management. Perfect for recent graduates with analytical skills.',
    requirements: ['Excel proficiency', 'SQL knowledge', 'Statistics background'],
    benefits: ['Flexible schedule', 'Mentorship program', 'Networking opportunities'],
    sponsorsVisa: false,
    saved: false,
    logo: '📊'
  },
  {
    id: 4,
    title: 'Customer Service Representative',
    company: 'ServicePro Canada',
    location: 'Calgary, AB',
    type: 'Part-time',
    salary: '$18 - $22/hour',
    posted: '1 week ago',
    description: 'Provide excellent customer service via phone, email, and chat. Great entry-level opportunity for newcomers.',
    requirements: ['Strong communication', 'Bilingual (English/French) preferred', 'Customer focus'],
    benefits: ['Training provided', 'Performance bonuses', 'Growth opportunities'],
    sponsorsVisa: true,
    saved: false,
    logo: '🎧'
  }
];

const jobCategories = [
  { name: 'Technology', count: 45, icon: '💻' },
  { name: 'Healthcare', count: 32, icon: '🏥' },
  { name: 'Finance', count: 28, icon: '💰' },
  { name: 'Education', count: 23, icon: '📚' },
  { name: 'Marketing', count: 19, icon: '📈' },
  { name: 'Engineering', count: 16, icon: '⚙️' }
];

const featuredEmployers = [
  { name: 'TechCorp Inc.', jobs: 12, rating: 4.8, logo: '🏢' },
  { name: 'HealthPlus Systems', jobs: 8, rating: 4.6, logo: '🏥' },
  { name: 'EduLearn Canada', jobs: 6, rating: 4.9, logo: '🎓' },
  { name: 'GreenEnergy Solutions', jobs: 4, rating: 4.7, logo: '🌱' }
];

export function LocalJobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'saved' | 'applied'>('browse');

  const filteredJobs = jobListings.filter(job => {
    return (
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const JobCard = ({ job }: { job: typeof jobListings[0] }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{job.logo}</div>
            <div className="flex-1">
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building className="h-3 w-3" />
                {job.company}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <Heart className={`h-4 w-4 ${job.saved ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{job.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>{job.salary}</span>
          </div>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300">{job.description}</p>

        <div className="flex flex-wrap gap-2">
          {job.requirements.slice(0, 3).map((req, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {req}
            </Badge>
          ))}
          {job.requirements.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{job.requirements.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {job.sponsorsVisa && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                Visa Sponsor
              </Badge>
            )}
            <span className="text-xs text-gray-500">{job.posted}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button size="sm">Apply</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const BrowseJobs = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Job title, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger>
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );

  const SavedJobs = () => (
    <div className="space-y-4">
      {jobListings.filter(job => job.saved).map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
      {jobListings.filter(job => job.saved).length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
            <p className="text-gray-500 mb-4">Start saving jobs you're interested in</p>
            <Button onClick={() => setActiveTab('browse')}>Browse Jobs</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const AppliedJobs = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-gray-500 mb-4">Applied jobs will appear here</p>
          <Button onClick={() => setActiveTab('browse')}>Find Jobs</Button>
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
            variant={activeTab === 'browse' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('browse')}
            className="rounded-md"
          >
            <Search className="h-4 w-4 mr-2" />
            Browse Jobs
          </Button>
          <Button
            variant={activeTab === 'saved' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('saved')}
            className="rounded-md"
          >
            <Heart className="h-4 w-4 mr-2" />
            Saved Jobs
          </Button>
          <Button
            variant={activeTab === 'applied' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('applied')}
            className="rounded-md"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Applied Jobs
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'browse' && <BrowseJobs />}
        {activeTab === 'saved' && <SavedJobs />}
        {activeTab === 'applied' && <AppliedJobs />}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Job Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Popular Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobCategories.map((category) => (
                <Button
                  key={category.name}
                  variant="ghost"
                  className="w-full justify-between h-auto p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <Badge variant="secondary">{category.count}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Featured Employers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5" />
              Featured Employers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featuredEmployers.map((employer) => (
                <div key={employer.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <div className="text-xl">{employer.logo}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{employer.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{employer.jobs} open positions</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{employer.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Market Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Market Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">1,247</p>
              <p className="text-sm text-gray-500">New jobs this week</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">68%</p>
              <p className="text-sm text-gray-500">Offer visa sponsorship</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">$58K</p>
              <p className="text-sm text-gray-500">Average salary</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Search Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-2">
              <p>• Customize your resume for each application</p>
              <p>• Research company culture and values</p>
              <p>• Practice common interview questions</p>
              <p>• Follow up after submitting applications</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}