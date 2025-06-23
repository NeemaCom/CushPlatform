import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Mic, 
  Paperclip,
  MoreVertical,
  Sparkles,
  MessageSquare,
  Globe,
  FileText,
  Calculator,
  Calendar,
  MapPin,
  Zap
} from 'lucide-react';

const quickActions = [
  {
    id: 'visa-check',
    title: 'Visa Requirements',
    description: 'Check visa requirements for any country',
    icon: Globe,
    color: 'bg-blue-500'
  },
  {
    id: 'document-checklist',
    title: 'Document Checklist',
    description: 'Get personalized document requirements',
    icon: FileText,
    color: 'bg-green-500'
  },
  {
    id: 'cost-calculator',
    title: 'Cost Calculator',
    description: 'Estimate immigration costs',
    icon: Calculator,
    color: 'bg-purple-500'
  },
  {
    id: 'timeline-planner',
    title: 'Timeline Planner',
    description: 'Plan your immigration timeline',
    icon: Calendar,
    color: 'bg-orange-500'
  }
];

const conversationHistory = [
  {
    id: 1,
    type: 'user',
    message: 'What documents do I need for a Canadian student visa?',
    timestamp: '10:30 AM'
  },
  {
    id: 2,
    type: 'assistant',
    message: 'For a Canadian student visa (study permit), you\'ll need several key documents:\n\n1. **Acceptance Letter** from a Canadian educational institution\n2. **Proof of Financial Support** (bank statements, scholarship letters)\n3. **Valid Passport**\n4. **Medical Exam** (if required)\n5. **Police Clearance Certificate**\n6. **Statement of Purpose**\n7. **Academic Transcripts** and diplomas\n\nWould you like me to provide more details about any of these requirements?',
    timestamp: '10:31 AM',
    suggestions: [
      'Tell me more about financial proof requirements',
      'What are the medical exam requirements?',
      'How long does the application process take?'
    ]
  },
  {
    id: 3,
    type: 'user',
    message: 'How much financial proof do I need to show?',
    timestamp: '10:35 AM'
  },
  {
    id: 4,
    type: 'assistant',
    message: 'For Canadian student visa financial requirements:\n\n**Minimum funds needed:**\n• Tuition fees for first year\n• Living expenses: CAD $10,000-15,000/year\n• Additional CAD $4,000 for spouse (if applicable)\n• Additional CAD $3,000 per child (if applicable)\n\n**Acceptable proof:**\n• Bank statements (last 4-6 months)\n• GIC (Guaranteed Investment Certificate)\n• Scholarship/funding letters\n• Sponsor\'s financial documents\n\nThe exact amount depends on your study location and program duration.',
    timestamp: '10:36 AM',
    suggestions: [
      'Calculate exact amount for my situation',
      'What is a GIC and how do I get one?',
      'Can my parents sponsor me?'
    ]
  }
];

export function ImisiPage() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle message sending logic here
      setMessage('');
    }
  };

  const handleQuickAction = (actionId: string) => {
    const actions = {
      'visa-check': 'What are the visa requirements for [country]?',
      'document-checklist': 'Can you provide a document checklist for my visa application?',
      'cost-calculator': 'Help me calculate the total cost for my immigration process',
      'timeline-planner': 'Create a timeline for my immigration application'
    };
    setMessage(actions[actionId as keyof typeof actions] || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      {/* Chat Interface */}
      <div className="lg:col-span-3 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <AvatarFallback className="text-white">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <CardTitle className="text-lg">Imisi 2.0</CardTitle>
                  <CardDescription>AI-Powered Immigration Assistant</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {/* Welcome Message */}
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600">
                    <AvatarFallback className="text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-md">
                      <p className="text-sm">
                        Hi! I'm Imisi 2.0, your AI immigration assistant. I can help you with visa requirements, document preparation, cost calculations, and more. How can I assist you today?
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Just now</p>
                  </div>
                </div>

                {/* Conversation History */}
                {conversationHistory.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <Avatar className={`w-8 h-8 ${msg.type === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}>
                      <AvatarFallback className={msg.type === 'user' ? 'text-blue-600 dark:text-blue-400' : 'text-white'}>
                        {msg.type === 'user' ? 'U' : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 max-w-md">
                      <div className={`rounded-lg p-3 ${
                        msg.type === 'user' 
                          ? 'bg-blue-600 text-white ml-auto' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{msg.message}</p>
                      </div>
                      <p className={`text-xs text-gray-500 mt-1 ${msg.type === 'user' ? 'text-right' : ''}`}>
                        {msg.timestamp}
                      </p>
                      
                      {/* Suggestions for assistant messages */}
                      {msg.type === 'assistant' && (msg as any).suggestions && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(msg as any).suggestions.map((suggestion: string, index: number) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600">
                      <AvatarFallback className="text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder="Ask Imisi anything about immigration..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="pr-12"
                />
                <Button
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common immigration tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-3"
                  onClick={() => handleQuickAction(action.id)}
                >
                  <div className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center mr-3`}>
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* AI Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              AI Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Multi-Country Expertise</p>
                  <p className="text-gray-500 text-xs">Coverage for 150+ countries</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Document Analysis</p>
                  <p className="text-gray-500 text-xs">Real-time document verification</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calculator className="h-4 w-4 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Cost Estimation</p>
                  <p className="text-gray-500 text-xs">Accurate fee calculations</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">24/7 Support</p>
                  <p className="text-gray-500 text-xs">Always available to help</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start h-auto p-2">
                <div className="text-left">
                  <p className="text-sm font-medium">Canadian Study Permit</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-start h-auto p-2">
                <div className="text-left">
                  <p className="text-sm font-medium">UK Visa Requirements</p>
                  <p className="text-xs text-gray-500">Yesterday</p>
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-start h-auto p-2">
                <div className="text-left">
                  <p className="text-sm font-medium">Document Checklist</p>
                  <p className="text-xs text-gray-500">3 days ago</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}