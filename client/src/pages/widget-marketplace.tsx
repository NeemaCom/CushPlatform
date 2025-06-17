import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Download, Search, Plus, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WidgetType {
  id: number;
  name: string;
  displayName: string;
  description: string;
  category: string;
  version: string;
  developer: string;
  icon?: string;
  previewImage?: string;
  isActive: boolean;
  isPremium: boolean;
  price: string;
  downloadCount: number;
  rating: string;
  ratingCount: number;
  configSchema?: Record<string, any>;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function WidgetMarketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ['/api/widgets', selectedCategory, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      return fetch(`/api/widgets?${params}`).then(res => res.json());
    }
  });

  const installWidgetMutation = useMutation({
    mutationFn: async (widgetTypeId: number) => {
      return apiRequest('/api/user-widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetTypeId,
          position: { x: 0, y: 0, w: 4, h: 4 }, // Default position
          config: {}
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Widget Installed",
        description: "Widget has been added to your dashboard"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-widgets'] });
    },
    onError: (error: any) => {
      toast({
        title: "Installation Failed",
        description: error.message || "Failed to install widget",
        variant: "destructive"
      });
    }
  });

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "financial", label: "Financial" },
    { value: "analytics", label: "Analytics" },
    { value: "productivity", label: "Productivity" },
    { value: "social", label: "Social" },
    { value: "news", label: "News" },
    { value: "weather", label: "Weather" },
    { value: "calendar", label: "Calendar" }
  ];

  const handleInstallWidget = (widgetId: number) => {
    installWidgetMutation.mutate(widgetId);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? "fill-yellow-400 text-yellow-400" 
            : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Widget Marketplace
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and install widgets to customize your dashboard
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Widget Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map((widget: WidgetType) => (
            <Card key={widget.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {widget.displayName}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      by {widget.developer} • v{widget.version}
                    </CardDescription>
                  </div>
                  {widget.isPremium && (
                    <Badge variant="secondary" className="ml-2">
                      Premium
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="w-fit">
                  {widget.category}
                </Badge>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                  {widget.description}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    {renderStars(parseFloat(widget.rating))}
                    <span className="ml-1">
                      {parseFloat(widget.rating).toFixed(1)} ({widget.ratingCount})
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Download className="w-4 h-4" />
                    <span>{widget.downloadCount}</span>
                  </div>
                </div>

                {widget.permissions && widget.permissions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Permissions:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {widget.permissions.map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  onClick={() => handleInstallWidget(widget.id)}
                  disabled={installWidgetMutation.isPending}
                  className="w-full"
                  variant={widget.isPremium ? "outline" : "default"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {widget.isPremium 
                    ? `Install - $${widget.price}` 
                    : "Install Free"
                  }
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && widgets.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No widgets found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search criteria or browse different categories
          </p>
        </div>
      )}
    </div>
  );
}