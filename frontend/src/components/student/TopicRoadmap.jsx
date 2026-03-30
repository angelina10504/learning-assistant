import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Lock, SkipForward } from 'lucide-react';
import Badge from '../shared/Badge';

const TopicRoadmap = ({ topics = [], title = 'Topic Roadmap', subtitle = '' }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-white" />;
      case 'current':
        return <Circle className="w-5 h-5 text-white fill-cyan-500" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-white" />;
      case 'skipped':
        return <SkipForward className="w-5 h-5 text-white" />;
      default:
        return <Circle className="w-5 h-5 text-white" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'current':
        return 'cyan';
      case 'locked':
        return 'slate';
      case 'skipped':
        return 'amber';
      default:
        return 'slate';
    }
  };

  const getNodeBgColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'current':
        return 'bg-cyan-500 shadow-lg shadow-cyan-500/50';
      case 'locked':
        return 'bg-slate-700';
      case 'skipped':
        return 'bg-amber-600';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-slate-50 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}

      {topics.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400">No topics yet</p>
        </div>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-700 to-slate-800" />

          {/* Topic nodes */}
          <div className="space-y-4">
            {topics.map((topic, idx) => (
              <motion.div
                key={idx}
                className="relative"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* Node circle */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ${getNodeBgColor(
                    topic.status
                  )} border-2 border-slate-900 transition-all duration-200 ${
                    topic.status === 'current' ? 'ring-4 ring-cyan-500/30' : ''
                  }`}
                >
                  {getStatusIcon(topic.status)}
                </div>

                {/* Topic content */}
                <div className="ml-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">{topic.name}</span>
                    <Badge color={getStatusColor(topic.status)} className="text-xs capitalize">
                      {topic.status}
                    </Badge>
                  </div>
                  {topic.subtitle && (
                    <p className="text-xs text-slate-400 mt-1">{topic.subtitle}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicRoadmap;
