import { motion } from 'framer-motion';
import { BookOpen, HelpCircle, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Badge from '../shared/Badge';

// Custom markdown component renderers for clean, styled output
const markdownComponents = {
  // Headings — smaller and accent-colored, not giant h1s
  h1: ({ children }) => (
    <p className="text-indigo-300 font-bold text-sm mt-3 mb-1 border-b border-slate-700/50 pb-1">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="text-indigo-300 font-semibold text-sm mt-3 mb-1">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="text-slate-200 font-semibold text-sm mt-2 mb-0.5">{children}</p>
  ),

  // Paragraphs — compact, not double-spaced
  p: ({ children }) => (
    <p className="text-slate-200 text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
  ),

  // Bullet lists — clean indented dots with proper spacing
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-sm text-slate-200">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </li>
  ),

  // Bold — highlighted key terms
  strong: ({ children }) => (
    <strong className="text-white font-semibold">{children}</strong>
  ),

  // Italic
  em: ({ children }) => (
    <em className="text-slate-300 italic">{children}</em>
  ),

  // Inline code
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 text-xs text-cyan-300 font-mono overflow-x-auto my-2 whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-900/60 text-cyan-300 text-xs font-mono px-1.5 py-0.5 rounded">
        {children}
      </code>
    );
  },

  // Blockquote — for tips/notes
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-400 pl-3 my-2 text-slate-300 text-sm italic">
      {children}
    </blockquote>
  ),

  // Horizontal rule — subtle separator
  hr: () => <hr className="border-slate-700/50 my-3" />,
};

const ChatMessage = ({ message }) => {
  const { role, content, toolsUsed = [], sources = [], timestamp } = message;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const toolBadgeMap = {
    'retrieve_from_notes': { icon: BookOpen, label: 'Retrieved', color: 'cyan' },
    'retrieve':            { icon: BookOpen, label: 'Retrieved', color: 'cyan' },
    'ask_student_question':{ icon: HelpCircle, label: 'Question', color: 'indigo' },
    'question':            { icon: HelpCircle, label: 'Question', color: 'indigo' },
    'log_weak_topic':      { icon: AlertTriangle, label: 'Weak Area Logged', color: 'amber' },
    'weak_area':           { icon: AlertTriangle, label: 'Weak Area', color: 'amber' },
    'suggest_next_topic':  { icon: Lightbulb, label: 'Next Topic', color: 'green' },
    'suggestion':          { icon: Lightbulb, label: 'Suggestion', color: 'green' },
    'summarize_progress':  { icon: BarChart3, label: 'Summary', color: 'cyan' },
    'summary':             { icon: BarChart3, label: 'Summary', color: 'cyan' },
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
          <p className="text-xs text-indigo-200 mt-1.5 opacity-70 text-right">{formatTime(timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  // AI message
  return (
    <motion.div
      className="flex justify-start mb-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-xs lg:max-w-2xl w-full">
        {/* Tool badges */}
        {toolsUsed && toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {toolsUsed.map((tool, idx) => {
              const toolInfo = toolBadgeMap[tool] || toolBadgeMap[tool?.split('_')[0]];
              const Icon = toolInfo?.icon;
              return (
                <Badge key={idx} color={toolInfo?.color || 'slate'} className="text-xs flex items-center gap-1 py-0.5">
                  {Icon && <Icon className="w-3 h-3" />}
                  {toolInfo?.label || tool}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Main message card */}
        <div className="bg-slate-800/80 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="min-w-0">
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>

          {/* Source citations */}
          {sources && sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-1.5">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Sources
              </p>
              {sources.map((source, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-slate-700/30 border border-slate-600/20 rounded-lg px-3 py-2"
                >
                  <p className="text-cyan-300 font-medium truncate">{source.title || source.source || 'Reference'}</p>
                  {(source.excerpt || source.content_preview) && (
                    <p className="text-slate-400 mt-0.5 line-clamp-2">{source.excerpt || source.content_preview}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500 mt-2 opacity-60">{formatTime(timestamp)}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
