const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'binaries.db');
const db = new DatabaseSync(dbPath);

console.log('Initializing BINARIES Symposium Quiz Database at:', dbPath);

// Execute Schema
const schemaPath = path.resolve(__dirname, '../src/lib/db/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// 1. SEED ADMIN USER
const defaultEmail = process.env.ADMIN_EMAIL || 'admin@binaries.com';
const defaultPass = process.env.ADMIN_PASSWORD || 'BinariesAdmin2026!';
const salt = crypto.randomBytes(16).toString('hex');
const passwordHash = crypto.scryptSync(defaultPass, salt, 64).toString('hex');
const now = new Date().toISOString();

const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(defaultEmail);
if (!existingAdmin) {
  db.prepare(`
    INSERT INTO admin_users (id, email, password_hash, salt, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('admin_root', defaultEmail, passwordHash, salt, 'superadmin', now);
  console.log('✔ Default Admin created:', defaultEmail);
}

// 2. SEED GAME SETTINGS
const existingSettings = db.prepare('SELECT id FROM game_settings WHERE id = ?').get('default');
if (!existingSettings) {
  const instructions = `1. Each question is based on a Scientist and their Inventions or Discoveries.
2. Every question contains exactly 5 options (A to E).
3. Exactly ONE option is the correct answer.
4. Select your answer before the timer reaches 0.
5. Once submitted, your response is locked.
6. The symposium quiz features multiple rounds of increasing excitement.
7. Final podium winners will be celebrated on the Winners presentation screen!`;

  db.prepare(`
    INSERT OR REPLACE INTO game_settings (
      id, event_name, timer_duration, current_round, current_question_index,
      total_rounds, questions_per_round, auto_next, answer_reveal, game_status,
      instructions, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('default', 'BINARIES', 20, 1, 0, 4, 5, 0, 1, 'waiting', instructions, now);
  console.log('✔ Default Game Settings seeded.');
}

// 3. SEED SCIENTISTS (20 Mapped Scientists)
const scientists = [
  {
    id: 'sci_tesla',
    name: 'Nikola Tesla',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS71lhaKoUNGa1xA8uroIOq7TLZskX_QYaw4rY-ADJgRx5Vj-Wl2YCT_Iz0sSVYFZNMJLJzeeVklnfq1NsumsbtVySicjpKkk1oZOLa9BU&s=10',
    description: 'Serbian-American engineer and physicist who designed the alternating-current (AC) polyphase system and the AC induction motor.',
    field: 'Electrical & Mechanical Engineering',
    country: 'Serbia / United States',
    year: '1856 – 1943',
  },
  {
    id: 'sci_volta',
    name: 'Alessandro Volta',
    image_url: 'https://cdn.britannica.com/49/147449-050-8B0F9C5F/Alessandro-Volta-two-inventions-electrophorus-battery.jpg?w=400&h=300&c=crop',
    description: 'Italian physicist, chemist, and pioneer of electricity who invented the voltaic pile, the first chemical electric battery.',
    field: 'Physics & Chemistry',
    country: 'Italy',
    year: '1745 – 1827',
  },
  {
    id: 'sci_ohm',
    name: 'Georg Ohm',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Georg_Simon_Ohm_%281789-1854%29.jpg/960px-Georg_Simon_Ohm_%281789-1854%29.jpg',
    description: 'German physicist and mathematician who formulated Ohm’s law, defining the fundamental relationship between voltage, current, and resistance.',
    field: 'Physics & Mathematics',
    country: 'Germany',
    year: '1789 – 1854',
  },
  {
    id: 'sci_henry',
    name: 'Joseph Henry',
    image_url: 'https://encrypted-tbn0.gstatic.com/imagesq=tbn:ANd9GcRkQEHSefLtTERo1JLGt9Mggg4Mhg2Fx5XWjW3pkSWrTUg9r2UDXFml1uuCwtIakc7kVM8dwMB72CJgXN5k3-5l0z_zgiUFoq2ZMakoFw&s=10',
    description: 'American scientist who discovered electromagnetic self-inductance and invented the electrical relay, crucial for telegraphy.',
    field: 'Electromagnetism & Applied Physics',
    country: 'United States',
    year: '1797 – 1878',
  },
  {
    id: 'sci_edison',
    name: 'Thomas Alva Edison',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqpHbVlmuYOE3X7VW_ilDDD1ylm5USJceo0ObOunOLMUc1bLBAOk55CqKHQvH9AYsqKuHyM6XK_W9IahACTfQ2JCXNon2oVNIXKBVgMJs&s=10',
    description: 'Prolific American inventor who developed electric power distribution, the electrical safety fuse, phonograph, and motion picture camera.',
    field: 'Applied Physics & Electrical Engineering',
    country: 'United States',
    year: '1847 – 1931',
  },
  {
    id: 'sci_faraday',
    name: 'Michael Faraday',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRM3r5zLXrwazaYAiovh2C7juswd1_xyaG1mBEgqzn0kJbSsckbxH1sPfxX1FzFINsbfBH2HlEr6EUdJsdfdMxrf-NXm4m-XiKsp5wDJQ&s=10',
    description: 'English scientist who discovered electromagnetic induction, inventing the foundational electric generator and transformer principles.',
    field: 'Electromagnetism & Electrochemistry',
    country: 'United Kingdom',
    year: '1791 – 1867',
  },
  {
    id: 'sci_shockley',
    name: 'William Shockley',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSLa8P2dGBOP17VoZpHutwPkhba-mEK118DeGXDsFnMMvYaVeVg8gPFAp78qh5s3iUWbqqYTjR4Lw3bEaN6Jf5vNyBXApJKerO7POukQ&s=10',
    description: 'American physicist and inventor who led the Bell Labs team that invented the point-contact and junction transistor.',
    field: 'Solid-State Physics & Semiconductors',
    country: 'United States',
    year: '1910 – 1989',
  },
  {
    id: 'sci_kilby',
    name: 'Jack Kilby',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaMdXBRncY_fZzcL-MaQSTf211ues0-sRQkLyh8rjHRgbwoEkxUbwv_4sHI-QUh0AE4QTU69b9yztcY3_sTuTeIF2meQsa26FEVZpx168&s=10',
    description: 'American electrical engineer at Texas Instruments who realized and patented the world’s first integrated circuit (IC) in 1958.',
    field: 'Electrical Engineering & Microelectronics',
    country: 'United States',
    year: '1923 – 2005',
  },
  {
    id: 'sci_thomson',
    name: 'Elihu Thomson',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Elihu_thomson_ca1880.png',
    description: 'English-born American electrical engineer whose patents on electrical generating equipment and arc lighting built General Electric.',
    field: 'Electrical Engineering & Arc Lighting',
    country: 'United Kingdom / United States',
    year: '1853 – 1937',
  },
  {
    id: 'sci_joule',
    name: 'James Prescott Joule',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLSbv0_ebi9bUGImFiUWifE6dpgBUZsQvgmDAXrTKhZ_sEQuuc7-tYQZInB4ZI5g3-c9Udaima-eOwm3xh8MvT0Ttrm05CCKc3U0zyf2I&s=10',
    description: 'English physicist who established the mechanical equivalent of heat and formulated Joule’s first law of electrical heating.',
    field: 'Thermodynamics & Electrical Physics',
    country: 'United Kingdom',
    year: '1818 – 1889',
  },
  {
    id: 'sci_fleming',
    name: 'John Ambrose Fleming',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/John_Ambrose_Fleming.jpg/800px-John_Ambrose_Fleming.jpg',
    description: 'English electrical engineer and physicist who invented the thermionic valve (vacuum tube diode), enabling electronic radio reception.',
    field: 'Electrical Engineering & Thermionics',
    country: 'United Kingdom',
    year: '1849 – 1945',
  },
  {
    id: 'sci_de_forest',
    name: 'Lee De Forest',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Lee_De_Forest.jpg',
    description: 'American inventor who created the Audion vacuum tube triode, making signal amplification, broadcasting, and long-distance telephone possible.',
    field: 'Electronics & Radio Technology',
    country: 'United States',
    year: '1873 – 1961',
  },
  {
    id: 'sci_armstrong',
    name: 'Edwin Armstrong',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Edwin_Armstrong.jpg/800px-Edwin_Armstrong.jpg',
    description: 'Pioneering electrical engineer who developed FM radio broadcasting, the regenerative circuit, and the superheterodyne receiver.',
    field: 'Electrical Engineering & Telecommunications',
    country: 'United States',
    year: '1890 – 1954',
  },
  {
    id: 'sci_franklin',
    name: 'Benjamin Franklin',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/BenFranklinDuplessis.jpg',
    description: 'American polymath who conducted seminal electrical experiments, characterized positive and negative charge, and invented the lightning rod.',
    field: 'Natural Philosophy & Electricity',
    country: 'United States',
    year: '1706 – 1790',
  },
  {
    id: 'sci_hertz',
    name: 'Heinrich Hertz',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Heinrich_Rudolf_Hertz.jpg/800px-Heinrich_Rudolf_Hertz.jpg',
    description: 'German physicist who experimentally proved the existence of electromagnetic waves and invented the first dipole antenna.',
    field: 'Electromagnetism & Experimental Physics',
    country: 'Germany',
    year: '1857 – 1894',
  },
  {
    id: 'sci_noyce',
    name: 'Robert Noyce',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Robert_Noyce_in_1959.jpg/800px-Robert_Noyce_in_1959.jpg',
    description: 'Co-founder of Fairchild Semiconductor and Intel who invented the planar silicon monolithic integrated circuit.',
    field: 'Semiconductor Physics & Microelectronics',
    country: 'United States',
    year: '1927 – 1990',
  },
  {
    id: 'sci_westinghouse',
    name: 'George Westinghouse',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/George_Westinghouse.jpg/800px-George_Westinghouse.jpg',
    description: 'American entrepreneur and engineer who invented the railway air brake and built the industrial infrastructure for alternating current power.',
    field: 'Mechanical & Electrical Engineering',
    country: 'United States',
    year: '1846 – 1914',
  },
  {
    id: 'sci_holonyak',
    name: 'Nick Holonyak',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Nick_Holonyak_Jr._in_2004.jpg',
    description: 'American engineer and educator at General Electric who invented the first practical visible-spectrum (red) light-emitting diode (LED) in 1962.',
    field: 'Optoelectronics & Semiconductor Lasers',
    country: 'United States',
    year: '1928 – 2022',
  },
  {
    id: 'sci_babbage',
    name: 'Charles Babbage',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Charles_Babbage_-_1860.jpg/800px-Charles_Babbage_-_1860.jpg',
    description: 'English mathematician and mechanical engineer known as the "father of computing" for conceiving the mechanical Analytical Engine.',
    field: 'Mechanical Computing & Mathematics',
    country: 'United Kingdom',
    year: '1791 – 1871',
  },
  {
    id: 'sci_steinmetz',
    name: 'Charles Proteus Steinmetz',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Charles_Proteus_Steinmetz.jpg/800px-Charles_Proteus_Steinmetz.jpg',
    description: 'German-born American mathematician and electrical engineer whose phasor representation and mathematical analysis made AC power commercialization possible.',
    field: 'Electrical Engineering & Applied Mathematics',
    country: 'Germany / United States',
    year: '1865 – 1923',
  },
];

db.exec('DELETE FROM scientists WHERE id NOT IN (' + scientists.map(s => `'${s.id}'`).join(',') + ')');

const insertScientist = db.prepare(`
  INSERT OR REPLACE INTO scientists (id, name, image_url, description, field, country, year, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

scientists.forEach((s) => {
  insertScientist.run(s.id, s.name, s.image_url, s.description, s.field, s.country, s.year, now, now);
});
console.log(`✔ Seeded ${scientists.length} Scientists.`);

// 4. SEED QUIZ QUESTIONS (EXACTLY 5 OPTIONS, EXACTLY 1 CORRECT)
const questions = [
  // -------------------------------------------------------------
  // ROUND 1: Electrical Pioneers & Fundamentals (Questions 1 - 5)
  // -------------------------------------------------------------
  {
    id: 'q_tesla_induction',
    scientist_id: 'sci_tesla',
    question_text: 'Nikola Tesla Invention?',
    option_a: 'Transformer',
    option_b: 'Induction motor',
    option_c: 'DC Motor',
    option_d: 'Synchronous Generator',
    option_e: 'Arc Lamp',
    correct_option: 'B',
    round_number: 1,
    difficulty: 'easy',
    question_order: 0,
  },
  {
    id: 'q_volta_battery',
    scientist_id: 'sci_volta',
    question_text: 'Alessandro Volta Invention?',
    option_a: 'Battery',
    option_b: 'Capacitor',
    option_c: 'Resistor',
    option_d: 'Electromagnet',
    option_e: 'Telegraph',
    correct_option: 'A',
    round_number: 1,
    difficulty: 'easy',
    question_order: 1,
  },
  {
    id: 'q_ohm_law',
    scientist_id: 'sci_ohm',
    question_text: 'Georg Ohm Invention / Discovery?',
    option_a: "Kirchhoff's Laws",
    option_b: "Faraday's Law",
    option_c: "Ohm's law",
    option_d: "Lenz's Law",
    option_e: "Maxwell's Equations",
    correct_option: 'C',
    round_number: 1,
    difficulty: 'easy',
    question_order: 2,
  },
  {
    id: 'q_henry_relay',
    scientist_id: 'sci_henry',
    question_text: 'Joseph Henry Invention?',
    option_a: 'Telegraph',
    option_b: 'Battery',
    option_c: 'Transformer',
    option_d: 'Vacuum Tube',
    option_e: 'Relay',
    correct_option: 'E',
    round_number: 1,
    difficulty: 'medium',
    question_order: 3,
  },
  {
    id: 'q_edison_fuse',
    scientist_id: 'sci_edison',
    question_text: 'Thomas Alva Edison Invention?',
    option_a: 'Circuit Breaker',
    option_b: 'Relay',
    option_c: 'Switch',
    option_d: 'Fuse',
    option_e: 'Isolator',
    correct_option: 'D',
    round_number: 1,
    difficulty: 'easy',
    question_order: 4,
  },

  // -------------------------------------------------------------
  // ROUND 2: Generation, Semiconductors & Heating (Questions 6 - 10)
  // -------------------------------------------------------------
  {
    id: 'q_faraday_generator',
    scientist_id: 'sci_faraday',
    question_text: 'Michael Faraday Invention?',
    option_a: 'Electric Generator',
    option_b: 'Alternator',
    option_c: 'Transformer',
    option_d: 'Inductor',
    option_e: 'Cathode Ray Tube',
    correct_option: 'A',
    round_number: 2,
    difficulty: 'easy',
    question_order: 0,
  },
  {
    id: 'q_shockley_transistor',
    scientist_id: 'sci_shockley',
    question_text: 'William Shockley Invention?',
    option_a: 'Diode',
    option_b: 'Integrated Circuit',
    option_c: 'Transistor',
    option_d: 'Microprocessor',
    option_e: 'Vacuum Tube',
    correct_option: 'C',
    round_number: 2,
    difficulty: 'medium',
    question_order: 1,
  },
  {
    id: 'q_kilby_ic',
    scientist_id: 'sci_kilby',
    question_text: 'Jack Kilby Invention?',
    option_a: 'PCB',
    option_b: 'IC (Integrated Circuit)',
    option_c: 'Microcontroller',
    option_d: 'Transistor',
    option_e: 'Breadboard',
    correct_option: 'B',
    round_number: 2,
    difficulty: 'medium',
    question_order: 2,
  },
  {
    id: 'q_thomson_generating_equipment',
    scientist_id: 'sci_thomson',
    question_text: 'Elihu Thomson Invention?',
    option_a: 'AC Motor',
    option_b: 'Battery',
    option_c: 'Electric Meter',
    option_d: 'Electrical Generating Equipment',
    option_e: 'Transformer',
    correct_option: 'D',
    round_number: 2,
    difficulty: 'medium',
    question_order: 3,
  },
  {
    id: 'q_joule_heating',
    scientist_id: 'sci_joule',
    question_text: 'James Prescott Joule Invention / Discovery?',
    option_a: 'Electrical Cooling',
    option_b: 'Electromagnetism',
    option_c: 'Electroplating',
    option_d: 'Thermocouple',
    option_e: 'Electrical Heating',
    correct_option: 'E',
    round_number: 2,
    difficulty: 'easy',
    question_order: 4,
  },

  // -------------------------------------------------------------
  // ROUND 3: Thermionics, Valves & Waves (Questions 11 - 15)
  // -------------------------------------------------------------
  {
    id: 'q_fleming_vacuum_tube',
    scientist_id: 'sci_fleming',
    question_text: 'John Ambrose Fleming Invention?',
    option_a: 'Triode',
    option_b: 'Vacuum Tube (Thermionic Valve)',
    option_c: 'Transistor',
    option_d: 'Capacitor',
    option_e: 'Inductor',
    correct_option: 'B',
    round_number: 3,
    difficulty: 'medium',
    question_order: 0,
  },
  {
    id: 'q_de_forest_triode',
    scientist_id: 'sci_de_forest',
    question_text: 'Lee De Forest Invention?',
    option_a: 'Triode (Audion)',
    option_b: 'Magnetron',
    option_c: 'Klystron',
    option_d: 'Pentode',
    option_e: 'Cathode Ray Tube',
    correct_option: 'A',
    round_number: 3,
    difficulty: 'medium',
    question_order: 1,
  },
  {
    id: 'q_armstrong_fm_radio',
    scientist_id: 'sci_armstrong',
    question_text: 'Edwin Armstrong Invention?',
    option_a: 'AM Radio',
    option_b: 'Television',
    option_c: 'FM Radio',
    option_d: 'Radar',
    option_e: 'Telegraph',
    correct_option: 'C',
    round_number: 3,
    difficulty: 'medium',
    question_order: 2,
  },
  {
    id: 'q_franklin_lightning_rod',
    scientist_id: 'sci_franklin',
    question_text: 'Benjamin Franklin Invention?',
    option_a: 'Battery',
    option_b: 'Leyden Jar',
    option_c: 'Electrometer',
    option_d: 'Lightning Rod',
    option_e: 'Kite Antenna',
    correct_option: 'D',
    round_number: 3,
    difficulty: 'easy',
    question_order: 3,
  },
  {
    id: 'q_hertz_dipole_antenna',
    scientist_id: 'sci_hertz',
    question_text: 'Heinrich Hertz Invention?',
    option_a: 'Parabolic Antenna',
    option_b: 'Yagi-Uda Antenna',
    option_c: 'Loop Antenna',
    option_d: 'Monopole Antenna',
    option_e: 'Dipole Antenna',
    correct_option: 'E',
    round_number: 3,
    difficulty: 'medium',
    question_order: 4,
  },

  // -------------------------------------------------------------
  // ROUND 4: Silicon, Transport, Optoelectronics & Computing (Questions 16 - 20)
  // -------------------------------------------------------------
  {
    id: 'q_noyce_monolithic_ic',
    scientist_id: 'sci_noyce',
    question_text: 'Robert Noyce Invention?',
    option_a: 'Monolithic IC (Silicon)',
    option_b: 'Germanium IC',
    option_c: 'Microprocessor',
    option_d: 'CMOS',
    option_e: 'FinFET',
    correct_option: 'A',
    round_number: 4,
    difficulty: 'hard',
    question_order: 0,
  },
  {
    id: 'q_westinghouse_air_brake',
    scientist_id: 'sci_westinghouse',
    question_text: 'George Westinghouse Invention?',
    option_a: 'AC Transformer',
    option_b: 'Railway Air Brake',
    option_c: 'Dynamo',
    option_d: 'Electric Locomotive',
    option_e: 'Steam Engine',
    correct_option: 'B',
    round_number: 4,
    difficulty: 'medium',
    question_order: 1,
  },
  {
    id: 'q_holonyak_visible_red_led',
    scientist_id: 'sci_holonyak',
    question_text: 'Nick Holonyak Invention?',
    option_a: 'Blue LED',
    option_b: 'OLED',
    option_c: 'Visible Red LED',
    option_d: 'LCD',
    option_e: 'Plasma Display',
    correct_option: 'C',
    round_number: 4,
    difficulty: 'medium',
    question_order: 2,
  },
  {
    id: 'q_babbage_analytical_engine',
    scientist_id: 'sci_babbage',
    question_text: 'Charles Babbage Invention?',
    option_a: 'ENIAC',
    option_b: 'Turing Machine',
    option_c: 'Pascaline',
    option_d: 'Analytical Engine',
    option_e: 'Abacus',
    correct_option: 'D',
    round_number: 4,
    difficulty: 'easy',
    question_order: 3,
  },
  {
    id: 'q_steinmetz_phasor_ac',
    scientist_id: 'sci_steinmetz',
    question_text: 'Charles Proteus Steinmetz Theory / Development?',
    option_a: 'Phasor representation of AC',
    option_b: 'DC Motor Commutation',
    option_c: 'Skin Effect',
    option_d: 'Dielectric Breakdown',
    option_e: 'Eddy Currents',
    correct_option: 'A',
    round_number: 4,
    difficulty: 'hard',
    question_order: 4,
  },
];

db.exec('DELETE FROM questions WHERE id NOT IN (' + questions.map(q => `'${q.id}'`).join(',') + ')');

const insertQuestion = db.prepare(`
  INSERT OR REPLACE INTO questions (
    id, scientist_id, question_text, option_a, option_b, option_c, option_d, option_e,
    correct_option, round_number, difficulty, question_order, active, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

questions.forEach((q) => {
  insertQuestion.run(
    q.id,
    q.scientist_id,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.option_e,
    q.correct_option,
    q.round_number,
    q.difficulty,
    q.question_order,
    1,
    now,
    now
  );
});
console.log(`✔ Seeded ${questions.length} Questions (5 options each).`);

// 5. SEED COMPONENTS (SUPPORTING / REFERENCE DATA)
const components = [
  {
    id: 'comp_555_timer',
    name: 'NE555 Precision Timer IC',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    description: 'Iconic 8-pin integrated circuit designed by Hans Camenzind in 1971 for precision timing pulses, delays, and oscillators.',
    category: 'Integrated Circuit',
  },
  {
    id: 'comp_microcontroller',
    name: 'ATmega328P Microcontroller',
    image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80',
    description: 'High performance 8-bit AVR RISC microcontroller powering embedded symposium robotics and IoT systems.',
    category: 'Processor',
  },
  {
    id: 'comp_photodiode',
    name: 'Silicon PIN Photodiode',
    image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80',
    description: 'Semiconductor p–n junction that converts optical photons into electric current via Einstein’s photoelectric principle.',
    category: 'Optoelectronics',
  },
  {
    id: 'comp_opamp',
    name: 'LM741 Operational Amplifier',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    description: 'High gain differential voltage amplifier with internal frequency compensation used for analog mathematical computation.',
    category: 'Analog IC',
  },
  {
    id: 'comp_logic_gate',
    name: '74HC08 Quad 2-Input AND Gate',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    description: 'High-speed CMOS logic integrated circuit implementing foundational Boolean binary decision architecture.',
    category: 'Digital Logic',
  }
];

const insertComponent = db.prepare(`
  INSERT OR REPLACE INTO components (id, name, image_url, description, category, active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

components.forEach((c) => {
  insertComponent.run(c.id, c.name, c.image_url, c.description, c.category, 1, now);
});
console.log(`✔ Seeded ${components.length} Electronic Components.`);

// 6. SEED WINNERS PODIUM
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
  }
];

const insertWinner = db.prepare(`
  INSERT OR REPLACE INTO winners (id, position, team_name, participant_name, score, completion_time, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

winners.forEach((w) => {
  insertWinner.run(w.id, w.position, w.team_name, w.participant_name, w.score, w.completion_time, now, now);
});
console.log(`✔ Seeded ${winners.length} Winners.`);

console.log('Database seeding completed successfully!');
