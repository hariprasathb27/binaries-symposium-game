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
} from '../types';
import * as firestoreRepo from './firestore';

/**
 * Returns true if the active database provider is Firestore.
 * Performs a case-insensitive check against DATABASE_PROVIDER,
 * strips surrounding quotes if present in environment configuration,
 * and automatically selects Firestore when running on Vercel or when
 * Firebase credentials are provided (unless SQLITE is explicitly forced).
 */
export function isFirestoreProvider(): boolean {
  const rawProvider = (process.env.DATABASE_PROVIDER || '').trim();
  const cleanProvider = rawProvider.replace(/^["']|["']$/g, '').trim().toUpperCase();

  if (cleanProvider === 'FIRESTORE' || cleanProvider === 'FIREBASE') {
    return true;
  }

  if (cleanProvider === 'SQLITE') {
    return false;
  }

  // Automatic detection for Vercel / serverless deployments:
  // Vercel serverless has a read-only filesystem (/var/task) where SQLite cannot operate.
  // Unless explicitly set to SQLITE, any Vercel deployment or environment with Firebase configuration uses Firestore.
  if (
    process.env.VERCEL === '1' ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    return true;
  }

  // Default to SQLite for local development
  return false;
}

/**
 * Returns the name of the active database provider.
 */
export function getDatabaseProvider(): 'sqlite' | 'firestore' {
  return isFirestoreProvider() ? 'firestore' : 'sqlite';
}

// Lazy-load SQLite repository ONLY when SQLite is active.
// When DATABASE_PROVIDER=FIRESTORE (or on Vercel), sqlite.ts is NEVER imported,
// initialized, or executed.
let _sqliteRepo: any = null;
function getSqlite() {
  if (isFirestoreProvider()) {
    throw new Error(
      'SQLite repository cannot be accessed when DATABASE_PROVIDER is FIRESTORE.'
    );
  }
  if (!_sqliteRepo) {
    _sqliteRepo = require('./sqlite');
  }
  return _sqliteRepo;
}

/**
 * Backward compatibility helper for SQLite database instance.
 * Throws an explicit error if called when Firestore is enabled.
 */
export function getDb() {
  if (isFirestoreProvider()) {
    throw new Error(
      'getDb() is not available when DATABASE_PROVIDER is FIRESTORE. Use repository methods instead.'
    );
  }
  return getSqlite().getDb();
}

// -------------------------------------------------------------
// GAME SETTINGS REPOSITORY
// -------------------------------------------------------------
export async function getGameSettings(): Promise<GameSettings> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getGameSettings();
  }
  return getSqlite().getGameSettings();
}

export async function updateGameSettings(settings: Partial<GameSettings>): Promise<GameSettings> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateGameSettings(settings);
  }
  return getSqlite().updateGameSettings(settings);
}

export async function resetGame(): Promise<GameSettings> {
  if (isFirestoreProvider()) {
    return firestoreRepo.resetGame();
  }
  return getSqlite().resetGame();
}

// -------------------------------------------------------------
// SCIENTISTS REPOSITORY
// -------------------------------------------------------------
export async function getScientists(): Promise<Scientist[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getScientists();
  }
  return getSqlite().getScientists();
}

export async function getScientistById(id: string): Promise<Scientist | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getScientistById(id);
  }
  return getSqlite().getScientistById(id);
}

export async function createScientist(
  data: Omit<Scientist, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Scientist> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createScientist(data);
  }
  return getSqlite().createScientist(data);
}

export async function updateScientist(
  id: string,
  data: Partial<Scientist>
): Promise<Scientist | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateScientist(id, data);
  }
  return getSqlite().updateScientist(id, data);
}

export async function deleteScientist(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteScientist(id);
  }
  return getSqlite().deleteScientist(id);
}

// -------------------------------------------------------------
// QUESTIONS REPOSITORY
// -------------------------------------------------------------
export async function getQuestions(roundNumber?: number): Promise<Question[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getQuestions(roundNumber);
  }
  return getSqlite().getQuestions(roundNumber);
}

