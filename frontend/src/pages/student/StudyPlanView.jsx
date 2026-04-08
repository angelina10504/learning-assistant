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
import sessionService from '../../services/sessionService';
import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';

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
    return 'bg-amber-900 text-amber-300'; // intermediate
  };

  const getDifficultyLabel = (d) => {
    if (d === 'basic' || d === 'beginner') return 'Basic';
    if (d === 'advanced') return 'Advanced';
    return 'Intermediate';
  };

  const getPriorKnowledgeStyle = (pk) => {
    if (pk === 'none') return 'bg-red-950 text-red-400';
    if (pk === 'strong') return 'bg-emerald-950 text-emerald-400';
    return 'bg-yellow-950 text-yellow-400'; // partial
  };

  const getPriorKnowledgeLabel = (pk) => {
    if (pk === 'none') return 'No Prior Knowledge';
    if (pk === 'strong') return 'Strong Knowledge';
    return 'Some Knowledge'; // partial
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
      default: return 'border-slate-700 bg-slate-800/50 opacity-60';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-slate-400 mb-4">Plan not found</p>
          <button onClick={() => navigate('/student/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h1 className="text-2xl font-bold text-slate-50 mb-1">{plan.title}</h1>
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
          <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-slate-700 to-slate-800" />

          <div className="space-y-4">
            {sortedTopics.map((topic, idx) => {
              // Find original index for starting session (since we sorted)
              const originalIdx = plan.topics.findIndex(t => t.name === topic.name);
              const isExpanded = expandedTopic === idx;
              const isCurrent = topic.status === 'in_progress';
              const unlocked = isUnlocked(idx);
              const isClickable = unlocked;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.4 }}
                  className="relative pl-16"
                >
                  {/* Timeline node */}
                  <div className={`absolute left-4 top-4 w-7 h-7 rounded-full flex items-center justify-center z-10 bg-slate-900 ${
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTopic(topic, originalIdx);
                            }}
                            disabled={startingSession === originalIdx}
                            className={`text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors font-medium ${
                              topic.status === 'needs_review'
                                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                : topic.status === 'in_progress'
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {startingSession === originalIdx ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Play size={12} />
                            )}
                            {topic.status === 'needs_review' 
                              ? 'Retry Quiz' 
                              : topic.status === 'in_progress' 
                              ? 'Continue Session' 
                              : 'Start Topic'}
                          </button>
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
                        className="mt-4 pt-4 border-t border-slate-700/50"
                      >
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-slate-400 mb-2 font-medium">Subtopics:</p>
                            <div className="flex flex-wrap gap-2">
                              {topic.subtopics.map((sub, sIdx) => (
                                <span key={sIdx} className="text-xs px-2.5 py-1 bg-slate-700/50 text-slate-300 rounded-full">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {topic.pageRange && topic.pageRange.length === 2 && (
                          <p className="text-xs text-slate-500">
                            Pages {topic.pageRange[0]}–{topic.pageRange[1]}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudyPlanView;
