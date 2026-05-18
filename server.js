const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;

if (DATA_DIR) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_RENDER_UPLOADS_DIR = path.join(os.tmpdir(), 'autosalon-uploads');
const UPLOADS_DIR = DATA_DIR
  ? path.join(DATA_DIR, 'uploads')
  : (process.env.RENDER ? DEFAULT_RENDER_UPLOADS_DIR : path.join(__dirname, 'public', 'uploads'));
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: UPLOADS_DIR });
const validTokens = new Set();
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL көрсетілмеген. Render Postgres connection string-ті Environment Variables ішіне қосыңыз.');
  process.exit(1);
}

const poolConfig = {
  connectionString: DATABASE_URL
};

if (process.env.DATABASE_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

const defaultCars = [
  {
    brand: 'Toyota',
    model: 'Camry 3.5',
    year: 2024,
    price: 18500000,
    mileage: 0,
    fuel: 'Бензин',
    transmission: 'Автомат',
    drive: 'Алдыңғы',
    color: 'Ақ',
    body: 'Седан',
    engine: '3.5L V6',
    power: '249 а.к.',
    status: 'Жаңа',
    description: 'Toyota Camry — сенімділік пен жайлылықтың үйлесімі. Кеңейтілген жабдықтау, қауіпсіздік жүйелері және экономикалық отын шығыны.',
    features: ['Cruise Control', 'Lane Assist', 'Камера', 'Жылытылатын орындықтар', 'Apple CarPlay'],
    images: []
  },
  {
    brand: 'Hyundai',
    model: 'Tucson Premium',
    year: 2024,
    price: 16200000,
    mileage: 0,
    fuel: 'Бензин',
    transmission: 'Автомат',
    drive: '4x4',
    color: 'Күміс',
    body: 'Кроссовер',
    engine: '2.0L',
    power: '150 а.к.',
    status: 'Жаңа',
    description: 'Hyundai Tucson — заманауи дизайн, технология және үнемдеу. Отбасы үшін тамаша таңдау.',
    features: ['Панорамалық шатыр', 'Blind Spot', 'Автопарковка', 'Жылытылатын руль', 'Android Auto'],
    images: []
  },
  {
    brand: 'BMW',
    model: 'X5 xDrive40i',
    year: 2023,
    price: 48900000,
    mileage: 15000,
    fuel: 'Бензин',
    transmission: 'Автомат',
    drive: '4x4',
    color: 'Қара',
    body: 'Кроссовер',
    engine: '3.0L Turbo',
    power: '340 а.к.',
    status: 'Қолданылған',
    description: 'BMW X5 — люкс сегменттің ең үздік өкілі. Динамикалық жүрісі, кеңейтілген салон және спорттық мінез.',
    features: ['Harman Kardon', 'Massaj орындықтар', 'Ambient жарықтандыру', 'Head-Up Display', 'Parking Assistant Pro'],
    images: []
  },
  {
    brand: 'Kia',
    model: 'Sportage',
    year: 2024,
    price: 14800000,
    mileage: 0,
    fuel: 'Бензин',
    transmission: 'Автомат',
    drive: 'Алдыңғы',
    color: 'Қызыл',
    body: 'Кроссовер',
    engine: '2.0L',
    power: '150 а.к.',
    status: 'Жаңа',
    description: 'Kia Sportage — стильді дизайн мен заманауи технологиялар. Жас отбасылар үшін ең тиімді таңдау.',
    features: ['KRELL дыбыс жүйесі', 'Drive Mode', 'Smart Key', 'USB-C зарядтау', 'Rear Camera'],
    images: []
  }
];

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function rowToCar(row) {
  return {
    id: Number(row.id),
    brand: row.brand,
    model: row.model,
    year: Number(row.year),
    price: Number(row.price),
    mileage: Number(row.mileage),
    fuel: row.fuel,
    transmission: row.transmission,
    drive: row.drive,
    color: row.color,
    body: row.body,
    engine: row.engine,
    power: row.power,
    status: row.status,
    description: row.description,
    features: parseJsonArray(row.features),
    images: parseJsonArray(row.images)
  };
}

function rowToTestDrive(row) {
  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    carId: row.car_id == null ? null : Number(row.car_id),
    carName: row.car_name,
    date: row.date,
    time: row.time,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function normalizeCarPayload(body) {
  return {
    brand: body.brand,
    model: body.model,
    year: body.year,
    price: body.price,
    mileage: body.mileage || 0,
    fuel: body.fuel,
    transmission: body.transmission,
    drive: body.drive,
    color: body.color,
    bodyType: body.body,
    engine: body.engine,
    power: body.power,
    status: body.status,
    description: body.description,
    features: JSON.stringify(Array.isArray(body.features) ? body.features : []),
    images: JSON.stringify(Array.isArray(body.images) ? body.images : [])
  };
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'DB error' });
      }
    });
  };
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY,
      brand TEXT,
      model TEXT,
      year INTEGER,
      price INTEGER,
      mileage INTEGER,
      fuel TEXT,
      transmission TEXT,
      drive TEXT,
      color TEXT,
      body TEXT,
      engine TEXT,
      power TEXT,
      status TEXT,
      description TEXT,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      images JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS testdrives (
      id SERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      car_id INTEGER REFERENCES cars(id) ON DELETE SET NULL,
      car_name TEXT,
      date TEXT,
      time TEXT,
      status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const seedResult = await pool.query(
    'SELECT value FROM app_meta WHERE key = $1',
    ['default_seed_completed']
  );

  if (!seedResult.rows.length) {
    for (const car of defaultCars) {
      await pool.query(
        `INSERT INTO cars (
          brand, model, year, price, mileage, fuel, transmission, drive, color, body, engine, power, status, description, features, images
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb
        )`,
        [
          car.brand,
          car.model,
          car.year,
          car.price,
          car.mileage,
          car.fuel,
          car.transmission,
          car.drive,
          car.color,
          car.body,
          car.engine,
          car.power,
          car.status,
          car.description,
          JSON.stringify(car.features),
          JSON.stringify(car.images)
        ]
      );
    }

    await pool.query(
      `INSERT INTO app_meta (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['default_seed_completed', new Date().toISOString()]
    );
  }
}

app.use('/uploads', express.static(UPLOADS_DIR));

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Логин немесе пароль қате' });
  }

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  validTokens.add(token);
  res.json({ token });
});

app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл таңдалмады' });
  }

  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.get('/api/cars', asyncHandler(async (req, res) => {
  const { status, body, search } = req.query;
  const { rows } = await pool.query('SELECT * FROM cars ORDER BY id DESC');

  let result = rows.map(rowToCar);
  if (status && status !== 'Барлығы') result = result.filter((car) => car.status === status);
  if (body && body !== 'Барлығы') result = result.filter((car) => car.body === body);
  if (search) {
    const lowerSearch = String(search).toLowerCase();
    result = result.filter((car) => `${car.brand} ${car.model}`.toLowerCase().includes(lowerSearch));
  }

  res.json(result);
}));

app.get('/api/cars/:id', asyncHandler(async (req, res) => {
  const carId = Number(req.params.id);
  const result = await pool.query('SELECT * FROM cars WHERE id = $1', [carId]);

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Табылмады' });
  }

  res.json(rowToCar(result.rows[0]));
}));

app.post('/api/cars', authenticate, asyncHandler(async (req, res) => {
  const data = normalizeCarPayload(req.body);
  const result = await pool.query(
    `INSERT INTO cars (
      brand, model, year, price, mileage, fuel, transmission, drive, color, body, engine, power, status, description, features, images
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb
    )
    RETURNING *`,
    [
      data.brand,
      data.model,
      data.year,
      data.price,
      data.mileage,
      data.fuel,
      data.transmission,
      data.drive,
      data.color,
      data.bodyType,
      data.engine,
      data.power,
      data.status,
      data.description,
      data.features,
      data.images
    ]
  );

  res.status(201).json(rowToCar(result.rows[0]));
}));

app.put('/api/cars/:id', authenticate, asyncHandler(async (req, res) => {
  const carId = Number(req.params.id);
  const data = normalizeCarPayload(req.body);
  const result = await pool.query(
    `UPDATE cars SET
      brand = $1,
      model = $2,
      year = $3,
      price = $4,
      mileage = $5,
      fuel = $6,
      transmission = $7,
      drive = $8,
      color = $9,
      body = $10,
      engine = $11,
      power = $12,
      status = $13,
      description = $14,
      features = $15::jsonb,
      images = $16::jsonb
    WHERE id = $17
    RETURNING *`,
    [
      data.brand,
      data.model,
      data.year,
      data.price,
      data.mileage,
      data.fuel,
      data.transmission,
      data.drive,
      data.color,
      data.bodyType,
      data.engine,
      data.power,
      data.status,
      data.description,
      data.features,
      data.images,
      carId
    ]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Табылмады' });
  }

  res.json(rowToCar(result.rows[0]));
}));

app.delete('/api/cars/:id', authenticate, asyncHandler(async (req, res) => {
  const carId = Number(req.params.id);
  const result = await pool.query('DELETE FROM cars WHERE id = $1 RETURNING id', [carId]);

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Табылмады' });
  }

  res.json({ success: true });
}));

app.get('/api/testdrives', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM testdrives ORDER BY created_at DESC, id DESC');
  res.json(rows.map(rowToTestDrive));
}));

app.post('/api/testdrives', asyncHandler(async (req, res) => {
  const carId = Number.isNaN(Number(req.body.carId)) ? null : Number(req.body.carId);
  let carName = 'Белгісіз';

  if (carId !== null) {
    const carResult = await pool.query('SELECT brand, model FROM cars WHERE id = $1', [carId]);
    if (carResult.rows.length) {
      carName = `${carResult.rows[0].brand} ${carResult.rows[0].model}`;
    }
  }

  const result = await pool.query(
    `INSERT INTO testdrives (name, phone, email, car_id, car_name, date, time, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      req.body.name,
      req.body.phone,
      req.body.email,
      carId,
      carName,
      req.body.date,
      req.body.time,
      'Күтуде'
    ]
  );

  res.status(201).json(rowToTestDrive(result.rows[0]));
}));

