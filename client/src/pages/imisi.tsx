import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Send, Sparkles, Crown, MessageCircle, Lightbulb, ArrowRight } from "lucide-react";

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  createdAt: string;
}

interface ChatResponse {
  message: string;
  suggestions?: string[];
  actions?: Array<{
    type: 'navigate' | 'form' | 'external';
    label: string;
    data: any;
  }>;
}

interface ProactivePrompt {
  suggestion: string;
}

export default function Imisi() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'assistant', content: string, timestamp: Date }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Fetch chat history
  const { data: chatMessages, isLoading: historyLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/imisi/history"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  // Fetch proactive suggestions
  const { data: proactivePrompt } = useQuery<ProactivePrompt>({
    queryKey: ["/api/imisi/suggestions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  // Check subscription status
  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; status: string }>({
    queryKey: ["/api/subscription-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      return await apiRequest("POST", "/api/imisi/chat", { message: userMessage });
    },
    onSuccess: (response: ChatResponse, userMessage: string) => {
      setChatHistory(prev => [
        ...prev,
        { type: 'user', content: userMessage, timestamp: new Date() },
        { type: 'assistant', content: response.message, timestamp: new Date() }
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/imisi/history"] });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const userMessage = message.trim();
    setMessage("");
    chatMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Initialize chat history from server
  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      const history = chatMessages.map(msg => [
        { type: 'user' as const, content: msg.message, timestamp: new Date(msg.createdAt) },
        { type: 'assistant' as const, content: msg.response, timestamp: new Date(msg.createdAt) }
      ]).flat();
      setChatHistory(history);
    }
  }, [chatMessages]);

  if (isLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Skeleton className="h-8 w-48 mx-auto mb-4" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isPremium = subscriptionStatus?.hasActiveSubscription || false;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                  Imisi 2.0
                  <Sparkles className="h-6 w-6 text-purple-500" />
                </h1>
                <p className="text-gray-600 mt-2">Your AI-powered migration assistant</p>
              </div>
              {!isPremium && (
                <Button
                  onClick={() => window.location.href = '/subscribe'}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </div>

          {/* Proactive Suggestions */}
          {proactivePrompt && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-2">Personalized Suggestion</p>
                    <p className="text-blue-800 text-sm">{proactivePrompt.suggestion}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-blue-600 hover:text-blue-700 p-0 h-auto"
                      onClick={() => setMessage(proactivePrompt.suggestion)}
                    >
                      Ask Imisi <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat Interface */}
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                Chat with Imisi
                {isPremium && <Badge className="bg-purple-100 text-purple-800">Premium</Badge>}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatHistory.length === 0 && !historyLoading && (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Welcome! I'm Imisi, your migration assistant.</p>
                    <p className="text-gray-400 text-sm">Ask me anything about your migration journey.</p>
                  </div>
                )}

                {historyLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                )}

                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                        <span className="text-xs text-gray-500">Imisi is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Imisi about your migration journey..."
                    className="flex-1"
                    disabled={chatMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || chatMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}