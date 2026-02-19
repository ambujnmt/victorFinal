
import React, { useState, useEffect } from 'react';
import { User, WorkoutDay, CoachInsight } from '../types';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Trophy, MessageSquareQuote, RefreshCw, Loader2, PlayCircle, BarChart3, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../App';
import { logWorkoutCompletion, getWorkoutLogs, saveCoachInsight } from '../services/firebaseService';
import { generateCoachInsight } from '../services/geminiService';

interface WorkoutPlanPageProps {}

const FeedbackModal: React.FC<{ day: WorkoutDay, week: number, onClose: () => void, onSubmit: (difficulty: any, comments: string) => void }> = ({ day, week, onClose, onSubmit }) => {
    const [difficulty, setDifficulty] = useState<'Too Easy' | 'Just Right' | 'Too Hard' | ''>('');
    const [comments, setComments] = useState('');

    const handleSubmit = () => {
        if (!difficulty) {
            alert('Please select a difficulty rating.');
            return;
        }
        onSubmit(difficulty, comments);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white">Workout Complete!</h3>
                        <p className="text-sm text-gray-400">Week {week}, Day {day.day}: {day.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-700 p-2 rounded-full"><X size={20}/></button>
                </div>
                <div className="space-y-6">
                    <div>
                        <p className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wide">How did it feel?</p>
                        <div className="grid grid-cols-3 gap-3">
                            {['Too Easy', 'Just Right', 'Too Hard'].map(level => (
                                <button 
                                    key={level} 
                                    onClick={() => setDifficulty(level as any)} 
                                    className={`p-4 rounded-xl text-sm font-bold border-2 transition-all ${difficulty === level ? 'bg-[rgb(255_117_93)] text-white border-[rgb(255_117_93)] transform scale-105 shadow-lg' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-300 mb-2 block uppercase tracking-wide">Coach's Notes (Optional)</label>
                        <textarea 
                            value={comments} 
                            onChange={e => setComments(e.target.value)} 
                            placeholder="Example: Squats felt heavy, form was good."
                            className="w-full p-3 h-24 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[rgb(59_130_246)]"
                        />
                    </div>
                    <button onClick={handleSubmit} className="w-full bg-[rgb(16_185_129)] text-white font-bold py-4 rounded-xl text-lg hover:bg-opacity-90 transition shadow-lg flex items-center justify-center">
                        <Trophy className="mr-2" size={20} /> Log Workout (+50 Pts)
                    </button>
                </div>
            </div>
        </div>
    );
};

const CoachVictorCard: React.FC<{ user: User }> = ({ user }) => {
    const [insight, setInsight] = useState<CoachInsight | undefined>(user.coachInsight);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshInsight = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const logs = await getWorkoutLogs(user.id, 5); // Get last 5 logs
            const newInsight = await generateCoachInsight(user, logs);
            await saveCoachInsight(user.id, newInsight);
            setInsight(newInsight);
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('index')) {
                setError("Database index required. Please contact admin.");
            } else {
                setError("Failed to reach Coach Victor. Try again later.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // Auto-generate if no insight exists yet
    useEffect(() => {
        if (!insight && !isGenerating) {
            refreshInsight();
        }
    }, []);

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
            <div className="bg-[#133666] p-4 flex justify-between items-center">
                <div className="flex items-center">
                    <div className="bg-white p-1.5 rounded-full mr-3">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Victor&clothing=hoodie&skinColor=black" alt="Coach" className="w-8 h-8 rounded-full"/>
                    </div>
                    <div>
                        <h3 className="font-bold text-white uppercase tracking-wide">Coach Victor</h3>
                        <p className="text-[10px] text-gray-300 font-medium uppercase">AI Performance Analyst</p>
                    </div>
                </div>
                <button onClick={refreshInsight} disabled={isGenerating} className="text-[rgb(255_152_43)] hover:text-white transition-colors disabled:opacity-50">
                    <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                </button>
            </div>
            
            <div className="p-6">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={24}/>
                        <p className="text-sm">Analyzing your performance...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                        <AlertCircle className="text-[rgb(255_117_93)] mb-2" size={24} />
                        <p className="text-xs text-gray-400">{error}</p>
                    </div>
                ) : insight ? (
                    <div>
                        <div className="flex items-start mb-4">
                            <MessageSquareQuote className="text-[rgb(255_117_93)] mr-3 flex-shrink-0 mt-1" size={24} />
                            <p className="text-lg text-white font-medium leading-relaxed italic">"{insight.message}"</p>
                        </div>
                        <div className="flex justify-between items-end border-t border-gray-700 pt-4 mt-4">
                             <div className="text-xs text-gray-500">
                                Last updated: {new Date(insight.generatedAt).toLocaleDateString()}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                insight.insightType === 'celebration' ? 'bg-green-900/50 text-green-400' :
                                insight.insightType === 'correction' ? 'bg-red-900/50 text-red-400' :
                                'bg-blue-900/50 text-blue-400'
                            }`}>
                                {insight.insightType}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-400">
                        <p>Complete your first workout to unlock Coach insights!</p>
                    </div>
                )}
            </div>
        </div>
    );
}


const WorkoutPlanPage: React.FC<WorkoutPlanPageProps> = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const plan = user?.workoutPlan;
  
  const [activeTab, setActiveTab] = useState<'plan' | 'coach'>('plan');
  const [activeWeek, setActiveWeek] = useState(1);
  
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedDayForFeedback, setSelectedDayForFeedback] = useState<WorkoutDay | null>(null);

  // Set active week based on start date logic on mount
  useEffect(() => {
    if (user?.workoutPlanStartDate) {
         const startDate = new Date(user.workoutPlanStartDate);
         const today = new Date();
         const diffTime = Math.abs(today.getTime() - startDate.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
         const currentWeek = Math.ceil(diffDays / 7);
         if(currentWeek > 0 && currentWeek <= (plan?.duration || 12)) {
             setActiveWeek(currentWeek);
         }
    }
  }, [user]);

  const handleOpenFeedbackModal = (day: WorkoutDay) => {
    setSelectedDayForFeedback(day);
    setIsFeedbackModalOpen(true);
  };

  const handleCloseFeedbackModal = () => {
      setIsFeedbackModalOpen(false);
      setSelectedDayForFeedback(null);
  };

  const handleSubmitFeedback = async (difficulty: any, comments: string) => {
      if(!user || !selectedDayForFeedback) return;
      
      try {
        await logWorkoutCompletion(user.id, activeWeek, selectedDayForFeedback.day, difficulty, comments);
        alert('Great job! You earned 50 points for completing this workout.');
      } catch (e) {
        console.error("Failed to log workout", e);
        alert("Error saving workout log.");
      }
      
      handleCloseFeedbackModal();
  };

  if (!user) {
    return <div className="p-4 text-white">Loading...</div>;
  }
  
  if (!plan) {
    return (
      <div className="min-h-screen bg-[rgb(19,54,102)] flex flex-col items-center justify-center p-6 text-white text-center">
        <h2 className="text-2xl font-bold">No workout plan found.</h2>
        <button onClick={() => navigate('/my-plan')} className="mt-4 bg-[rgb(255_117_93)] font-bold py-3 px-6 rounded-full">Go to Profile</button>
      </div>
    );
  }
  
  const selectedWeekData = plan.weeks.find(w => w.week === activeWeek) || plan.weeks[0];

  return (
    <div className="p-4 pb-24 space-y-6 bg-[rgb(19,54,102)] min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
          <button onClick={() => navigate('/my-plan')} className="flex items-center text-[rgb(255_152_43)] font-bold">
              <ArrowLeft size={20} className="mr-2"/> Back
          </button>
          <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
             <button onClick={() => setActiveTab('plan')} className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'plan' ? 'bg-[#133666] text-white' : 'text-gray-400'}`}>
                Plan
             </button>
             <button onClick={() => setActiveTab('coach')} className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${activeTab === 'coach' ? 'bg-[#133666] text-white' : 'text-gray-400'}`}>
                Coach
             </button>
          </div>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">{plan.title}</h1>
        <p className="text-gray-400 text-sm mt-1">{plan.duration}-Week Personalized Program</p>
      </div>

      {activeTab === 'coach' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <CoachVictorCard user={user} />
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 p-5 rounded-2xl shadow-lg border-l-4 border-[rgb(16_185_129)]">
                      <p className="text-xs text-gray-400 font-bold uppercase">Workouts Done</p>
                      <p className="text-3xl font-extrabold text-white mt-1">{user.completedWorkouts || 0}</p>
                  </div>
                   <div className="bg-gray-800 p-5 rounded-2xl shadow-lg border-l-4 border-[rgb(251_191_36)]">
                      <p className="text-xs text-gray-400 font-bold uppercase">Points Earned</p>
                      <p className="text-3xl font-extrabold text-white mt-1">{(user.completedWorkouts || 0) * 50}</p>
                  </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
                  <h3 className="font-bold text-lg mb-4 flex items-center"><Info size={20} className="mr-2 text-[rgb(59_130_246)]"/> Program Stats</h3>
                  <div className="space-y-4">
                      <div>
                          <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">Program Completion</span>
                              <span className="font-bold">{Math.min(100, Math.round((activeWeek / plan.duration) * 100))}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                              <div className="bg-[rgb(255_117_93)] h-2 rounded-full" style={{ width: `${(activeWeek / plan.duration) * 100}%` }}></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'plan' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
            {/* Week Selector */}
            <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex space-x-2">
                    {plan.weeks.map(week => (
                        <button
                            key={week.week}
                            onClick={() => setActiveWeek(week.week)}
                            className={`flex-shrink-0 w-16 h-16 flex flex-col items-center justify-center rounded-2xl transition-all border-2 ${
                                activeWeek === week.week 
                                ? 'bg-[rgb(255_117_93)] border-[rgb(255_117_93)] text-white shadow-lg scale-105' 
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            <span className="text-[10px] font-bold uppercase">Week</span>
                            <span className="text-xl font-extrabold">{week.week}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Days List */}
            <div className="space-y-4">
                {selectedWeekData.days.map(day => (
                    <div key={day.day} className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700/50">
                        <div className="p-5 flex justify-between items-start">
                            <div>
                                <h3 className="font-extrabold text-lg text-white">Day {day.day}</h3>
                                <p className="text-[rgb(255_152_43)] font-bold">{day.title}</p>
                            </div>
                            {day.exercises.length > 0 ? (
                                <span className="bg-[#133666] text-xs font-bold px-3 py-1 rounded-full text-blue-200">
                                    {day.exercises.length} Exercises
                                </span>
                            ) : (
                                <span className="bg-gray-700 text-xs font-bold px-3 py-1 rounded-full text-gray-400">Rest</span>
                            )}
                        </div>

                        {day.exercises.length > 0 && (
                            <>
                                <div className="px-5 pb-5 space-y-3">
                                    {day.exercises.map((ex, idx) => (
                                        <div key={idx} className="bg-gray-900/50 p-3 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm text-white">{ex.name}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {ex.sets} sets × {ex.reps} • <span className="text-[rgb(251_191_36)]">{ex.weight}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase">Rest</p>
                                                <p className="text-xs font-bold text-gray-300">{ex.rest}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-gray-900/30 p-4 border-t border-gray-700">
                                    <button
                                        onClick={() => handleOpenFeedbackModal(day)}
                                        className="w-full bg-[rgb(16_185_129)] text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-opacity-90 transition-transform active:scale-95 flex items-center justify-center shadow-md"
                                    >
                                        <CheckCircle className="mr-2" size={18}/> Log Workout
                                    </button>
                                </div>
                            </>
                        )}
                        {day.exercises.length === 0 && (
                             <div className="px-5 pb-5 text-gray-500 text-sm italic">
                                Active recovery. Go for a walk or stretch.
                             </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {isFeedbackModalOpen && selectedDayForFeedback && (
        <FeedbackModal
            day={selectedDayForFeedback}
            week={activeWeek}
            onClose={handleCloseFeedbackModal}
            onSubmit={handleSubmitFeedback}
        />
       )}
    </div>
  );
};

export default WorkoutPlanPage;