app.put('/api/testdrives/:id', authenticate, asyncHandler(async (req, res) => {
  const tdId = Number(req.params.id);
  const result = await pool.query(
    'UPDATE testdrives SET status = $1 WHERE id = $2 RETURNING *',
    [req.body.status, tdId]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Табылмады' });
  }

  res.json(rowToTestDrive(result.rows[0]));
}));

app.delete('/api/testdrives/:id', authenticate, asyncHandler(async (req, res) => {
  const tdId = Number(req.params.id);
  const result = await pool.query('DELETE FROM testdrives WHERE id = $1 RETURNING id', [tdId]);

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Табылмады' });
  }

  res.json({ success: true });
}));

app.get('/api/stats', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM cars) AS "totalCars",
      (SELECT COUNT(*)::int FROM cars WHERE status = 'Жаңа') AS "newCars",
      (SELECT COUNT(*)::int FROM cars WHERE status = 'Қолданылған') AS "usedCars",
      (SELECT COUNT(*)::int FROM testdrives) AS "totalTestDrives",
      (SELECT COUNT(*)::int FROM testdrives WHERE status = 'Күтуде') AS "pendingTestDrives",
      (SELECT COUNT(*)::int FROM testdrives WHERE status = 'Расталды') AS "confirmedTestDrives"
  `);

  const stats = rows[0];
  res.json({
    totalCars: Number(stats.totalCars) || 0,
    newCars: Number(stats.newCars) || 0,
    usedCars: Number(stats.usedCars) || 0,
    totalTestDrives: Number(stats.totalTestDrives) || 0,
    pendingTestDrives: Number(stats.pendingTestDrives) || 0,
    confirmedTestDrives: Number(stats.confirmedTestDrives) || 0
  });
}));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/car/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'car.html')));

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

if (process.env.RENDER && !process.env.DATA_DIR) {
  console.warn(`DATA_DIR көрсетілмеген. Uploads уақытша бумаға сақталады: ${DEFAULT_RENDER_UPLOADS_DIR}.`);
  console.warn('Postgres дерегі сақталады, бірақ жүктелген суреттер deploy/restart сайын жоғалмауы үшін persistent disk қосып, DATA_DIR орнатыңыз.');
}

async function startServer() {
  await initializeDatabase();

  let dbHost = 'unknown';
  try {
    dbHost = new URL(DATABASE_URL).host;
  } catch (error) {
    dbHost = 'invalid-url';
  }

  app.listen(PORT, HOST, () => {
    console.log(`Сервер іске қосылды: http://${HOST}:${PORT}`);
    console.log(`Database: PostgreSQL (${dbHost})`);
    console.log(`Uploads path: ${UPLOADS_DIR}`);
  });
}

startServer().catch((err) => {
  console.error('Серверді іске қосу қатесі:', err);
  process.exit(1);
});
