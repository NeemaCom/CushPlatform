import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  country: string;
  image: string;
  rating: number;
  content: string;
  journey: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Software Engineer",
    country: "Canada",
    image: "/api/placeholder/64/64",
    rating: 5,
    content: "Cush made my Express Entry application seamless. The AI guidance was incredibly accurate, and I received my PR in just 6 months!",
    journey: "Nigeria → Canada"
  },
  {
    id: 2,
    name: "David Rodriguez",
    role: "Healthcare Professional",
    country: "Australia",
    image: "/api/placeholder/64/64",
    rating: 5,
    content: "The financial planning tools helped me budget perfectly for my move. The community support was invaluable during the entire process.",
    journey: "Philippines → Australia"
  },
  {
    id: 3,
    name: "Amara Okonkwo",
    role: "Business Analyst",
    country: "UK",
    image: "/api/placeholder/64/64",
    rating: 5,
    content: "From document preparation to settlement planning, Cush guided me every step of the way. Now living my dream in London!",
    journey: "Ghana → United Kingdom"
  },
  {
    id: 4,
    name: "Michael Thompson",
    role: "Digital Marketing",
    country: "New Zealand",
    image: "/api/placeholder/64/64",
    rating: 5,
    content: "The mentor matching feature connected me with someone who had the exact same journey. Their insights were game-changing.",
    journey: "South Africa → New Zealand"
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Success Stories From Our Community
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join thousands who have successfully navigated their immigration journey with Cush
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="h-full hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 h-full flex flex-col">
                {/* Quote Icon */}
                <Quote className="h-8 w-8 text-blue-500 mb-4" />
                
                {/* Content */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 flex-grow leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {testimonial.journey}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Ready to write your own success story?
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
            Start Your Journey Today
          </button>
        </div>
      </div>
    </section>
  );
}