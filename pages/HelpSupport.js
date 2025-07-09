import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { FaHeadset, FaLifeRing, FaQuestionCircle, FaChevronRight, FaChevronDown, FaUsers, FaBook, FaSearch, FaThumbsUp, FaThumbsDown, FaPlus, FaTicketAlt, FaComments, FaEnvelope, FaHeart, FaBookOpen, FaClipboardList, FaFilter, FaRocket, FaChartLine, FaGlobe, FaCheck, FaExclamationTriangle, FaClock, FaUser, FaPhone, FaExternalLinkAlt, FaInfo, FaStarHalf, FaStarHalfAlt, FaRegStar, FaStar, FaRating, FaRegHeart, FaRegComment, FaReply, FaTimesCircle, FaEye, FaChevronUp, FaListUl, FaList, FaBoxOpen, FaCommentDots, FaRegQuestionCircle, FaCheckDouble, FaSpinner, FaFileText, FaLink, FaClipboard, FaUserCheck, FaUserPlus, FaUserShield, FaUserCog, FaSettingsSliders, FaDesktop, FaTextWidth, FaEdit, FaTrash, FaFolderOpen, FaSort, FaFilter as FaFilterIcon } from 'react-icons/fa';
import { FiSend, FiUser, FiMail, FiSearch, FiHelpCircle, FiMessageSquare, FiPhoneCall, FiSettings, FiStar, FiThumbsUp, FiThumbsDown, FiClock, FiCheck, FiAlertTriangle, FiInfo, FiArrowUp, FiArrowDown, FiArchive, FiEdit2, FiTrash2, FiFolder, FiPlus, FiFilter, FiRefreshCw, FiMoreHorizontal, FiChevronRight, FiChevronDown, FiChevronUp, FiChevronLeft, FiCalendar, FiX, FiMaximize2, FiMinimize2, FiExternalLink, FiSend as FiSendIcon, FiPaperclip, FiSmile, FiHeart, FiBookOpen, FiUsers, FiGlobe, FiTrendingUp, FiShield, FiLock, FiUnlock, FiActivity, FiBarChart, FiPieChart, FiMonitor, FiSmartphone, FiTablet, FiCamera, FiFileText, FiDownload, FiUpload, FiCopy, FiPaste, FiMove, FiRotateCw, FiRotateCcw, FiMaximize, FiMinimize, FiZoomIn, FiZoomOut, FiTarget, FiZap, FiAward, FiMail as FiMailIcon, FiPhone as FiPhoneIcon, FiMessageCircle, FiVideo, FiMic, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { Loader2, Star, MessageSquare, Phone, Mail, HelpCircle, Book, Users, Clock, AlertTriangle, CheckCircle, XCircle, Lightbulb, Search, Filter, Plus, Send, User, Heart, ThumbsUp, ThumbsDown, Calendar, Settings, BarChart, TrendingUp, Shield, Zap, Award, Target, Globe, Rocket, Activity, PieChart, Monitor, Smartphone, Tablet, Camera, FileText, Download, Upload, Copy, Paste, Move, RotateCw, RotateCcw, Maximize, Minimize, ZoomIn, ZoomOut, Eye, RefreshCw, MoreHorizontal, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, ArrowUp, ArrowDown, Folder, Archive, Edit2, Trash2, ExternalLink, Paperclip, Smile, X, Maximize2, Minimize2, Mic, Video, Volume2, VolumeX, CreditCard } from 'lucide-react';

const HelpSupport = () => {
  const [activeTab, setActiveTab] = useState('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [ticketFormData, setTicketFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const [feedbackFormData, setFeedbackFormData] = useState({
    type: 'general',
    title: '',
    description: '',
    rating: 5,
    browserInfo: '',
    featureArea: ''
  });

  // Fetch FAQ articles
  const { data: faqData, isLoading: faqLoading } = useQuery({
    queryKey: ['/api/support/faq', { category: selectedCategory, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/support/faq?${params}`);
      if (!response.ok) throw new Error('Failed to fetch FAQ articles');
      return response.json();
    }
  });

  // Fetch user's support tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/support/tickets'],
    queryFn: async () => {
      const response = await fetch('/api/support/tickets');
      if (!response.ok) throw new Error('Failed to fetch tickets');
      return response.json();
    }
  });

  // Fetch user's feedback
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['/api/support/feedback'],
    queryFn: async () => {
      const response = await fetch('/api/support/feedback');
      if (!response.ok) throw new Error('Failed to fetch feedback');
      return response.json();
    }
  });

  // Create support ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData) => {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });
      if (!response.ok) throw new Error('Failed to create ticket');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setShowTicketForm(false);
      setTicketFormData({
        title: '',
        description: '',
        category: '',
        priority: 'medium'
      });
    }
  });

  // Create feedback mutation
  const createFeedbackMutation = useMutation({
    mutationFn: async (feedbackData) => {
      const response = await fetch('/api/support/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      if (!response.ok) throw new Error('Failed to create feedback');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/feedback'] });
      setShowFeedbackForm(false);
      setFeedbackFormData({
        type: 'general',
        title: '',
        description: '',
        rating: 5,
        browserInfo: '',
        featureArea: ''
      });
    }
  });

  // Rate FAQ article
  const rateFaqMutation = useMutation({
    mutationFn: async ({ articleId, isHelpful }) => {
      const response = await fetch(`/api/support/faq/${articleId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful })
      });
      if (!response.ok) throw new Error('Failed to rate article');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/faq'] });
    }
  });

  // Increment FAQ view
  const incrementViewMutation = useMutation({
    mutationFn: async (articleId) => {
      const response = await fetch(`/api/support/faq/${articleId}/view`, {
        method: 'PUT'
      });
      if (!response.ok) throw new Error('Failed to increment view');
      return response.json();
    }
  });

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    createTicketMutation.mutate(ticketFormData);
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    createFeedbackMutation.mutate({
      ...feedbackFormData,
      browserInfo: navigator.userAgent
    });
  };

  const handleFaqClick = (article) => {
    setExpandedFaq(expandedFaq === article.id ? null : article.id);
    if (expandedFaq !== article.id) {
      incrementViewMutation.mutate(article.id);
    }
  };

  const categories = [
    { id: 'account', name: 'Account Management', icon: <User className="w-4 h-4" /> },
    { id: 'loans', name: 'Loans & Applications', icon: <FileText className="w-4 h-4" /> },
    { id: 'payments', name: 'Payments & Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'community', name: 'Community Features', icon: <Users className="w-4 h-4" /> },
    { id: 'technical', name: 'Technical Issues', icon: <Settings className="w-4 h-4" /> },
    { id: 'security', name: 'Security & Privacy', icon: <Shield className="w-4 h-4" /> }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HelpCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
                <p className="text-gray-600">Get help with your account and platform features</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTicketForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Ticket</span>
              </button>
              <button
                onClick={() => setShowFeedbackForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Feedback</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Live Chat</h3>
                <p className="text-sm text-gray-600">Get instant help from our support team</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Email Support</h3>
                <p className="text-sm text-gray-600">Send us an email for detailed assistance</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Phone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Phone Support</h3>
                <p className="text-sm text-gray-600">Call us at +1 (555) 123-4567</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('faq')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'faq'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Book className="w-4 h-4" />
                  <span>FAQ</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'tickets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>My Tickets</span>
                  {ticketsData && ticketsData.length > 0 && (
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                      {ticketsData.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === 'feedback'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4" />
                  <span>My Feedback</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div className="space-y-6">
                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search FAQ articles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* FAQ Articles */}
                <div className="space-y-4">
                  {faqLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : faqData && faqData.length > 0 ? (
                    faqData.map((article) => (
                      <div key={article.id} className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => handleFaqClick(article)}
                          className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              {categories.find(c => c.id === article.category)?.icon || <HelpCircle className="w-4 h-4" />}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{article.title}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span>{categories.find(c => c.id === article.category)?.name || 'General'}</span>
                                <span className="flex items-center space-x-1">
                                  <Eye className="w-3 h-3" />
                                  <span>{article.views || 0} views</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          {expandedFaq === article.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        
                        {expandedFaq === article.id && (
                          <div className="px-6 pb-4 border-t bg-gray-50">
                            <div className="py-4">
                              <div className="prose max-w-none text-gray-700">
                                {article.content}
                              </div>
                              
                              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <div className="text-sm text-gray-500">
                                  Was this article helpful?
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => rateFaqMutation.mutate({ articleId: article.id, isHelpful: true })}
                                    className="flex items-center space-x-1 px-3 py-1 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span>Yes</span>
                                  </button>
                                  <button
                                    onClick={() => rateFaqMutation.mutate({ articleId: article.id, isHelpful: false })}
                                    className="flex items-center space-x-1 px-3 py-1 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                    <span>No</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No FAQ articles found</p>
                      {searchTerm && (
                        <p className="text-sm mt-2">Try adjusting your search or browse all categories</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div className="space-y-6">
                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : ticketsData && ticketsData.length > 0 ? (
                  <div className="space-y-4">
                    {ticketsData.map((ticket) => (
                      <div key={ticket.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status?.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority?.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">{ticket.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>#{ticket.ticketNumber}</span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                              </span>
                              <span>{categories.find(c => c.id === ticket.category)?.name || ticket.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                              <MessageSquare className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No support tickets yet</p>
                    <p className="text-sm mt-2">Create your first support ticket to get help</p>
                    <button
                      onClick={() => setShowTicketForm(true)}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Ticket
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="space-y-6">
                {feedbackLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : feedbackData && feedbackData.length > 0 ? (
                  <div className="space-y-4">
                    {feedbackData.map((feedback) => (
                      <div key={feedback.id} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{feedback.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                                {feedback.status?.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">{feedback.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Star className="w-4 h-4" />
                                <span>{feedback.rating}/5</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                              </span>
                              <span>{feedback.type?.replace('_', ' ').toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        {feedback.adminNotes && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <h4 className="font-medium text-blue-900 mb-2">Admin Response</h4>
                            <p className="text-blue-800">{feedback.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No feedback submitted yet</p>
                    <p className="text-sm mt-2">Share your thoughts to help us improve</p>
                    <button
                      onClick={() => setShowFeedbackForm(true)}
                      className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Send Feedback
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Create Support Ticket</h2>
              <button
                onClick={() => setShowTicketForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleTicketSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={ticketFormData.title}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={ticketFormData.category}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={ticketFormData.priority}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={ticketFormData.description}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTicketForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {createTicketMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Create Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Feedback Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Send Feedback</h2>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Type
                </label>
                <select
                  value={feedbackFormData.type}
                  onChange={(e) => setFeedbackFormData({ ...feedbackFormData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="general">General Feedback</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="improvement">Improvement Suggestion</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={feedbackFormData.title}
                  onChange={(e) => setFeedbackFormData({ ...feedbackFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFeedbackFormData({ ...feedbackFormData, rating })}
                      className={`p-1 ${
                        rating <= feedbackFormData.rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                  <span className="text-sm text-gray-600 ml-2">
                    {feedbackFormData.rating}/5
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={feedbackFormData.description}
                  onChange={(e) => setFeedbackFormData({ ...feedbackFormData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFeedbackForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFeedbackMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {createFeedbackMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupport;