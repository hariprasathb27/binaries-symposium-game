import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
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

let dbInstance: DatabaseSync | null = null;

function getDbPath(): string {
  const customPath = process.env.SQLITE_DB_PATH;
  if (customPath) {
    const resolved = path.resolve(process.cwd(), customPath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return resolved;
  }

  // On Vercel serverless environments, /var/task is read-only.
  // Never attempt to create /var/task/data. Use /tmp/data if SQLite is ever called on Vercel.
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    const tmpDir = path.resolve('/tmp', 'data');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (e) {
        console.warn('Could not create /tmp/data on Vercel:', e);
      }
    }
    return path.join(tmpDir, 'binaries.db');
  }

  const defaultDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return path.join(defaultDir, 'binaries.db');
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = getDbPath();
    dbInstance = new DatabaseSync(dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  const schemaPath = path.resolve(process.cwd(), 'src/lib/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS team_sessions (
        id TEXT PRIMARY KEY,
        team_name TEXT NOT NULL,
        participant_name TEXT NOT NULL,
        current_round INTEGER NOT NULL DEFAULT 1,
        current_question_index INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        score INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  } catch (e) {
    // Already created
  }
}

// -------------------------------------------------------------
// GAME SETTINGS REPOSITORY (SQLITE)
// -------------------------------------------------------------
export function getGameSettings(): GameSettings {
  const db = getDb();
  const row = (db.prepare('SELECT * FROM game_settings WHERE id = ?') as any).get('default') as any;
  if (!row) {
    const now = new Date().toISOString();
    const defaultSettings: GameSettings = {
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
    (db.prepare(`
      INSERT INTO game_settings (
        id, event_name, timer_duration, current_round, current_question_index,
        total_rounds, questions_per_round, auto_next, answer_reveal, game_status,
        instructions, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `) as any).run(
      defaultSettings.id,
      defaultSettings.event_name,
      defaultSettings.timer_duration,
      defaultSettings.current_round,
      defaultSettings.current_question_index,
      defaultSettings.total_rounds,
      defaultSettings.questions_per_round,
      defaultSettings.auto_next ? 1 : 0,
      defaultSettings.answer_reveal ? 1 : 0,
      defaultSettings.game_status,
      defaultSettings.instructions,
      now
    );
    return defaultSettings;
  }

  return {
    id: row.id,
    event_name: row.event_name,
    timer_duration: Number(row.timer_duration),
    current_round: Number(row.current_round),
    current_question_index: Number(row.current_question_index),
    total_rounds: Number(row.total_rounds),
    questions_per_round: Number(row.questions_per_round),
    auto_next: Boolean(row.auto_next),
    answer_reveal: Boolean(row.answer_reveal),
    game_status: row.game_status as any,
    instructions: row.instructions,
    updated_at: row.updated_at,
  };
}

export function updateGameSettings(settings: Partial<GameSettings>): GameSettings {
  const db = getDb();
  const current = getGameSettings();
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

  (db.prepare(`
    UPDATE game_settings SET
      event_name = ?,
      timer_duration = ?,
      current_round = ?,
      current_question_index = ?,
      total_rounds = ?,
      questions_per_round = ?,
      auto_next = ?,
      answer_reveal = ?,
      game_status = ?,
      instructions = ?,
      updated_at = ?
    WHERE id = ?
  `) as any).run(
    updated.event_name,
    updated.timer_duration,
    updated.current_round,
    updated.current_question_index,
    updated.total_rounds,
    updated.questions_per_round,
    updated.auto_next ? 1 : 0,
    updated.answer_reveal ? 1 : 0,
    updated.game_status,
    updated.instructions,
    now,
    updated.id
  );

  return updated;
}

export function resetGame(): GameSettings {
  const db = getDb();
  try {
    (db.prepare('DELETE FROM team_sessions') as any).run();
  } catch (err) {
    console.error('Error clearing team sessions on game reset in SQLite:', err);
  }

  return updateGameSettings({
    current_round: 1,
    current_question_index: 0,
    game_status: 'waiting',
  });
}

// -------------------------------------------------------------
// SCIENTISTS REPOSITORY (SQLITE)
// -------------------------------------------------------------
export function getScientists(): Scientist[] {
  const db = getDb();
  const rows = (db.prepare('SELECT * FROM scientists ORDER BY name ASC') as any).all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    image_url: r.image_url,
    description: r.description,
    field: r.field,
    country: r.country,
    year: r.year,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export function getScientistById(id: string): Scientist | null {
  const db = getDb();
  const r = (db.prepare('SELECT * FROM scientists WHERE id = ?') as any).get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    image_url: r.image_url,
    description: r.description,
    field: r.field,
    country: r.country,
    year: r.year,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function createScientist(data: Omit<Scientist, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Scientist {
  const db = getDb();
  const id = data.id || `sci_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  (db.prepare(`
    INSERT INTO scientists (id, name, image_url, description, field, country, year, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `) as any).run(id, data.name, data.image_url, data.description, data.field, data.country, data.year, now, now);
  return { ...data, id, created_at: now, updated_at: now };
}

export function updateScientist(id: string, data: Partial<Scientist>): Scientist | null {
  const db = getDb();
  const current = getScientistById(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const updated = { ...current, ...data, updated_at: now };
  (db.prepare(`
    UPDATE scientists SET
      name = ?, image_url = ?, description = ?, field = ?, country = ?, year = ?, updated_at = ?
    WHERE id = ?
  `) as any).run(updated.name, updated.image_url, updated.description, updated.field, updated.country, updated.year, now, id);
  return updated;
}

export function deleteScientist(id: string): boolean {
  const db = getDb();
  const res = (db.prepare('DELETE FROM scientists WHERE id = ?') as any).run(id);
  return Number(res.changes) > 0;
}

// -------------------------------------------------------------
// QUESTIONS REPOSITORY (SQLITE)
// -------------------------------------------------------------
export function getQuestions(roundNumber?: number): Question[] {
  const db = getDb();
  let query = `
    SELECT q.*, s.name as s_name, s.image_url as s_image, s.description as s_desc,
           s.field as s_field, s.country as s_country, s.year as s_year
    FROM questions q
    LEFT JOIN scientists s ON q.scientist_id = s.id
  `;
  const params: any[] = [];
  if (roundNumber !== undefined) {
    query += ' WHERE q.round_number = ?';
    params.push(roundNumber);
  }
  query += ' ORDER BY q.round_number ASC, q.question_order ASC, q.created_at ASC';

  const rows = (db.prepare(query) as any).all(...params) as any[];
  return rows.map((r) => ({
    id: r.id,
    scientist_id: r.scientist_id,
    question_text: r.question_text,
    option_a: r.option_a,
    option_b: r.option_b,
    option_c: r.option_c,
    option_d: r.option_d,
    option_e: r.option_e,
    correct_option: r.correct_option as OptionKey,
    round_number: Number(r.round_number),
    difficulty: r.difficulty,
    question_order: Number(r.question_order),
    active: Boolean(r.active),
    created_at: r.created_at,
    updated_at: r.updated_at,
    scientist: r.s_name
      ? {
          id: r.scientist_id,
          name: r.s_name,
          image_url: r.s_image,
          description: r.s_desc,
          field: r.s_field,
          country: r.s_country,
          year: r.s_year,
        }
      : undefined,
  }));
}

export function getQuestionById(id: string): Question | null {
  const db = getDb();
  const r = (db.prepare(`
    SELECT q.*, s.name as s_name, s.image_url as s_image, s.description as s_desc,
           s.field as s_field, s.country as s_country, s.year as s_year
    FROM questions q
    LEFT JOIN scientists s ON q.scientist_id = s.id
    WHERE q.id = ?
  `) as any).get(id) as any;

  if (!r) return null;
  return {
    id: r.id,
    scientist_id: r.scientist_id,
    question_text: r.question_text,
    option_a: r.option_a,
    option_b: r.option_b,
    option_c: r.option_c,
    option_d: r.option_d,
    option_e: r.option_e,
    correct_option: r.correct_option as OptionKey,
    round_number: Number(r.round_number),
    difficulty: r.difficulty,
    question_order: Number(r.question_order),
    active: Boolean(r.active),
    created_at: r.created_at,
    updated_at: r.updated_at,
    scientist: r.s_name
      ? {
          id: r.scientist_id,
          name: r.s_name,
          image_url: r.s_image,
          description: r.s_desc,
          field: r.s_field,
          country: r.s_country,
          year: r.s_year,
        }
      : undefined,
  };
}

export function getCurrentPublicQuestion(): PublicQuestion | null {
  const settings = getGameSettings();
  const roundQuestions = getQuestions(settings.current_round).filter((q) => q.active);

  if (roundQuestions.length === 0) {
    const allQuestions = getQuestions().filter((q) => q.active);
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

export function createQuestion(data: Omit<Question, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Question {
  const db = getDb();
  const id = data.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const maxOrderRow = (db.prepare('SELECT MAX(question_order) as max_order FROM questions WHERE round_number = ?') as any).get(data.round_number) as any;
  const nextOrder = (maxOrderRow?.max_order ?? -1) + 1;

  (db.prepare(`
    INSERT INTO questions (
      id, scientist_id, question_text, option_a, option_b, option_c, option_d, option_e,
      correct_option, round_number, difficulty, question_order, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `) as any).run(
    id,
    data.scientist_id,
    data.question_text,
    data.option_a,
    data.option_b,
    data.option_c,
    data.option_d,
    data.option_e,
    data.correct_option,
    data.round_number,
    data.difficulty || 'medium',
    data.question_order !== undefined ? data.question_order : nextOrder,
    data.active !== undefined ? (data.active ? 1 : 0) : 1,
    now,
    now
  );

  return getQuestionById(id)!;
}

export function updateQuestion(id: string, data: Partial<Question>): Question | null {
  const db = getDb();
  const current = getQuestionById(id);
  if (!current) return null;
  const now = new Date().toISOString();

  const updated: Question = {
    ...current,
    ...data,
    updated_at: now,
  };

  (db.prepare(`
    UPDATE questions SET
      scientist_id = ?,
      question_text = ?,
      option_a = ?,
      option_b = ?,
      option_c = ?,
      option_d = ?,
      option_e = ?,
      correct_option = ?,
      round_number = ?,
      difficulty = ?,
      question_order = ?,
      active = ?,
      updated_at = ?
    WHERE id = ?
  `) as any).run(
    updated.scientist_id,
    updated.question_text,
    updated.option_a,
    updated.option_b,
    updated.option_c,
    updated.option_d,
    updated.option_e,
    updated.correct_option,
    updated.round_number,
    updated.difficulty,
    updated.question_order,
    updated.active ? 1 : 0,
    now,
    id
  );

  return getQuestionById(id);
}

export function deleteQuestion(id: string): boolean {
  const db = getDb();
  const res = (db.prepare('DELETE FROM questions WHERE id = ?') as any).run(id);
  return Number(res.changes) > 0;
}

export function shuffleQuestions(mode: 'all' | 'round', roundNumber?: number): Question[] {
  const db = getDb();
  let questionsToShuffle: Question[];

  if (mode === 'round' && roundNumber !== undefined) {
    questionsToShuffle = getQuestions(roundNumber);
  } else {
    questionsToShuffle = getQuestions();
  }

  if (questionsToShuffle.length <= 1) return questionsToShuffle;

  const shuffled = [...questionsToShuffle];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  db.exec('BEGIN TRANSACTION');
  try {
    const stmt = db.prepare('UPDATE questions SET question_order = ? WHERE id = ?') as any;
    shuffled.forEach((q, index) => {
      stmt.run(index, q.id);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return mode === 'round' && roundNumber !== undefined ? getQuestions(roundNumber) : getQuestions();
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
 * and inserts/updates their record in the winners SQLite table.
 */
export function recordParticipantScore(
  participantId: string,
  explicitTeamName?: string,
  explicitParticipantName?: string
): Winner | null {
  const db = getDb();
  const row = (db.prepare(`
    SELECT SUM(CASE WHEN is_correct = 1 THEN 100 ELSE 0 END) as total_score,
           MIN(submitted_at) as earliest_time,
           MAX(submitted_at) as latest_time
    FROM submissions
    WHERE participant_id = ?
  `) as any).get(participantId) as any;

  if (!row) return null;

  const totalScore = Number(row.total_score || 0);
  const now = new Date().toISOString();

  let compTime = '02:00';
  if (row.earliest_time && row.latest_time) {
    const t1 = new Date(row.earliest_time).getTime();
    const t2 = new Date(row.latest_time).getTime();
    if (!isNaN(t1) && !isNaN(t2) && t2 > t1) {
      const elapsed = Math.max(1, Math.round((t2 - t1) / 1000));
      compTime = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    }
  }

  const teamName = formatTeamName(participantId, explicitTeamName);
  const participantName = explicitParticipantName || 'Symposium Participant';
  const winnerId = `win_${participantId.replace(/[^a-zA-Z0-9_]/g, '')}`;

  const existing = (db.prepare('SELECT id FROM winners WHERE id = ?') as any).get(winnerId);
  if (existing) {
    (db.prepare(`
      UPDATE winners SET score = ?, completion_time = ?, updated_at = ?
      WHERE id = ?
    `) as any).run(totalScore, compTime, now, winnerId);
  } else {
    (db.prepare(`
      INSERT INTO winners (id, position, team_name, participant_name, score, completion_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `) as any).run(winnerId, 999, teamName, participantName, totalScore, compTime, now, now);
  }

  syncWinnersPodium();
  return (db.prepare('SELECT * FROM winners WHERE id = ?') as any).get(winnerId) as any;
}

export function verifyAnswer(
  questionId: string,
  selectedOption: OptionKey,
  participantId: string = 'participant',
  submissionToken?: string,
  explicitTeamName?: string,
  explicitParticipantName?: string
): SubmitAnswerResponse {
  const db = getDb();
  const question = getQuestionById(questionId);

  if (!question) {
    throw new Error('Question not found');
  }

  if (submissionToken) {
    const existing = (db.prepare('SELECT * FROM submissions WHERE submission_token = ?') as any).get(submissionToken) as any;
    if (existing) {
      return {
        success: true,
        is_correct: Boolean(existing.is_correct),
        correct_option: question.correct_option,
        selected_option: existing.selected_option as OptionKey,
        scientist_name: question.scientist?.name || 'Scientist',
        points_awarded: existing.is_correct ? 100 : 0,
        already_submitted: true,
      };
    }
  }

  const isCorrect = question.correct_option === selectedOption;
  const now = new Date().toISOString();
  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  (db.prepare(`
    INSERT INTO submissions (id, question_id, participant_id, selected_option, is_correct, submitted_at, submission_token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `) as any).run(
    submissionId,
    questionId,
    participantId,
    selectedOption,
    isCorrect ? 1 : 0,
    now,
    submissionToken || submissionId
  );

  // Synchronize score to winners
  if (participantId && participantId !== 'participant_anonymous' && participantId !== 'participant') {
    try {
      recordParticipantScore(participantId, explicitTeamName, explicitParticipantName);
    } catch (err) {
      console.error('Error recording participant score in SQLite:', err);
    }
  }

  return {
    success: true,
    is_correct: isCorrect,
    correct_option: question.correct_option,
    selected_option: selectedOption,
    scientist_name: question.scientist?.name || 'Scientist',
    points_awarded: isCorrect ? 100 : 0,
    already_submitted: false,
  };
}

// -------------------------------------------------------------
// COMPONENTS REPOSITORY (SQLITE)
// -------------------------------------------------------------
export function getComponents(): ComponentItem[] {
  const db = getDb();
  const rows = (db.prepare('SELECT * FROM components ORDER BY name ASC') as any).all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    image_url: r.image_url,
    description: r.description,
    category: r.category,
    active: Boolean(r.active),
    created_at: r.created_at,
  }));
}

export function createComponent(data: Omit<ComponentItem, 'id' | 'created_at'> & { id?: string }): ComponentItem {
  const db = getDb();
  const id = data.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const existing = (db.prepare('SELECT id FROM components WHERE LOWER(name) = LOWER(?)') as any).get(data.name);
  if (existing) {
    throw new Error(`Component with name "${data.name}" already exists.`);
  }

  (db.prepare(`
    INSERT INTO components (id, name, image_url, description, category, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `) as any).run(id, data.name, data.image_url, data.description, data.category, data.active ? 1 : 0, now);

  return { ...data, id, created_at: now };
}

export function updateComponent(id: string, data: Partial<ComponentItem>): ComponentItem | null {
  const db = getDb();
  const r = (db.prepare('SELECT * FROM components WHERE id = ?') as any).get(id) as any;
  if (!r) return null;

  const updated: ComponentItem = {
    id: r.id,
    name: data.name ?? r.name,
    image_url: data.image_url ?? r.image_url,
    description: data.description ?? r.description,
    category: data.category ?? r.category,
    active: data.active !== undefined ? data.active : Boolean(r.active),
    created_at: r.created_at,
  };

  (db.prepare(`
    UPDATE components SET name = ?, image_url = ?, description = ?, category = ?, active = ?
    WHERE id = ?
  `) as any).run(updated.name, updated.image_url, updated.description, updated.category, updated.active ? 1 : 0, id);

  return updated;
}

export function deleteComponent(id: string): boolean {
  const db = getDb();
  const res = (db.prepare('DELETE FROM components WHERE id = ?') as any).run(id);
  return Number(res.changes) > 0;
}

export function shuffleComponents(): ComponentItem[] {
  const items = getComponents();
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// -------------------------------------------------------------
// WINNERS REPOSITORY (SQLITE)
// -------------------------------------------------------------
/**
 * Dynamically synchronizes and re-ranks all winners in SQLite by score descending
 * and updates their positions so positions 1, 2, 3... strictly reflect the top scores.
 */
export function syncWinnersPodium(): Winner[] {
  const db = getDb();
  const rows = (db.prepare('SELECT * FROM winners') as any).all() as any[];
  const winnersList: Winner[] = rows.map((r) => ({
    id: r.id,
    position: Number(r.position),
    team_name: r.team_name,
    participant_name: r.participant_name,
    score: Number(r.score),
    completion_time: r.completion_time,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  if (winnersList.length === 0) {
    return [];
  }

  // Sort by score descending (highest score first)
  winnersList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.position - b.position;
  });

  // Assign sequential positions (1, 2, 3...)
  const updateStmt = db.prepare('UPDATE winners SET position = ?, updated_at = ? WHERE id = ?') as any;
  const ranked = winnersList.map((w, idx) => {
    const newPos = idx + 1;
    if (w.position !== newPos) {
      updateStmt.run(newPos, new Date().toISOString(), w.id);
      w.position = newPos;
    }
    return w;
  });

  return ranked;
}

export function getWinners(): Winner[] {
  return syncWinnersPodium();
}

export function createWinner(data: Omit<Winner, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Winner {
  const db = getDb();
  const id = data.id || `win_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  (db.prepare(`
    INSERT INTO winners (id, position, team_name, participant_name, score, completion_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `) as any).run(
    id,
    Number(data.position) || 1,
    String(data.team_name || '').trim(),
    String(data.participant_name || '').trim(),
    Number(data.score) || 0,
    String(data.completion_time || '00:00').trim(),
    now,
    now
  );

  try {
    syncWinnersPodium();
  } catch (err) {}

  return { ...data, id, created_at: now, updated_at: now };
}

export function updateWinner(id: string, data: Partial<Winner>): Winner | null {
  const db = getDb();
  let r = (db.prepare('SELECT * FROM winners WHERE id = ?') as any).get(id) as any;
  let targetId = id;

  if (!r) {
    if (id.startsWith('win_')) {
      const altId = id.replace(/^win_/, '');
      r = (db.prepare('SELECT * FROM winners WHERE id = ?') as any).get(altId) as any;
      if (r) targetId = altId;
    } else {
      const altId = `win_${id}`;
      r = (db.prepare('SELECT * FROM winners WHERE id = ?') as any).get(altId) as any;
      if (r) targetId = altId;
    }
  }

  if (!r) return null;
  const now = new Date().toISOString();

  const updated: Winner = {
    id: r.id,
    position: data.position !== undefined ? Number(data.position) : Number(r.position),
    team_name: data.team_name !== undefined ? String(data.team_name).trim() : r.team_name,
    participant_name: data.participant_name !== undefined ? String(data.participant_name).trim() : r.participant_name,
    score: data.score !== undefined ? Number(data.score) : Number(r.score),
    completion_time: data.completion_time !== undefined ? String(data.completion_time).trim() : r.completion_time,
    created_at: r.created_at,
    updated_at: now,
  };

  (db.prepare(`
    UPDATE winners SET position = ?, team_name = ?, participant_name = ?, score = ?, completion_time = ?, updated_at = ?
    WHERE id = ?
  `) as any).run(updated.position, updated.team_name, updated.participant_name, updated.score, updated.completion_time, now, targetId);

  try {
    syncWinnersPodium();
  } catch (err) {}

  return updated;
}

export function deleteWinner(id: string): boolean {
  const db = getDb();
  const rawPId = id.replace(/^win_/, '');
  const res = (db.prepare('DELETE FROM winners WHERE id = ? OR id = ? OR id = ?') as any).run(
    id,
    rawPId,
    `win_${rawPId}`
  );

  // Clean up associated submissions and team sessions so the team cannot be resurrected
  try {
    const pIds = Array.from(new Set([id, rawPId, `team_${rawPId}`, rawPId.replace(/^team_/, '')]));
    for (const pid of pIds) {
      (db.prepare('DELETE FROM submissions WHERE participant_id = ?') as any).run(pid);
      (db.prepare('DELETE FROM team_sessions WHERE participant_id = ?') as any).run(pid);
    }
  } catch (cleanErr) {
    console.error('Error cleaning submissions in SQLite:', cleanErr);
  }

  try {
    syncWinnersPodium();
  } catch (err) {}

  return Number(res.changes) > 0;
}

// -------------------------------------------------------------
// AUTH & ADMIN USERS (SQLITE)
// -------------------------------------------------------------
export function getAdminUserByEmail(email: string): AdminUser | null {
  const db = getDb();
  const row = (db.prepare('SELECT * FROM admin_users WHERE email = ?') as any).get(email) as any;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    created_at: row.created_at,
    last_login: row.last_login,
    salt: row.salt,
  } as any;
}

export function updateAdminLastLogin(id: string): void {
  const db = getDb();
  (db.prepare('UPDATE admin_users SET last_login = ? WHERE id = ?') as any).run(new Date().toISOString(), id);
}

export function insertAdminUser(user: { id: string; email: string; password_hash: string; salt: string; role: string; created_at: string }): void {
  const db = getDb();
  (db.prepare(`
    INSERT INTO admin_users (id, email, password_hash, salt, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `) as any).run(user.id, user.email, user.password_hash, user.salt, user.role, user.created_at);
}

// -------------------------------------------------------------
// AUDIT LOGS & HEALTH (SQLITE)
// -------------------------------------------------------------
export function logAudit(action: string, details?: string): void {
  try {
    const db = getDb();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    (db.prepare('INSERT INTO audit_logs (id, action, details, created_at) VALUES (?, ?, ?, ?)') as any).run(
      id,
      action,
      details || '',
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function getHealthStatus(): { status: string; timestamp: string; database: string; questionsCount: number; scientistsCount: number } {
  const db = getDb();
  const qCount = ((db.prepare('SELECT COUNT(*) as count FROM questions') as any).get() as any)?.count || 0;
  const sCount = ((db.prepare('SELECT COUNT(*) as count FROM scientists') as any).get() as any)?.count || 0;

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected (sqlite-native)',
    questionsCount: Number(qCount),
    scientistsCount: Number(sCount),
  };
}

// -------------------------------------------------------------
// TEAM SESSIONS REPOSITORY (PER-TEAM ISOLATION - SQLITE)
// -------------------------------------------------------------
export function getTeamSession(participantId: string): TeamSession | null {
  const cleanId = (participantId || 'participant_anonymous').trim();
  const db = getDb();
  const row = (db.prepare('SELECT * FROM team_sessions WHERE id = ?') as any).get(cleanId) as any;
  if (!row) return null;
  return {
    id: row.id,
    team_name: row.team_name,
    participant_name: row.participant_name,
    current_round: Number(row.current_round ?? 1),
    current_question_index: Number(row.current_question_index ?? 0),
    status: row.status || 'active',
    score: Number(row.score ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function initOrResetTeamSession(
  participantId: string,
  teamName?: string,
  participantName?: string
): TeamSession {
  const cleanId = (participantId || 'participant_anonymous').trim();
  const team = formatTeamName(cleanId, teamName);
  const participant = participantName?.trim() || 'Symposium Participant';
  const now = new Date().toISOString();
  const db = getDb();

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

  (db.prepare(`
    INSERT OR REPLACE INTO team_sessions (
      id, team_name, participant_name, current_round, current_question_index, status, score, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `) as any).run(
    session.id,
    session.team_name,
    session.participant_name,
    session.current_round,
    session.current_question_index,
    session.status,
    session.score,
    session.created_at,
    session.updated_at
  );

  return session;
}

export function resetTeamSession(participantId: string): TeamSession {
  return initOrResetTeamSession(participantId);
}

export function getTeamCurrentPublicQuestion(
  participantId: string,
  teamName?: string,
  participantName?: string
): { question: PublicQuestion | null; session: TeamSession; totalInRound: number } {
  let session = getTeamSession(participantId);
  if (!session) {
    session = initOrResetTeamSession(participantId, teamName, participantName);
  }

  if (session.status === 'completed') {
    return { question: null, session, totalInRound: 0 };
  }

  const settings = getGameSettings();
  let roundQuestions = getQuestions(session.current_round).filter((q) => q.active);

  if (roundQuestions.length === 0) {
    roundQuestions = getQuestions().filter((q) => q.active);
  }

  if (roundQuestions.length === 0) {
    return { question: null, session, totalInRound: 0 };
  }

  if (session.current_question_index >= roundQuestions.length) {
    const nextRound = session.current_round + 1;
    const nextQuestions = getQuestions(nextRound).filter((q) => q.active);

    if (nextQuestions.length > 0 && nextRound <= settings.total_rounds) {
      session = {
        ...session,
        current_round: nextRound,
        current_question_index: 0,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      const db = getDb();
      (db.prepare(`
        UPDATE team_sessions
        SET current_round = ?, current_question_index = ?, status = ?, updated_at = ?
        WHERE id = ?
      `) as any).run(session.current_round, session.current_question_index, session.status, session.updated_at, session.id);
      roundQuestions = nextQuestions;
    } else {
      session = {
        ...session,
        status: 'completed',
        updated_at: new Date().toISOString(),
      };
      const db = getDb();
      (db.prepare(`
        UPDATE team_sessions
        SET status = ?, updated_at = ?
        WHERE id = ?
      `) as any).run(session.status, session.updated_at, session.id);
      try {
        recordParticipantScore(session.id, session.team_name, session.participant_name);
        syncWinnersPodium();
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

export function advanceTeamSession(
  participantId: string,
  teamName?: string
): { session: TeamSession; completed: boolean; advancedRound: boolean; message: string } {
  let session = getTeamSession(participantId);
  if (!session) {
    session = initOrResetTeamSession(participantId, teamName);
  }

  const settings = getGameSettings();
  const roundQuestions = getQuestions(session.current_round).filter((q) => q.active);
  const nextIndex = session.current_question_index + 1;
  const now = new Date().toISOString();
  const db = getDb();

  if (nextIndex < roundQuestions.length) {
    const updatedSession: TeamSession = {
      ...session,
      current_question_index: nextIndex,
      status: 'active',
      updated_at: now,
    };
    (db.prepare(`
      UPDATE team_sessions
      SET current_question_index = ?, status = ?, updated_at = ?
      WHERE id = ?
    `) as any).run(updatedSession.current_question_index, updatedSession.status, updatedSession.updated_at, updatedSession.id);
    return {
      session: updatedSession,
      completed: false,
      advancedRound: false,
      message: `Advanced to Question ${nextIndex + 1}`,
    };
  } else {
    const nextRound = session.current_round + 1;
    const nextRoundQuestions = getQuestions(nextRound).filter((q) => q.active);

    if (nextRoundQuestions.length > 0 && nextRound <= settings.total_rounds) {
      const updatedSession: TeamSession = {
        ...session,
        current_round: nextRound,
        current_question_index: 0,
        status: 'active',
        updated_at: now,
      };
      (db.prepare(`
        UPDATE team_sessions
        SET current_round = ?, current_question_index = ?, status = ?, updated_at = ?
        WHERE id = ?
      `) as any).run(updatedSession.current_round, updatedSession.current_question_index, updatedSession.status, updatedSession.updated_at, updatedSession.id);
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
      (db.prepare(`
        UPDATE team_sessions
        SET status = ?, updated_at = ?
        WHERE id = ?
      `) as any).run(updatedSession.status, updatedSession.updated_at, updatedSession.id);
      try {
        recordParticipantScore(session.id, session.team_name, session.participant_name);
        syncWinnersPodium();
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

