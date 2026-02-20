
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  increment,
  runTransaction,
  orderBy,
  limit,
  arrayRemove,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseServices, getFirebaseProjectId } from '../firebase/firebaseConfig';
import { User, Course, Challenge, LearningGroup, Post, Submission, HeyFam, PrayerRequest, AppNotification, Badge, ActiveChallenge, Session, GroupMessage, GlobalContent, ResourceLink, JournalEntry, MonthlyReflection, WorkoutLog, CoachInsight, Comment } from '../types';
import { ALL_BADGES } from '../constants/staticData';
import { MOCK_COURSES as MOCK_COURSES_DATA, MOCK_CHALLENGES as MOCK_CHALLENGES_DATA } from '../constants/mockData';

// --- Authentication ---

export const signUpWithEmail = async (email: string, password: string, name: string, language: 'English' | 'German') => {
  const { auth, db } = getFirebaseServices();
  await setPersistence(auth, browserLocalPersistence);
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;

  if (fbUser) {
    try {
      const userRole = email === 'admin@heychurch.de' ? 'admin' : 'user';
      await updateProfile(fbUser, { displayName: name });
      const userDocRef = doc(db, 'users', fbUser.uid);
      const newUser: Omit<User, 'id'> = {
          name,
          email: fbUser.email || '',
          avatar: `https://i.pravatar.cc/150?u=${fbUser.email}`,
          points: 0,
          certificates: [],
          role: userRole as any,
          onboarded: false,
          joinDate: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          language: language,
          badges: [],
          prayerCount: 0,
          challengesCompleted: 0,
          activeChallenges: [],
          journalStreak: 0,
          completedWorkouts: 0,
      };
      await setDoc(userDocRef, newUser);
    } catch (error) {
      console.error("Firestore profile creation failed, deleting auth user.", error);
      await deleteUser(fbUser).catch(deleteErr => console.error("Failed to delete orphaned auth user.", deleteErr));
      throw new Error(`Profile creation failed. Original error: ${error}`);
    }
  }
  return fbUser;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { auth } = getFirebaseServices();
  await setPersistence(auth, browserLocalPersistence);
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = async () => {
    const { auth, db } = getFirebaseServices();
    const provider = new GoogleAuthProvider();
    await setPersistence(auth, browserLocalPersistence);
    
    try {
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            const userRole = fbUser.email === 'admin@heychurch.de' ? 'admin' : 'user';
            const newUser: Omit<User, 'id'> = {
                name: fbUser.displayName || 'New User',
                email: fbUser.email || '',
                avatar: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.email}`,
                points: 0,
                certificates: [],
                role: userRole as any,
                onboarded: false,
                joinDate: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                language: 'English',
                badges: [],
                prayerCount: 0,
                challengesCompleted: 0,
                activeChallenges: [],
                journalStreak: 0,
                completedWorkouts: 0,
            };
            await setDoc(userDocRef, newUser);
        } else {
            await updateDoc(userDocRef, { 
                lastActiveAt: new Date().toISOString() 
            });
        }
        return fbUser;
    } catch (error: any) {
        console.error("signInWithGoogle Error:", error.code, error.message);
        throw error;
    }
};

export const signOutUser = () => {
    const { auth } = getFirebaseServices();
    return signOut(auth);
};

export const sendPasswordReset = (email: string) => {
  const { auth } = getFirebaseServices();
  return sendPasswordResetEmail(auth, email);
};

// --- Posts & Feed Interactions (Real-Time) ---

export const listenToPosts = (callback: (posts: Post[]) => void) => {
    const { db } = getFirebaseServices();
    const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(postsQuery, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        callback(posts);
    });
};

export const getPosts = async (): Promise<Post[]> => {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, 'posts'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
};

export const addPost = async (post: Omit<Post, 'id'>) => {
    const { db } = getFirebaseServices();
    await addDoc(collection(db, 'posts'), {
        ...post,
        timestamp: serverTimestamp() // Ensure server-side timestamp for accuracy
    });
};

export const addCommentToPost = async (postId: string, comment: Comment) => {
    const { db } = getFirebaseServices();
    const postRef = doc(db, 'posts', postId);

    await updateDoc(postRef, {
        comments: arrayUnion(comment)
    });
};

export const updatePostReaction = async (postId: string, emoji: string, countChange: number) => {
    const { db } = getFirebaseServices();
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
        [`reactions.${emoji}`]: increment(countChange)
    });
};

// --- User Management ---

export const getUserData = async (userId: string): Promise<User | null> => {
    const { db } = getFirebaseServices();
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
};

export const updateUserData = async (userId: string, data: Partial<User>) => {
    const { db } = getFirebaseServices();
    const userRef = doc(db, 'users', userId);
    return updateDoc(userRef, data);
};

export const updateUserProfilePicture = async (userId: string, base64Avatar: string) => {
    const { db } = getFirebaseServices();
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { avatar: base64Avatar });
    const postsQuery = query(collection(db, 'posts'), where('user.id', '==', userId), limit(20));
    const postsSnapshot = await getDocs(postsQuery);
    postsSnapshot.docs.forEach(postDoc => {
        batch.update(postDoc.ref, { 'user.avatar': base64Avatar });
    });
    const prayerQuery = query(collection(db, 'prayerRequests'), where('userId', '==', userId), limit(20));
    const prayerSnapshot = await getDocs(prayerQuery);
    prayerSnapshot.docs.forEach(reqDoc => {
        batch.update(reqDoc.ref, { userAvatar: base64Avatar });
    });
    await batch.commit();
};

export const getAllUsers = async (): Promise<User[]> => {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    if (userIds.length === 0) return [];
    const { db } = getFirebaseServices();
    const users: User[] = [];
    for (const uid of userIds) {
        const docRef = doc(db, 'users', uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            users.push({ id: snap.id, ...snap.data() } as User);
        }
    }
    return users;
};

// --- Challenges ---

export const getChallenges = async (): Promise<Challenge[]> => {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, 'challenges'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge));
};

export const startChallenge = async (userId: string, challenge: Challenge) => {
    const { db } = getFirebaseServices();
    const userRef = doc(db, 'users', userId);
    const challengeRef = doc(db, 'challenges', challenge.id);
    const newActiveChallenge: ActiveChallenge = {
        id: challenge.id,
        title: challenge.title,
        duration: challenge.duration,
        startDate: new Date().toISOString(),
        completedDays: 0,
    };
    const batch = writeBatch(db);
    batch.update(userRef, { activeChallenges: arrayUnion(newActiveChallenge) });
    batch.update(challengeRef, { participantIds: arrayUnion(userId) });
    await batch.commit();
};

export const leaveChallenge = async (userId: string, challengeId: string) => {
    const { db } = getFirebaseServices();
    const userRef = doc(db, 'users', userId);
    const challengeRef = doc(db, 'challenges', challengeId);
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) return;
        const userData = userDoc.data() as User;
        const updatedActive = (userData.activeChallenges || []).filter(c => c.id !== challengeId);
        transaction.update(userRef, { activeChallenges: updatedActive });
        transaction.update(challengeRef, { participantIds: arrayRemove(userId) });
    });
};

export const completeChallengeDay = async (userId: string, activeChallengeId: string) => {
    const { db } = getFirebaseServices();
    const userRef = doc(db, 'users', userId);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User document does not exist!");
            const userData = userDoc.data() as User;
            const activeChallenges = userData.activeChallenges || [];
            const challengeIndex = activeChallenges.findIndex(c => c.id === activeChallengeId);
            if (challengeIndex === -1) return;
            const challengeToUpdate = { ...activeChallenges[challengeIndex] };
            if (challengeToUpdate.completedDays >= challengeToUpdate.duration) return;
            const challengeDocRef = doc(db, 'challenges', activeChallengeId);
            const challengeDocSnap = await getDoc(challengeDocRef);
            let pointsPerDay = 10;
            if (challengeDocSnap.exists()) {
                const cData = challengeDocSnap.data() as Challenge;
                pointsPerDay = Math.round(cData.points / cData.duration);
            }
            challengeToUpdate.completedDays += 1;
            const isCompleted = challengeToUpdate.completedDays >= challengeToUpdate.duration;
            const updatedPoints = (userData.points || 0) + pointsPerDay + (isCompleted ? 100 : 0);
            const updatedActiveChallenges = [...activeChallenges];
            updatedActiveChallenges[challengeIndex] = challengeToUpdate;
            transaction.update(userRef, {
                activeChallenges: updatedActiveChallenges,
                points: updatedPoints,
                ...(isCompleted ? { challengesCompleted: increment(1) } : {})
            });
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw e;
    }
};

export const addChallenge = async (challenge: Omit<Challenge, 'id'> | Challenge) => {
    const { db } = getFirebaseServices();
    if ('id' in challenge) {
        await setDoc(doc(db, 'challenges', challenge.id), challenge);
    } else {
        await addDoc(collection(db, 'challenges'), challenge);
    }
};

export const updateChallenge = async (id: string, data: Partial<Challenge>) => {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, 'challenges', id), data);
};

export const deleteChallenge = async (id: string) => {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'challenges', id));
};

export const listenToChallenge = (challengeId: string, callback: (challenge: Challenge) => void) => {
    const { db } = getFirebaseServices();
    return onSnapshot(doc(db, 'challenges', challengeId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as Challenge);
        }
    });
};

export const addMessageToChallenge = async (challengeId: string, message: any) => {
    const { db } = getFirebaseServices();
    const challengeRef = doc(db, 'challenges', challengeId);
    await updateDoc(challengeRef, {
        messages: arrayUnion({
            ...message,
            timestamp: new Date().toISOString()
        })
    });
};

// --- Courses / Academy ---

export const getCourses = async (): Promise<Course[]> => {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, 'courses'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

export const addCourse = async (course: Omit<Course, 'id'> | Course) => {
    const { db } = getFirebaseServices();
    if ('id' in course) {
        await setDoc(doc(db, 'courses', course.id), course);
    } else {
        await addDoc(collection(db, 'courses'), course);
    }
};

export const updateCourse = async (id: string, data: Partial<Course>) => {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, 'courses', id), data);
};

export const deleteCourse = async (id: string) => {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'courses', id));
};

// --- Global Content ---

export const getGlobalContent = async (): Promise<GlobalContent | null> => {
    const { db } = getFirebaseServices();
    const docSnap = await getDoc(doc(db, 'globals', 'content'));
    if (docSnap.exists()) return docSnap.data() as GlobalContent;
    return null;
};

export const updateGlobalContent = async (data: Partial<GlobalContent>) => {
    const { db } = getFirebaseServices();
    const docRef = doc(db, 'globals', 'content');
    await setDoc(docRef, data, { merge: true });
};

// --- Invitations ---

export const sendCourseInvitation = async (inviter: User, inviteeEmail: string, course: Course) => {
    const { db } = getFirebaseServices();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', inviteeEmail));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, message: "User not found." };
    const inviteeId = snap.docs[0].id;
    await addDoc(collection(db, 'notifications'), {
        userId: inviteeId,
        type: 'course_invitation',
        text: `${inviter.name} invited you to join the course "${course.title}"!`,
        relatedId: course.id,
        isRead: false,
        createdAt: new Date().toISOString()
    } as AppNotification);
    return { success: true, message: "Invitation sent!" };
};

export const sendChallengeInvitation = async (inviter: User, inviteeEmail: string, challenge: Challenge) => {
    const { db } = getFirebaseServices();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', inviteeEmail));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, message: "User not found." };
    const inviteeId = snap.docs[0].id;
    await addDoc(collection(db, 'notifications'), {
        userId: inviteeId,
        type: 'challenge_invitation',
        text: `${inviter.name} invited you to the "${challenge.title}" challenge!`,
        relatedId: challenge.id,
        isRead: false,
        createdAt: new Date().toISOString()
    } as AppNotification);
    return { success: true, message: "Invitation sent!" };
};

export const sendLessonInvitation = async (inviter: User, inviteeEmail: string, session: Session, courseId: string) => {
    const { db } = getFirebaseServices();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', inviteeEmail));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, message: "User not found." };
    const inviteeId = snap.docs[0].id;
    await addDoc(collection(db, 'notifications'), {
        userId: inviteeId,
        type: 'lesson_invitation',
        text: `${inviter.name} invited you to watch the lesson "${session.title}"!`,
        relatedId: `${courseId}/session/${session.id}`,
        isRead: false,
        createdAt: new Date().toISOString()
    } as AppNotification);
    return { success: true, message: "Invitation sent!" };
};

export const sendGroupInvitation = async (inviter: User, inviteeEmail: string, fam: HeyFam) => {
    const { db } = getFirebaseServices();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', inviteeEmail));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, message: "User not found." };
    const inviteeId = snap.docs[0].id;
    await addDoc(collection(db, 'notifications'), {
        userId: inviteeId,
        type: 'group_invitation',
        text: `${inviter.name} invited you to join the "${fam.name}" group!`,
        relatedId: fam.id,
        isRead: false,
        createdAt: new Date().toISOString()
    } as AppNotification);
    return { success: true, message: "Invitation sent!" };
};

// --- Learning Groups ---

export const getLearningGroups = async (): Promise<LearningGroup[]> => {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, 'learningGroups'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningGroup));
};

export const getLearningGroup = async (id: string): Promise<LearningGroup | null> => {
    const { db } = getFirebaseServices();
    const docSnap = await getDoc(doc(db, 'learningGroups', id));
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as LearningGroup;
    return null;
};

export const addMessageToGroup = async (groupId: string, message: GroupMessage) => {
    const { db } = getFirebaseServices();
    const groupRef = doc(db, 'learningGroups', groupId);
    await updateDoc(groupRef, {
        messages: arrayUnion(message)
    });
};

// --- Submissions ---

export const getUserSubmissions = async (userId: string): Promise<Submission[]> => {
    const { db } = getFirebaseServices();
    const q = query(collection(db, 'submissions'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
};

export const addSubmission = async (submission: Omit<Submission, 'id'>) => {
    const { db } = getFirebaseServices();
    await addDoc(collection(db, 'submissions'), submission);
};

// --- Hey Fams ---

export const getHeyFams = async (): Promise<HeyFam[]> => {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, 'heyFams'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HeyFam));
};

export const createHeyFam = async (fam: Omit<HeyFam, 'id'>) => {
    const { db } = getFirebaseServices();
    const docRef = await addDoc(collection(db, 'heyFams'), fam);
    return docRef.id;
};

export const updateHeyFam = async (id: string, data: Partial<HeyFam>) => {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, 'heyFams', id), data);
};

export const deleteHeyFam = async (id: string) => {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'heyFams', id));
};

export const joinHeyFam = async (userId: string, famId: string) => {
    const { db } = getFirebaseServices();
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { heyFamIds: arrayUnion(famId) });
    const famRef = doc(db, 'heyFams', famId);
    batch.update(famRef, { memberIds: arrayUnion(userId) });
    await batch.commit();
};

export const leaveHeyFam = async (userId: string, famId: string) => {
    const { db } = getFirebaseServices();
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { heyFamIds: arrayRemove(famId) });
    const famRef = doc(db, 'heyFams', famId);
    batch.update(famRef, { memberIds: arrayRemove(userId) });
    await batch.commit();
};

export const listenToHeyFam = (famId: string, callback: (fam: HeyFam) => void) => {
    const { db } = getFirebaseServices();
    return onSnapshot(doc(db, 'heyFams', famId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as HeyFam);
        }
    });
};

export const addMessageToHeyFam = async (famId: string, message: any) => {
    const { db } = getFirebaseServices();
    const famRef = doc(db, 'heyFams', famId);
    await updateDoc(famRef, {
        messages: arrayUnion({ ...message, timestamp: new Date().toISOString() })
    });
};

export const addResourceToHeyFam = async (famId: string, resource: ResourceLink) => {
    const { db } = getFirebaseServices();
    const famRef = doc(db, 'heyFams', famId);
    await updateDoc(famRef, {
        resources: arrayUnion(resource)
    });
};

// --- Prayer Requests ---

export const getPrayerRequests = async (): Promise<PrayerRequest[]> => {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, 'prayerRequests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrayerRequest));
};

export const addPrayerRequest = async (request: Omit<PrayerRequest, 'id'>) => {
    const { db } = getFirebaseServices();
    await addDoc(collection(db, 'prayerRequests'), request);
};

export const incrementPrayerCount = async (requestId: string, user: User) => {
    const { db } = getFirebaseServices();
    const reqRef = doc(db, 'prayerRequests', requestId);
    const userRef = doc(db, 'users', user.id);
    const batch = writeBatch(db);
    batch.update(reqRef, { 
        prayerCount: increment(1),
        prayedBy: arrayUnion(user.id)
    });
    batch.update(userRef, { prayerCount: increment(1) });
    await batch.commit();
};

// --- Notifications ---

export const getUserNotifications = (userId: string) => {
    const { db } = getFirebaseServices();
    return query(collection(db, 'notifications'), where('userId', '==', userId), limit(50));
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
};

export const respondToChallengeInvitation = async (challengeId: string, notificationId: string, user: User, accepted: boolean) => {
    const { db } = getFirebaseServices();
    const batch = writeBatch(db);
    const notificationRef = doc(db, 'notifications', notificationId);
    batch.update(notificationRef, { isRead: true });
    if (accepted) {
        const challengeRef = doc(db, 'challenges', challengeId);
        const challengeSnap = await getDoc(challengeRef);
        if (challengeSnap.exists()) {
            const challenge = { id: challengeSnap.id, ...challengeSnap.data() } as Challenge;
            const userRef = doc(db, 'users', user.id);
            const newActiveChallenge: ActiveChallenge = {
                id: challenge.id,
                title: challenge.title,
                duration: challenge.duration,
                startDate: new Date().toISOString(),
                completedDays: 0,
            };
            batch.update(userRef, { activeChallenges: arrayUnion(newActiveChallenge) });
            batch.update(challengeRef, { participantIds: arrayUnion(user.id) });
        }
    }
    await batch.commit();
};

export const respondToGroupInvitation = async (famId: string, notificationId: string, user: User, accepted: boolean) => {
    const { db } = getFirebaseServices();
    const batch = writeBatch(db);
    const notificationRef = doc(db, 'notifications', notificationId);
    batch.update(notificationRef, { isRead: true });
    if (accepted) {
        const userRef = doc(db, 'users', user.id);
        batch.update(userRef, { heyFamIds: arrayUnion(famId) });
        const famRef = doc(db, 'heyFams', famId);
        batch.update(famRef, { memberIds: arrayUnion(user.id) });
    }
    await batch.commit();
};

// --- Workout ---

export const logWorkoutCompletion = async (userId: string, week: number, day: number, difficulty: string, comments: string) => {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  const logRef = doc(collection(db, 'workoutLogs'));
  const logEntry: WorkoutLog = {
    id: logRef.id,
    userId,
    date: new Date().toISOString(),
    weekNumber: week,
    dayNumber: day,
    difficulty: difficulty as any,
    comments
  };
  batch.set(logRef, logEntry);
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, {
    completedWorkouts: increment(1),
    points: increment(50)
  });
  await batch.commit();
};

export const getWorkoutLogs = async (userId: string, limitCount: number = 10): Promise<WorkoutLog[]> => {
  const { db } = getFirebaseServices();
  const q = query(collection(db, 'workoutLogs'), where('userId', '==', userId), orderBy('date', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as WorkoutLog);
};

export const saveCoachInsight = async (userId: string, insight: CoachInsight) => {
  const { db } = getFirebaseServices();
  await updateDoc(doc(db, 'users', userId), { coachInsight: insight });
};

// --- Journal ---

export const addJournalEntry = async (userId: string, entry: Omit<JournalEntry, 'id'>) => {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  const entryRef = doc(collection(db, 'journalEntries'));
  batch.set(entryRef, { ...entry, id: entryRef.id });
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, { 
    lastJournalDate: new Date().toISOString(),
    journalStreak: increment(1) 
  });
  await batch.commit();
};

export const getJournalEntries = async (userId: string): Promise<JournalEntry[]> => {
  const { db } = getFirebaseServices();
  const q = query(collection(db, 'journalEntries'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as JournalEntry);
};

export const updateMonthlyReflection = async (userId: string, reflection: MonthlyReflection) => {
  const { db } = getFirebaseServices();
  await updateDoc(doc(db, 'users', userId), { monthlyReflection: reflection });
};

// --- Sync & Maintenance ---

export const syncDatabase = async (adminUser: User, log: (msg: string) => void) => {
  const { db } = getFirebaseServices();
  log("Starting Sync...");
  const batch = writeBatch(db);
  let batchCount = 0;
  log(`Syncing ${MOCK_COURSES_DATA.length} Courses...`);
  for (const course of MOCK_COURSES_DATA) {
    const ref = doc(db, 'courses', course.id);
    batch.set(ref, course, { merge: false }); 
    log(`Overwriting Course: ${course.title} (ID: ${course.id})`);
    batchCount++;
  }
  log(`Syncing ${MOCK_CHALLENGES_DATA.length} Challenges...`);
  for (const challenge of MOCK_CHALLENGES_DATA) {
    const ref = doc(db, 'challenges', challenge.id);
    batch.set(ref, challenge, { merge: false });
    log(`Overwriting Challenge: ${challenge.title} (ID: ${challenge.id})`);
    batchCount++;
  }
  if (batchCount > 0) {
    await batch.commit();
    log(`Successfully committed ${batchCount} documents.`);
  } else {
    log("No items found to sync.");
  }
};
