import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  Play,
  BookOpen,
  Sparkles,
  Target,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import Badge from '../../components/shared/Badge';
import ProgressBar from '../../components/shared/ProgressBar';
import { TopicCardSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import sessionService from '../../services/sessionService';
import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const StudyPlanView = () => {
  const { id: planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [startingSession, setStartingSession] = useState(null);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await sessionService.getPlanDetails(planId);
      setPlan(response.data);
    } catch (err) {
      console.error('Error fetching plan:', err);
      toast.error('Failed to load study plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (window.confirm('Are you sure you want to delete this study plan? This action cannot be undone.')) {
      try {
        await sessionService.deletePlan(planId);
        toast.success('Study plan deleted');
        const classId = plan.classId?._id || plan.classId;
        navigate(`/student/class/${classId}`);
      } catch (err) {
        console.error('Error deleting plan:', err);
        toast.error('Failed to delete study plan');
      }
    }
  };

  const handleStartTopic = async (topic, index) => {
    if (topic.status === 'pending') {
      toast.error('Complete the previous topic first!');
      return;
    }
    if (topic.status === 'completed') {
      toast.error('This topic is already completed. You can review it by starting a new session.');
    }

    setStartingSession(index);
    try {
      const classId = plan.classId?._id || plan.classId;
      const response = await sessionService.startSession(classId, {
        planId: plan._id || plan.id,
        topicName: topic.name,
        topicIndex: index,
      });
      const session = response.data;
      toast.success(`Starting: ${topic.name}`);
      navigate(`/student/session/${session._id || session.id}`);
    } catch (err) {
      console.error('Error starting session:', err);
      toast.error(err.response?.data?.message || 'Failed to start session');
    } finally {
      setStartingSession(null);
    }
  };

  const progress = plan
    ? Math.round((plan.topics.filter(t => t.status === 'completed').length / plan.topics.length) * 100)
    : 0;

  const completedCount = plan?.topics.filter(t => t.status === 'completed').length || 0;
  const currentTopic = plan?.topics.find(t => t.status === 'in_progress' || t.status === 'needs_review');

  const getDifficultyStyle = (d) => {
    if (d === 'basic' || d === 'beginner') return 'bg-slate-600 text-slate-200';
    if (d === 'advanced') return 'bg-red-900 text-red-300';
    return 'bg-amber-900 text-amber-300';
  };

  const getDifficultyLabel = (d) => {
    if (d === 'basic' || d === 'beginner') return 'Basic';
    if (d === 'advanced') return 'Advanced';
    return 'Intermediate';
  };

  const getPriorKnowledgeStyle = (pk) => {
    if (pk === 'none') return 'bg-red-950 text-red-400';
    if (pk === 'strong') return 'bg-emerald-950 text-emerald-400';
    return 'bg-yellow-950 text-yellow-400';
  };

  const getPriorKnowledgeLabel = (pk) => {
    if (pk === 'none') return 'No Prior Knowledge';
    if (pk === 'strong') return 'Strong Knowledge';
    return 'Some Knowledge';
  };

  const difficultyOrder = { basic: 0, beginner: 0, intermediate: 1, advanced: 2 };
  const priorKnowledgeOrder = { none: 0, partial: 1, strong: 2 };

  const sortedTopics = plan
    ? [...plan.topics].sort((a, b) => {
        const dDiff = (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
        if (dDiff !== 0) return dDiff;
        return (priorKnowledgeOrder[a.priorKnowledge] ?? 1) - (priorKnowledgeOrder[b.priorKnowledge] ?? 1);
      })
    : [];

  const prioritizedCount = plan?.topics.filter(t => t.priority === 'high').length || 0;

  const isUnlocked = (index) => {
    if (index === 0) return true;
    return sortedTopics[index - 1].status === 'completed';
  };

  const getStatusIcon = (status, unlocked) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'in_progress': return <Circle className="w-6 h-6 text-cyan-400 fill-cyan-500" />;
      case 'needs_review': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      default: return unlocked ? <Circle className="w-6 h-6 text-slate-500 fill-slate-700" /> : <Lock className="w-6 h-6 text-slate-600" />;
    }
  };

  const getNodeStyle = (status) => {
    switch (status) {
      case 'completed': return 'border-green-500 bg-green-500/10';
      case 'in_progress': return 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10';
      case 'needs_review': return 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10';
      default: return 'border-slate-700 bg-white/[0.03] opacity-60';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816]">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            <div className="h-6 w-32 bg-white/[0.06] rounded animate-pulse mb-6" />
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] space-y-4">
              <div className="h-8 w-48 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-4 w-64 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-3 w-full bg-white/[0.04] rounded animate-pulse" />
            </div>
            {[1, 2, 3, 4].map(i => <TopicCardSkeleton key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#050816]">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
          <BookOpen className="w-12 h-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-300 mb-1">Plan not found</h3>
          <p className="text-slate-500 mb-4">This study plan may have been deleted.</p>
          <Button onClick={() => navigate('/student/dashboard')}>
            Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816]">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <div className="absolute top-0 right-[20%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <div className="relative z-10">
      <Navbar />

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            onClick={() => {
              const classId = plan.classId?._id || plan.classId;
              navigate(`/student/class/${classId}`);
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Class
          </button>

          {/* Plan Header Card */}
          <div className="card p-6 mb-8 relative group">
            <button
              onClick={handleDeletePlan}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Delete Study Plan"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-50 mb-1">{plan.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen size={14} />
                    {plan.classId?.name || 'Class'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={14} />
                    {plan.topics.length} topics
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    ~{plan.totalEstimatedHours}h total
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-medium">
                      {completedCount}/{plan.topics.length} completed
                    </span>
                    <span className="text-slate-400">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} max={100} />
                </div>
              </div>
            </div>

            {plan.completedAt && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-300 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Plan completed on {new Date(plan.completedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Personalization Banner */}
          {prioritizedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3"
            >
              <div className="mt-0.5 p-1.5 bg-indigo-500/20 rounded-lg">
                <Sparkles size={16} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-indigo-200 text-sm font-medium">This plan is personalized based on your assessment.</p>
                <p className="text-indigo-400/70 text-xs mt-0.5">
                  {prioritizedCount} topic{prioritizedCount > 1 ? 's are' : ' is'} prioritized as focus areas based on your responses.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Topic Roadmap */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-white/[0.08] to-transparent" />

          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            {sortedTopics.map((topic, idx) => {
              const originalIdx = plan.topics.findIndex(t => t.name === topic.name);
              const isExpanded = expandedTopic === idx;
              const isCurrent = topic.status === 'in_progress';
              const unlocked = isUnlocked(idx);
              const isClickable = unlocked;

              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="relative pl-16"
                >
                  {/* Timeline node */}
                  <div className={`absolute left-4 top-4 w-7 h-7 rounded-full flex items-center justify-center z-10 bg-[#050816] ${
                    isCurrent ? 'ring-4 ring-cyan-500/30' : ''
                  }`}>
                    {getStatusIcon(topic.status, unlocked)}
                  </div>

                  {/* Topic card */}
                  <div
                    className={`card p-5 border transition-all duration-200 ${getNodeStyle(topic.status)} ${
                      isClickable ? 'cursor-pointer hover:border-indigo-500/50' : ''
                    }`}
                    onClick={() => isClickable && setExpandedTopic(isExpanded ? null : idx)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-slate-500 font-mono">#{idx + 1}</span>
                          <h3 className={`font-semibold text-sm ${
                            topic.status === 'pending' ? 'text-slate-500' : 'text-slate-50'
                          }`}>
                            {topic.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyStyle(topic.difficulty)}`}>
                            {getDifficultyLabel(topic.difficulty)}
                          </span>
                          {topic.priorKnowledge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorKnowledgeStyle(topic.priorKnowledge)}`}>
                              {getPriorKnowledgeLabel(topic.priorKnowledge)}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={12} />
                            {topic.estimatedMinutes} min
                          </span>
                          {topic.status === 'completed' && (
                            <Badge color="green" className="text-xs">Completed</Badge>
                          )}
                          {isCurrent && (
                            <Badge color="cyan" className="text-xs">Up Next</Badge>
                          )}
                          {topic.status === 'needs_review' && (
                            <Badge color="amber" className="text-xs flex items-center gap-1">
                              <AlertTriangle size={12} /> Needs Review
                            </Badge>
                          )}
                          {topic.priority === 'high' && (
                            <Badge color="red" className="text-xs flex items-center gap-1">
                              <ShieldAlert size={12} /> Focus Area
                            </Badge>
                          )}
                          {topic.priority === 'low' && (
                            <Badge color="green" className="text-xs flex items-center gap-1">
                              <CheckCircle2 size={12} /> Quick Review
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {topic.status === 'completed' ? (
                          <div className="flex items-center gap-2 text-green-400 px-2">
                            <CheckCircle2 size={18} />
                          </div>
                        ) : unlocked ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTopic(topic, originalIdx);
                            }}
                            loading={startingSession === originalIdx}
                            className={`text-xs py-1.5 px-3 ${
                              topic.status === 'needs_review'
                                ? 'bg-amber-600 hover:bg-amber-500'
                                : topic.status === 'in_progress'
                                ? 'bg-cyan-600 hover:bg-cyan-500'
                                : ''
                            }`}
                          >
                            <Play size={12} />
                            {topic.status === 'needs_review'
                              ? 'Retry Quiz'
                              : topic.status === 'in_progress'
                              ? 'Continue Session'
                              : 'Start Topic'}
                          </Button>
                        ) : null}
                        {isClickable && (
                          isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/[0.06]"
                      >
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-slate-400 mb-2 font-medium">Subtopics:</p>
                            <div className="flex flex-wrap gap-2">
                              {topic.subtopics.map((sub, sIdx) => (
                                <span key={sIdx} className="text-xs px-2.5 py-1 bg-white/[0.06] text-slate-300 rounded-full">{sub}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {topic.pageRange && topic.pageRange.length === 2 && (
                          <p className="text-xs text-slate-500">
                            Pages {topic.pageRange[0]}\u2013{topic.pageRange[1]}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default StudyPlanView;
