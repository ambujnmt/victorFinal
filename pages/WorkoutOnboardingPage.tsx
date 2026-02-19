
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { generateWorkoutPlan } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Calendar, ChevronRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../App';
import { updateUserData } from '../services/firebaseService';

const equipmentOptions = [
    'Bodyweight only', 'Dumbbells', 'Barbell & Plates', 'Kettlebells', 
    'Resistance Bands', 'Pull-up Bar', 'Full Gym', 'CrossFit Gym'
];

const inspirationTexts = [
    "Your only limit is you.",
    "Consistency is the key to mastery.",
    "Train your body, honor your soul.",
    "Small steps, every day, lead to big results.",
];

const WorkoutOnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [inspiration, setInspiration] = useState(inspirationTexts[0]);
  
  const [answers, setAnswers] = useState({
    goal: 'Build Strength',
    experience: 'Beginner',
    frequency: 3,
    duration: 12,
    age: user?.age || 30,
    height: user?.height || 180,
    weight: user?.weight || 80,
    equipment: [] as string[],
    oneRepMax: { squat: 0, deadlift: 0, bench: 0 },
    injuries: '',
  });

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setInspiration(prev => {
          const idx = (inspirationTexts.indexOf(prev) + 1) % inspirationTexts.length;
          return inspirationTexts[idx];
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const steps = [
    { key: 'goal', title: 'Your Goal?' },
    { key: 'experience', title: 'Experience Level?' },
    { key: 'frequency', title: 'Days Per Week?' },
    { key: 'duration', title: 'Plan Duration?' },
    { key: 'biometrics', title: 'Personal Details' },
    { key: 'equipment', title: 'Available Gear?' },
    { key: 'oneRepMax', title: 'Estimated 1RM' },
    { key: 'injuries', title: 'Health Safety' },
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handleToggleEquipment = (item: string) => {
      setAnswers(prev => ({
          ...prev,
          equipment: prev.equipment.includes(item) 
            ? prev.equipment.filter(i => i !== item)
            : [...prev.equipment, item]
      }));
  };

  const handleGeneratePlan = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const plan = await generateWorkoutPlan(answers);
        await updateUserData(user.id, {
            workoutPlan: plan, 
            age: answers.age,
            height: answers.height,
            weight: answers.weight,
            workoutPlanStartDate: new Date().toISOString()
        });
        navigate('/workout-plan');
    } catch (error) {
        console.error(error);
        alert("Coach is offline or having trouble processing your data. Please check your internet and try again.");
    } finally {
        setIsLoading(false);
    }
  };

  if (isLoading) {
      return (
         <div className="min-h-screen bg-[rgb(19,54,102)] flex flex-col items-center justify-center p-8 text-center">
            <Sparkles size={64} className="text-[rgb(251_191_36)] animate-pulse mb-6"/>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">AI Coach Building Plan...</h2>
            <p className="mt-4 text-gray-400 max-w-xs font-medium">Analyzing biometrics and periodizing your {answers.duration}-week schedule.</p>
            <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 italic text-[rgb(255_152_43)]">
                "{inspiration}"
            </div>
        </div>
      )
  }

  const renderContent = () => {
    const current = steps[step];
    switch(current.key) {
        case 'goal': return (
            <div className="grid gap-3">
                {['Build Strength', 'Build Muscle', 'Weight Loss', 'Longevity'].map(o => (
                    <button key={o} onClick={() => {setAnswers({...answers, goal: o}); handleNext()}} className={`p-5 rounded-2xl border-2 text-left font-bold text-lg transition-all ${answers.goal === o ? 'border-[rgb(255_117_93)] bg-[rgb(255_117_93/0.2)]' : 'border-gray-700 bg-gray-800'}`}>{o}</button>
                ))}
            </div>
        );
        case 'experience': return (
            <div className="grid gap-3">
                {['Beginner', 'Intermediate', 'Advanced'].map(o => (
                    <button key={o} onClick={() => {setAnswers({...answers, experience: o}); handleNext()}} className={`p-5 rounded-2xl border-2 text-left font-bold text-lg transition-all ${answers.experience === o ? 'border-[rgb(255_117_93)] bg-[rgb(255_117_93/0.2)]' : 'border-gray-700 bg-gray-800'}`}>
                        {o}
                        <p className="text-xs font-normal text-gray-400 mt-1">
                            {o === 'Beginner' && '0-1 year experience. Focus on form and foundations.'}
                            {o === 'Intermediate' && '1-3 years consistent training. Focused on progression.'}
                            {o === 'Advanced' && '3+ years experience. Complex movements and high intensity.'}
                        </p>
                    </button>
                ))}
            </div>
        );
        case 'frequency': return (
            <div className="grid gap-3">
                {[2, 3, 4, 5, 6].map(num => (
                    <button key={num} onClick={() => {setAnswers({...answers, frequency: num}); handleNext()}} className={`p-5 rounded-2xl border-2 text-left font-bold text-lg transition-all ${answers.frequency === num ? 'border-[rgb(255_117_93)] bg-[rgb(255_117_93/0.2)]' : 'border-gray-700 bg-gray-800'}`}>{num} Days Per Week</button>
                ))}
            </div>
        );
        case 'duration': return (
            <div className="grid gap-4">
                {[4, 8, 12].map(weeks => (
                    <button key={weeks} onClick={() => {setAnswers({...answers, duration: weeks}); handleNext()}} className={`p-6 rounded-3xl border-2 text-left transition-all ${answers.duration === weeks ? 'border-[rgb(16_185_129)] bg-[rgb(16_185_129/0.1)]' : 'border-gray-700 bg-gray-800'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="block text-2xl font-black text-white">{weeks} WEEKS</span>
                                <span className="text-sm font-bold text-gray-500 uppercase">{weeks === 12 ? 'Full Transformation' : 'Focused Growth'}</span>
                            </div>
                            <Calendar className={answers.duration === weeks ? 'text-[rgb(16_185_129)]' : 'text-gray-600'} />
                        </div>
                    </button>
                ))}
            </div>
        );
        case 'biometrics': return (
            <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                    <label className="text-xs font-black text-gray-500 uppercase">Weight (kg)</label>
                    <input type="number" value={answers.weight} onChange={e => setAnswers({...answers, weight: +e.target.value})} className="w-full bg-transparent text-2xl font-bold mt-1 outline-none text-white"/>
                </div>
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                    <label className="text-xs font-black text-gray-500 uppercase">Height (cm)</label>
                    <input type="number" value={answers.height} onChange={e => setAnswers({...answers, height: +e.target.value})} className="w-full bg-transparent text-2xl font-bold mt-1 outline-none text-white"/>
                </div>
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                    <label className="text-xs font-black text-gray-500 uppercase">Age</label>
                    <input type="number" value={answers.age} onChange={e => setAnswers({...answers, age: +e.target.value})} className="w-full bg-transparent text-2xl font-bold mt-1 outline-none text-white"/>
                </div>
            </div>
        );
        case 'equipment': return (
            <div className="grid grid-cols-1 gap-2">
                {equipmentOptions.map(opt => (
                    <button 
                        key={opt} 
                        onClick={() => handleToggleEquipment(opt)}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between font-bold transition-all ${answers.equipment.includes(opt) ? 'border-[rgb(59_130_246)] bg-[rgb(59_130_246/0.1)] text-white' : 'border-gray-700 bg-gray-800 text-gray-400'}`}
                    >
                        {opt}
                        {answers.equipment.includes(opt) && <CheckCircle2 size={18} />}
                    </button>
                ))}
            </div>
        );
        case 'oneRepMax': return (
            <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-4">Enter your best lifts (in kg) or estimate. Use 0 if unsure.</p>
                {['squat', 'bench', 'deadlift'].map(lift => (
                    <div key={lift} className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                        <label className="text-xs font-black text-gray-500 uppercase">{lift.toUpperCase()} 1RM (kg)</label>
                        <input 
                            type="number" 
                            value={(answers.oneRepMax as any)[lift]} 
                            onChange={e => setAnswers({...answers, oneRepMax: {...answers.oneRepMax, [lift]: +e.target.value}})} 
                            className="w-full bg-transparent text-2xl font-bold mt-1 outline-none text-white"
                        />
                    </div>
                ))}
            </div>
        );
        case 'injuries': return (
            <div className="space-y-4">
                <div className="bg-[rgb(255_117_93/0.1)] p-4 rounded-2xl border border-[rgb(255_117_93/0.3)] flex items-start">
                    <AlertCircle size={20} className="text-[rgb(255_117_93)] mr-3 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-300">Safety first. Let the AI coach know about any existing injuries or medical conditions to adapt your plan.</p>
                </div>
                <textarea 
                    value={answers.injuries}
                    onChange={e => setAnswers({...answers, injuries: e.target.value})}
                    placeholder="e.g. Lower back pain, knee surgery 2 years ago, or 'None'"
                    className="w-full h-40 p-4 bg-gray-800 border-2 border-gray-700 rounded-2xl text-white outline-none focus:border-[rgb(255_117_93)] transition-colors"
                />
            </div>
        );
        default: return <p className="text-gray-500">Processing detailed data...</p>;
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(19,54,102)] text-white p-6 flex flex-col justify-between">
        <div className="max-w-md mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <button onClick={handleBack} className="text-gray-500 hover:text-white p-2"><ArrowLeft /></button>
                <div className="flex-grow mx-4 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[rgb(255_117_93)] h-full transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }}></div>
                </div>
                <span className="text-xs font-black text-gray-500">{step + 1}/{steps.length}</span>
            </div>
            
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-8 leading-none">{steps[step].title}</h1>
            {renderContent()}
        </div>

        <div className="max-w-md mx-auto w-full mt-8">
            {step === steps.length - 1 ? (
                <button onClick={handleGeneratePlan} className="w-full bg-[rgb(255_117_93)] py-5 rounded-3xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">GENERATE PLAN</button>
            ) : (
                <button onClick={handleNext} className="w-full bg-white text-black py-5 rounded-3xl font-black text-xl flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all">NEXT <ChevronRight size={24} className="ml-1"/></button>
            )}
        </div>
    </div>
  );
};

export default WorkoutOnboardingPage;
