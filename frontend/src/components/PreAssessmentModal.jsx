import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, Play, ArrowRight, HelpCircle } from 'lucide-react';
import sessionService from '../services/sessionService';

const PreAssessmentModal = ({ isOpen, onClose, classId, milestoneId, onComplete }) => {
  const [stage, setStage] = useState('intro'); // intro, loading_questions, quiz, generating, success
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // { topic, correct, skipped }
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState(null);
  const [genMessage, setGenMessage] = useState("Analyzing your responses...");

  useEffect(() => {
    if (isOpen) {
      setStage('intro');
      setCurrentIdx(0);
      setAnswers([]);
      setSelectedOption(null);
      setError(null);
    }
  }, [isOpen]);

  const startAssessment = async () => {
    setStage('loading_questions');
    try {
      const response = await sessionService.getPreAssessmentQuestions(classId);
      setQuestions(response.data.questions);
      setStage('quiz');
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load diagnostic questions.");
      setStage('intro');
    }
  };

  const handleNext = () => {
    const question = questions[currentIdx];
    const isCorrect = selectedOption === question.correct;
    const isSkipped = selectedOption === 'skip';

    const newAnswers = [...answers, {
      topic: question.topic,
      correct: isCorrect,
      skipped: isSkipped
    }];
    
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      processPlanGeneration(newAnswers);
    }
  };

  const processPlanGeneration = async (finalAnswers) => {
    setStage('generating');
    setGenMessage("Analyzing your responses...");
    
    setTimeout(() => setGenMessage("Building your personalized plan..."), 2000);

    try {
      const response = await sessionService.generatePlan(classId, milestoneId, finalAnswers);
      setStage('success');
      setTimeout(() => {
        onComplete(response.data);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate plan.");
      setStage('intro');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
        onClick={() => stage !== 'generating' && onClose()}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Play className="text-indigo-400 fill-indigo-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Let's personalize your study plan</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Answer a few quick questions so we can understand what you already know and where you need focus.
              </p>
              
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={startAssessment}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                Start Assessment
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {stage === 'loading_questions' && (
            <motion.div 
              key="loading"
              className="p-12 text-center"
            >
              <Loader2 className="animate-spin text-indigo-400 mx-auto mb-4" size={48} />
              <p className="text-slate-300 font-medium">Preparing your diagnostic questions...</p>
            </motion.div>
          )}

          {stage === 'quiz' && questions.length > 0 && (
            <motion.div 
              key={`question-${currentIdx}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-8"
            >
              {/* Progress bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="text-indigo-400 text-sm font-semibold italic">{questions[currentIdx].topic}</span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-8 leading-tight">
                {questions[currentIdx].question}
              </h3>

              <div className="space-y-3 mb-8">
                {questions[currentIdx].options.map((option, idx) => {
                  const letter = option.trim().charAt(0);
                  const isSelected = selectedOption === letter;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(letter)}
                      className={`w-full p-4 text-left rounded-xl border transition-all flex items-center gap-4 ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-white/20' : 'bg-slate-900'
                      }`}>
                        {letter}
                      </span>
                      {option.substring(option.indexOf('.') + 1).trim()}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setSelectedOption('skip')}
                  className={`w-full p-4 text-left rounded-xl border border-dashed transition-all flex items-center gap-4 ${
                    selectedOption === 'skip'
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                  }`}
                >
                  <HelpCircle size={20} className="ml-1.5" />
                  <span>I'm not sure / Skip this topic</span>
                </button>
              </div>

              <button
                disabled={!selectedOption}
                onClick={handleNext}
                className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  selectedOption
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {currentIdx < questions.length - 1 ? 'Next Question' : 'Complete Assessment'}
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {stage === 'generating' && (
            <motion.div 
              key="generating"
              className="p-12 text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                <motion.div 
                  className="absolute inset-0 border-4 border-t-indigo-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{genMessage}</h3>
              <p className="text-slate-400">Our agent is tailoring the topics to your current level.</p>
            </motion.div>
          )}

          {stage === 'success' && (
            <motion.div 
              key="success"
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-emerald-500" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Your personalized plan is ready!</h2>
              <p className="text-slate-400">Loading your roadmap now...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default PreAssessmentModal;
