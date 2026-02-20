
import React, { useState, useEffect } from 'react';
import { User, LatestMessage, SpiritSnack, ActiveChallenge } from '../types';
import { QUOTES, LATEST_MESSAGE as fallbackMessage, getDailySpiritSnack } from '../constants/staticData';
import { 
    PlayCircle, Dumbbell, Sparkles, Gift, HandHelping, 
    Globe, BookText, ChevronRight, UserPlus, Trophy, 
    Play, Share2, Quote, ArrowRight, MessageSquare, 
    PenLine, BookOpen, Bell, CheckCircle2, Plus, Target, Compass
} from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../App';
import { getGlobalContent, completeChallengeDay } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { GuidedPrayerModal } from '../components/GuidedPrayerModal';
import InviteFriendModal from '../components/InviteFriendModal';

const VideoPlayerModal: React.FC<{ videoId: string; onClose: () => void }> = ({ videoId, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="aspect-video bg-black">
                    <iframe 
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`}
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                        className="w-full h-full"
                    ></iframe>
                </div>
                <button onClick={onClose} className="w-full py-4 bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors uppercase tracking-widest text-xs">Close Player</button>
            </div>
        </div>
    );
};

const FeatureBox: React.FC<{ 
    title: string; 
    icon: React.ElementType; 
    color: string; 
    onClick: () => void;
    accentColor?: string;
}> = ({ title, icon: Icon, color, onClick, accentColor = "bg-white/20" }) => (
    <button 
        onClick={onClick}
        className={`${color} rounded-[2rem] p-6 flex flex-col justify-between items-start text-left shadow-xl transition-all active:scale-[0.98] hover:brightness-110 h-36 w-full border border-white/5 relative overflow-hidden group`}
    >
        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
            <Icon size={100} className="text-white" />
        </div>
        
        <div className={`${accentColor} w-11 h-11 rounded-2xl flex items-center justify-center mb-2 relative z-10 shadow-inner`}>
            <Icon size={22} className="text-white" />
        </div>
        
        <div className="relative z-10">
            <h3 className="font-black text-white text-xs uppercase tracking-widest leading-none mb-1">{title}</h3>
            <div className="w-6 h-0.5 bg-white/40 rounded-full"></div>
        </div>
    </button>
);

const ChallengeCarouselItem: React.FC<{ challenge: ActiveChallenge, onComplete: (id: string) => void }> = ({ challenge, onComplete }) => {
    const progress = (challenge.completedDays / challenge.duration) * 100;
    const { t } = useLanguage();
    return (
        <div className="flex-shrink-0 w-[85vw] bg-[#EF6D4D] rounded-[2.5rem] p-6 shadow-xl snap-center relative overflow-hidden border border-white/10">
            <div className="relative z-10">
                <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mb-2 bg-black/10 inline-block px-3 py-1 rounded-full">
                    Day {challenge.completedDays + 1} of {challenge.duration}
                </p>
                <h3 className="text-2xl font-black text-white leading-tight mb-4 tracking-tighter">{t(challenge.title)}</h3>
                
                <div className="mb-6">
                    <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-white h-full transition-all duration-1000 shadow-[0_0_10px_white]" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <button 
                    onClick={(e) => { e.stopPropagation(); onComplete(challenge.id); }}
                    className="w-full bg-white text-[#EF6D4D] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all active:scale-95 shadow-lg border-b-4 border-gray-200"
                >
                    Mark Today as Complete
                </button>
            </div>
            <Trophy className="absolute -right-6 -bottom-6 text-white/10" size={140} />
        </div>
    );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { onToggleNotifications } = useOutletContext<{ onToggleNotifications: () => void }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [spiritSnack, setSpiritSnack] = useState<SpiritSnack | null>(null);
  const [dailyQuote, setDailyQuote] = useState<{text: string, keywords: string[]} | null>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [latestMessage, setLatestMessage] = useState<LatestMessage>(fallbackMessage);
  const [showGuidedPrayer, setShowGuidedPrayer] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    setSpiritSnack(getDailySpiritSnack());
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    setDailyQuote(QUOTES[randomIndex]);

    const fetchAppData = async () => {
        const globalContent = await getGlobalContent();
        if (globalContent?.latestMessage) setLatestMessage(globalContent.latestMessage);
    };
    fetchAppData();
  }, []);

  const handleShareApp = async () => {
    const shareData = {
        title: 'Hey Life App',
        text: 'Come join me on the Hey Life App! Let\'s grow together.',
        url: window.location.origin
    };
    if (navigator.share) {
        try { await navigator.share(shareData); } catch (e) {}
    } else {
        navigator.clipboard.writeText(window.location.origin);
        alert('App link copied!');
    }
  };

  const handleShare = async (text: string, title: string) => {
    if (navigator.share) {
        try {
            await navigator.share({ title, text });
        } catch (err) {
            console.error(err);
        }
    } else {
        navigator.clipboard.writeText(`${title}: ${text}`);
        alert('Copied to clipboard!');
    }
  };

  const handleCompleteChallengeDay = async (challengeId: string) => {
    if (!user) return;
    try {
        await completeChallengeDay(user.id, challengeId);
    } catch (e) {
        console.error(e);
    }
  };

  const getTimeGreetingPrefix = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 18) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  };

  const getFirstName = () => {
    if (!user?.name) return '';
    return user.name.split(' ')[0];
  };

  const renderColorizedQuote = () => {
    if (!dailyQuote) return null;
    const { text, keywords } = dailyQuote;
    const cleanText = text.replace(/^"|"$/g, '').trim();
    
    const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
    const parts = cleanText.split(regex);
    
    return (
      <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tighter drop-shadow-lg px-1">
        {parts.map((part, i) => {
          const isKeyword = keywords.some(kw => kw.toLowerCase() === part.toLowerCase());
          return (
            <span key={i} className={isKeyword ? "text-[rgb(255,117,93)]" : ""}>
              {part}
            </span>
          );
        })}
      </h1>
    );
  };

  if (!user) return null;

  const activeChallenges = (user.activeChallenges || []).filter(c => c.completedDays < c.duration);
  const sermonThumbnail = latestMessage.thumbnail || `https://img.youtube.com/vi/${latestMessage.videoId}/maxresdefault.jpg`;

  return (
    <>
    <div className="p-4 space-y-6 bg-[rgb(19,54,102)] min-h-screen text-white pb-24">
      
      {/* Header */}
      <div className="flex justify-between items-center px-2 pt-2">
          <h1 className="text-3xl font-black tracking-tighter">Dashboard</h1>
          <button onClick={onToggleNotifications} className="relative p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors shadow-inner border border-white/5">
              <Bell size={24} className="text-gray-300" />
          </button>
      </div>

      {/* 1. Greeting & Inspiration Box */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] border border-white/20 rounded-[2.5rem] p-8 py-10 shadow-2xl relative overflow-hidden text-center mx-auto">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
            
            <button 
                onClick={() => dailyQuote && handleShare(`"${dailyQuote.text}"`, "Daily Inspiration")}
                className="absolute top-6 right-6 bg-white/10 backdrop-blur-sm p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all shadow-lg active:scale-90 z-20"
            >
                <Share2 size={18} />
            </button>

            <div className="relative z-10 max-w-[95%] mx-auto">
                <p className="text-lg font-black tracking-wider text-white/90 mb-6 drop-shadow-md">
                    {getTimeGreetingPrefix()}, <span className="text-[rgb(255,117,93)]">{getFirstName()}</span>
                </p>
                {renderColorizedQuote()}
                <div className="mt-8 text-white/30 text-[8px] font-black uppercase tracking-[0.5em] flex items-center justify-center">
                    <div className="h-px w-4 bg-white/20 mr-3"></div>
                    Victor Akko
                    <div className="h-px w-4 bg-white/20 ml-3"></div>
                </div>
            </div>

            <Quote className="absolute top-6 left-6 text-white opacity-[0.03]" size={64} />
          </div>
      </div>

      {/* --- Faith Check --- */}
      <div 
        onClick={() => navigate('/assessment')}
        className="bg-gradient-to-r from-[#EF6D4D] to-[#E85A37] rounded-[2.5rem] p-7 shadow-2xl border border-white/10 flex items-center justify-between group cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700 delay-100"
      >
          <div className="flex items-center space-x-5 relative z-10">
              <div className="bg-white/20 p-5 rounded-3xl border border-white/20 backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Compass className="text-white" size={28} />
              </div>
              <div>
                  <h3 className="font-black text-white text-xl leading-none tracking-tight"> {t('home.faithcheck')}</h3>
                  <p className="text-white/80 text-[10px] mt-2 font-black uppercase tracking-[0.2em]">
                    {t('home.Visualizeyourgrowthmap')}
                  </p>
              </div>
          </div>
          <div className="bg-white/10 p-2 rounded-full group-hover:translate-x-2 transition-transform">
             <ChevronRight className="text-white/60" />
          </div>
      </div>

      {/* 2. Spirit Snack Box */}
      {spiritSnack && (
          <section className="relative rounded-[2.5rem] shadow-2xl overflow-hidden p-6 pb-6 flex flex-col justify-between bg-gradient-to-br from-[#962323] to-[#4a0a0a] animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 group border border-white/5">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-[rgb(251_191_36/0.1)] text-[rgb(251,191,36)] px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] inline-block border !border-[rgb(251_191_36/0.2)] backdrop-blur-sm shadow-inner">
                        Today's Spirit Snack
                    </div>
                    <button 
                        onClick={() => handleShare(`${t(spiritSnack.titleKey)}: "${t(spiritSnack.verseKey)}"`, "Daily Spirit Snack")}
                        className="p-2 rounded-full bg-white/10 border-2 border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all active:scale-90 shadow-lg"
                    >
                        <Share2 size={16} />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <h2 className="text-2xl font-black text-white tracking-tighter leading-none drop-shadow-xl uppercase">
                        {t(spiritSnack.titleKey)}
                    </h2>
                  </div>

                  <div className="mb-6 pl-4 border-l-[3px] border-[rgb(251_191_36)] relative">
                      <p className="text-lg md:text-xl font-medium text-white leading-relaxed font-serif opacity-95">
                          {t(spiritSnack.verseKey)}
                      </p>
                  </div>

                  <div className="flex items-end justify-between">
                    <button 
                        onClick={() => setShowGuidedPrayer(true)} 
                        className="bg-transparent border-2 border-[rgb(251_191_36/0.3)] text-[rgb(251_191_36)] px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 hover:bg-[rgb(251_191_36/0.1)] shadow-xl"
                    >
                       {t('home.letsPray')}
                    </button>
                    
                    <p className="text-base font-black text-[rgb(251_191_36)] uppercase tracking-tighter drop-shadow-md pb-1">
                        {spiritSnack.reference}
                    </p>
                  </div>
              </div>
          </section>
      )}

      {/* 3. Latest Sermon Box */}
      <div 
        onClick={() => setIsVideoPlayerOpen(true)}
        className="relative h-64 w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group cursor-pointer"
      >
          <img 
            src={sermonThumbnail} 
            alt={latestMessage.title} 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40"></div>
          
          {/* Watch Label - Top Left - Glass style */}
          <div className="absolute top-6 left-6 z-20">
              <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[rgb(255,117,93)]">Watch latest sermon</p>
              </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[rgb(255_117_93)] p-7 rounded-[2rem] shadow-[0_0_40px_rgba(239,68,68,0.5)] group-hover:scale-110 transition-transform duration-500 border border-white/10 backdrop-blur-sm">
                  <Play size={36} className="text-white fill-white ml-1.5"/>
              </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 z-20">
              <h3 className="text-lg md:text-xl font-black text-white leading-none tracking-tight drop-shadow-2xl truncate">{latestMessage.title}</h3>
          </div>
      </div>

      {/* 5. Challenges Carousel */}
      <div className="space-y-4 pt-4">
          <div className="flex justify-between items-end px-3">
            <h2 className="text-2xl font-black tracking-tighter">Active quests</h2>
            <button onClick={() => navigate('/challenges')} className="text-[10px] font-black uppercase tracking-[0.2em] text-[rgb(255_152_43)]">
                Browse all
            </button>
          </div>
          <div className="flex overflow-x-auto space-x-5 pb-6 px-3 snap-x scrollbar-hide">
              {activeChallenges.length > 0 ? (
                  activeChallenges.map(challenge => (
                      <ChallengeCarouselItem 
                        key={challenge.id} 
                        challenge={challenge} 
                        onComplete={handleCompleteChallengeDay}
                      />
                  ))
              ) : (
                  <div 
                    onClick={() => navigate('/challenges')}
                    className="flex-shrink-0 w-full bg-gray-800/40 border-2 border-dashed border-gray-700 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center cursor-pointer group hover:bg-gray-800/60 transition-colors"
                  >
                      <Trophy size={48} className="text-gray-600 mb-4 group-hover:scale-110 transition-transform"/>
                      <p className="font-black text-white uppercase tracking-[0.2em] text-sm">Unlock your first quest</p>
                  </div>
              )}
              <div className="flex-shrink-0 w-4"></div>
          </div>
      </div>

      {/* 6. Gym and Friends Wide Boxes */}
      <div className="space-y-5">
        <div 
            onClick={() => navigate(user.workoutPlan ? '/workout-plan' : '/workout-onboarding')}
            className="bg-[rgb(59_130_246)] rounded-[2.5rem] p-8 shadow-2xl border border-white/10 flex items-center justify-between group cursor-pointer relative overflow-hidden"
        >
            <div className="flex items-center space-x-6 relative z-10">
                <div className="bg-white/20 p-5 rounded-3xl border border-white/20 backdrop-blur-md shadow-inner group-hover:rotate-12 transition-transform duration-500">
                    <Dumbbell className="text-white" size={32} />
                </div>
                <div>
                    <h3 className="font-black text-white text-2xl leading-none tracking-tighter">Hey Gym</h3>
                    <p className="text-blue-100 text-[10px] mt-2 font-black uppercase tracking-[0.2em] opacity-80">
                        {user.workoutPlan ? "Keep pushing your limits" : "Create my performance plan"}
                    </p>
                </div>
            </div>
            <div className="bg-white/10 p-2 rounded-full group-hover:translate-x-2 transition-transform">
                <ChevronRight className="text-white/60" />
            </div>
        </div>

        <div 
            onClick={handleShareApp}
            className="bg-[#8B5CF6] rounded-[2.5rem] p-8 shadow-2xl border border-white/5 flex items-center justify-between group cursor-pointer"
        >
            <div className="flex items-center space-x-6 relative z-10">
                <div className="bg-white/20 p-5 rounded-3xl border border-white/20 backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform">
                    <UserPlus className="text-white" size={32} />
                </div>
                <div>
                    <h3 className="font-black text-white text-2xl leading-none tracking-tighter">Make God known</h3>
                    <p className="text-purple-100 text-[10px] mt-2 font-black uppercase tracking-[0.2em] opacity-80">Invite your world to Hey Life</p>
                </div>
            </div>
            <div className="bg-white/10 p-2 rounded-full group-hover:translate-x-2 transition-transform">
                <ChevronRight className="text-white/60" />
            </div>
        </div>
      </div>

      {/* 4. Feature Boxes Grid (2x2) */}
      <div className="grid grid-cols-2 gap-5 pt-4">
          <FeatureBox 
            title="Giving" 
            icon={Gift} 
            color="bg-[#10B981]" 
            accentColor="bg-black/10"
            onClick={() => navigate('/giving')}
          />
          <FeatureBox 
            title="Prayer wall" 
            icon={HandHelping} 
            color="bg-[#8B5CF6]" 
            accentColor="bg-black/10"
            onClick={() => navigate('/community')}
          />
          <FeatureBox 
            title="Spiritual journal" 
            icon={PenLine} 
            color="bg-gradient-to-br from-[#133666] to-[#0f2a50]" 
            accentColor="bg-white/10"
            onClick={() => navigate('/journal')}
          />
          <FeatureBox 
            title="Bible App" 
            icon={BookText} 
            color="bg-[#2E1C17]" 
            accentColor="bg-white/5"
            onClick={() => window.open('https://www.bible.com', '_blank')}
          />
      </div>

      <div className="pt-12 text-center opacity-10 pb-16">
          <p className="text-[10px] font-black uppercase tracking-[0.8em]">Hey Life Global Experience</p>
      </div>
    </div>

    {isVideoPlayerOpen && <VideoPlayerModal videoId={latestMessage.videoId} onClose={() => setIsVideoPlayerOpen(false)} />}
    {showGuidedPrayer && spiritSnack && (
        <GuidedPrayerModal 
            snack={spiritSnack} 
            onClose={() => setShowGuidedPrayer(false)} 
        />
    )}
    {showInviteModal && (
        <InviteFriendModal 
            user={user} 
            onClose={() => setShowInviteModal(false)}
            target={{
                id: 'home',
                title: 'Hey Life App',
                type: 'lesson', 
                data: { title: 'Hey Life App' },
                courseId: 'app'
            }}
        />
    )}
    </>
  );
};

export default HomePage;
