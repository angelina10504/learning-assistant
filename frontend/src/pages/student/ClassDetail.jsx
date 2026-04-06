import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  Play,
  BookOpen,
  GraduationCap,
  Copy,
  Pin,
  AlertCircle,
  Sparkles,
  Target,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import Badge from '../../components/shared/Badge';
import ProgressBar from '../../components/shared/ProgressBar';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import PreAssessmentModal from '../../components/PreAssessmentModal';
import FilePreviewModal from '../../components/shared/FilePreviewModal';

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [preparingMilestone, setPreparingMilestone] = useState(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState(null);
  const [previewMaterial, setPreviewMaterial] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const detailsResponse = await classService.getClassDetails(id);
      const classInfo = detailsResponse.data || {};
      setClassData({
        ...classInfo,
        id: classInfo._id || classInfo.id,
        teacherName: classInfo.teacherId?.name || 'Unknown Teacher',
      });

      const [materialsRes, milestonesRes, plansRes] = await Promise.allSettled([
        classService.getClassMaterials(id),
        classService.getClassMilestones(id),
        sessionService.getPlans(id),
      ]);

      if (materialsRes.status === 'fulfilled') {
        setMaterials(materialsRes.value.data || []);
      }

      if (milestonesRes.status === 'fulfilled') {
        const milestonesData = milestonesRes.value.data || [];
        setMilestones(
          milestonesData
            .map((m) => ({ ...m, id: m._id || m.id }))
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        );
      }

      if (plansRes.status === 'fulfilled') {
        setPlans((plansRes.value.data || []).map(p => ({ ...p, id: p._id || p.id })));
      }
    } catch (err) {
      console.error('Error fetching class data:', err);
      setError('Unable to load class details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = (milestoneId = null) => {
    if (materials.length === 0) {
      toast.error("No study materials available to generate questions from.");
      return;
    }
    setActiveMilestoneId(milestoneId);
    setShowAssessment(true);
  };

  const handleAssessmentComplete = (plan) => {
    toast.success('Personalized study plan generated!');
    navigate(`/student/plan/${plan._id || plan.id}`);
  };

  const handleCopyClassCode = () => {
    if (classData?.classCode) {
      navigator.clipboard.writeText(classData.classCode);
      toast.success('Class code copied!');
    }
  };

  const getMilestoneStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    if (deadlineDate < now) return { status: 'passed', color: 'green', icon: CheckCircle };
    const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return { status: `${daysLeft}d left`, color: 'red', icon: AlertCircle };
    return { status: `${daysLeft}d left`, color: 'slate', icon: Clock };
  };

  const getPlanProgress = (plan) => {
    if (!plan.topics || plan.topics.length === 0) return 0;
    const completed = plan.topics.filter(t => t.status === 'completed').length;
    return Math.round((completed / plan.topics.length) * 100);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          <div className="card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-300 mb-4">{error}</p>
            <button onClick={fetchData} className="btn-primary">Retry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>

          <div className="card p-6 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-50 mb-2">
                  {classData?.name || 'Class'}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={16} className="text-indigo-400" />
                    {classData?.teacherName}
                  </span>
                  {classData?.classCode && (
                    <Badge color="indigo" className="cursor-pointer text-xs" onClick={handleCopyClassCode}>
                      <span className="font-mono">{classData.classCode}</span>
                      <Copy size={12} className="ml-1 inline" />
                    </Badge>
                  )}
                </div>
                {classData?.description && (
                  <p className="text-slate-400 text-sm mt-3">{classData.description}</p>
                )}
              </div>
              <button
                onClick={() => handleGeneratePlan()}
                disabled={generatingPlan || materials.length === 0}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                {generatingPlan ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Study Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Existing Study Plans */}
        {plans.length > 0 && (
          <motion.section
            className="mb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center gap-2">
              <Target size={22} className="text-green-400" />
              Your Study Plans ({plans.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const progress = getPlanProgress(plan);
                return (
                  <motion.div
                    key={plan.id}
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/student/plan/${plan.id}`)}
                    className="card p-4 cursor-pointer hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-50 text-sm truncate">{plan.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {plan.topics?.length || 0} topics &middot; ~{plan.totalEstimatedHours}h
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-500 flex-shrink-0 mt-1" />
                    </div>
                    <ProgressBar value={progress} max={100} />
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                      <span>{progress}% complete</span>
                      {plan.completedAt ? (
                        <Badge color="green" className="text-xs">Done</Badge>
                      ) : (
                        <span>{new Date(plan.generatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Materials */}
          <div className="lg:col-span-2">
            <motion.section variants={containerVariants} initial="hidden" animate="visible">
              <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center gap-2">
                <FileText size={22} className="text-indigo-400" />
                Course Materials ({materials.length})
              </h2>

              {materials.length === 0 ? (
                <motion.div variants={itemVariants} className="card p-8 text-center">
                  <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">No materials uploaded yet.</p>
                  <p className="text-slate-500 text-sm mt-1">
                    Your teacher will upload study materials here.
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {materials.map((material, idx) => (
                    <motion.div
                      key={material._id || idx}
                      variants={itemVariants}
                      whileHover={{ y: -2 }}
                      onClick={() => setPreviewMaterial(material)}
                      className="card p-4 hover:border-indigo-500/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-lg flex-shrink-0">
                          <FileText className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-50 text-sm truncate" title={material.originalName}>
                            {material.originalName}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            {material.fileSize && <span>{(material.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                            {material.uploadedAt && <span>{new Date(material.uploadedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>

          {/* Right Column: Milestones Timeline */}
          <div className="lg:col-span-1">
            <motion.section variants={containerVariants} initial="hidden" animate="visible">
              <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center gap-2">
                <Calendar size={22} className="text-cyan-400" />
                Milestones
              </h2>

              {milestones.length === 0 ? (
                <motion.div variants={itemVariants} className="card p-6 text-center">
                  <Calendar className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No milestones set yet.</p>
                </motion.div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-700" />

                  <div className="space-y-4">
                    {milestones.map((milestone, idx) => {
                      const { status, color, icon: StatusIcon } = getMilestoneStatus(milestone.deadline);
                      const isPassed = status === 'passed';

                      return (
                        <motion.div
                          key={milestone.id || idx}
                          variants={itemVariants}
                          className="relative pl-10"
                        >
                          <div
                            className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 ${
                              isPassed
                                ? 'bg-green-500 border-green-400'
                                : color === 'red'
                                  ? 'bg-red-500 border-red-400'
                                  : 'bg-slate-600 border-slate-500'
                            }`}
                          />

                          <div className="card p-4 hover:border-slate-600 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-medium text-slate-50 text-sm leading-tight">
                                {milestone.topic}
                              </h3>
                              <StatusIcon
                                size={16}
                                className={
                                  isPassed ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-slate-400'
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              <span className="text-xs text-slate-400">
                                {new Date(milestone.deadline).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}
                              </span>
                              <Badge color={color} className="text-xs">{status}</Badge>
                              {milestone.isCompulsory && (
                                <Badge color="red" className="text-xs flex items-center gap-0.5">
                                  <Pin size={10} /> Required
                                </Badge>
                              )}
                            </div>
                            {!isPassed && materials.length > 0 && (
                              <button
                                onClick={() => handleGeneratePlan(milestone.id)}
                                disabled={preparingMilestone === milestone.id}
                                className="w-full text-xs py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center justify-center gap-1.5"
                              >
                                {preparingMilestone === milestone.id ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                                    Preparing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={12} />
                                    Prepare for this
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </main>

      <PreAssessmentModal
        isOpen={showAssessment}
        onClose={() => setShowAssessment(false)}
        classId={id}
        milestoneId={activeMilestoneId}
        onComplete={handleAssessmentComplete}
      />

      <FilePreviewModal
        isOpen={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        file={previewMaterial}
        classId={id}
      />
    </div>
  );
};

export default ClassDetail;
