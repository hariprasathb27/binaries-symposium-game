/**
 * Optional Firebase Firestore Adapter for BINARIES Symposium Quiz
 *
 * To enable Firestore in production:
 * 1. Set DATABASE_PROVIDER=firestore in .env
 * 2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY
 * 3. The interface below maps seamlessly to Firestore collections.
 */

export interface FirestoreConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function isFirestoreEnabled(): boolean {
  return process.env.DATABASE_PROVIDER === 'firestore' &&
    Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY);
}

export const FIRESTORE_COLLECTIONS = {
  ADMINS: 'admin_users',
  SCIENTISTS: 'scientists',
  QUESTIONS: 'questions',
  COMPONENTS: 'components',
  WINNERS: 'winners',
  SETTINGS: 'game_settings',
  SUBMISSIONS: 'submissions',
  LOGS: 'audit_logs',
};
