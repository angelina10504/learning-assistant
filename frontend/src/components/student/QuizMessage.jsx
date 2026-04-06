import { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Parses an agent message to extract quiz data.
 * Only triggers if the message contains a CORRECT_ANSWER: X line.
 * Returns null if not a quiz message.
 */
export function parseQuizFromMessage(text) {
  // Only parse if the reliable CORRECT_ANSWER marker is present
  const correctAnswerMatch = text.match(/CORRECT_ANSWER:\s*([A-D])/i);
  if (!correctAnswerMatch) return null;

  const correctLetter = correctAnswerMatch[1].toUpperCase();

  // Extract all option lines: A) ..., B) ..., etc.
  const optionMatches = [...text.matchAll(/^([A-D])[).]\s+(.+)$/gm)];
  if (optionMatches.length < 2) return null; // not enough options

  const options = optionMatches.map(m => ({
    letter: m[1].toUpperCase(),
    text: m[2].trim(),
    full: `${m[1]}) ${m[2].trim()}`,
  }));

  // Content before first option = explanation + question
  const firstOptionIndex = text.indexOf(optionMatches[0][0]);
  const beforeOptions = text.substring(0, firstOptionIndex).trim();

  // Extract question text: last sentence/line ending with '?' before options
  const questionMatch = beforeOptions.match(/([^\n]+\?)\s*$/);
  const questionText = questionMatch
    ? questionMatch[1].trim()
    : beforeOptions.split('\n').filter(Boolean).pop() || 'Answer the question:';

  // Content before the question = purely explanatory text
  const contentBefore = beforeOptions
    .replace(questionText, '')
    .replace(/Practice Question.*\n?/i, '')
    .replace(/MCQ.*\n?/i, '')
    .trim();

  return {
    contentBefore,
    questionText,
    options,
    correctLetter,
  };
}

const QuizMessage = ({ questionText, options, correctLetter, onAnswer }) => {
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleOptionClick = (letter) => {
    if (hasAnswered) return;

    const correct = letter === correctLetter;
    setSelectedLetter(letter);
    setIsCorrect(correct);
    setHasAnswered(true);

    // Pass letter-based callback so parent can compose the right message
    onAnswer(correct, letter, correctLetter);
  };

  // Find the correct option text for the "Incorrect. Correct answer was..." message
  const correctOption = options.find(o => o.letter === correctLetter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 ml-12 lg:ml-16"
    >
      <div className="card border-l-4 border-l-indigo-500 overflow-hidden shadow-xl bg-slate-800/80 backdrop-blur-sm">
        {/* Header */}
        <div className="bg-indigo-500/10 px-4 py-2 border-b border-slate-700/50 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Practice Question
          </span>
        </div>

        <div className="p-5">
          {/* Question text */}
          <p className="text-slate-100 font-medium mb-5 leading-relaxed">
            {questionText}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {options.map(({ letter, full }) => {
              const isSelected = selectedLetter === letter;
              const isThisCorrect = letter === correctLetter;

              let buttonClass =
                'w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between ';

              if (!hasAnswered) {
                buttonClass +=
                  'bg-slate-700/40 border-slate-600/50 hover:bg-slate-700 hover:border-indigo-500/50 text-slate-300';
              } else if (isSelected && isCorrect) {
                buttonClass +=
                  'bg-emerald-900/60 border-emerald-500 text-emerald-300';
              } else if (isSelected && !isCorrect) {
                buttonClass +=
                  'bg-red-900/60 border-red-500 text-red-300';
              } else if (!isSelected && isThisCorrect) {
                // Reveal correct answer when student got it wrong
                buttonClass +=
                  'bg-emerald-900/40 border-emerald-600 text-emerald-200/80';
              } else {
                buttonClass +=
                  'bg-slate-800/40 border-slate-700 text-slate-500 opacity-50 pointer-events-none';
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleOptionClick(letter)}
                  disabled={hasAnswered}
                  className={buttonClass}
                >
                  <span className="flex-1">{full}</span>

                  {hasAnswered && isSelected && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </motion.span>
                  )}

                  {hasAnswered && !isSelected && isThisCorrect && (
                    <span className="text-[10px] font-bold text-emerald-500 border border-emerald-500/40 px-1.5 py-0.5 rounded uppercase">
                      Correct Answer
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Result feedback */}
          <AnimatePresence>
            {hasAnswered && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4 pt-4 border-t border-slate-700/50"
              >
                {isCorrect ? (
                  <div className="text-sm font-medium flex items-center gap-2 text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Correct! Well done.
                  </div>
                ) : (
                  <div className="text-sm font-medium flex items-center gap-2 text-red-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Incorrect. The correct answer was{' '}
                    <span className="font-bold">
                      {correctLetter}) {correctOption?.text}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default QuizMessage;
