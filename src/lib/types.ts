export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Scientist {
  id: string;
  name: string;
  image_url: string;
  description: string;
  field: string;
  country: string;
  year: string;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: string;
  scientist_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option: OptionKey;
  round_number: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question_order: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  scientist?: Scientist;
}

export interface PublicQuestionOption {
  key: OptionKey;
  text: string;
}

export interface PublicQuestion {
  id: string;
  scientist_id: string;
  question_text: string;
  options: PublicQuestionOption[];
  round_number: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question_order: number;
  scientist: Scientist;
  total_questions_in_round?: number;
  current_question_index?: number;
}

export interface ComponentItem {
  id: string;
  name: string;
  image_url: string;
  description: string;
  category: string;
  active: boolean;
  created_at?: string;
}

export interface Winner {
  id: string;
  position: number;
  team_name: string;
  participant_name: string;
  score: number;
  completion_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface GameSettings {
  id: string;
  event_name: string;
  timer_duration: number; // e.g. 10, 15, 20, 30
  current_round: number;
  current_question_index: number;
  total_rounds: number;
  questions_per_round: number;
  auto_next: boolean;
  answer_reveal: boolean;
  game_status: 'waiting' | 'active' | 'completed' | 'paused';
  instructions: string;
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: 'admin' | 'superadmin';
  created_at?: string;
  last_login?: string;
}

export interface SubmitAnswerPayload {
  question_id: string;
  selected_option: OptionKey;
  participant_id?: string;
  submission_token?: string;
}

export interface SubmitAnswerResponse {
  success: boolean;
  is_correct: boolean;
  correct_option: OptionKey;
  selected_option: OptionKey;
  explanation?: string;
  scientist_name: string;
  points_awarded: number;
  already_submitted?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: Record<string, string>;
}
