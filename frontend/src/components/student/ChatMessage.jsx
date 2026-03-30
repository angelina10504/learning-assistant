import { motion } from 'framer-motion';
import { BookOpen, HelpCircle, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Badge from '../shared/Badge';

const ChatMessage = ({ message }) => {
  const { role, content, toolsUsed = [], sources = [], timestamp } = message;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const toolBadgeMap = {
    'retrieve': { icon: BookOpen, label: 'Retrieved', color: 'cyan' },
    'question': { icon: HelpCircle, label: 'Question', color: 'indigo' },
    'weak_area': { icon: AlertTriangle, label: 'Logged Weak Area', color: 'amber' },
    'suggestion': { icon: Lightbulb, label: 'Suggested Topic', color: 'green' },
    'summary': { icon: BarChart3, label: 'Summary', color: 'cyan' },
  };

  if (role === 'user') {
    return (
      <motion.div
        className="flex justify-end mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-xs lg:max-w-md bg-indigo-600 rounded-2xl rounded-tr-sm px-4 py-3 shadow-md">
          <p className="text-slate-50 text-sm leading-relaxed break-words">{content}</p>
          <p className="text-xs text-indigo-200 mt-2 opacity-70">{formatTime(timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  // AI message
  return (
    <motion.div
      className="flex justify-start mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-xs lg:max-w-2xl">
        {/* Tool badges */}
        {toolsUsed && toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {toolsUsed.map((tool, idx) => {
              const toolInfo = toolBadgeMap[tool];
              const Icon = toolInfo?.icon;
              return (
                <Badge key={idx} color={toolInfo?.color || 'slate'} className="text-xs flex items-center gap-1">
                  {Icon && <Icon className="w-3 h-3" />}
                  {toolInfo?.label || tool}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Main message card */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <ReactMarkdown className="text-slate-100 text-sm leading-relaxed prose prose-invert max-w-none">
            {content}
          </ReactMarkdown>

          {/* Source citations */}
          {sources && sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Sources:</p>
              {sources.map((source, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-slate-700/30 border border-slate-600/30 rounded-lg p-2 hover:bg-slate-700/50 transition-colors"
                >
                  <p className="text-cyan-300 font-medium truncate">{source.title || 'Reference'}</p>
                  {source.excerpt && (
                    <p className="text-slate-400 mt-1 line-clamp-2">{source.excerpt}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500 mt-2 opacity-70">{formatTime(timestamp)}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
