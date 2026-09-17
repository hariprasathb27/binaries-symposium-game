/**
 * Explicit Firestore Migration & Seed Script for BINARIES Symposium Game
 *
 * This script is deliberately separate from the application runtime.
 * It is IDEMPOTENT (uses .doc(id).set(data, { merge: true })) and will
 * NEVER create duplicate documents.
 *
 * Usage:
 *   npm run db:seed:firestore
 *
 * Required Environment Variables:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Optional dotenv loader if .env or .env.local exists
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

loadEnv();

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || (!clientEmail && !process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error('\n❌ Firestore Seed Failed: Missing Firebase Admin credentials.');
  console.error('Please configure the following environment variables:');
  console.error('  FIREBASE_PROJECT_ID');
  console.error('  FIREBASE_CLIENT_EMAIL');
  console.error('  FIREBASE_PRIVATE_KEY\n');
  process.exit(1);
}

let app;
if (getApps().length === 0) {
  if (clientEmail && rawPrivateKey) {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    app = initializeApp({ projectId });
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const now = new Date().toISOString();

// -------------------------------------------------------------
// SEED DATA DEFINITIONS
// -------------------------------------------------------------

// 1. Admin User
const defaultEmail = process.env.ADMIN_EMAIL || 'admin@binaries.com';
const defaultPass = process.env.ADMIN_PASSWORD || 'BinariesAdmin2026!';
const salt = crypto.randomBytes(16).toString('hex');
const passwordHash = crypto.scryptSync(defaultPass, salt, 64).toString('hex');

const adminUser = {
  id: 'admin_root',
  email: defaultEmail,
  password_hash: passwordHash,
  salt: salt,
  role: 'superadmin',
  created_at: now,
  last_login: null,
};

// 2. Game Settings
const gameSettings = {
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

// 3. 12 Scientists
const scientists = [
  {
    id: 'sci_tesla',
    name: 'Nikola Tesla',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    description: 'Serbian-American engineer and physicist who designed the alternating-current (AC) electrical system and high-voltage Tesla coil.',
    field: 'Electrical & Mechanical Engineering',
    country: 'Serbia / United States',
    year: '1856 – 1943',
  },
  {
    id: 'sci_edison',
    name: 'Thomas Edison',
    image_url: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=600&q=80',
    description: 'Prolific American inventor whose developments include the practical incandescent light bulb, phonograph, and motion picture camera.',
    field: 'Applied Physics & Electrical Invention',
    country: 'United States',
    year: '1847 – 1931',
  },
  {
    id: 'sci_curie',
    name: 'Marie Curie',
    image_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
    description: 'Polish-French physicist and chemist who pioneered radioactivity research and discovered the chemical elements polonium and radium.',
    field: 'Nuclear Chemistry & Physics',
    country: 'Poland / France',
    year: '1867 – 1934',
  },
  {
    id: 'sci_turing',
    name: 'Alan Turing',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    description: 'English mathematician and father of modern computer science and artificial intelligence who formalized the Turing Machine and cracked Enigma.',
    field: 'Computer Science & Cryptanalysis',
    country: 'United Kingdom',
    year: '1912 – 1954',
  },
  {
    id: 'sci_bell',
    name: 'Alexander Graham Bell',
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    description: 'Scottish-born scientist and inventor credited with patenting the first practical telephone and founding the Bell Telephone Company.',
    field: 'Acoustics & Telecommunications',
    country: 'Scotland / Canada / USA',
    year: '1847 – 1922',
  },
  {
    id: 'sci_einstein',
    name: 'Albert Einstein',
    image_url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=600&q=80',
    description: 'Theoretical physicist who developed the theory of relativity and explained the photoelectric effect, fundamentally altering modern physics.',
    field: 'Theoretical Physics',
    country: 'Germany / Switzerland / USA',
    year: '1879 – 1955',
  },
  {
    id: 'sci_faraday',
    name: 'Michael Faraday',
    image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
    description: 'English scientist who discovered electromagnetic induction, diamagnetism, and electrolysis, laying the groundwork for electric motors.',
    field: 'Electromagnetism & Electrochemistry',
    country: 'United Kingdom',
    year: '1791 – 1867',
  },
  {
    id: 'sci_lovelace',
    name: 'Ada Lovelace',
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    description: 'English mathematician recognized as the first computer programmer for publishing the first algorithm intended for Charles Babbage’s Analytical Engine.',
    field: 'Mechanical Computing & Mathematics',
    country: 'United Kingdom',
    year: '1815 – 1852',
  },
  {
    id: 'sci_marconi',
    name: 'Guglielmo Marconi',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    description: 'Italian inventor and electrical engineer known for his pioneering work on long-distance radio transmission and development of Marconi’s law.',
    field: 'Wireless Communications & Radio',
    country: 'Italy',
    year: '1874 – 1937',
  },
  {
    id: 'sci_shockley',
    name: 'William Shockley, John Bardeen & Walter Brattain',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    description: 'American physicists at Bell Labs who co-invented the point-contact transistor in 1947, ushering in the silicon semiconductor age.',
    field: 'Solid-State Physics & Semiconductors',
    country: 'United States',
    year: 'Mid-20th Century',
  },
  {
    id: 'sci_lamarr',
    name: 'Hedy Lamarr',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    description: 'Austrian-American inventor who co-patented frequency-hopping spread spectrum technology, the foundation for modern Wi-Fi, Bluetooth, and CDMA.',
    field: 'Spread Spectrum & Telecommunications',
    country: 'Austria / United States',
    year: '1914 – 2000',
  },
  {
    id: 'sci_berners_lee',
    name: 'Tim Berners-Lee',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    description: 'British computer scientist who invented the World Wide Web in 1989 at CERN, specifying HTML, HTTP, and the first web browser.',
    field: 'Information Systems & Internet Architecture',
    country: 'United Kingdom',
    year: '1955 – Present',
  },
];

// 4. 15 Questions
const questions = [
  // ROUND 1: Foundational Pioneers
  {
    id: 'q_tesla_ac',
    scientist_id: 'sci_tesla',
    question_text: 'Which breakthrough electrical invention is Nikola Tesla most celebrated for developing to enable modern long-distance power grids?',
    option_a: 'Direct Current (DC) Dynamo',
    option_b: 'Alternating Current (AC) Induction Motor & Polyphase System',
    option_c: 'Incandescent Filament Lamp',
    option_d: 'Mercury Arc Rectifier',
    option_e: 'Lead-Acid Storage Battery',
    correct_option: 'B',
    round_number: 1,
    difficulty: 'easy',
    question_order: 0,
    active: true,
  },
  {
    id: 'q_edison_bulb',
    scientist_id: 'sci_edison',
    question_text: 'Which groundbreaking invention did Thomas Edison patent after discovering a durable carbonized bamboo filament in 1879?',
    option_a: 'Practical Incandescent Electric Lamp',
    option_b: 'Cathode Ray Oscilloscope',
    option_c: 'Fluorescent Neon Tube',
    option_d: 'Light Emitting Diode',
    option_e: 'Halogen Arc Projector',
    correct_option: 'A',
    round_number: 1,
    difficulty: 'easy',
    question_order: 1,
    active: true,
  },
  {
    id: 'q_bell_telephone',
    scientist_id: 'sci_bell',
    question_text: 'In 1876, Alexander Graham Bell was awarded US Patent 174,465 for transmitting vocal sounds telegraphically. What was this device?',
    option_a: 'Wireless Radio Receiver',
    option_b: 'Acoustic Gramophone',
    option_c: 'Electric Telephone',
    option_d: 'Magnetic Tape Recorder',
    option_e: 'Carbon Microphone Resonator',
    correct_option: 'C',
    round_number: 1,
    difficulty: 'easy',
    question_order: 2,
    active: true,
  },
  {
    id: 'q_curie_radium',
    scientist_id: 'sci_curie',
    question_text: 'Which radioactive element did Marie Curie and Pierre Curie isolate from pitchblende ore in 1898, revolutionizing radiation physics and cancer therapy?',
    option_a: 'Uranium-235',
    option_b: 'Thorium',
    option_c: 'Plutonium',
    option_d: 'Radium',
    option_e: 'Cesium',
    correct_option: 'D',
    round_number: 1,
    difficulty: 'medium',
    question_order: 3,
    active: true,
  },
  {
    id: 'q_faraday_induction',
    scientist_id: 'sci_faraday',
    question_text: 'Michael Faraday discovered that moving a magnet through a coil of wire induces an electric current. What fundamental principle is this?',
    option_a: 'Electromagnetic Induction',
    option_b: 'Thermionic Emission',
    option_c: 'Seebeck Thermoelectric Effect',
    option_d: 'Piezoelectric Resonance',
    option_e: 'Hall Effect Conduction',
    correct_option: 'A',
    round_number: 1,
    difficulty: 'easy',
    question_order: 4,
    active: true,
  },

  // ROUND 2: Waves, Physics & Semiconductor Revolution
  {
    id: 'q_marconi_radio',
    scientist_id: 'sci_marconi',
    question_text: 'Guglielmo Marconi achieved worldwide fame in 1901 by transmitting the first transatlantic wireless radio signal using which code?',
    option_a: 'Baudot Binary Teleprinter Code',
    option_b: 'Morse Code (Letter "S" - three dots)',
    option_c: 'ASCII 7-bit Character Set',
    option_d: 'Gray Reflex Code',
    option_e: 'Huffman Compressed Packet',
    correct_option: 'B',
    round_number: 2,
    difficulty: 'medium',
    question_order: 0,
    active: true,
  },
  {
    id: 'q_einstein_photoelectric',
    scientist_id: 'sci_einstein',
    question_text: 'Albert Einstein was awarded the 1921 Nobel Prize in Physics specifically for his explanation of which physical law, proving light quantization?',
    option_a: 'Law of the Photoelectric Effect',
    option_b: 'General Theory of Gravitation',
    option_c: 'Mass-Energy Equivalence Formula',
    option_d: 'Bose-Einstein Condensation',
    option_e: 'Brownian Motion Diffusion',
    correct_option: 'A',
    round_number: 2,
    difficulty: 'medium',
    question_order: 1,
    active: true,
  },
  {
    id: 'q_shockley_transistor',
    scientist_id: 'sci_shockley',
    question_text: 'At Bell Labs in December 1947, Shockley, Bardeen, and Brattain unveiled what revolutionary device that replaced bulky vacuum tubes?',
    option_a: 'Silicon Solar Cell',
    option_b: 'Bipolar Point-Contact Transistor',
    option_c: 'Integrated Monolithic Chip',
    option_d: 'Field-Effect Tunnel Diode',
    option_e: 'Schottky Barrier Diode',
    correct_option: 'B',
    round_number: 2,
    difficulty: 'medium',
    question_order: 2,
    active: true,
  },
  {
    id: 'q_lamarr_spread_spectrum',
    scientist_id: 'sci_lamarr',
    question_text: 'Hedy Lamarr co-patented a Secret Communication System using a piano roll mechanism to synchronize frequency changes. What technology did this originate?',
    option_a: 'Frequency-Hopping Spread Spectrum (FHSS)',
    option_b: 'Amplitude Modulated Radio',
    option_c: 'Fiber Optic Total Internal Reflection',
    option_d: 'Satellite Microwave Relaying',
    option_e: 'Phase Shift Keying Modulation',
    correct_option: 'A',
    round_number: 2,
    difficulty: 'hard',
    question_order: 3,
    active: true,
  },
  {
    id: 'q_tesla_coil',
    scientist_id: 'sci_tesla',
    question_text: 'Nikola Tesla patented an electrical resonant transformer circuit in 1891 capable of generating high-voltage, high-frequency AC electricity. What is it named?',
    option_a: 'Van de Graaff Generator',
    option_b: 'Wimshurst Static Machine',
    option_c: 'Tesla Coil',
    option_d: 'Cockcroft-Walton Voltage Multiplier',
    option_e: 'Marx Impulse Generator',
    correct_option: 'C',
    round_number: 2,
    difficulty: 'easy',
    question_order: 4,
    active: true,
  },

  // ROUND 3: Computing, Algorithms & The Digital Age
  {
    id: 'q_turing_machine',
    scientist_id: 'sci_turing',
    question_text: 'In his landmark 1936 paper, what theoretical mathematical model did Alan Turing formulate that serves as the foundation of modern computer architecture?',
    option_a: 'Von Neumann Architecture Bus',
    option_b: 'Universal Turing Machine (UTM)',
    option_c: 'Lambda Calculus Evaluator',
    option_d: 'Finite State Moore Automaton',
    option_e: 'Petri Net Synchronization Graph',
    correct_option: 'B',
    round_number: 3,
    difficulty: 'hard',
    question_order: 0,
    active: true,
  },
  {
    id: 'q_lovelace_algorithm',
    scientist_id: 'sci_lovelace',
    question_text: 'Ada Lovelace published Note G in 1843 containing an algorithm to compute which mathematical sequence, widely considered the world’s first computer program?',
    option_a: 'Fibonacci Series',
    option_b: 'Bernoulli Numbers',
    option_c: 'Mersenne Prime Numbers',
    option_d: 'Euler-Mascheroni Constants',
    option_e: 'Taylor Series Polynomials',
    correct_option: 'B',
    round_number: 3,
    difficulty: 'hard',
    question_order: 1,
    active: true,
  },
  {
    id: 'q_berners_lee_web',
    scientist_id: 'sci_berners_lee',
    question_text: 'While working at CERN in 1989, Tim Berners-Lee created three foundational technologies that launched the World Wide Web. Which of the following was NOT one of them?',
    option_a: 'HTML (HyperText Markup Language)',
    option_b: 'HTTP (HyperText Transfer Protocol)',
    option_c: 'URI/URL (Uniform Resource Identifier)',
    option_d: 'TCP/IP (Transmission Control Protocol / Internet Protocol)',
    option_e: 'WorldWideWeb (First WYSIWYG Web Browser & Editor)',
    correct_option: 'D',
    round_number: 3,
    difficulty: 'hard',
    question_order: 2,
    active: true,
  },
  {
    id: 'q_turing_enigma',
    scientist_id: 'sci_turing',
    question_text: 'At Bletchley Park during World War II, what electromechanical decryption machine did Alan Turing and Gordon Welchman design to break Enigma ciphers?',
    option_a: 'The Colossus Mk 1',
    option_b: 'The Bombe',
    option_c: 'The ENIAC Integrator',
    option_d: 'The Manchester Mark 1',
    option_e: 'The Z3 Relay Computer',
    correct_option: 'B',
    round_number: 3,
    difficulty: 'medium',
    question_order: 3,
    active: true,
  },
  {
    id: 'q_edison_phonograph',
    scientist_id: 'sci_edison',
    question_text: 'In 1877, Thomas Edison startled the scientific community by recording and playing back "Mary had a little lamb" on tinfoil wrapped around a cylinder. What was this machine?',
    option_a: 'Magnetic Tape Deck',
    option_b: 'Dictaphone Microgroove',
    option_c: 'Phonograph',
    option_d: 'Audion Valve Synthesizer',
    option_e: 'Electrostatic Wire Recorder',
    correct_option: 'C',
    round_number: 3,
    difficulty: 'easy',
    question_order: 4,
    active: true,
  },
];

// 5. Components
const components = [
  {
    id: 'comp_555_timer',
    name: 'NE555 Precision Timer IC',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    description: 'Iconic 8-pin integrated circuit designed by Hans Camenzind in 1971 for precision timing pulses, delays, and oscillators.',
    category: 'Integrated Circuit',
    active: true,
  },
  {
    id: 'comp_microcontroller',
    name: 'ATmega328P Microcontroller',
    image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80',
    description: 'High performance 8-bit AVR RISC microcontroller powering embedded symposium robotics and IoT systems.',
    category: 'Processor',
    active: true,
  },
  {
    id: 'comp_photodiode',
    name: 'Silicon PIN Photodiode',
    image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80',
    description: 'Semiconductor p–n junction that converts optical photons into electric current via Einstein’s photoelectric principle.',
    category: 'Optoelectronics',
    active: true,
  },
  {
    id: 'comp_opamp',
    name: 'LM741 Operational Amplifier',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    description: 'High gain differential voltage amplifier with internal frequency compensation used for analog mathematical computation.',
    category: 'Analog IC',
    active: true,
  },
  {
    id: 'comp_logic_gate',
    name: '74HC08 Quad 2-Input AND Gate',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    description: 'High-speed CMOS logic integrated circuit implementing foundational Boolean binary decision architecture.',
    category: 'Digital Logic',
    active: true,
  },
];

// 6. Winners
const winners = [
  {
    id: 'win_1',
    position: 1,
    team_name: 'Binary Titans',
    participant_name: 'Alex Rivera & Sarah Chen',
    score: 950,
    completion_time: '02:45',
  },
  {
    id: 'win_2',
    position: 2,
    team_name: 'Quantum Circuit',
    participant_name: 'David Kumar & Priya Sharma',
    score: 880,
    completion_time: '03:10',
  },
  {
    id: 'win_3',
    position: 3,
    team_name: 'Logic Pioneers',
    participant_name: 'Marcus Vance & Elena Rostova',
    score: 810,
    completion_time: '03:22',
  },
  {
    id: 'win_4',
    position: 4,
    team_name: 'Silicon Sparks',
    participant_name: 'Liam Zhang & Chloe Dubois',
    score: 740,
    completion_time: '03:40',
  },
];

async function seedFirestore() {
  console.log('\n=============================================================');
  console.log('🔥 BINARIES FIRESTORE IDEMPOTENT SEED / MIGRATION');
  console.log(`Target Project: ${projectId}`);
  console.log('=============================================================\n');

  const batch = db.batch();

  // 1. Admin User
  console.log('1. Seeding Admin User...');
  const adminRef = db.collection('admin_users').doc(adminUser.id);
  batch.set(adminRef, adminUser, { merge: true });
  console.log(`   ✔ Admin [${adminUser.email}] queued.`);

  // 2. Game Settings
  console.log('2. Seeding Game Settings...');
  const settingsRef = db.collection('game_settings').doc(gameSettings.id);
  batch.set(settingsRef, gameSettings, { merge: true });
  console.log(`   ✔ Settings [${gameSettings.event_name}] queued.`);

  // 3. Scientists
  console.log(`3. Seeding ${scientists.length} Scientists...`);
  for (const sci of scientists) {
    const sciRef = db.collection('scientists').doc(sci.id);
    batch.set(
      sciRef,
      {
        ...sci,
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );
  }
  console.log(`   ✔ Queued ${scientists.length} Scientists.`);

  // 4. Questions
  console.log(`4. Seeding ${questions.length} Questions...`);
  for (const q of questions) {
    const qRef = db.collection('questions').doc(q.id);
    batch.set(
      qRef,
      {
        ...q,
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );
  }
  console.log(`   ✔ Queued ${questions.length} Questions (5 options each).`);

  // 5. Components
  console.log(`5. Seeding ${components.length} Components...`);
  for (const c of components) {
    const cRef = db.collection('components').doc(c.id);
    batch.set(
      cRef,
      {
        ...c,
        created_at: now,
      },
      { merge: true }
    );
  }
  console.log(`   ✔ Queued ${components.length} Components.`);

  // 6. Winners
  console.log(`6. Seeding ${winners.length} Winners...`);
  for (const w of winners) {
    const wRef = db.collection('winners').doc(w.id);
    batch.set(
      wRef,
      {
        ...w,
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );
  }
  console.log(`   ✔ Queued ${winners.length} Winners.`);

  console.log('\nCommitting atomic batch write to Firestore...');
  await batch.commit();

  console.log('\n🎉 FIRESTORE SEED COMPLETED SUCCESSFULLY!');
  console.log('Summary of seeded collections:');
  console.log(`  - admin_users: 1 (${adminUser.email})`);
  console.log(`  - game_settings: 1 (${gameSettings.event_name})`);
  console.log(`  - scientists: ${scientists.length}`);
  console.log(`  - questions: ${questions.length}`);
  console.log(`  - components: ${components.length}`);
  console.log(`  - winners: ${winners.length}`);
  console.log('All documents seeded with stable keys using { merge: true } idempotency.\n');
}

seedFirestore().catch((err) => {
  console.error('\n❌ Firestore Seed encountered an error:', err);
  process.exit(1);
});
