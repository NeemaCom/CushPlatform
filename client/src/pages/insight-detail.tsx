import React from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Calendar } from "lucide-react";

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
  updatedAt: string;
}

export default function InsightDetailPage() {
  const { id } = useParams();

  const { data: insight, isLoading, error } = useQuery({
    queryKey: ["/api/community/insights", id],
    queryFn: async () => {
      const response = await fetch(`/api/community/insights/${id}`);
      if (!response.ok) throw new Error("Failed to fetch insight");
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      migration: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      finance: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      legal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      housing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      employment: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    };
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading insight...</p>
        </div>
      </div>
    );
  }

  if (error || !insight) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Insight Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The insight you're looking for doesn't exist or has been removed.
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
          <article className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            {/* Featured Image */}
            {insight.featuredImage && (
              <div className="h-64 md:h-96 overflow-hidden">
                <img 
                  src={insight.featuredImage} 
                  alt={insight.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Article Header */}
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <Badge className={getCategoryColor(insight.category)}>
                  {insight.category}
                </Badge>
                {insight.readTime && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {insight.readTime} min read
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(insight.createdAt)}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <User className="h-4 w-4 mr-1" />
                  Author ID: {insight.authorId}
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                {insight.title}
              </h1>

              {insight.excerpt && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                  {insight.excerpt}
                </p>
              )}

              {/* Content */}
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <div 
                  className="text-gray-800 dark:text-gray-200 leading-relaxed"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {insight.content}
                </div>
              </div>

              {/* Tags */}
              {insight.tags && insight.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {insight.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Related Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/community">
              <Button variant="outline" className="w-full sm:w-auto">
                Browse More Insights
              </Button>
            </Link>
            <Link href="/community/create-insight">
              <Button className="w-full sm:w-auto">
                Share Your Insight
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}