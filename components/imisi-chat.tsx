import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles, MessageCircle, X, Minimize2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  sessionId?: string;
  timestamp: string;
}

interface AIResponse {
  id: number;
  message: string;
  suggestions?: string[];
  actions?: Array<{
    type: 'navigate' | 'form' | 'external';
    label: string;
    data: any;
  }>;
  sessionId: string;
  timestamp: string;
}

interface ProactiveSuggestion {
  suggestion: string | null;
  timestamp: string;
}

interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export function ImisiChatHead() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNewSuggestion, setHasNewSuggestion] = useState(true);
  const [, setLocation] = useLocation();

  // Check if user is authenticated
  const { data: user } = useQuery<{ id: number; email: string; role: string; firstName: string; lastName: string }>({
    queryKey: ['/api/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get proactive suggestions - only if user is authenticated
  const { data: proactiveSuggestion } = useQuery<ProactiveSuggestion>({
    queryKey: ['/api/imisi/suggestions'],
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    retry: false,
    staleTime: 4 * 60 * 1000, // 4 minutes
    enabled: !!user, // Only fetch if user is logged in
  });

  // Check subscription status - only if user is authenticated
  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; status: string }>({
    queryKey: ['/api/subscription-status'],
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!user, // Only fetch if user is logged in
  });

  React.useEffect(() => {
    if (proactiveSuggestion?.suggestion && !isOpen) {
      setHasNewSuggestion(true);
    }
  }, [proactiveSuggestion?.suggestion, isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setHasNewSuggestion(false);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const hasActiveSub = subscriptionStatus?.hasActiveSubscription;

  // Only show chat head if user is authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Proactive Suggestion Bubble */}
      {proactiveSuggestion?.suggestion && !isOpen && hasNewSuggestion && (
        <div className="fixed bottom-24 right-6 z-40 max-w-xs animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow-lg border border-blue-200 dark:border-blue-700 p-4 relative">
            <button
              onClick={() => setHasNewSuggestion(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Imisi suggests:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 pr-4">{proactiveSuggestion.suggestion}</p>
                <button
                  onClick={toggleChat}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Chat with Imisi →
                </button>
              </div>
            </div>
            <div className="absolute bottom-0 right-8 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-200 dark:border-t-blue-700 transform translate-y-full"></div>
          </div>
        </div>
      )}

      {/* Enhanced Chat Head */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className={`relative w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group overflow-hidden ${
            isOpen ? 'scale-110' : 'hover:scale-105'
          } ${hasNewSuggestion ? 'animate-bounce' : ''}`}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Icon Container */}
          <div className="relative z-10 transition-transform duration-200">
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <div className="flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-xs">🧠</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Pulse Animation */}
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
          
          {/* Online Indicator */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
          </div>

          {/* AI Badge */}
          <div className="absolute -bottom-1 -left-1 bg-white rounded-full px-2 py-0.5 shadow-md">
            <span className="text-xs font-bold text-blue-600">AI</span>
          </div>
        </button>
      </div>

      {/* Enhanced Chat Interface */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 z-40 transition-all duration-300 ${
          isMinimized ? 'h-12' : 'h-[500px] sm:h-[600px]'
        } w-80 sm:w-96 max-w-[calc(100vw-2rem)]`}>
          <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <span className="text-base sm:text-lg">🤖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg truncate">Imisi 2.0</h3>
                  <p className="text-xs sm:text-sm opacity-90 truncate">AI Migration Concierge</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium hidden sm:inline">Online</span>
                  </div>
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="w-7 h-7 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
                  >
                    {isMinimized ? <Bot className="h-3 w-3 sm:h-4 sm:w-4" /> : <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <div className="flex-1 min-h-0 flex flex-col">
                <ImisiChatInterface />
              </div>
            )}
          </div>
        </div>
      )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <CardTitle className="text-lg">Imisi 2.0</CardTitle>
                  {subscriptionStatus?.hasActiveSubscription ? (
                    <Badge variant="secondary" className="text-xs bg-yellow-500/90 text-yellow-900">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setLocation('/subscribe')}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 h-6"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Upgrade
                    </Button>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="text-white hover:bg-white/20 p-1 h-7 w-7"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 p-1 h-7 w-7"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {!isMinimized && (
              <CardContent className="p-0 flex flex-col h-[432px]">
                <ImisiChatInterface 
                  proactiveSuggestion={proactiveSuggestion?.suggestion}
                />
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function ImisiChatInterface({ proactiveSuggestion }: { proactiveSuggestion?: string | null }) {
  const [message, setMessage] = useState('');
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'ai'; content: string; suggestions?: string[]; actions?: any[] }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Get chat history
  const { data: chatHistory } = useQuery<ChatHistoryResponse>({
    queryKey: ['/api/imisi/history'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get subscription status
  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; status: string }>({
    queryKey: ['/api/subscription-status'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle chat history data
  React.useEffect(() => {
    if (chatHistory?.messages && Array.isArray(chatHistory.messages) && chatHistory.messages.length > 0) {
      const formattedMessages = [...chatHistory.messages].reverse().flatMap((msg: ChatMessage) => [
        { type: 'user' as const, content: msg.message },
        { type: 'ai' as const, content: msg.response }
      ]);
      setMessages(formattedMessages);
    }
  }, [chatHistory]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; sessionId: string }) => {
      const response = await fetch('/api/imisi/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
      
      return response.json() as Promise<AIResponse>;
    },
    onSuccess: (response: AIResponse) => {
      setMessages(prev => [
        ...prev,
        { type: 'user', content: message },
        { 
          type: 'ai', 
          content: response.message,
          suggestions: response.suggestions,
          actions: response.actions
        }
      ]);
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/imisi/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Chat Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate({ message: message.trim(), sessionId });
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'navigate') {
      if (action.data === '/subscribe' || action.data?.route === '/subscribe') {
        setLocation('/subscribe');
      } else if (typeof action.data === 'string') {
        setLocation(action.data);
      } else if (action.data?.route) {
        setLocation(action.data.route);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (proactiveSuggestion && messages.length === 0) {
      setMessages([{ type: 'ai', content: proactiveSuggestion }]);
    }
  }, [proactiveSuggestion]);

  return (
    <>
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 && !proactiveSuggestion && (
              <div className="text-center text-gray-500 py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Hi! I'm Imisi 2.0, your AI assistant.</p>
                <p className="text-xs mt-1">Ask me about your finances, immigration help, or anything else!</p>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-2 sm:gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'} ${
                msg.type === 'ai' ? 'chat-message-ai' : 'chat-message-user'
              }`} style={{ animationDelay: `${index * 0.1}s` }}>
                {msg.type === 'ai' && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 chat-bot-thinking">
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
                
                <div className={`min-w-0 ${msg.type === 'user' ? 'max-w-[85%] order-1' : 'max-w-[85%]'}`}>
                  <div className={`
                    rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm transition-all duration-200 hover:shadow-md break-words overflow-wrap-anywhere
                    ${msg.type === 'user' 
                      ? 'bg-blue-500 text-white ml-auto hover:bg-blue-600' 
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-50'
                    }
                  `}>
                    <div className="whitespace-pre-wrap word-break-keep-all overflow-hidden">
                      {msg.content}
                    </div>
                  </div>
                
                  {/* AI Suggestions */}
                  {msg.type === 'ai' && msg.suggestions && (
                    <div className="mt-2 space-y-1">
                      {msg.suggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs h-auto py-1 px-2 block w-full text-left chat-button-hover hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 break-words whitespace-normal"
                          style={{ animationDelay: `${(index + 1) * 0.1 + i * 0.05}s` }}
                        >
                          <Sparkles className="w-3 h-3 mr-1 inline animate-pulse flex-shrink-0" />
                          <span className="break-words">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* AI Actions */}
                  {msg.type === 'ai' && msg.actions && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.actions.map((action, i) => (
                        <Button
                          key={i}
                          variant="default"
                          size="sm"
                          onClick={() => handleActionClick(action)}
                          className="text-xs h-auto py-1 px-2 chat-button-hover hover:scale-105 transition-all duration-200 break-words"
                          style={{ animationDelay: `${(index + 1) * 0.1 + i * 0.05}s` }}
                        >
                          <span className="truncate">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Premium Upgrade Button - Show for non-premium users after AI responses */}
                  {msg.type === 'ai' && !subscriptionStatus?.hasActiveSubscription && (
                    <div className="mt-3 pt-2 border-t border-gray-200 chat-message-enter" style={{ animationDelay: `${(index + 1) * 0.1 + 0.3}s` }}>
                      <Button
                        onClick={() => setLocation('/subscribe')}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs py-2 px-3 rounded-md shadow-sm transition-all duration-200 upgrade-button-glow hover:scale-[1.02] hover:shadow-lg"
                      >
                        <Crown className="w-3 h-3 mr-2 animate-pulse flex-shrink-0" />
                        <span className="truncate">Upgrade to Premium</span>
                      </Button>
                    </div>
                  )}
                </div>
                
                {msg.type === 'user' && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            
            {sendMessageMutation.isPending && (
              <div className="flex gap-2 sm:gap-3 justify-start chat-message-ai">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center chat-bot-thinking">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm message-shimmer">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 sm:p-4 bg-white dark:bg-gray-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Imisi anything..."
            disabled={sendMessageMutation.isPending}
            className="flex-1 min-w-0 chat-input-focus transition-all duration-200 hover:border-blue-300 focus:border-blue-500 text-sm"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 chat-button-hover hover:scale-105 transition-all duration-200 flex-shrink-0 w-10 h-10 p-0"
          >
            {sendMessageMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </>
  );
}