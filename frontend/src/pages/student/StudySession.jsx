import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, BookOpen, HelpCircle, Play, BarChart3, AlertTriangle, Send, Lightbulb, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import ChatMessage from '../../components/student/ChatMessage';
import QuizMessage, { parseQuizFromMessage } from '../../components/student/QuizMessage';
import TopicRoadmap from '../../components/student/TopicRoadmap';
import { ChatBubbleSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import sessionService from '../../services/sessionService';
import FinalQuizModal from '../../components/student/FinalQuizModal';
import { Activity, CheckCircle2 } from 'lucide-react';

const StudySession = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [planTopics, setPlanTopics] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [endingSession, setEndingSession] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [autoMessageSent, setAutoMessageSent] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [progress, setProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    questionsAsked: 0,
    correctAnswers: 0,
    totalAnswered: 0,
    confidence: 0
  });

  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch session data on mount
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const response = await sessionService.getSessionDetails(sessionId);
        const apiData = response.data;

        const mappedSessionData = {
          ...apiData,
          id: apiData._id || apiData.id,
          topicName: apiData.topicName || apiData.classId?.name || 'Study Session',
          className: apiData.classId?.name || 'Unknown Class',
          classId: apiData.classId?._id || apiData.classId,
          planId: apiData.planId?._id || apiData.planId || null,
          topicIndex: apiData.topicIndex,
          stats: {
            questionsAsked: apiData.performanceMetrics?.questionsAnswered || 0,
            correctAnswers: apiData.performanceMetrics?.correctCount || 0,
            currentConfidence: Math.round((apiData.performanceMetrics?.avgConfidence || 0) * 100),
          },
          weakTopics: apiData.weakTopics || [],
          duration: apiData.duration || 0,
        };

        setSessionData(mappedSessionData);

        setSessionStats({
          questionsAsked: apiData.performanceMetrics?.questionsAnswered || 0,
          correctAnswers: apiData.performanceMetrics?.correctCount || 0,
          totalAnswered: apiData.performanceMetrics?.questionsAnswered || 0,
          confidence: Math.round((apiData.performanceMetrics?.avgConfidence || 0) * 100)
        });

        if (apiData.planId) {
          const planData = typeof apiData.planId === 'object' ? apiData.planId : null;
          if (planData && planData.topics) {
            setPlanTopics(planData.topics.map(t => ({
              name: t.name,
              status: t.status,
              subtitle: `${t.estimatedMinutes} min`,
              difficulty: t.difficulty,
              priorKnowledge: t.priorKnowledge,
            })));
          } else {
            try {
              const planRes = await sessionService.getPlanDetails(apiData.planId);
              const plan = planRes.data;
              setPlanTopics(plan.topics.map(t => ({
                name: t.name,
                status: t.status,
                subtitle: `${t.estimatedMinutes} min`,
                difficulty: t.difficulty,
                priorKnowledge: t.priorKnowledge,
              })));
            } catch {
              setPlanTopics([]);
            }
          }
        }

        if (apiData.messages && apiData.messages.length > 0) {
          setMessages(apiData.messages.map(m => ({
            ...m,
            role: m.role === 'human' ? 'user' : m.role,
          })));
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        toast.error('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Auto-send first message when session loads with no messages
  useEffect(() => {
    if (!loading && sessionData && messages.length === 0 && !autoMessageSent) {
      setAutoMessageSent(true);
      const topicName = sessionData.topicName;
      const className = sessionData.className;
      const topicInfo = planTopics.find(t => t.name === topicName);
      const difficulty = topicInfo?.difficulty || 'intermediate';
      const priorKnowledge = topicInfo?.priorKnowledge || 'partial';

      const autoMessage = topicName && topicName !== className
        ? `I want to study the topic: ${topicName} from ${className}.\nTopic difficulty: ${difficulty}. My prior knowledge of this topic: ${priorKnowledge}.\nPlease help me learn this topic using my study materials.`
        : `I want to start studying ${className}. Please help me learn using my study materials.`;

      sendMessage(autoMessage);
    }
  }, [loading, sessionData, messages.length, autoMessageSent]);

  // Timer effect
  useEffect(() => {
    if (sessionData && sessionData.duration !== undefined) {
      setSessionTime(sessionData.duration);
    }
  }, [sessionData?.id]);

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

  const calculateProgressValue = () => {
    let score = 0;
    const humanMessages = messages.filter(m => m.role === 'user').length;
    score += Math.min(humanMessages * 5, 30);
    if (sessionStats.totalAnswered > 0) {
      score += Math.round((sessionStats.correctAnswers / sessionStats.totalAnswered) * 40);
    }
    const elapsedMinutes = (Date.now() - sessionStartTime) / 60000;
    score += Math.min(Math.floor(elapsedMinutes / 2) * 5, 20);
    if (sessionStats.totalAnswered >= 2 && sessionStats.confidence >= 50) {
      score += 10;
    }
    return Math.min(score, 100);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(calculateProgressValue());
    }, 30000);
    return () => clearInterval(interval);
  }, [messages.length, sessionStats, sessionStartTime]);

  useEffect(() => {
    setProgress(calculateProgressValue());
  }, [messages.length, sessionStats]);

  const splitMessageContent = (content) => {
    const parsed = parseQuizFromMessage(content);
    if (!parsed) return { hasQuiz: false, content };

    return {
      hasQuiz: true,
      explanation: parsed.contentBefore,
      questionText: parsed.questionText,
      options: parsed.options,
      correctLetter: parsed.correctLetter,
    };
  };

  const handleQuizAnswer = (isCorrect, selectedLetter, correctLetter) => {
    if (endingSession) return;

    setSessionStats(prev => {
      const newCorrect = prev.correctAnswers + (isCorrect ? 1 : 0);
      const newTotal = prev.totalAnswered + 1;
      return {
        questionsAsked: newTotal,
        correctAnswers: newCorrect,
        totalAnswered: newTotal,
        confidence: Math.round((newCorrect / newTotal) * 100),
      };
    });

    const feedback = isCorrect
      ? `I answered ${selectedLetter}) and got it correct.`
      : `I answered ${selectedLetter}) which was wrong. The correct answer was ${correctLetter}). Please explain why ${correctLetter}) is correct in simple terms.`;

    sendMessage(feedback);
  };

  const sendMessage = async (content) => {
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setSending(true);
    try {
      const response = await sessionService.sendMessage(sessionId, content, sessionTime);
      if (response.data.message) {
        const aiMessage = {
          role: 'ai',
          content: response.data.message,
          toolsUsed: response.data.session?.messages?.slice(-1)?.[0]?.toolsUsed || [],
          sources: [],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        if (response.data.session.completedTopics?.includes(sessionData.topicName)) {
          setShowQuizModal(true);
        }

        if (response.data.session) {
          setSessionData((prev) => ({
            ...prev,
            weakTopics: response.data.session.weakTopics || prev?.weakTopics || [],
            completedTopics: response.data.session.completedTopics || prev?.completedTopics || [],
            stats: {
              questionsAsked: response.data.session.performanceMetrics?.questionsAnswered || prev?.stats?.questionsAsked || 0,
              correctAnswers: response.data.session.performanceMetrics?.correctCount || prev?.stats?.correctAnswers || 0,
              currentConfidence: Math.round((response.data.session.performanceMetrics?.avgConfidence || 0) * 100),
            },
          }));
        }
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message === 'Session has ended') {
        toast.error('This session has already been ended.');
        setEndingSession(true);
        setSending(false);
        return;
      }

      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        toolsUsed: [],
        sources: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const msg = inputValue;
    setInputValue('');
    await sendMessage(msg);
  };

  const handleQuickAction = (action) => {
    const actions = {
      explain: 'Can you explain that with an example?',
      question: 'Ask me a question about this topic to test my understanding.',
      next: "I think I'm ready to move to the next topic.",
      summary: 'Can you give me a summary of what we covered?',
    };
    setInputValue(actions[action]);
  };

  const handleSkipAndEnd = async () => {
    if (!window.confirm('Are you sure you want to end without taking the final assessment? Your topic progress won\'t be completed.')) return;
    performEndSession();
  };

  const performEndSession = async () => {
    setEndingSession(true);
    try {
      const endData = {
        duration: sessionTime,
        questionsAsked: sessionStats.questionsAsked,
        correctAnswers: sessionStats.correctAnswers,
        confidence: sessionStats.confidence,
        progressPercent: progress
      };
      await sessionService.endSession(sessionId, endData);
      toast.success('Session ended!');
      if (sessionData?.planId) {
        navigate(`/student/plan/${sessionData.planId}`);
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error('Error ending session:', err);
      navigate('/student/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-10 w-10 bg-slate-700/50 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-48 bg-slate-700/50 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-700/30 rounded animate-pulse" />
              </div>
            </div>
            <ChatBubbleSkeleton align="left" />
            <ChatBubbleSkeleton align="right" />
            <ChatBubbleSkeleton align="left" />
          </div>
        </main>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <BookOpen className="w-12 h-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-300 mb-1">Session not found</h3>
          <p className="text-slate-500 mb-4">This session may have been deleted or ended.</p>
          <Button onClick={() => navigate('/student/dashboard')}>
            Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Topic Roadmap from Plan */}
      {planTopics.length > 0 && (
        <TopicRoadmap
          topics={planTopics}
          title="Study Plan Topics"
          subtitle={sessionData.className}
        />
      )}

      {/* Session Stats */}
      <motion.div
        className="card p-4 relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Activity className="absolute -bottom-2 -right-2 w-16 h-16 text-indigo-500/10 -rotate-12" />

        <h3 className="font-semibold text-slate-50 mb-4">Session Stats</h3>
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> Questions Asked
            </span>
            <span className="text-sm font-bold text-slate-50">{sessionStats.questionsAsked}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span>&#10003;</span> Correct Answers
            </span>
            <span className="text-sm font-bold text-emerald-400">
              {sessionStats.correctAnswers}/{sessionStats.totalAnswered}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Confidence
            </span>
            <span className="text-sm font-bold text-cyan-300">{sessionStats.confidence}%</span>
          </div>
        </div>
      </motion.div>

      {/* Weak Spots */}
      {sessionData.weakTopics && sessionData.weakTopics.length > 0 && (
        <motion.div
          className="card p-4 bg-amber-600/10 border-amber-600/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-semibold text-slate-50 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Weak Spots Detected
          </h3>
          <div className="space-y-2">
            {sessionData.weakTopics.map((wt, idx) => (
              <p key={idx} className="text-xs text-slate-300">
                &bull; {wt.topic}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Open sidebar"
              >
                <Menu className="w-5 h-5 text-slate-300" />
              </button>
              <button
                onClick={() => {
                  if (sessionData?.planId) navigate(`/student/plan/${sessionData.planId}`);
                  else navigate('/student/dashboard');
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-50">{sessionData.topicName}</h1>
                <p className="text-xs text-slate-400">{sessionData.className}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden sm:flex items-center gap-3 mr-4">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Progress</p>
                  <p className="text-sm font-bold text-slate-300">{progress}%</p>
                </div>
                <div className="w-24 sm:w-32 h-2.5 bg-slate-700 rounded-full overflow-hidden border border-slate-600/50">
                  <motion.div
                    className={`h-full ${
                      progress < 30 ? 'bg-red-500' :
                      progress < 60 ? 'bg-yellow-500' :
                      progress < 85 ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 50 }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1 bg-slate-700 rounded-lg">
                <Clock className="w-4 h-4 text-cyan-300" />
                <span className="text-sm font-mono text-cyan-300">{formatTime(sessionTime)}</span>
              </div>

              {progress >= 95 || (sessionStats.totalAnswered >= 5 && sessionStats.confidence >= 70) ? (
                <div className="flex flex-col items-end">
                  <Button
                    onClick={() => setShowQuizModal(true)}
                    disabled={endingSession}
                    className="text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Finish Topic</span>
                  </Button>
                  <button onClick={handleSkipAndEnd} className="text-[10px] text-slate-400 hover:text-slate-300 mt-1">Skip & End</button>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <Button
                    variant="danger"
                    onClick={() => setShowQuizModal(true)}
                    disabled={endingSession}
                    className="text-sm"
                  >
                    <span className="hidden sm:inline">End Session</span>
                    <span className="sm:hidden">End</span>
                  </Button>
                  <button onClick={handleSkipAndEnd} className="text-[10px] text-slate-400 hover:text-slate-300 mt-1">Skip & End</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-l border-slate-700 z-50 lg:hidden overflow-y-auto p-6"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-50">Session Info</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-3 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2">
            {messages.length === 0 && !sending ? (
              <div className="text-center py-12 space-y-3">
                <ChatBubbleSkeleton align="left" />
                <ChatBubbleSkeleton align="right" />
                <p className="text-slate-400 text-sm">Preparing your study session...</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isAI = msg.role === 'ai';
                const parsed = isAI ? splitMessageContent(msg.content) : { hasQuiz: false };

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  >
                    {isAI && parsed.hasQuiz ? (
                      <>
                        {parsed.explanation && (
                          <ChatMessage message={{ ...msg, content: parsed.explanation }} />
                        )}
                        <QuizMessage
                          questionText={parsed.questionText}
                          options={parsed.options}
                          correctLetter={parsed.correctLetter}
                          onAnswer={handleQuizAnswer}
                          disabled={endingSession}
                        />
                      </>
                    ) : (
                      <ChatMessage message={msg} />
                    )}
                  </motion.div>
                );
              })
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
              {[
                { key: 'explain', icon: BookOpen, label: 'Explain with example' },
                { key: 'question', icon: HelpCircle, label: 'Ask me a question' },
                { key: 'next', icon: Play, label: 'Next topic' },
                { key: 'summary', icon: BarChart3, label: 'Summarize' },
              ].map(({ key, icon: Icon, label }) => (
                <motion.button
                  key={key}
                  onClick={() => handleQuickAction(key)}
                  className="px-3 py-1 rounded-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all duration-200 flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </motion.button>
              ))}
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
              className="input-base flex-1 text-sm sm:text-base"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || sending}
              loading={sending}
              className="px-4 py-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:col-span-1">
          <SidebarContent />
        </div>
      </main>

      {sessionData && (
        <FinalQuizModal
          isOpen={showQuizModal}
          onClose={() => setShowQuizModal(false)}
          topicName={sessionData.topicName}
          classId={sessionData.classId}
          sessionId={sessionId}
          difficulty={planTopics.find(t => t.name === sessionData.topicName)?.difficulty || 'intermediate'}
          onComplete={(passed) => {
             setShowQuizModal(false);
             performEndSession();
          }}
        />
      )}
    </div>
  );
};

export default StudySession;
