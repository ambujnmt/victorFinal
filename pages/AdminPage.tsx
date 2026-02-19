import React, { useState, useEffect, FC, useRef } from 'react';
import { Course, Session, AcademyPathId, QuizQuestion, Challenge, User, HeyFam, GlobalContent } from '../types';
import { 
    ArrowLeft, Loader2, PlusCircle, Edit, Trash2, X, 
    Youtube, BookOpen, Award, Users, 
    HelpCircle, ChevronDown, UserCheck, Search,
    Save, ExternalLink, Settings, Play, CreditCard, QrCode, Zap, Shield, UserPlus, ShieldAlert, Calendar, Lightbulb,
    Upload, ImageIcon, Hash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as firebaseService from '../services/firebaseService';
import { useAuth } from '../App';
import { PATHS } from '../constants/academyPaths';

const getYouTubeId = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    if (match && match[2].length >= 11) return match[2].substring(0, 11);
    return cleanUrl;
};

const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas context error'));
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

// --- BIBLE VERSE EDITOR ---
const BibleVerseEditor: FC<{ verses: {reference: string, text: string}[], onChange: (v: any[]) => void }> = ({ verses, onChange }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                <BookOpen size={12} className="mr-1.5 text-[rgb(251_191_36)]"/> Bible Verses (Study Tab)
            </h4>
            <button onClick={() => onChange([...(verses || []), { reference: '', text: '' }])} className="text-[10px] text-[rgb(251_191_36)] font-black flex items-center uppercase tracking-widest">
                <PlusCircle size={12} className="mr-1"/> Add Verse
            </button>
        </div>
        {(verses || []).map((v, i) => (
            <div key={i} className="bg-gray-900/40 p-4 rounded-2xl border border-white/5 space-y-3 relative group animate-in slide-in-from-left-2">
                <button onClick={() => onChange(verses.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors">
                    <X size={16}/>
                </button>
                <div className="pr-10">
                    <label className="text-[9px] font-black text-gray-600 uppercase mb-1 block">Reference</label>
                    <input 
                        placeholder="e.g. John 3:16" 
                        value={v.reference} 
                        onChange={e => { const newV = [...verses]; newV[i].reference = e.target.value; onChange(newV); }}
                        className="bg-transparent border-b border-gray-700 text-sm font-black text-[rgb(255_152_43)] outline-none w-full pb-1"
                    />
                </div>
                <div>
                    <label className="text-[9px] font-black text-gray-600 uppercase mb-1 block">Full Scripture Text</label>
                    <textarea 
                        placeholder="Paste the verse content here..." 
                        value={v.text}
                        onChange={e => { const newV = [...verses]; newV[i].text = e.target.value; onChange(newV); }}
                        className="w-full bg-gray-900/50 p-3 rounded-lg text-xs text-gray-300 outline-none h-20 resize-none italic leading-relaxed"
                    />
                </div>
            </div>
        ))}
    </div>
);

// --- QUIZ EDITOR ---
const QuizEditor: FC<{ questions: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void }> = ({ questions, onChange }) => {
    const addQuestion = () => {
        onChange([...(questions || []), { id: `q_${Date.now()}_${questions?.length || 0}`, question: '', options: ['', '', '', ''], correctAnswerIndices: [], explanation: '' }]);
    };
    const updateQ = (idx: number, field: keyof QuizQuestion, val: any) => {
        const newQs = [...questions];
        (newQs[idx] as any)[field] = val;
        onChange(newQs);
    };
    const toggleCorrectIndex = (qIdx: number, oIdx: number) => {
        const currentIndices = questions[qIdx].correctAnswerIndices || [];
        let newIndices;
        if (currentIndices.includes(oIdx)) {
            newIndices = currentIndices.filter(i => i !== oIdx);
        } else {
            newIndices = [...currentIndices, oIdx];
        }
        updateQ(qIdx, 'correctAnswerIndices', newIndices);
    };
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                    <HelpCircle size={12} className="mr-1.5 text-[rgb(59_130_246)]"/> Knowledge Check
                </h4>
                <button onClick={addQuestion} className="text-[10px] bg-[rgb(59_130_246/0.2)] text-[rgb(59_130_246)] px-3 py-1.5 rounded-full flex items-center font-black uppercase tracking-widest">
                    <PlusCircle size={12} className="mr-1" /> Add Question
                </button>
            </div>
            {(questions || []).map((q, qIdx) => (
                <div key={q.id} className="bg-gray-900/40 p-5 rounded-2xl border border-white/5 space-y-4 relative group">
                    <button onClick={() => onChange(questions.filter((_, i) => i !== qIdx))} className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                    </button>
                    <div>
                        <label className="text-[9px] font-black text-gray-600 uppercase mb-1 ml-1 block">Question Title</label>
                        <input placeholder="Type question here..." value={q.question} onChange={e => updateQ(qIdx, 'question', e.target.value)} className="w-full bg-gray-900 p-3 rounded-xl text-sm font-bold text-white border border-gray-800 outline-none" />
                    </div>
                    <div className="space-y-2">
                        {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctAnswerIndices?.includes(oIdx);
                            return (
                                <div key={oIdx} className={`flex items-center gap-3 p-2 rounded-xl ${isCorrect ? 'bg-[rgb(16_185_129/0.1)] border border-[rgb(16_185_129/0.3)]' : ''}`}>
                                    <input type="checkbox" checked={isCorrect} onChange={() => toggleCorrectIndex(qIdx, oIdx)} className="w-5 h-5 rounded border-gray-700 text-[rgb(16_185_129)]" />
                                    <input placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => { const newOpts = [...q.options]; newOpts[oIdx] = e.target.value; updateQ(qIdx, 'options', newOpts); }} className="flex-grow bg-transparent text-xs text-white outline-none" />
                                </div>
                            );
                        })}
                    </div>
                    <div className="pt-2 border-t border-white/5">
                        <label className="text-[9px] font-black text-[rgb(251_191_36)] uppercase mb-2 ml-1 flex items-center">
                            <Lightbulb size={12} className="mr-1.5" /> Recap / Explanation (Shown after correct answer)
                        </label>
                        <textarea 
                            placeholder="Add the teaching or recap for this specific question..." 
                            value={q.explanation || ''} 
                            onChange={e => updateQ(qIdx, 'explanation', e.target.value)} 
                            className="w-full bg-gray-950 p-4 rounded-xl text-xs text-gray-300 outline-none h-24 resize-none italic leading-relaxed border border-gray-800 focus:border-[rgb(251_191_36)] transition-colors"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- COURSE EDITOR MODAL ---
const CourseEditor: FC<{ course: Course | null, onSave: (c: Course) => void, onClose: () => void }> = ({ course, onSave, onClose }) => {
    const [form, setForm] = useState<Course>(course || { id: `course_${Date.now()}`, title: '', description: '', pathId: 'foundation', thumbnail: '', order: 1, isPublished: true, sessions: [] } as Course);
    const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const courseFileRef = useRef<HTMLInputElement>(null);
    const sessionFileRef = useRef<HTMLInputElement>(null);

    const updateSession = (idx: number, field: string, value: any) => {
        const newSessions = [...form.sessions];
        (newSessions[idx] as any)[field] = value;
        setForm({ ...form, sessions: newSessions });
    };

    const handleRemoveSession = (idx: number) => {
        if (confirm('Permanently remove this session from the course?')) {
            const newSessions = form.sessions.filter((_, i) => i !== idx);
            setForm({ ...form, sessions: newSessions });
            setEditingSessionIdx(null);
        }
    };

    const handleCourseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            try {
                const base64 = await processImage(e.target.files[0]);
                setForm({...form, thumbnail: base64});
            } catch (err) {
                alert("Upload failed.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSessionUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            try {
                const base64 = await processImage(e.target.files[0]);
                updateSession(idx, 'thumbnail', base64);
            } catch (err) {
                alert("Upload failed.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col overflow-hidden">
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-black text-white uppercase italic">{course ? 'Edit Course' : 'New Course'}</h2>
                <div className="flex gap-3"><button onClick={onClose} className="px-5 py-2 text-gray-400 font-black uppercase text-xs">Cancel</button><button onClick={() => onSave(form)} className="px-8 py-2.5 bg-[rgb(16_185_129)] text-white rounded-xl font-black uppercase text-xs">Save Course</button></div>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-8 bg-[#133666]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-800/40 p-8 rounded-[2.5rem] border border-white/5">
                    <div className="md:col-span-2 space-y-5">
                        <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Course Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-black text-xl italic outline-none"/></div>
                        <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Short Pitch</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-sm h-24 outline-none"/></div>
                    </div>
                    <div className="space-y-5">
                        <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Learning Path</label><select value={form.pathId} onChange={e => setForm({...form, pathId: e.target.value as AcademyPathId})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-bold outline-none">{PATHS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Cover URL / Image</label>
                            <div className="flex gap-2">
                                <input value={form.thumbnail} onChange={e => setForm({...form, thumbnail: e.target.value})} placeholder="URL or leave blank" className="flex-grow p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-[10px] font-mono outline-none"/>
                                <button onClick={() => courseFileRef.current?.click()} disabled={isUploading} className="p-4 bg-gray-700 rounded-2xl text-white hover:bg-gray-600 transition-colors">
                                    {isUploading ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>}
                                </button>
                                <input type="file" ref={courseFileRef} onChange={handleCourseUpload} className="hidden" accept="image/*"/>
                            </div>
                            {form.thumbnail && (
                                <img src={form.thumbnail} className="mt-3 w-20 h-20 object-cover rounded-xl border border-white/10" alt="Preview"/>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/10">
                            <div><label className="text-[10px] font-black text-white uppercase tracking-widest block leading-none">Published</label><p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Visible to Users</p></div>
                            <button onClick={() => setForm({...form, isPublished: !form.isPublished})} className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${form.isPublished ? 'bg-[rgb(16_185_129)]' : 'bg-gray-700'}`}><div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${form.isPublished ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex justify-between items-end px-2"><h3 className="text-2xl font-black text-white uppercase italic">Sessions</h3><button onClick={() => setForm({...form, sessions: [...(form.sessions || []), { id: `s_${Date.now()}`, title: '', videoId: '', reflectionQuestions: [], bibleVerses: [], keyTakeaways: [], tags: [] } as Session]}) } className="bg-[rgb(59_130_246)] px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center shadow-lg"><PlusCircle className="mr-2" size={16}/> Add Session</button></div>
                    <div className="space-y-4">{(form.sessions || []).map((session, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
                            <div className="p-5 bg-gray-750 flex justify-between items-center cursor-pointer hover:bg-gray-700" onClick={() => setEditingSessionIdx(editingSessionIdx === idx ? null : idx)}>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        {session.thumbnail ? (
                                            <img src={session.thumbnail} className="w-10 h-10 rounded-xl object-cover" alt=""/>
                                        ) : (
                                            <div className="bg-gray-900 w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-[rgb(255_152_43)]">{idx + 1}</div>
                                        )}
                                    </div>
                                    <span className="font-black text-white uppercase italic">{session.title || 'Untitled Session'}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveSession(idx); }} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    <ChevronDown size={20} className={`text-gray-500 transition-transform ${editingSessionIdx === idx ? 'rotate-180' : ''}`}/>
                                </div>
                            </div>
                            {editingSessionIdx === idx && (
                                <div className="p-8 space-y-10 bg-gray-800/80 border-t border-white/5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Session Title</label><input value={session.title} onChange={e => updateSession(idx, 'title', e.target.value)} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white font-bold outline-none"/></div>
                                            <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">YouTube URL / ID</label><input value={session.videoId} onChange={e => updateSession(idx, 'videoId', getYouTubeId(e.target.value))} className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm outline-none"/></div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase mb-2  flex items-center">
                                                    <Hash size={12} className="mr-1.5" /> Tags (comma-separated, e.g. Angst, Yoga, Partner)
                                                </label>
                                                <input 
                                                    value={session.tags?.join(', ') || ''} 
                                                    onChange={e => updateSession(idx, 'tags', e.target.value.split(',').map(s => s.trim()))} 
                                                    placeholder="Angst, Sex, Yoga, Partner..." 
                                                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm font-bold outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Session Thumbnail (Optional)</label>
                                            <div className="flex gap-2">
                                                <input value={session.thumbnail || ''} onChange={e => updateSession(idx, 'thumbnail', e.target.value)} placeholder="URL or leave blank" className="flex-grow p-3 bg-gray-900 border border-gray-700 rounded-xl text-[10px] text-white font-mono outline-none"/>
                                                <button onClick={() => sessionFileRef.current?.click()} disabled={isUploading} className="p-3 bg-gray-700 rounded-xl text-white">
                                                    <Upload size={16}/>
                                                </button>
                                                <input type="file" ref={sessionFileRef} onChange={e => handleSessionUpload(e, idx)} className="hidden" accept="image/*"/>
                                            </div>
                                            {session.thumbnail && (
                                                <div className="mt-2 flex items-center gap-3">
                                                    <img src={session.thumbnail} className="w-16 h-10 object-cover rounded-lg border border-white/10" alt=""/>
                                                    <button onClick={() => updateSession(idx, 'thumbnail', '')} className="text-[8px] font-black text-red-500 uppercase tracking-widest">Clear Image</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <BibleVerseEditor verses={session.bibleVerses || []} onChange={v => updateSession(idx, 'bibleVerses', v)} />
                                    <QuizEditor questions={session.quizQuestions || []} onChange={qs => updateSession(idx, 'quizQuestions', qs)} />
                                </div>
                            )}
                        </div>
                    ))}</div>
                </div>
            </div>
        </div>
    );
};

// --- CHALLENGE EDITOR MODAL ---
const ChallengeEditor: FC<{ challenge: Challenge | null, onSave: (c: Challenge) => void, onClose: () => void }> = ({ challenge, onSave, onClose }) => {
    const [form, setForm] = useState<Challenge>(challenge || { id: `challenge_${Date.now()}`, title: '', description: '', why: '', category: 'General', duration: 7, points: 100 } as Challenge);
    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-[2.5rem] w-full max-w-lg p-8 border border-white/5 space-y-6 overflow-y-auto max-h-[90vh]">
                <h2 className="text-2xl font-black text-white uppercase italic">{challenge ? 'Edit Challenge' : 'New Challenge'}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Title</label>
                        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-bold outline-none focus:border-[rgb(255_117_93)]" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Description</label>
                        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-sm h-20 outline-none focus:border-[rgb(255_117_93)]" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">The Why (Motivation)</label>
                        <textarea value={form.why} onChange={e => setForm({...form, why: e.target.value})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-sm h-24 outline-none focus:border-[rgb(255_117_93)]" placeholder="Foster deeper connections and meaningful conversations..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Duration (Days)</label><input type="number" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value)})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-bold outline-none focus:border-[rgb(255_117_93)]" /></div>
                        <div><label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Points</label><input type="number" value={form.points} onChange={e => setForm({...form, points: parseInt(e.target.value)})} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-bold outline-none focus:border-[rgb(255_117_93)]" /></div>
                    </div>
                </div>
                <div className="flex gap-3 pt-4"><button onClick={onClose} className="flex-1 py-4 text-gray-400 font-black uppercase text-xs">Cancel</button><button onClick={() => onSave(form)} className="flex-1 py-4 bg-[rgb(255_117_93)] text-white rounded-2xl font-black uppercase text-xs shadow-xl">Save Challenge</button></div>
            </div>
        </div>
    );
};

const AdminPage: React.FC = () => {
    const { user: adminUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'academy' | 'challenges' | 'fams' | 'users' | 'globals'>('academy');
    
    // Data States
    const [courses, setCourses] = useState<Course[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [fams, setFams] = useState<HeyFam[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [globalConfig, setGlobalConfig] = useState<GlobalContent | null>(null);
    
    // UI Logic
    const [loading, setLoading] = useState(false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [isUploadingHero, setIsUploadingHero] = useState(false);
    const [isUploadingQr, setIsUploadingQr] = useState(false);
    const heroFileRef = useRef<HTMLInputElement>(null);
    const qrFileRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal States
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isCreatingCourse, setIsCreatingCourse] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
    const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);

    const refreshData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'academy') setCourses(await firebaseService.getCourses());
            if (activeTab === 'challenges') setChallenges(await firebaseService.getChallenges());
            
            if (activeTab === 'fams') {
                const [famData, userData] = await Promise.all([
                    firebaseService.getHeyFams(),
                    firebaseService.getAllUsers()
                ]);
                setFams(famData);
                setUsers(userData);
            }
            
            if (activeTab === 'users') setUsers(await firebaseService.getAllUsers());
            if (activeTab === 'globals') setGlobalConfig(await firebaseService.getGlobalContent());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { refreshData(); }, [activeTab]);

    if (!adminUser || adminUser.role !== 'admin') return <div className="p-8 text-white text-center"><Shield size={64} className="mx-auto text-[rgb(255_117_93)] mb-6" /><h1 className="text-3xl font-black uppercase">Access Restricted</h1></div>;

    const filteredUsers = users.filter(u => 
        (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleToggleRole = async (userToUpdate: User) => {
        const newRole = userToUpdate.role === 'leader' ? 'user' : 'leader';
        if (confirm(`Change ${userToUpdate.name}'s role to ${newRole}?`)) {
            await firebaseService.updateUserData(userToUpdate.id, { role: newRole as any });
            refreshData();
        }
    };

    const handleDeleteChallenge = async (id: string) => {
        if (confirm('Delete this challenge permanently?')) {
            await firebaseService.deleteChallenge(id);
            refreshData();
        }
    };

    const handleDeleteFam = async (id: string) => {
        if (confirm('Delete this group permanently?')) {
            await firebaseService.deleteHeyFam(id);
            refreshData();
        }
    };

    const handleSaveGlobalConfig = async () => {
        if (!globalConfig) return;
        setIsSavingConfig(true);
        await firebaseService.updateGlobalContent(globalConfig);
        setIsSavingConfig(false);
        alert("Config saved!");
    };

    const handleHeroThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && globalConfig) {
            setIsUploadingHero(true);
            try {
                const base64 = await processImage(e.target.files[0]);
                setGlobalConfig({
                    ...globalConfig,
                    latestMessage: {
                        ...(globalConfig.latestMessage || { title: '', videoId: '' }),
                        thumbnail: base64
                    }
                });
            } catch (err) {
                alert("Upload failed.");
            } finally {
                setIsUploadingHero(false);
            }
        }
    };

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && globalConfig) {
            setIsUploadingQr(true);
            try {
                const base64 = await processImage(e.target.files[0]);
                setGlobalConfig({
                    ...globalConfig,
                    donation: {
                        ...(globalConfig.donation || {}),
                        qrCodeUrl: base64
                    }
                });
            } catch (err) {
                alert("Upload failed.");
            } finally {
                setIsUploadingQr(false);
            }
        }
    };

    const sidebarItems = [
        { id: 'academy', label: 'Academy', icon: BookOpen },
        { id: 'challenges', label: 'Challenges', icon: Award },
        { id: 'fams', label: 'Hey Fams', icon: Users },
        { id: 'users', label: 'Members', icon: UserCheck },
        { id: 'globals', label: 'Global Config', icon: Settings }
    ];

    return (
        <div className="bg-[rgb(19,54,102)] min-h-screen text-white flex flex-col md:flex-row font-sans">
            {/* Sidebar */}
            <div className="md:w-64 bg-gray-900 border-r border-gray-800 flex-shrink-0">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h1 className="text-xl font-black uppercase italic">Admin</h1>
                    <Shield size={18} className="text-[rgb(255_117_93)]" />
                </div>
                <nav className="p-4 space-y-2">
                    <button onClick={() => navigate('/home')} className="w-full flex items-center p-3 text-gray-500 hover:text-white rounded-2xl transition-all mb-4 font-black text-xs uppercase tracking-widest"><ArrowLeft size={16} className="mr-3"/> Back</button>
                    {sidebarItems.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center p-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === item.id ? 'bg-[rgb(59_130_246)] text-white' : 'text-gray-500 hover:bg-gray-800'}`}>
                            <item.icon size={18} className="mr-3"/> {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow p-6 md:p-10 overflow-y-auto pb-24">
                <div className="max-w-6xl mx-auto">
                    {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-[rgb(59_130_246)]"/></div>}
                    
                    {!loading && activeTab === 'academy' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="flex justify-between items-end mb-8">
                                <div><h2 className="text-4xl font-black uppercase italic">Courses</h2><p className="text-gray-500 text-xs mt-1 uppercase font-bold">Manage paths and sessions</p></div>
                                <button onClick={() => setIsCreatingCourse(true)} className="bg-[rgb(16_185_129)] px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg"><PlusCircle className="mr-2" size={18}/> New Course</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map(course => (
                                    <div key={course.id} className={`bg-gray-800 rounded-[2.5rem] p-6 border flex flex-col justify-between min-h-[160px] ${course.isPublished ? 'border-[rgb(16_185_129/0.2)]' : 'border-red-900/20 opacity-70'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[8px] px-3 py-1.5 rounded-full bg-gray-900 text-gray-400 uppercase font-black tracking-[0.2em]">{course.pathId?.replace('_', ' ')}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingCourse(course)} className="p-2.5 bg-blue-900/30 text-blue-400 rounded-xl hover:bg-blue-900/50"><Edit size={16}/></button>
                                                <button onClick={async () => { if(confirm('Delete course?')) { await firebaseService.deleteCourse(course.id); refreshData(); } }} className="p-2.5 bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <div><h3 className="font-black text-xl mb-1 text-white uppercase italic">{course.title}</h3><p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{course.sessions?.length || 0} sessions</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'challenges' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="flex justify-between items-end mb-8">
                                <div><h2 className="text-4xl font-black uppercase italic">Challenges</h2><p className="text-gray-500 text-xs mt-1 uppercase font-bold">Community growth quests</p></div>
                                <button onClick={() => setIsCreatingChallenge(true)} className="bg-[rgb(255_117_93)] px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg"><PlusCircle className="mr-2" size={18}/> New Quest</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {challenges.map(c => (
                                    <div key={c.id} className="bg-gray-800 rounded-[2.5rem] p-8 border border-white/5 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center space-x-2">
                                                <div className="bg-[rgb(251_191_36/0.1)] p-3 rounded-2xl"><Award className="text-[rgb(251_191_36)]" size={20}/></div>
                                                <span className="font-black text-[rgb(251_191_36)]">+{c.points} PTS</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingChallenge(c)} className="p-3 bg-gray-900 rounded-xl hover:text-[rgb(59_130_246)] transition-colors"><Edit size={18}/></button>
                                                <button onClick={() => handleDeleteChallenge(c.id)} className="p-3 bg-gray-900 rounded-xl hover:text-[rgb(255_117_93)] transition-colors"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase italic mb-2">{c.title}</h3>
                                            <div className="flex items-center text-gray-500 text-[10px] font-black uppercase tracking-widest space-x-4">
                                                <span className="flex items-center"><Calendar size={12} className="mr-1.5" /> {c.duration} Days</span>
                                                <span className="flex items-center"><Users size={12} className="mr-1.5" /> {c.participantIds?.length || 0} Participants</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'fams' && (
                        <div className="animate-in fade-in duration-500">
                             <div className="mb-8">
                                <h2 className="text-4xl font-black uppercase italic">Hey Fams</h2>
                                <p className="text-gray-500 text-xs mt-1 uppercase font-bold">Active community groups</p>
                             </div>
                             
                             {fams.length === 0 ? (
                                <div className="text-center py-20 bg-gray-800 rounded-[2.5rem] border border-dashed border-gray-700">
                                    <Users size={48} className="mx-auto text-gray-600 mb-4" />
                                    <p className="text-gray-500 font-bold uppercase tracking-widest">No groups found</p>
                                </div>
                             ) : (
                                <div className="bg-gray-800 rounded-[2.5rem] border border-white/5 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-900/50 border-b border-white/5">
                                                <tr>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Group Name</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Leader</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Members</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {fams.map(fam => (
                                                    <tr key={fam.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-6">
                                                            <div className="flex items-center">
                                                                <img src={fam.avatar || `https://ui-avatars.com/api/?name=${fam.name}`} className="w-10 h-10 rounded-full mr-4 border-2 border-[rgb(59_130_246)] object-cover"/>
                                                                <span className="font-bold text-sm uppercase">{fam.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-xs text-gray-400">
                                                            {users.find(u => u.id === fam.leaderId)?.name || 'Unknown'}
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="bg-gray-900 px-3 py-1 rounded-full text-[10px] font-black">
                                                                {(fam.memberIds || []).length}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <button onClick={() => handleDeleteFam(fam.id)} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                             )}
                        </div>
                    )}

                    {!loading && activeTab === 'users' && (
                        <div className="animate-in fade-in duration-500 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div><h2 className="text-4xl font-black uppercase italic">Members</h2><p className="text-gray-500 text-xs mt-1 uppercase font-bold">Manage roles and points</p></div>
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                                    <input placeholder="Search name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-800 p-4 pl-12 rounded-2xl border border-white/5 text-sm outline-none focus:border-[rgb(59_130_246)]"/>
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-[2.5rem] border border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-900/50 border-b border-white/5">
                                            <tr>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">User</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Role</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Points</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredUsers.map(u => (
                                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-6">
                                                        <div className="flex items-center">
                                                            <img src={u.avatar} className="w-10 h-10 rounded-full mr-4 border border-gray-700 object-cover"/>
                                                            <div>
                                                                <p className="font-bold text-sm leading-none">{u.name}</p>
                                                                <p className="text-[10px] text-gray-500 mt-1">{u.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-red-900/30 text-red-400' : u.role === 'leader' ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-900 text-gray-500'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 font-bold text-[rgb(251_191_36)]">{u.points.toLocaleString()}</td>
                                                    <td className="p-6">
                                                        {u.role !== 'admin' && (
                                                            <button 
                                                                onClick={() => handleToggleRole(u)}
                                                                className={`flex items-center text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${u.role === 'leader' ? 'text-red-400 bg-red-900/10' : 'text-blue-400 bg-blue-900/10'}`}
                                                            >
                                                                {u.role === 'leader' ? <ShieldAlert size={12} className="mr-1.5"/> : <UserCheck size={12} className="mr-1.5"/>}
                                                                {u.role === 'leader' ? 'Demote' : 'Make Leader'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'globals' && (
                        <div className="animate-in fade-in duration-500 space-y-8">
                             <div className="flex justify-between items-end mb-4">
                                <div><h2 className="text-4xl font-black uppercase italic">Global Settings</h2><p className="text-gray-500 text-xs mt-2 uppercase font-bold tracking-widest">Master app controls</p></div>
                                <button onClick={handleSaveGlobalConfig} disabled={isSavingConfig} className="bg-[rgb(16_185_129)] px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-2xl hover:scale-105 transition-all">{isSavingConfig ? <Loader2 size={18} className="animate-spin mr-2"/> : <Save className="mr-2" size={18}/>} Save Config</button>
                             </div>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-gray-800 rounded-[2.5rem] p-8 border border-white/5 space-y-6">
                                    <div className="flex items-center space-x-3 mb-2"><div className="p-3 bg-[rgb(255_117_93/0.2)] rounded-2xl"><Youtube className="text-[rgb(255_117_93)]" /></div><h3 className="text-xl font-black uppercase italic">Hero Content</h3></div>
                                    <div className="space-y-4">
                                        <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Latest Sermon Title</label><input value={globalConfig?.latestMessage?.title || ''} onChange={e => setGlobalConfig(prev => prev ? {...prev, latestMessage: {...(prev.latestMessage || {videoId: ''}), title: e.target.value}} : null)} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-bold outline-none focus:border-[rgb(255_117_93)]" /></div>
                                        <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">YouTube Video ID</label><input value={globalConfig?.latestMessage?.videoId || ''} onChange={e => setGlobalConfig(prev => prev ? {...prev, latestMessage: {...(prev.latestMessage || {title: ''}), videoId: getYouTubeId(e.target.value)}} : null)} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-mono text-sm outline-none" /></div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Custom Thumbnail (Optional)</label>
                                            <div className="flex gap-2">
                                                <input value={globalConfig?.latestMessage?.thumbnail || ''} onChange={e => setGlobalConfig(prev => prev ? {...prev, latestMessage: {...(prev.latestMessage || {title: '', videoId: ''}), thumbnail: e.target.value}} : null)} placeholder="URL or leave blank for auto" className="flex-grow p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-[10px] font-mono outline-none" />
                                                <button onClick={() => heroFileRef.current?.click()} disabled={isUploadingHero} className="p-4 bg-gray-700 rounded-2xl text-white hover:bg-gray-600 transition-colors">
                                                    {isUploadingHero ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>}
                                                </button>
                                                <input type="file" ref={heroFileRef} onChange={handleHeroThumbnailUpload} className="hidden" accept="image/*"/>
                                            </div>
                                            {globalConfig?.latestMessage?.thumbnail && (
                                                <img src={globalConfig.latestMessage.thumbnail} className="mt-3 w-32 h-20 object-cover rounded-xl border border-white/10" alt="Preview"/>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded-[2.5rem] p-8 border border-white/5 space-y-6">
                                    <div className="flex items-center justify-between"><div className="flex items-center space-x-3"><div className="p-3 bg-[rgb(59_130_246/0.2)] rounded-2xl"><CreditCard className="text-[rgb(59_130_246)]" /></div><h3 className="text-xl font-black uppercase italic">Giving Gateway</h3></div></div>
                                    <div className="space-y-4">
                                        <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">PayPal Client ID</label><input value={globalConfig?.paypalClientId || ''} onChange={e => setGlobalConfig(prev => prev ? {...prev, paypalClientId: e.target.value} : null)} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-mono text-xs outline-none focus:border-[rgb(59_130_246)]"/></div>
                                        <div><label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">PayPal.me (Fallback)</label><input value={globalConfig?.donation?.paypalLink || ''} onChange={e => setGlobalConfig(prev => prev ? {...prev, donation: {...(prev.donation || {}), paypalLink: e.target.value}} : null)} className="w-full p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white font-bold outline-none" /></div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Donation QR Code (Optional)</label>
                                            <div className="flex gap-2">
                                                <input value={globalConfig?.donation?.qrCodeUrl || ''} onChange={e => setGlobalConfig(prev => prev ? {...prev, donation: {...(prev.donation || {}), qrCodeUrl: e.target.value}} : null)} placeholder="URL or upload image" className="flex-grow p-4 bg-gray-900 border border-gray-700 rounded-2xl text-white text-[10px] font-mono outline-none" />
                                                <button onClick={() => qrFileRef.current?.click()} disabled={isUploadingQr} className="p-4 bg-gray-700 rounded-2xl text-white hover:bg-gray-600 transition-colors">
                                                    {isUploadingQr ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>}
                                                </button>
                                                <input type="file" ref={qrFileRef} onChange={handleQrUpload} className="hidden" accept="image/*"/>
                                            </div>
                                            {globalConfig?.donation?.qrCodeUrl && (
                                                <div className="mt-2 flex items-center gap-3">
                                                    <img src={globalConfig.donation.qrCodeUrl} className="w-16 h-16 object-contain rounded-lg border border-white/10" alt="QR Code Preview"/>
                                                    <button onClick={() => setGlobalConfig(prev => prev ? {...prev, donation: {...(prev.donation || {}), qrCodeUrl: ''}} : null)} className="text-[8px] font-black text-red-500 uppercase tracking-widest">Clear QR Code</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            {(editingCourse || isCreatingCourse) && (
                <CourseEditor course={editingCourse} onSave={async (c) => { if (isCreatingCourse) await firebaseService.addCourse(c); else await firebaseService.updateCourse(c.id, c); setIsCreatingCourse(false); setEditingCourse(null); refreshData(); }} onClose={() => { setEditingCourse(null); setIsCreatingCourse(false); }} />
            )}
            {(editingChallenge || isCreatingChallenge) && (
                <ChallengeEditor challenge={editingChallenge} onSave={async (c) => { if (isCreatingChallenge) await firebaseService.addChallenge(c); else await firebaseService.updateChallenge(c.id, c); setIsCreatingChallenge(false); setEditingChallenge(null); refreshData(); }} onClose={() => { setEditingChallenge(null); setIsCreatingChallenge(false); }} />
            )}
        </div>
    );
};

export default AdminPage;