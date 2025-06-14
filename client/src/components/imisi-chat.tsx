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
  const [hasNewSuggestion, setHasNewSuggestion] = useState(false);
  const [, setLocation] = useLocation();

  // Get proactive suggestions
  const { data: proactiveSuggestion } = useQuery<ProactiveSuggestion>({
    queryKey: ['/api/imisi/suggestions'],
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    retry: false,
    staleTime: 4 * 60 * 1000, // 4 minutes
  });

  // Check subscription status
  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; status: string }>({
    queryKey: ['/api/subscription-status'],
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
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

  return (
    <>
      {/* Animated Chat Head */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={toggleChat}
          className={`
            relative w-14 h-14 rounded-full shadow-xl transition-all duration-300 
            pulsing-orb hover:scale-110
            ${hasNewSuggestion ? 'animate-bounce' : ''}
          `}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>

      {isOpen && (
        <div className={`
          fixed bottom-24 right-6 z-40 w-96 transition-all duration-300
          ${isMinimized ? 'h-14' : 'h-[500px]'}
        `}>
          <Card className="h-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && !proactiveSuggestion && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Hi! I'm Imisi 2.0, your AI assistant.</p>
              <p className="text-xs mt-1">Ask me about your finances, immigration help, or anything else!</p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-1' : ''}`}>
                <div className={`
                  rounded-lg px-4 py-2 text-sm
                  ${msg.type === 'user' 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : 'bg-gray-100 text-gray-900'
                  }
                `}>
                  {msg.content}
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
                        className="text-xs h-auto py-1 px-2 block w-full text-left"
                      >
                        <Sparkles className="w-3 h-3 mr-1 inline" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
                
                {/* AI Actions */}
                {msg.type === 'ai' && msg.actions && (
                  <div className="mt-2 space-y-1">
                    {msg.actions.map((action, i) => (
                      <Button
                        key={i}
                        variant="default"
                        size="sm"
                        onClick={() => handleActionClick(action)}
                        className="text-xs h-auto py-1 px-2 mr-1"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          
          {sendMessageMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Imisi anything..."
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </>
  );
}