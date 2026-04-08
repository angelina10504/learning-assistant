import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react';
import sessionService from '../../services/sessionService';
import toast from 'react-hot-toast';

const FinalQuizModal = ({ isOpen, onClose, topicName, classId, sessionId, difficulty, onComplete }) => {
  const [stage, setStage] = useState('intro'); // intro, questions, results
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedLetter }
  const [resultsData, setResultsData] = useState(null); // { passed, score, results }

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStage('intro');
      setQuiz(null);
      setCurrentQIndex(0);
      setAnswers({});
      setResultsData(null);
    }
  }, [isOpen, topicName]);

  if (!isOpen) return null;

  const startQuiz = async (isRetry = false) => {
    console.log('[FinalQuiz] Fetching final quiz with:', { classId, topicName, sessionId, isRetry });
    try {
      setLoading(true);
      const res = await sessionService.getFinalQuiz(classId, topicName, isRetry, difficulty);
      console.log('[FinalQuiz] Response:', res.status, res.data);
      if (res.data && res.data.questions) {
        setQuiz(res.data);
        setStage('questions');
      } else {
        toast.error('Invalid quiz data received.');
      }
    } catch (err) {
      console.error('[FinalQuiz] Error:', err?.response?.status, JSON.stringify(err?.response?.data), err?.message);
      if (err.response?.data?.error === 'course_not_vectorized') {
        toast.error(err.response.data.message || "Your teacher hasn't prepared the study material yet.");
      } else {
        const msg = err.response?.data?.message || err.message || 'Failed to load assessment. Please try again.';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, letter) => {
    setAnswers(prev => ({ ...prev, [qId]: letter }));
  };

  const submitAssessment = async () => {
    try {
      setLoading(true);
      const formattedAnswers = Object.entries(answers).map(([qId, letter]) => ({
        questionId: parseInt(qId),
        selectedLetter: letter
      }));
      const res = await sessionService.submitFinalQuiz(sessionId, classId, topicName, formattedAnswers);
      setResultsData(res.data);
      setStage('results');
    } catch (err) {
      toast.error('Failed to submit assessment.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentQIndex < quiz.questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      submitAssessment();
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const handleDone = () => {
    // Notify parent to actually end session and navigate
    onComplete(resultsData.passed);
  };

  // Render logic based on stage
  let content = null;

  if (stage === 'intro') {
    content = (
      <div className="flex flex-col items-center text-center p-6">
        <div className="mb-6 p-4 rounded-full bg-indigo-500/10 text-indigo-400">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-50 mb-2">Final Assessment — {topicName}</h2>
        <p className="text-slate-400 mb-8 max-w-sm">
          5 questions · No time limit · 70% required to complete this topic
        </p>
        
        {loading ? (
          <div className="flex flex-col items-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Preparing your assessment...</p>
          </div>
        ) : (
          <button onClick={() => startQuiz()} className="btn-primary w-full max-w-xs text-lg py-3">
            Begin Assessment
          </button>
        )}
      </div>
    );
  } else if (stage === 'questions' && quiz) {
    const q = quiz.questions[currentQIndex];
    const selectedLetter = answers[q.id];

    content = (
      <div className="flex flex-col w-full max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-300">Question {currentQIndex + 1} of {quiz.questions.length}</h3>
          <span className="text-sm text-slate-400 font-mono">{Math.round(((currentQIndex) / quiz.questions.length) * 100)}% Complete</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full mb-8 overflow-hidden">
          <div 
            className="bg-indigo-500 h-full transition-all duration-300" 
            style={{ width: `${((currentQIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-slate-800 rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
          <p className="text-xl text-slate-50 mb-6">{q.question}</p>
          <div className="space-y-3">
            {q.options.map(opt => {
              const isSelected = selectedLetter === opt.letter;
              return (
                <button
                  key={opt.letter}
                  onClick={() => handleSelectOption(q.id, opt.letter)}
                  className={`w-full text-left p-4 rounded-lg flex items-start gap-4 transition-all border ${
                    isSelected 
                      ? 'bg-indigo-600/40 border-indigo-400' 
                      : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 hover:border-slate-500'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm mt-0.5 ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    {opt.letter}
                  </div>
                  <span className="text-slate-200">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between mt-auto">
          <button 
            onClick={handlePrev} 
            disabled={currentQIndex === 0 || loading}
            className="btn-secondary flex items-center gap-2 px-6"
            style={{ opacity: currentQIndex === 0 ? 0 : 1 }}
          >
            <ArrowLeft size={18} /> Previous
          </button>
          
          <button 
            onClick={handleNext}
            disabled={!selectedLetter || loading}
            className="btn-primary flex items-center gap-2 px-8 py-3 font-semibold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
              currentQIndex === quiz.questions.length - 1 ? 'Submit Assessment' : 'Next Question'
            }
            {!loading && currentQIndex !== quiz.questions.length - 1 && <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    );
  } else if (stage === 'results' && resultsData) {
    const { passed, score, results, attemptNumber } = resultsData;

    content = (
      <div className="flex flex-col w-full max-w-4xl mx-auto h-[80vh]">
        {passed ? (
          <div className="bg-emerald-900/40 border border-emerald-500/50 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between mb-8 flex-shrink-0">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-emerald-400">Score: {score}% — Topic Completed!</h3>
                <p className="text-emerald-300/70">You can now proceed to the next topic.</p>
              </div>
            </div>
            <button onClick={handleDone} className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white border-0 py-3">
              Continue to Next Topic
            </button>
          </div>
        ) : (
          <div className="bg-amber-900/40 border border-amber-500/50 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between mb-8 flex-shrink-0">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-amber-400">Score: {score}% — Keep Studying</h3>
                <p className="text-amber-300/70">You need 70% to unlock the next topic. Review your answers below.</p>
              </div>
            </div>
            <div className="flex gap-3">
              {attemptNumber >= 3 ? (
                <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700 mr-2 flex items-center">
                  <span className="text-sm text-slate-300">You've attempted this quiz 3 times. Please review the topic with your teacher.</span>
                </div>
              ) : (
                <button onClick={() => { setStage('intro'); startQuiz(true); }} className="btn-secondary bg-slate-800 text-slate-200">
                  Retry Quiz Now
                </button>
              )}
              <button onClick={handleDone} className="btn-primary">
                Review Topic & Retry Later
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
          {quiz.questions.map((q, idx) => {
            const res = results.find(r => r.questionId === q.id);
            if (!res) return null;
            
            // Determine if this is the first wrong answer
            const isFirstWrong = quiz.questions.findIndex(question => {
                const r = results.find(res => res.questionId === question.id);
                return r && !r.isCorrect;
            }) === idx;
            
            return (
              <div key={q.id} className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
                <div className="flex items-start gap-3 mb-4">
                  <div className="mt-1">
                    {res.isCorrect ? (
                      <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                    ) : (
                      <XCircle className="text-red-500 w-6 h-6" />
                    )}
                  </div>
                  <h4 className="text-lg text-slate-50 font-medium leading-relaxed">{q.question}</h4>
                </div>
                
                <div className="space-y-2 ml-9">
                  {q.options.map(opt => {
                    let optStyle = "bg-slate-900/50 text-slate-400 border-slate-700/50";
                    
                    if (res.isCorrect && opt.letter === res.selectedLetter) {
                      optStyle = "bg-emerald-900/30 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/50";
                    } else if (!res.isCorrect && opt.letter === res.selectedLetter) {
                      optStyle = "bg-red-900/30 text-red-300 border-red-500/50 line-through decoration-red-500/50";
                    } else if (!res.isCorrect && opt.letter === res.correctLetter) {
                      optStyle = "bg-emerald-900/30 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/50";
                    }

                    return (
                      <div key={opt.letter} className={`p-3 rounded-lg border flex gap-3 ${optStyle}`}>
                        <span className="font-bold opacity-70">{opt.letter}</span>
                        <span>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {!res.isCorrect && (
                  <details className="mt-4 ml-9 group" open={isFirstWrong}>
                    <summary className="cursor-pointer list-none flex items-center gap-2 text-slate-400 hover:text-slate-200 font-medium text-sm mb-2 outline-none select-none">
                      <span className="group-open:rotate-90 transition-transform"><ChevronRight size={16} /></span>
                      View Explanations
                    </summary>
                    <div className="space-y-4 pl-6 border-l-2 border-slate-700 mt-2 pb-2">
                       {/* Red Box for Wrong Answer */}
                       {res.wrongAnswerReason && (
                         <div className="bg-red-950 p-4 border border-red-800 rounded-lg text-red-200">
                           <p className="text-sm font-semibold mb-1">Why this is wrong:</p>
                           <p className="text-sm">{res.wrongAnswerReason}</p>
                         </div>
                       )}
                       
                       {/* Correct Answer Note */}
                       <p className="text-sm font-semibold text-emerald-400 mt-4 mb-2">
                         Correct Answer: {res.correctLetter}) {q.options.find(o => o.letter === res.correctLetter)?.text}
                       </p>
                       
                       {/* Green Box for Correct Answer */}
                       {res.explanation && (
                         <div className="bg-emerald-950 p-4 border border-emerald-800 rounded-lg text-emerald-200">
                           <p className="text-sm font-semibold mb-1">Why this is correct:</p>
                           <p className="text-sm">{res.explanation}</p>
                         </div>
                       )}
                    </div>
                  </details>
                )}
                {res.isCorrect && res.explanation && (
                  <div className="mt-4 ml-9 bg-slate-900/60 p-4 rounded-lg flex gap-3 border-l-2 border-emerald-500">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-400 mb-1">Why is {res.correctLetter} correct?</p>
                      <p className="text-sm text-slate-300 italic">{res.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl relative"
        >
          {stage === 'intro' && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <XCircle size={28} />
            </button>
          )}

          <div className="bg-slate-900 p-8 h-full min-h-[60vh] max-h-[90vh] flex items-center justify-center border border-slate-700/50 rounded-2xl shadow-indigo-500/5">
            {content}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FinalQuizModal;
