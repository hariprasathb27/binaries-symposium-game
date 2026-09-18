import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import {
  Scientist,
  Question,
  PublicQuestion,
  ComponentItem,
  Winner,
  GameSettings,
  AdminUser,
  OptionKey,
  SubmitAnswerResponse,
  TeamSession,
} from '../types';

let firestoreInstance: Firestore | null = null;

export const FIRESTORE_COLLECTIONS = {
  ADMINS: 'admin_users',
  SCIENTISTS: 'scientists',
  QUESTIONS: 'questions',
  COMPONENTS: 'components',
  WINNERS: 'winners',
  SETTINGS: 'game_settings',
  SUBMISSIONS: 'submissions',
  LOGS: 'audit_logs',
  TEAM_SESSIONS: 'team_sessions',
};

function cleanEnvValue(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || undefined;
}

function cleanPrivateKey(rawKey: string | undefined): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, '\n');
  return key || undefined;
}

function getFirestoreDb(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const apps = getApps();
  let app: App;

  if (apps.length === 0) {
    const projectId = cleanEnvValue(
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCP_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
    const clientEmail = cleanEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
    const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    if (projectId && clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else if (projectId) {
      // Allows Google Application Default Credentials or App Hosting environment
      app = initializeApp({ projectId });
    } else {
      throw new Error(
        'Firestore is selected as DATABASE_PROVIDER, but FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY environment variables are missing.'
      );
    }
  } else {
    app = apps[0];
  }

  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}

// -------------------------------------------------------------
// GAME SETTINGS REPOSITORY (FIRESTORE)
// -------------------------------------------------------------
export async function getGameSettings(): Promise<GameSettings> {
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc('default');
  const snap = await docRef.get();

  if (!snap.exists) {
    const now = new Date().toISOString();
    return {
      id: 'default',
      event_name: 'BINARIES',
      timer_duration: 20,
      current_round: 1,
      current_question_index: 0,
      total_rounds: 3,
      questions_per_round: 5,
      auto_next: false,
      answer_reveal: true,
      game_status: 'waiting',
      instructions: `1. Each question is based on a Scientist and their Inventions or Discoveries.
2. Every question contains exactly 5 options (A to E).
3. Exactly ONE option is the correct answer.
4. Select your answer before the timer reaches 0.
5. Once submitted, your response is final.
6. The symposium quiz features multiple rounds of increasing excitement.
7. Final podium winners will be awarded on the Winners presentation screen!`,
      updated_at: now,
    };
  }

  const d = snap.data()!;
  return {
    id: d.id || 'default',
    event_name: d.event_name || 'BINARIES',
    timer_duration: Number(d.timer_duration ?? 20),
    current_round: Number(d.current_round ?? 1),
    current_question_index: Number(d.current_question_index ?? 0),
    total_rounds: Number(d.total_rounds ?? 3),
    questions_per_round: Number(d.questions_per_round ?? 5),
    auto_next: Boolean(d.auto_next),
    answer_reveal: Boolean(d.answer_reveal ?? true),
    game_status: d.game_status || 'waiting',
    instructions: d.instructions || '',
    updated_at: d.updated_at || new Date().toISOString(),
  };
}

export async function updateGameSettings(settings: Partial<GameSettings>): Promise<GameSettings> {
  const db = getFirestoreDb();
  const current = await getGameSettings();
  const now = new Date().toISOString();

  const updated: GameSettings = {
    ...current,
    ...settings,
    timer_duration: settings.timer_duration !== undefined ? Number(settings.timer_duration) : current.timer_duration,
    current_round: settings.current_round !== undefined ? Number(settings.current_round) : current.current_round,
    current_question_index: settings.current_question_index !== undefined ? Number(settings.current_question_index) : current.current_question_index,
    total_rounds: settings.total_rounds !== undefined ? Number(settings.total_rounds) : current.total_rounds,
    questions_per_round: settings.questions_per_round !== undefined ? Number(settings.questions_per_round) : current.questions_per_round,
    auto_next: settings.auto_next !== undefined ? Boolean(settings.auto_next) : current.auto_next,
    answer_reveal: settings.answer_reveal !== undefined ? Boolean(settings.answer_reveal) : current.answer_reveal,
    event_name: settings.event_name !== undefined ? String(settings.event_name).trim() : current.event_name,
    instructions: settings.instructions !== undefined ? String(settings.instructions) : current.instructions,
    updated_at: now,
  };

  await db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc('default').set(updated, { merge: true });
  return updated;
}

export async function resetGame(): Promise<GameSettings> {
  const db = getFirestoreDb();

  // Clear team sessions so all participant devices start fresh at Round 1, Question 0
  try {
    const teamSessionsSnap = await db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).get();
    if (!teamSessionsSnap.empty) {
      const batch = db.batch();
      teamSessionsSnap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (err) {
    console.error('Error clearing team sessions on game reset in Firestore:', err);
  }

  return await updateGameSettings({
    current_round: 1,
    current_question_index: 0,
    game_status: 'waiting',
  });
}

// -------------------------------------------------------------
// SCIENTISTS REPOSITORY (FIRESTORE)
// -------------------------------------------------------------
export async function getScientists(): Promise<Scientist[]> {
  const db = getFirestoreDb();
  const snap = await db.collection(FIRESTORE_COLLECTIONS.SCIENTISTS).get();
  const scientists: Scientist[] = [];

  snap.forEach((doc) => {
    const d = doc.data();
    scientists.push({
      id: doc.id,
      name: d.name || '',
      image_url: d.image_url || '',
      description: d.description || '',
      field: d.field || '',
      country: d.country || '',
      year: d.year || '',
      created_at: d.created_at,
      updated_at: d.updated_at,
    });
  });

  return scientists.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getScientistById(id: string): Promise<Scientist | null> {
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.SCIENTISTS).doc(id);
  const snap = await docRef.get();

  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    id: snap.id,
    name: d.name || '',
    image_url: d.image_url || '',
    description: d.description || '',
    field: d.field || '',
    country: d.country || '',
    year: d.year || '',
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function createScientist(
  data: Omit<Scientist, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Scientist> {
  const db = getFirestoreDb();
  const id = data.id || `sci_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const scientist: Scientist = {
    ...data,
    id,
    created_at: now,
    updated_at: now,
  };

  await db.collection(FIRESTORE_COLLECTIONS.SCIENTISTS).doc(id).set(scientist);
  return scientist;
}

export async function updateScientist(id: string, data: Partial<Scientist>): Promise<Scientist | null> {
  const db = getFirestoreDb();
  const current = await getScientistById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const updated: Scientist = {
    ...current,
    ...data,
    updated_at: now,
  };

  await db.collection(FIRESTORE_COLLECTIONS.SCIENTISTS).doc(id).set(updated, { merge: true });
  return updated;
}

export async function deleteScientist(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.SCIENTISTS).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) return false;

  await docRef.delete();
  return true;
}

// -------------------------------------------------------------
// QUESTIONS REPOSITORY (FIRESTORE)
// -------------------------------------------------------------
export async function getQuestions(roundNumber?: number): Promise<Question[]> {
  const db = getFirestoreDb();
  let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.QUESTIONS);

  if (roundNumber !== undefined) {
    query = query.where('round_number', '==', roundNumber);
  }

  const snap = await query.get();
  const questions: Question[] = [];

  // Fetch scientists to join scientist data
  const scientistsMap = new Map<string, Scientist>();
  const scientists = await getScientists();
  scientists.forEach((s) => scientistsMap.set(s.id, s));

  snap.forEach((doc) => {
    const d = doc.data();
    questions.push({
      id: doc.id,
      scientist_id: d.scientist_id,
      question_text: d.question_text || '',
      option_a: d.option_a || '',
      option_b: d.option_b || '',
      option_c: d.option_c || '',
      option_d: d.option_d || '',
      option_e: d.option_e || '',
      correct_option: d.correct_option as OptionKey,
      round_number: Number(d.round_number ?? 1),
      difficulty: d.difficulty || 'medium',
      question_order: Number(d.question_order ?? 0),
      active: d.active !== undefined ? Boolean(d.active) : true,
      created_at: d.created_at,
      updated_at: d.updated_at,
      scientist: scientistsMap.get(d.scientist_id),
    });
  });

  return questions.sort((a, b) => {
    if (a.round_number !== b.round_number) return a.round_number - b.round_number;
    return a.question_order - b.question_order;
  });
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.QUESTIONS).doc(id);
  const snap = await docRef.get();

  if (!snap.exists) return null;
  const d = snap.data()!;

  let scientist: Scientist | undefined = undefined;
  if (d.scientist_id) {
    scientist = (await getScientistById(d.scientist_id)) || undefined;
  }

  return {
    id: snap.id,
    scientist_id: d.scientist_id,
    question_text: d.question_text || '',
    option_a: d.option_a || '',
    option_b: d.option_b || '',
    option_c: d.option_c || '',
    option_d: d.option_d || '',
    option_e: d.option_e || '',
    correct_option: d.correct_option as OptionKey,
    round_number: Number(d.round_number ?? 1),
    difficulty: d.difficulty || 'medium',
    question_order: Number(d.question_order ?? 0),
    active: d.active !== undefined ? Boolean(d.active) : true,
    created_at: d.created_at,
    updated_at: d.updated_at,
    scientist,
  };
}

/**
 * Anti-cheat: Returns current question for participants WITHOUT the correct answer.
 */
export async function getCurrentPublicQuestion(): Promise<PublicQuestion | null> {
  const settings = await getGameSettings();
  const roundQuestions = (await getQuestions(settings.current_round)).filter((q) => q.active);

  if (roundQuestions.length === 0) {
    const allQuestions = (await getQuestions()).filter((q) => q.active);
    if (allQuestions.length === 0) return null;
    const idx = Math.min(settings.current_question_index, allQuestions.length - 1);
    const q = allQuestions[idx];
    return formatPublicQuestion(q, idx, allQuestions.length);
  }

  const idx = Math.min(settings.current_question_index, roundQuestions.length - 1);
  const q = roundQuestions[idx];
  return formatPublicQuestion(q, idx, roundQuestions.length);
}

function formatPublicQuestion(q: Question, currentIndex: number, totalInRound: number): PublicQuestion {
  // STRICT ANTI-CHEAT: correct_option is never included in PublicQuestion!
  return {
    id: q.id,
    scientist_id: q.scientist_id,
    question_text: q.question_text,
    options: [
      { key: 'A', text: q.option_a },
      { key: 'B', text: q.option_b },
      { key: 'C', text: q.option_c },
      { key: 'D', text: q.option_d },
      { key: 'E', text: q.option_e },
    ],
    round_number: q.round_number,
    difficulty: q.difficulty,
    question_order: q.question_order,
    scientist: q.scientist || {
      id: q.scientist_id,
      name: 'Pioneering Scientist',
      image_url: '/scientists/default.svg',
      description: 'Visionary researcher in science and technology',
      field: 'Invention & Engineering',
      country: 'Global',
      year: 'Modern Era',
    },
    total_questions_in_round: totalInRound,
    current_question_index: currentIndex,
  };
}

export async function createQuestion(
  data: Omit<Question, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Question> {
  const db = getFirestoreDb();
  const id = data.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Find max question_order for round
  const existingRoundQuestions = await getQuestions(data.round_number);
  const maxOrder = existingRoundQuestions.reduce((max, q) => Math.max(max, q.question_order), -1);
  const nextOrder = data.question_order !== undefined ? data.question_order : maxOrder + 1;

  const question: Question = {
    ...data,
    id,
    question_order: nextOrder,
    active: data.active !== undefined ? data.active : true,
    created_at: now,
    updated_at: now,
  };

  const { scientist, ...storedData } = question;
  await db.collection(FIRESTORE_COLLECTIONS.QUESTIONS).doc(id).set(storedData);

  return (await getQuestionById(id))!;
}

export async function updateQuestion(id: string, data: Partial<Question>): Promise<Question | null> {
  const db = getFirestoreDb();
  const current = await getQuestionById(id);
  if (!current) return null;

  const now = new Date().toISOString();
  const updated: Question = {
    ...current,
    ...data,
    updated_at: now,
  };

  const { scientist, ...storedData } = updated;
  await db.collection(FIRESTORE_COLLECTIONS.QUESTIONS).doc(id).set(storedData, { merge: true });

  return await getQuestionById(id);
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.QUESTIONS).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) return false;

  await docRef.delete();
  return true;
}

export async function shuffleQuestions(mode: 'all' | 'round', roundNumber?: number): Promise<Question[]> {
  const db = getFirestoreDb();
  let questionsToShuffle: Question[];

  if (mode === 'round' && roundNumber !== undefined) {
    questionsToShuffle = await getQuestions(roundNumber);
  } else {
    questionsToShuffle = await getQuestions();
  }

  if (questionsToShuffle.length <= 1) return questionsToShuffle;

  const shuffled = [...questionsToShuffle];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const batch = db.batch();
  shuffled.forEach((q, index) => {
    const ref = db.collection(FIRESTORE_COLLECTIONS.QUESTIONS).doc(q.id);
    batch.update(ref, { question_order: index, updated_at: new Date().toISOString() });
  });
  await batch.commit();

  return mode === 'round' && roundNumber !== undefined
    ? await getQuestions(roundNumber)
    : await getQuestions();
}

/**
 * Helper to extract or format a user-friendly team name.
 */
export function formatTeamName(participantId: string, explicitTeamName?: string): string {
  if (explicitTeamName && explicitTeamName.trim()) {
    return explicitTeamName.trim();
  }
  if (!participantId || participantId === 'participant_anonymous' || participantId === 'participant') {
    return 'Symposium Team';
  }
  let clean = participantId;
  if (clean.startsWith('team_')) {
    clean = clean.substring(5);
  }
  return clean
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Calculates total cumulative score and elapsed completion time for a participant
 * and inserts/updates their record in the winners Firestore collection.
 */
export async function recordParticipantScore(
  participantId: string,
  explicitTeamName?: string,
  explicitParticipantName?: string
): Promise<Winner | null> {
  const db = getFirestoreDb();
  const now = new Date().toISOString();

  // Query all submissions for this participant
  const subsSnap = await db
    .collection(FIRESTORE_COLLECTIONS.SUBMISSIONS)
    .where('participant_id', '==', participantId)
    .get();

  if (subsSnap.empty) {
    return null;
  }

  let totalScore = 0;
  let earliestTime: number | null = null;
  let latestTime: number | null = null;

  subsSnap.forEach((doc) => {
    const data = doc.data();
    if (data.is_correct) {
      totalScore += data.points !== undefined ? Number(data.points) : 100;
    }
    if (data.submitted_at) {
      const timeMs = new Date(data.submitted_at).getTime();
      if (!isNaN(timeMs)) {
        if (earliestTime === null || timeMs < earliestTime) earliestTime = timeMs;
        if (latestTime === null || timeMs > latestTime) latestTime = timeMs;
      }
    }
  });

  // Calculate elapsed time formatted as MM:SS
  let completionTime = '02:00';
  if (earliestTime !== null && latestTime !== null && latestTime > earliestTime) {
    const elapsedSecs = Math.max(1, Math.round((latestTime - earliestTime) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    completionTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  const teamName = formatTeamName(participantId, explicitTeamName);
  const participantName = explicitParticipantName || 'Symposium Participant';

  // Winner ID deterministically derived from participantId
  const winnerId = `win_${participantId.replace(/[^a-zA-Z0-9_]/g, '')}`;
  const winnerRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(winnerId);
  const existingDoc = await winnerRef.get();

  let winnerData: Winner;
  if (existingDoc.exists) {
    const existing = existingDoc.data()!;
    winnerData = {
      id: winnerId,
      position: Number(existing.position ?? 999),
      team_name: existing.team_name || teamName,
      participant_name: existing.participant_name || participantName,
      score: totalScore,
      completion_time: completionTime,
      created_at: existing.created_at || now,
      updated_at: now,
    };
  } else {
    winnerData = {
      id: winnerId,
      position: 999, // Will be dynamically ranked
      team_name: teamName,
      participant_name: participantName,
      score: totalScore,
      completion_time: completionTime,
      created_at: now,
      updated_at: now,
    };
  }

  await winnerRef.set(winnerData, { merge: true });

  // Dynamically re-rank podium positions so rankings 1, 2, 3... are strictly accurate
  await syncWinnersPodium();

  return winnerData;
}

/**
 * Server-side anti-cheat answer verification with idempotency protection,
 * point calculation, submission tracking, and real-time winner podium synchronization.
 */
export async function verifyAnswer(
  questionId: string,
  selectedOption: OptionKey,
  participantId: string = 'participant',
  submissionToken?: string,
  explicitTeamName?: string,
  explicitParticipantName?: string
): Promise<SubmitAnswerResponse> {
  const db = getFirestoreDb();
  const question = await getQuestionById(questionId);

  if (!question) {
    throw new Error('Question not found');
  }

  // Check idempotency token
  if (submissionToken) {
    const existingSnap = await db
      .collection(FIRESTORE_COLLECTIONS.SUBMISSIONS)
      .where('submission_token', '==', submissionToken)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      return {
        success: true,
        is_correct: Boolean(existing.is_correct),
        correct_option: question.correct_option,
        selected_option: existing.selected_option as OptionKey,
        scientist_name: question.scientist?.name || 'Scientist',
        points_awarded: existing.points !== undefined ? Number(existing.points) : (existing.is_correct ? 100 : 0),
        already_submitted: true,
      };
    }
  }

  const isCorrect = question.correct_option === selectedOption;
  const pointsAwarded = isCorrect ? 100 : 0;
  const now = new Date().toISOString();
  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Record individual submission in Firestore with explicit points field
  await db.collection(FIRESTORE_COLLECTIONS.SUBMISSIONS).doc(submissionId).set({
    id: submissionId,
    question_id: questionId,
    participant_id: participantId,
    selected_option: selectedOption,
    is_correct: isCorrect,
    points: pointsAwarded,
    submitted_at: now,
    submission_token: submissionToken || submissionId,
  });

  // 2. Track cumulative points and synchronize into WINNERS collection
  if (participantId && participantId !== 'participant_anonymous' && participantId !== 'participant') {
    try {
      await recordParticipantScore(participantId, explicitTeamName, explicitParticipantName);
    } catch (err) {
      console.error('Error recording participant score in Firestore:', err);
    }
  }

  return {
    success: true,
    is_correct: isCorrect,
    correct_option: question.correct_option,
    selected_option: selectedOption,
    scientist_name: question.scientist?.name || 'Scientist',
    points_awarded: pointsAwarded,
    already_submitted: false,
  };
}

// -------------------------------------------------------------
// COMPONENTS REPOSITORY (FIRESTORE)
// -------------------------------------------------------------
export async function getComponents(): Promise<ComponentItem[]> {
  const db = getFirestoreDb();
  const snap = await db.collection(FIRESTORE_COLLECTIONS.COMPONENTS).get();
  const components: ComponentItem[] = [];

  snap.forEach((doc) => {
    const d = doc.data();
    components.push({
      id: doc.id,
      name: d.name || '',
      image_url: d.image_url || '',
      description: d.description || '',
      category: d.category || '',
      active: d.active !== undefined ? Boolean(d.active) : true,
      created_at: d.created_at,
    });
  });

  return components.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createComponent(
  data: Omit<ComponentItem, 'id' | 'created_at'> & { id?: string }
): Promise<ComponentItem> {
  const db = getFirestoreDb();
  const id = data.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Prevent duplicate names
  const existingSnap = await db
    .collection(FIRESTORE_COLLECTIONS.COMPONENTS)
    .where('name', '==', data.name)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    throw new Error(`Component with name "${data.name}" already exists.`);
  }

  const component: ComponentItem = {
    ...data,
    id,
    active: data.active !== undefined ? data.active : true,
    created_at: now,
  };

  await db.collection(FIRESTORE_COLLECTIONS.COMPONENTS).doc(id).set(component);
  return component;
}

export async function updateComponent(id: string, data: Partial<ComponentItem>): Promise<ComponentItem | null> {
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.COMPONENTS).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const current = snap.data()! as ComponentItem;
  const updated: ComponentItem = {
    ...current,
    ...data,
    id,
  };

  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteComponent(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.COMPONENTS).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) return false;

  await docRef.delete();
  return true;
}

export async function shuffleComponents(): Promise<ComponentItem[]> {
  const items = await getComponents();
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// -------------------------------------------------------------
// WINNERS REPOSITORY (FIRESTORE)
// -------------------------------------------------------------
/**
 * Dynamically synchronizes and re-ranks all winners in the winners collection by score descending
 * and updates their positions in Firestore so positions 1, 2, 3... strictly reflect the top scores.
 */
export async function syncWinnersPodium(): Promise<Winner[]> {
  const db = getFirestoreDb();
  const snap = await db.collection(FIRESTORE_COLLECTIONS.WINNERS).get();
  const rawWinners: Winner[] = [];

  snap.forEach((doc) => {
    const d = doc.data();
    rawWinners.push({
      id: doc.id,
      position: Number(d.position ?? 999),
      team_name: d.team_name || '',
      participant_name: d.participant_name || '',
      score: Number(d.score ?? 0),
      completion_time: d.completion_time || '00:00',
      created_at: d.created_at,
      updated_at: d.updated_at,
    });
  });

  if (rawWinners.length === 0) {
    return [];
  }

  // Sort by score descending (highest score first)
  rawWinners.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
    return timeA - timeB;
  });

  // Assign sequential podium positions (1, 2, 3, ...) and commit in batch
  const batch = db.batch();
  let hasBatchUpdates = false;

  const rankedWinners: Winner[] = rawWinners.map((w, idx) => {
    const newPos = idx + 1;
    if (w.position !== newPos) {
      const docRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(w.id);
      batch.set(docRef, { position: newPos, updated_at: new Date().toISOString() }, { merge: true });
      hasBatchUpdates = true;
    }
    return {
      ...w,
      position: newPos,
    };
  });

  if (hasBatchUpdates) {
    await batch.commit();
  }

  return rankedWinners;
}

export async function getWinners(): Promise<Winner[]> {
  return await syncWinnersPodium();
}

export async function createWinner(
  data: Omit<Winner, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Winner> {
  const db = getFirestoreDb();
  const id = data.id || `win_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const winner: Winner = {
    id,
    position: Number(data.position) || 1,
    team_name: String(data.team_name || '').trim(),
    participant_name: String(data.participant_name || '').trim(),
    score: Number(data.score) || 0,
    completion_time: String(data.completion_time || '00:00').trim(),
    created_at: now,
    updated_at: now,
  };

  await db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(id).set(winner);

  try {
    await syncWinnersPodium();
  } catch (err) {
    console.error('Error syncing podium after winner creation:', err);
  }

  return winner;
}

export async function updateWinner(id: string, data: Partial<Winner>): Promise<Winner | null> {
  const db = getFirestoreDb();
  let docRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(id);
  let snap = await docRef.get();

  if (!snap.exists) {
    if (id.startsWith('win_')) {
      const altRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(id.replace(/^win_/, ''));
      const altSnap = await altRef.get();
      if (altSnap.exists) {
        docRef = altRef;
        snap = altSnap;
      } else {
        return null;
      }
    } else {
      const altRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(`win_${id}`);
      const altSnap = await altRef.get();
      if (altSnap.exists) {
        docRef = altRef;
        snap = altSnap;
      } else {
        return null;
      }
    }
  }

  const current = snap.data()! as Winner;
  const now = new Date().toISOString();
  const updated: Winner = {
    ...current,
    id: snap.id,
    position: data.position !== undefined ? Number(data.position) : Number(current.position ?? 1),
    team_name: data.team_name !== undefined ? String(data.team_name).trim() : current.team_name,
    participant_name: data.participant_name !== undefined ? String(data.participant_name).trim() : current.participant_name,
    score: data.score !== undefined ? Number(data.score) : Number(current.score ?? 0),
    completion_time: data.completion_time !== undefined ? String(data.completion_time).trim() : current.completion_time,
    updated_at: now,
  };

  await docRef.set(updated, { merge: true });

  try {
    await syncWinnersPodium();
  } catch (err) {
    console.error('Error syncing podium after winner update:', err);
  }

  return updated;
}

export async function deleteWinner(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  let docRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(id);
  let snap = await docRef.get();

  if (!snap.exists) {
    if (id.startsWith('win_')) {
      const altRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(id.replace(/^win_/, ''));
      const altSnap = await altRef.get();
      if (altSnap.exists) {
        docRef = altRef;
        snap = altSnap;
      } else {
        return false;
      }
    } else {
      const altRef = db.collection(FIRESTORE_COLLECTIONS.WINNERS).doc(`win_${id}`);
      const altSnap = await altRef.get();
      if (altSnap.exists) {
        docRef = altRef;
        snap = altSnap;
      } else {
        return false;
      }
    }
  }

  await docRef.delete();

  // Also clean up any associated submissions and team sessions so the team cannot be resurrected
  try {
    const rawPId = id.replace(/^win_/, '');
    const pIds = Array.from(new Set([id, rawPId, `team_${rawPId}`, rawPId.replace(/^team_/, '')]));

    for (const pid of pIds) {
      const subsSnap = await db
        .collection(FIRESTORE_COLLECTIONS.SUBMISSIONS)
        .where('participant_id', '==', pid)
        .get();

      if (!subsSnap.empty) {
        const batch = db.batch();
        subsSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      const sessionRef = db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(pid);
      const sessSnap = await sessionRef.get();
      if (sessSnap.exists) {
        await sessionRef.delete();
      }
    }
  } catch (cleanErr) {
    console.error('Error cleaning up associated submissions for deleted winner:', cleanErr);
  }

  // Re-sync podium rankings after deletion
  try {
    await syncWinnersPodium();
  } catch (err) {
    console.error('Error syncing podium after winner deletion:', err);
  }

  return true;
}

// -------------------------------------------------------------
// AUTH & ADMIN USERS (FIRESTORE)
// -------------------------------------------------------------
export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  const db = getFirestoreDb();
  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.ADMINS)
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return {
    id: snap.docs[0].id,
    email: d.email,
    password_hash: d.password_hash,
    role: d.role || 'admin',
    created_at: d.created_at,
    last_login: d.last_login,
    salt: d.salt,
  } as any;
}

export async function updateAdminLastLogin(id: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(FIRESTORE_COLLECTIONS.ADMINS).doc(id).set(
    {
      last_login: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function insertAdminUser(user: {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: string;
  created_at: string;
}): Promise<void> {
  const db = getFirestoreDb();
  await db.collection(FIRESTORE_COLLECTIONS.ADMINS).doc(user.id).set(user, { merge: true });
}

// -------------------------------------------------------------
// AUDIT LOGS & HEALTH (FIRESTORE)
// -------------------------------------------------------------
export async function logAudit(action: string, details?: string): Promise<void> {
  try {
    const db = getFirestoreDb();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection(FIRESTORE_COLLECTIONS.LOGS).doc(id).set({
      id,
      action,
      details: details || '',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to write audit log to Firestore:', err);
  }
}

export async function getHealthStatus(): Promise<{
  status: string;
  timestamp: string;
  database: string;
  questionsCount: number;
  scientistsCount: number;
}> {
  const db = getFirestoreDb();
  const qSnap = await db.collection(FIRESTORE_COLLECTIONS.QUESTIONS).count().get();
  const sSnap = await db.collection(FIRESTORE_COLLECTIONS.SCIENTISTS).count().get();

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected (firestore)',
    questionsCount: qSnap.data().count,
    scientistsCount: sSnap.data().count,
  };
}

// -------------------------------------------------------------
// TEAM SESSIONS REPOSITORY (PER-TEAM ISOLATION)
// -------------------------------------------------------------
export async function getTeamSession(participantId: string): Promise<TeamSession | null> {
  const cleanId = (participantId || 'participant_anonymous').trim();
  const db = getFirestoreDb();
  const docRef = db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(cleanId);
  const snap = await docRef.get();

  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    id: snap.id,
    team_name: d.team_name || formatTeamName(cleanId),
    participant_name: d.participant_name || 'Symposium Participant',
    current_round: Number(d.current_round ?? 1),
    current_question_index: Number(d.current_question_index ?? 0),
    status: d.status || 'active',
    score: Number(d.score ?? 0),
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export async function initOrResetTeamSession(
  participantId: string,
  teamName?: string,
  participantName?: string
): Promise<TeamSession> {
  const cleanId = (participantId || 'participant_anonymous').trim();
  const team = formatTeamName(cleanId, teamName);
  const participant = participantName?.trim() || 'Symposium Participant';
  const now = new Date().toISOString();
  const db = getFirestoreDb();

  const session: TeamSession = {
    id: cleanId,
    team_name: team,
    participant_name: participant,
    current_round: 1,
    current_question_index: 0,
    status: 'active',
    score: 0,
    created_at: now,
    updated_at: now,
  };

  await db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(cleanId).set(session);
  return session;
}

export async function resetTeamSession(participantId: string): Promise<TeamSession> {
  return await initOrResetTeamSession(participantId);
}

export async function getTeamCurrentPublicQuestion(
  participantId: string,
  teamName?: string,
  participantName?: string
): Promise<{ question: PublicQuestion | null; session: TeamSession; totalInRound: number }> {
  let session = await getTeamSession(participantId);
  if (!session) {
    session = await initOrResetTeamSession(participantId, teamName, participantName);
  }

  if (session.status === 'completed') {
    return { question: null, session, totalInRound: 0 };
  }

  const settings = await getGameSettings();
  let roundQuestions = (await getQuestions(session.current_round)).filter((q) => q.active);

  if (roundQuestions.length === 0) {
    roundQuestions = (await getQuestions()).filter((q) => q.active);
  }

  if (roundQuestions.length === 0) {
    return { question: null, session, totalInRound: 0 };
  }

  // If index is past the end of round questions, try next round or complete
  if (session.current_question_index >= roundQuestions.length) {
    const nextRound = session.current_round + 1;
    const nextQuestions = (await getQuestions(nextRound)).filter((q) => q.active);

    if (nextQuestions.length > 0 && nextRound <= settings.total_rounds) {
      session = {
        ...session,
        current_round: nextRound,
        current_question_index: 0,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      const db = getFirestoreDb();
      await db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(session.id).set(session, { merge: true });
      roundQuestions = nextQuestions;
    } else {
      session = {
        ...session,
        status: 'completed',
        updated_at: new Date().toISOString(),
      };
      const db = getFirestoreDb();
      await db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(session.id).set(session, { merge: true });
      try {
        await recordParticipantScore(session.id, session.team_name, session.participant_name);
        await syncWinnersPodium();
      } catch (e) {
        console.error('Error finalizing score for completed team session:', e);
      }
      return { question: null, session, totalInRound: 0 };
    }
  }

  const q = roundQuestions[session.current_question_index];
  const formatted = formatPublicQuestion(q, session.current_question_index, roundQuestions.length);
  return { question: formatted, session, totalInRound: roundQuestions.length };
}

export async function advanceTeamSession(
  participantId: string,
  teamName?: string
): Promise<{ session: TeamSession; completed: boolean; advancedRound: boolean; message: string }> {
  let session = await getTeamSession(participantId);
  if (!session) {
    session = await initOrResetTeamSession(participantId, teamName);
  }

  const settings = await getGameSettings();
  const roundQuestions = (await getQuestions(session.current_round)).filter((q) => q.active);
  const nextIndex = session.current_question_index + 1;
  const now = new Date().toISOString();
  const db = getFirestoreDb();

  if (nextIndex < roundQuestions.length) {
    const updatedSession: TeamSession = {
      ...session,
      current_question_index: nextIndex,
      status: 'active',
      updated_at: now,
    };
    await db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(session.id).set(updatedSession, { merge: true });
    return {
      session: updatedSession,
      completed: false,
      advancedRound: false,
      message: `Advanced to Question ${nextIndex + 1}`,
    };
  } else {
    const nextRound = session.current_round + 1;
    const nextRoundQuestions = (await getQuestions(nextRound)).filter((q) => q.active);

    if (nextRoundQuestions.length > 0 && nextRound <= settings.total_rounds) {
      const updatedSession: TeamSession = {
        ...session,
        current_round: nextRound,
        current_question_index: 0,
        status: 'active',
        updated_at: now,
      };
      await db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(session.id).set(updatedSession, { merge: true });
      return {
        session: updatedSession,
        completed: false,
        advancedRound: true,
        message: `Advanced to Round ${nextRound}!`,
      };
    } else {
      const updatedSession: TeamSession = {
        ...session,
        status: 'completed',
        updated_at: now,
      };
      await db.collection(FIRESTORE_COLLECTIONS.TEAM_SESSIONS).doc(session.id).set(updatedSession, { merge: true });
      try {
        await recordParticipantScore(session.id, session.team_name, session.participant_name);
        await syncWinnersPodium();
      } catch (syncErr) {
        console.error('Error synchronizing winners on team completion:', syncErr);
      }
      return {
        session: updatedSession,
        completed: true,
        advancedRound: false,
        message: 'Symposium Quiz Completed! Check the Winners tab.',
      };
    }
  }
}

