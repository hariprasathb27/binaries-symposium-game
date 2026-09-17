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
import * as sqliteRepo from './sqlite';
import * as firestoreRepo from './firestore';

/**
 * Returns true if the active database provider is Firestore.
 * Performs a case-insensitive check against DATABASE_PROVIDER.
 */
export function isFirestoreProvider(): boolean {
  return (process.env.DATABASE_PROVIDER || '').trim().toUpperCase() === 'FIRESTORE';
}

/**
 * Returns the name of the active database provider.
 */
export function getDatabaseProvider(): 'sqlite' | 'firestore' {
  return isFirestoreProvider() ? 'firestore' : 'sqlite';
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
  return sqliteRepo.getDb();
}

// -------------------------------------------------------------
// GAME SETTINGS REPOSITORY
// -------------------------------------------------------------
export async function getGameSettings(): Promise<GameSettings> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getGameSettings();
  }
  return sqliteRepo.getGameSettings();
}

export async function updateGameSettings(settings: Partial<GameSettings>): Promise<GameSettings> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateGameSettings(settings);
  }
  return sqliteRepo.updateGameSettings(settings);
}

export async function resetGame(): Promise<GameSettings> {
  if (isFirestoreProvider()) {
    return firestoreRepo.resetGame();
  }
  return sqliteRepo.resetGame();
}

// -------------------------------------------------------------
// SCIENTISTS REPOSITORY
// -------------------------------------------------------------
export async function getScientists(): Promise<Scientist[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getScientists();
  }
  return sqliteRepo.getScientists();
}

export async function getScientistById(id: string): Promise<Scientist | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getScientistById(id);
  }
  return sqliteRepo.getScientistById(id);
}

export async function createScientist(
  data: Omit<Scientist, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Scientist> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createScientist(data);
  }
  return sqliteRepo.createScientist(data);
}

export async function updateScientist(
  id: string,
  data: Partial<Scientist>
): Promise<Scientist | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateScientist(id, data);
  }
  return sqliteRepo.updateScientist(id, data);
}

export async function deleteScientist(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteScientist(id);
  }
  return sqliteRepo.deleteScientist(id);
}

// -------------------------------------------------------------
// QUESTIONS REPOSITORY
// -------------------------------------------------------------
export async function getQuestions(roundNumber?: number): Promise<Question[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getQuestions(roundNumber);
  }
  return sqliteRepo.getQuestions(roundNumber);
}

export async function getQuestionById(id: string): Promise<Question | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getQuestionById(id);
  }
  return sqliteRepo.getQuestionById(id);
}

export async function getCurrentPublicQuestion(): Promise<PublicQuestion | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getCurrentPublicQuestion();
  }
  return sqliteRepo.getCurrentPublicQuestion();
}

export async function createQuestion(
  data: Omit<Question, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Question> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createQuestion(data);
  }
  return sqliteRepo.createQuestion(data);
}

export async function updateQuestion(
  id: string,
  data: Partial<Question>
): Promise<Question | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateQuestion(id, data);
  }
  return sqliteRepo.updateQuestion(id, data);
}

export async function deleteQuestion(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteQuestion(id);
  }
  return sqliteRepo.deleteQuestion(id);
}

export async function shuffleQuestions(
  mode: 'all' | 'round',
  roundNumber?: number
): Promise<Question[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.shuffleQuestions(mode, roundNumber);
  }
  return sqliteRepo.shuffleQuestions(mode, roundNumber);
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
  return sqliteRepo.verifyAnswer(question_id, selected_option, participant_id, submission_token);
}

// -------------------------------------------------------------
// COMPONENTS REPOSITORY
// -------------------------------------------------------------
export async function getComponents(): Promise<ComponentItem[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getComponents();
  }
  return sqliteRepo.getComponents();
}

export async function createComponent(
  data: Omit<ComponentItem, 'id' | 'created_at'> & { id?: string }
): Promise<ComponentItem> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createComponent(data);
  }
  return sqliteRepo.createComponent(data);
}

export async function updateComponent(
  id: string,
  data: Partial<ComponentItem>
): Promise<ComponentItem | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateComponent(id, data);
  }
  return sqliteRepo.updateComponent(id, data);
}

export async function deleteComponent(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteComponent(id);
  }
  return sqliteRepo.deleteComponent(id);
}

export async function shuffleComponents(): Promise<ComponentItem[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.shuffleComponents();
  }
  return sqliteRepo.shuffleComponents();
}

// -------------------------------------------------------------
// WINNERS REPOSITORY
// -------------------------------------------------------------
export async function getWinners(): Promise<Winner[]> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getWinners();
  }
  return sqliteRepo.getWinners();
}

export async function createWinner(
  data: Omit<Winner, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Winner> {
  if (isFirestoreProvider()) {
    return firestoreRepo.createWinner(data);
  }
  return sqliteRepo.createWinner(data);
}

export async function updateWinner(
  id: string,
  data: Partial<Winner>
): Promise<Winner | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateWinner(id, data);
  }
  return sqliteRepo.updateWinner(id, data);
}

export async function deleteWinner(id: string): Promise<boolean> {
  if (isFirestoreProvider()) {
    return firestoreRepo.deleteWinner(id);
  }
  return sqliteRepo.deleteWinner(id);
}

// -------------------------------------------------------------
// AUTH & ADMIN USERS
// -------------------------------------------------------------
export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  if (isFirestoreProvider()) {
    return firestoreRepo.getAdminUserByEmail(email);
  }
  return sqliteRepo.getAdminUserByEmail(email);
}

export async function updateAdminLastLogin(id: string): Promise<void> {
  if (isFirestoreProvider()) {
    return firestoreRepo.updateAdminLastLogin(id);
  }
  return sqliteRepo.updateAdminLastLogin(id);
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
  return sqliteRepo.insertAdminUser(user);
}

// -------------------------------------------------------------
// AUDIT LOGS & HEALTH
// -------------------------------------------------------------
export async function logAudit(action: string, details?: string): Promise<void> {
  if (isFirestoreProvider()) {
    return firestoreRepo.logAudit(action, details);
  }
  return sqliteRepo.logAudit(action, details);
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
  return sqliteRepo.getHealthStatus();
}
