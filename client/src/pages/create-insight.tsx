import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, FileText, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const createInsightSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  excerpt: z.string().max(300, "Excerpt must be less than 300 characters").optional(),
  category: z.string().min(1, "Please select a category"),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readTime: z.number().min(1).max(120).optional(),
});

type CreateInsightData = z.infer<typeof createInsightSchema>;

export default function CreateInsightPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const form = useForm<CreateInsightData>({
    resolver: zodResolver(createInsightSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      category: undefined,
      tags: [],
      featuredImage: "",
      readTime: undefined,
    },
  });

  const createInsightMutation = useMutation({
    mutationFn: async (data: CreateInsightData) => {
      return await apiRequest("/api/community/insights", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          tags,
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Insight Published",
        description: "Your insight has been successfully shared with the community!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/community/insights"] });
      setLocation(`/community/insights/${data.id}`);
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
        title: "Publication Failed",
        description: error.message || "Failed to publish insight",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateInsightData) => {
    createInsightMutation.mutate(data);
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  const contentValue = form.watch("content");
  const estimatedReadTime = contentValue ? estimateReadTime(contentValue) : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => setLocation("/community")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Share Your Insight
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Help fellow migrants with your knowledge and experience
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Create New Insight
              </CardTitle>
              <CardDescription>
                Share valuable migration insights, tips, and experiences with the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Complete Guide to Opening a Bank Account in Canada"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="migration">Migration</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="housing">Housing</SelectItem>
                            <SelectItem value="employment">Employment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Excerpt */}
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A brief summary of your insight (optional)"
                            className="h-20"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          This will be shown in the insight preview
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Content */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Share your detailed insights, tips, and experiences..."
                            className="h-64"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Estimated read time: {estimatedReadTime} minute{estimatedReadTime !== 1 ? 's' : ''}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Featured Image */}
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Featured Image URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image.jpg"
                            type="url"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: Add a featured image to make your insight more engaging
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tags */}
                  <div className="space-y-2">
                    <FormLabel>Tags</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-md text-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormDescription>
                      Add relevant tags to help others find your insight
                    </FormDescription>
                  </div>

                  {/* Read Time */}
                  <FormField
                    control={form.control}
                    name="readTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Read Time (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            max="120"
                            placeholder={estimatedReadTime.toString()}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Estimated: {estimatedReadTime} minute{estimatedReadTime !== 1 ? 's' : ''} (auto-calculated)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setLocation("/community")}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createInsightMutation.isPending}
                      className="flex-1"
                    >
                      {createInsightMutation.isPending ? "Publishing..." : "Publish Insight"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}