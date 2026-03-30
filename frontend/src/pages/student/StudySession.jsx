import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, BookOpen, HelpCircle, Play, BarChart3, AlertTriangle, Send, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import ChatMessage from '../../components/student/ChatMessage';
import TopicRoadmap from '../../components/student/TopicRoadmap';
import sessionService from '../../services/sessionService';

const StudySession = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [endingSession, setEndingSession] = useState(false);

  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);

  // Mock session data
  const mockSessionData = {
    id: sessionId || 'sess_1',
    topicName: 'Variables and Data Types',
    classId: 'class_1',
    className: 'Introduction to Python',
    sessionNumber: 1,
    subtopics: [
      { name: 'What are variables?', status: 'completed' },
      { name: 'Naming conventions', status: 'completed' },
      { name: 'Data types overview', status: 'current' },
      { name: 'Type conversion', status: 'locked' },
      { name: 'Common mistakes', status: 'locked' },
    ],
    stats: {
      questionsAsked: 5,
      correctAnswers: 4,
      currentConfidence: 72,
    },
  };

  // Mock initial messages
  const mockMessages = [
    {
      role: 'ai',
      content: 'Hello! I\'m your study assistant. Today we\'re learning about **Variables and Data Types** in Python. Let\'s start with the basics.',
      toolsUsed: [],
      sources: [],
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      role: 'ai',
      content: 'A variable is a named container that stores a value. Think of it like a labeled box where you can put information. For example:\n```\nname = "Alice"\nage = 25\n```\nHere, `name` and `age` are variables.',
      toolsUsed: ['retrieve'],
      sources: [
        { title: 'Python Variables Documentation', excerpt: 'Variables are containers for storing data values...' }
      ],
      timestamp: new Date(Date.now() - 1000 * 60 * 3),
    },
  ];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch session data on mount
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        try {
          const response = await sessionService.getSessionDetails(sessionId);
          setSessionData(response.data);
          // If API returns messages, use them; otherwise use mock
          setMessages(response.data.messages || mockMessages);
        } catch (err) {
          // Fallback to mock data
          console.log('Using mock session data');
          setSessionData(mockSessionData);
          setMessages(mockMessages);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue('');

    // Simulate API call and AI response
    setSending(true);
    try {
      try {
        const response = await sessionService.sendMessage(sessionId, inputValue);
        // Backend returns { message: string, session: object }
        if (response.data.message) {
          const aiMessage = {
            role: 'ai',
            content: response.data.message,
            toolsUsed: response.data.session?.messages?.slice(-1)?.[0]?.toolsUsed || [],
            sources: [],
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);

          // Update session data with latest from backend
          if (response.data.session) {
            setSessionData((prev) => ({
              ...prev,
              completedTopics: response.data.session.completedTopics || prev?.completedTopics || [],
              weakTopics: response.data.session.weakTopics || prev?.weakTopics || [],
            }));
          }
        }
      } catch (err) {
        // Mock response for demo
        const aiMessage = {
          role: 'ai',
          content: 'That\'s a great question! Let me explain that in more detail...',
          toolsUsed: ['question'],
          sources: [],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleQuickAction = (action) => {
    const actions = {
      explain: 'Can you explain that with an example?',
      question: 'Ask me a question about this topic to test my understanding.',
      next: 'I think I\'m ready to move to the next topic.',
      summary: 'Can you give me a summary of what we covered?',
    };

    setInputValue(actions[action]);
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this session?')) return;

    setEndingSession(true);
    try {
      await sessionService.endSession(sessionId);
      toast.success('Session ended!');
      navigate('/student/dashboard');
    } catch (err) {
      console.error('Error ending session:', err);
      // Still navigate even if API call fails
      navigate('/student/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <svg className="w-12 h-12 animate-spin text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </main>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-slate-400 mb-4">Session not found</p>
            <button onClick={() => navigate('/student/dashboard')} className="btn-primary">
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/student/dashboard')}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-50">{sessionData.topicName}</h1>
                <p className="text-xs text-slate-400">
                  {sessionData.className} • Session {sessionData.sessionNumber}
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-700 rounded-lg">
                <Clock className="w-4 h-4 text-cyan-300" />
                <span className="text-sm font-mono text-cyan-300">{formatTime(sessionTime)}</span>
              </div>
              <button
                onClick={handleEndSession}
                disabled={endingSession}
                className="btn-danger text-sm"
              >
                {endingSession ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-3 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No messages yet. Start by asking a question!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <ChatMessage message={msg} />
                </motion.div>
              ))
            )}

            {sending && (
              <motion.div
                className="flex justify-start mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs lg:max-w-md">
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-slate-400">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="mb-4 space-y-2">
            <p className="text-xs text-slate-400 px-1">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              <motion.button
                onClick={() => handleQuickAction('explain')}
                className="px-3 py-1 rounded-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BookOpen className="w-3 h-3" />
                Explain with example
              </motion.button>
              <motion.button
                onClick={() => handleQuickAction('question')}
                className="px-3 py-1 rounded-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <HelpCircle className="w-3 h-3" />
                Ask me a question
              </motion.button>
              <motion.button
                onClick={() => handleQuickAction('next')}
                className="px-3 py-1 rounded-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-3 h-3" />
                Next topic
              </motion.button>
              <motion.button
                onClick={() => handleQuickAction('summary')}
                className="px-3 py-1 rounded-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart3 className="w-3 h-3" />
                Summarize
              </motion.button>
            </div>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about the topic..."
              disabled={sending}
              className="input-base flex-1"
            />
            <motion.button
              type="submit"
              disabled={!inputValue.trim() || sending}
              className="btn-primary px-4 py-2"
              title="Send message"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Topic Roadmap */}
          <TopicRoadmap
            topics={sessionData.subtopics}
            title="Topic Breakdown"
            subtitle={`${sessionData.topicName}`}
          />

          {/* Session Stats */}
          <motion.div
            className="card p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-semibold text-slate-50 mb-4">Session Stats</h3>
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    Questions Asked
                  </span>
                  <span className="text-sm font-bold text-slate-50">{sessionData.stats.questionsAsked}</span>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <span>✓</span> Correct Answers
                  </span>
                  <span className="text-sm font-bold text-green-400">
                    {sessionData.stats.correctAnswers}/{sessionData.stats.questionsAsked}
                  </span>
                </div>
              </motion.div>
              <motion.div
                className="pt-2 border-t border-slate-700/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Confidence
                  </span>
                  <span className="text-sm font-bold text-cyan-300">{sessionData.stats.currentConfidence}%</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Weak Spot Warning */}
          <motion.div
            className="card p-4 bg-amber-600/10 border-amber-600/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="font-semibold text-slate-50 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Weak Spot Detected
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              You seem unsure about type conversion. Would you like extra practice?
            </p>
            <button className="btn-primary text-xs w-full">
              Practice Now
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default StudySession;
