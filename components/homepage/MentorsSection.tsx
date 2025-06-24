import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Star, MessageCircle, MapPin, Briefcase } from 'lucide-react';

interface Mentor {
  id: number;
  name: string;
  title: string;
  location: string;
  expertise: string[];
  rating: number;
  reviews: number;
  description: string;
  image: string;
  journey: string;
  languages: string[];
  specializations: string[];
}

const mentors: Mentor[] = [
  {
    id: 1,
    name: "Dr. Aisha Patel",
    title: "Immigration Lawyer & Consultant",
    location: "Toronto, Canada",
    expertise: ["Express Entry", "Provincial Nomination", "Family Sponsorship"],
    rating: 4.9,
    reviews: 156,
    description: "Helped 500+ professionals successfully immigrate to Canada. Specializes in tech and healthcare workers.",
    image: "/api/placeholder/80/80",
    journey: "India → Canada (2018)",
    languages: ["English", "Hindi", "Gujarati"],
    specializations: ["Canadian Immigration", "Work Permits", "Settlement Services"]
  },
  {
    id: 2,
    name: "James Mitchell",
    title: "Migration Agent (MARA Certified)",
    location: "Sydney, Australia",
    expertise: ["Skilled Migration", "Student Visas", "Employer Nomination"],
    rating: 4.8,
    reviews: 203,
    description: "15+ years experience in Australian immigration. Former immigration officer with insider insights.",
    image: "/api/placeholder/80/80",
    journey: "UK → Australia (2009)",
    languages: ["English"],
    specializations: ["Australian Points System", "Regional Visas", "Business Migration"]
  },
  {
    id: 3,
    name: "Sofia Andersson",
    title: "EU Immigration Specialist",
    location: "Stockholm, Sweden",
    expertise: ["EU Blue Card", "Nordic Countries", "Work Permits"],
    rating: 4.9,
    reviews: 89,
    description: "Expert in Scandinavian and EU immigration policies. Helps professionals relocate across Europe.",
    image: "/api/placeholder/80/80",
    journey: "Brazil → Sweden (2015)",
    languages: ["English", "Swedish", "Portuguese", "Spanish"],
    specializations: ["EU Immigration", "Nordic Settlement", "Tech Talent Mobility"]
  },
  {
    id: 4,
    name: "Ahmed Hassan",
    title: "Middle East Immigration Expert",
    location: "Dubai, UAE",
    expertise: ["Gulf Countries", "Investment Visas", "Business Setup"],
    rating: 4.7,
    reviews: 134,
    description: "Specialized in GCC immigration and business setup. Helps entrepreneurs and investors.",
    image: "/api/placeholder/80/80",
    journey: "Egypt → UAE (2012)",
    languages: ["Arabic", "English", "French"],
    specializations: ["GCC Immigration", "Investment Visas", "Business Migration"]
  },
  {
    id: 5,
    name: "Maria Santos",
    title: "Latin America Migration Consultant",
    location: "São Paulo, Brazil",
    expertise: ["South America", "Portuguese Speaking Countries", "Student Exchange"],
    rating: 4.8,
    reviews: 97,
    description: "Helps connect Latin American professionals with global opportunities.",
    image: "/api/placeholder/80/80",
    journey: "Colombia → Brazil (2017)",
    languages: ["Spanish", "Portuguese", "English"],
    specializations: ["Latin American Immigration", "Student Programs", "Professional Exchange"]
  }
];

export function MentorsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;
  const maxIndex = Math.max(0, mentors.length - itemsPerPage);

  const nextSlide = () => {
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const visibleMentors = mentors.slice(currentIndex, currentIndex + itemsPerPage);

  return (
    <section className="py-16 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Connect With Expert Mentors
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get personalized guidance from immigration experts who have walked your path
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white dark:bg-gray-700 shadow-lg rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          <button
            onClick={nextSlide}
            disabled={currentIndex >= maxIndex}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white dark:bg-gray-700 shadow-lg rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Mentors Grid */}
          <div className="grid lg:grid-cols-3 gap-6 transition-all duration-300">
            {visibleMentors.map((mentor) => (
              <Card key={mentor.id} className="hover:shadow-xl transition-shadow duration-300 border-0 shadow-md">
                <CardContent className="p-6">
                  {/* Mentor Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {mentor.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {mentor.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {mentor.title}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="h-3 w-3" />
                        {mentor.location}
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 font-semibold">{mentor.rating}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ({mentor.reviews} reviews)
                    </span>
                  </div>

                  {/* Journey */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Migration Journey
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {mentor.journey}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    {mentor.description}
                  </p>

                  {/* Expertise Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mentor.expertise.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {/* Languages */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Languages: {mentor.languages.join(', ')}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                    <Button variant="outline" className="px-4">
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: Math.ceil(mentors.length / itemsPerPage) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index * itemsPerPage)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  Math.floor(currentIndex / itemsPerPage) === index
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Want to become a mentor and help others?
          </p>
          <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            Join Our Mentor Network
          </Button>
        </div>
      </div>
    </section>
  );
}