export async function getQuestionById(id: string): Promise<Question | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getQuestionById(id);
  }
  return getSqlite().getQuestionById(id);
}

export async function getCurrentPublicQuestion(): Promise<PublicQuestion | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getCurrentPublicQuestion();
  }
  return getSqlite().getCurrentPublicQuestion();
}

export async function createQuestion(
  data: Omit<Question, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Question> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createQuestion(data);
  }
  return getSqlite().createQuestion(data);
}

export async function updateQuestion(
  id: string,
  data: Partial<Question>
): Promise<Question | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateQuestion(id, data);
  }
  return getSqlite().updateQuestion(id, data);
}

export async function deleteQuestion(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteQuestion(id);
  }
  return getSqlite().deleteQuestion(id);
}

export async function shuffleQuestions(
  mode: 'all' | 'round',
  roundNumber?: number
): Promise<Question[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.shuffleQuestions(mode, roundNumber);
  }
  return getSqlite().shuffleQuestions(mode, roundNumber);
}

export async function verifyAnswer(
  question_id: string,
  selected_option: OptionKey,
  participant_id?: string,
  submission_token?: string
): Promise<SubmitAnswerResponse> {
  if (isFirestoreProvider()) {
    return firestoreRepo.verifyAnswer(question_id, selected_option, participant_id, submission_token);
  }
  return getSqlite().verifyAnswer(question_id, selected_option, participant_id, submission_token);
}

// -------------------------------------------------------------
// COMPONENTS REPOSITORY
// -------------------------------------------------------------
export async function getComponents(): Promise<ComponentItem[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getComponents();
  }
  return getSqlite().getComponents();
}

export async function createComponent(
  data: Omit<ComponentItem, 'id' | 'created_at'> & { id?: string }
): Promise<ComponentItem> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createComponent(data);
  }
  return getSqlite().createComponent(data);
}

export async function updateComponent(
  id: string,
  data: Partial<ComponentItem>
): Promise<ComponentItem | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateComponent(id, data);
  }
  return getSqlite().updateComponent(id, data);
}

export async function deleteComponent(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteComponent(id);
  }
  return getSqlite().deleteComponent(id);
}

export async function shuffleComponents(): Promise<ComponentItem[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.shuffleComponents();
  }
  return getSqlite().shuffleComponents();
}

// -------------------------------------------------------------
// WINNERS REPOSITORY
// -------------------------------------------------------------
export async function getWinners(): Promise<Winner[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getWinners();
  }
  return getSqlite().getWinners();
}

export async function createWinner(
  data: Omit<Winner, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Winner> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createWinner(data);
  }
  return getSqlite().createWinner(data);
}

export async function updateWinner(
  id: string,
  data: Partial<Winner>
): Promise<Winner | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateWinner(id, data);
  }
  return getSqlite().updateWinner(id, data);
}

export async function deleteWinner(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteWinner(id);
  }
  return getSqlite().deleteWinner(id);
}

// -------------------------------------------------------------
// AUTH & ADMIN USERS
// -------------------------------------------------------------
export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getAdminUserByEmail(email);
  }
  return getSqlite().getAdminUserByEmail(email);
}

export async function updateAdminLastLogin(id: string): Promise<void> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateAdminLastLogin(id);
  }
  return getSqlite().updateAdminLastLogin(id);
}

export async function insertAdminUser(user: {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: string;
  created_at: string;
}): Promise<void> {
  if (isFirestoreProvider()) {
    return firestoreRepo.insertAdminUser(user);
  }
  return getSqlite().insertAdminUser(user);
}

// -------------------------------------------------------------
// AUDIT LOGS & HEALTH
// -------------------------------------------------------------
export async function logAudit(action: string, details?: string): Promise<void> {
  if (isFirestoreProvider()) {
    return firestoreRepo.logAudit(action, details);
  }
  return getSqlite().logAudit(action, details);
}

export async function getHealthStatus(): Promise<{
  status: string;
  timestamp: string;
  database: string;
  questionsCount: number;
  scientistsCount: number;
}> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getHealthStatus();
  }
  return getSqlite().getHealthStatus();
}
