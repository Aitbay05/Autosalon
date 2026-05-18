const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
const UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME_TO_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const UPLOAD_PROVIDER = String(process.env.UPLOAD_PROVIDER || 'local').toLowerCase();
const wantsCloudinary = UPLOAD_PROVIDER === 'cloudinary';
const hasCloudinaryCredentials = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
const useCloudinary = wantsCloudinary && hasCloudinaryCredentials;
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

function getFileExtension(file) {
  const originalName = typeof file.originalname === 'string' ? file.originalname : '';
  const originalExt = path.extname(originalName).toLowerCase();
  if (UPLOAD_EXTENSIONS.has(originalExt)) return originalExt;
  return MIME_TO_EXTENSION[file.mimetype] || null;
}

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sanitizeBaseName(fileName) {
  const baseName = path.basename(fileName || 'image', path.extname(fileName || ''));
  const normalized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return normalized || 'image';
}

function fileFilter(_req, file, cb) {
  const extension = getFileExtension(file);
  const hasAllowedMimeType = !file.mimetype || UPLOAD_MIME_TYPES.has(file.mimetype);

  if (extension && hasAllowedMimeType) {
    cb(null, true);
    return;
  }

  const err = new Error('Тек JPG, PNG, WebP немесе GIF файлдарын жүктеуге болады');
  err.status = 400;
  cb(err);
}

// ─── Cloudinary баптау ───────────────────────────────────────────────────────
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  ensureUploadDir();
}

const storage = useCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'autoprime',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
      },
    })
  : multer.diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadDir();
        cb(null, UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const extension = getFileExtension(file) || '.jpg';
        const baseName = sanitizeBaseName(file.originalname);
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        cb(null, `${uniqueSuffix}-${baseName}${extension}`);
      },
    });

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES },
});
const uploadSingleImage = upload.single('file');

// ─── Auth ────────────────────────────────────────────────────────────────────
const validTokens = new Set();
const ADMIN_USER     = process.env.ADMIN_USER     || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ─── PostgreSQL ──────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL көрсетілмеген. Render Postgres connection string-ті Environment Variables ішіне қосыңыз.');
  process.exit(1);
}

const poolConfig = { connectionString: DATABASE_URL };
if (process.env.DATABASE_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);
pool.on('error', (err) => console.error('PostgreSQL pool error:', err));

// ─── Default деректер ────────────────────────────────────────────────────────
const defaultCars = [
  {
    brand: 'Toyota', model: 'Camry 3.5', year: 2024, price: 18500000,
    mileage: 0, fuel: 'Бензин', transmission: 'Автомат', drive: 'Алдыңғы',
    color: 'Ақ', body: 'Седан', engine: '3.5L V6', power: '249 а.к.',
    status: 'Жаңа',
    description: 'Toyota Camry — сенімділік пен жайлылықтың үйлесімі.',
    features: ['Cruise Control', 'Lane Assist', 'Камера', 'Жылытылатын орындықтар', 'Apple CarPlay'],
    images: [],
  },
  {
    brand: 'Hyundai', model: 'Tucson Premium', year: 2024, price: 16200000,
    mileage: 0, fuel: 'Бензин', transmission: 'Автомат', drive: '4x4',
    color: 'Күміс', body: 'Кроссовер', engine: '2.0L', power: '150 а.к.',
    status: 'Жаңа',
    description: 'Hyundai Tucson — заманауи дизайн, технология және үнемдеу.',
    features: ['Панорамалық шатыр', 'Blind Spot', 'Автопарковка', 'Жылытылатын руль', 'Android Auto'],
    images: [],
  },
  {
    brand: 'BMW', model: 'X5 xDrive40i', year: 2023, price: 48900000,
    mileage: 15000, fuel: 'Бензин', transmission: 'Автомат', drive: '4x4',
    color: 'Қара', body: 'Кроссовер', engine: '3.0L Turbo', power: '340 а.к.',
    status: 'Қолданылған',
    description: 'BMW X5 — люкс сегменттің ең үздік өкілі.',
    features: ['Harman Kardon', 'Massaj орындықтар', 'Ambient жарықтандыру', 'Head-Up Display', 'Parking Assistant Pro'],
    images: [],
  },
  {
    brand: 'Kia', model: 'Sportage', year: 2024, price: 14800000,
    mileage: 0, fuel: 'Бензин', transmission: 'Автомат', drive: 'Алдыңғы',
    color: 'Қызыл', body: 'Кроссовер', engine: '2.0L', power: '150 а.к.',
    status: 'Жаңа',
    description: 'Kia Sportage — стильді дизайн мен заманауи технологиялар.',
    features: ['KRELL дыбыс жүйесі', 'Drive Mode', 'Smart Key', 'USB-C зарядтау', 'Rear Camera'],
    images: [],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToCar(row) {
  return {
    id: Number(row.id),
    brand: row.brand, model: row.model,
    year: Number(row.year), price: Number(row.price), mileage: Number(row.mileage),
    fuel: row.fuel, transmission: row.transmission, drive: row.drive,
    color: row.color, body: row.body, engine: row.engine, power: row.power,
    status: row.status, description: row.description,
    features: parseJsonArray(row.features),
    images: parseJsonArray(row.images),
  };
}

function rowToTestDrive(row) {
  return {
    id: Number(row.id), name: row.name, phone: row.phone, email: row.email,
    carId: row.car_id == null ? null : Number(row.car_id),
    carName: row.car_name, date: row.date, time: row.time, status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function normalizeCarPayload(body) {
  return {
    brand: body.brand, model: body.model, year: body.year, price: body.price,
    mileage: body.mileage || 0, fuel: body.fuel, transmission: body.transmission,
    drive: body.drive, color: body.color, bodyType: body.body,
    engine: body.engine, power: body.power, status: body.status,
    description: body.description,
    features: JSON.stringify(Array.isArray(body.features) ? body.features : []),
    images:   JSON.stringify(Array.isArray(body.images)   ? body.images   : []),
  };
}

function asyncHandler(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'DB error' });
    });
}

// ─── DB init ─────────────────────────────────────────────────────────────────
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY, brand TEXT, model TEXT, year INTEGER, price INTEGER,
      mileage INTEGER, fuel TEXT, transmission TEXT, drive TEXT, color TEXT,
      body TEXT, engine TEXT, power TEXT, status TEXT, description TEXT,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      images   JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS testdrives (
      id SERIAL PRIMARY KEY, name TEXT, phone TEXT, email TEXT,
      car_id INTEGER REFERENCES cars(id) ON DELETE SET NULL,
      car_name TEXT, date TEXT, time TEXT, status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const seedResult = await pool.query(
    'SELECT value FROM app_meta WHERE key = $1', ['default_seed_completed']
  );
  if (!seedResult.rows.length) {
    for (const car of defaultCars) {
      await pool.query(
        `INSERT INTO cars
          (brand,model,year,price,mileage,fuel,transmission,drive,color,body,engine,power,status,description,features,images)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb)`,
        [car.brand, car.model, car.year, car.price, car.mileage, car.fuel,
         car.transmission, car.drive, car.color, car.body, car.engine, car.power,
         car.status, car.description, JSON.stringify(car.features), JSON.stringify(car.images)]
      );
    }
    await pool.query(
      `INSERT INTO app_meta (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
      ['default_seed_completed', new Date().toISOString()]
    );
  }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  if (!validTokens.has(token)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─── Auth routes ─────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Логин немесе пароль қате' });
  }
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  validTokens.add(token);
  res.json({ token });
});

// ─── Upload route ─────────────────────────────────────────────────────────────
app.post('/api/upload', authenticate, (req, res) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл өлшемі 15 МБ-тан аспауы керек' });
      }
      return res.status(err.status || 500).json({ error: err.message || 'Файлды жүктеу мүмкін болмады' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл таңдалмады' });
    }

    const url = useCloudinary
      ? (req.file.path || req.file.secure_url)
      : `/uploads/${req.file.filename}`;

    res.json({ url });
  });
});

// ─── Cars routes ──────────────────────────────────────────────────────────────
app.get('/api/cars', asyncHandler(async (req, res) => {
  const { status, body, search } = req.query;
  const { rows } = await pool.query('SELECT * FROM cars ORDER BY id DESC');
  let result = rows.map(rowToCar);
  if (status && status !== 'Барлығы') result = result.filter((c) => c.status === status);
  if (body   && body   !== 'Барлығы') result = result.filter((c) => c.body   === body);
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter((c) => `${c.brand} ${c.model}`.toLowerCase().includes(q));
  }
  res.json(result);
}));

app.get('/api/cars/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM cars WHERE id = $1', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'Табылмады' });
  res.json(rowToCar(rows[0]));
}));

app.post('/api/cars', authenticate, asyncHandler(async (req, res) => {
  const d = normalizeCarPayload(req.body);
  const { rows } = await pool.query(
    `INSERT INTO cars (brand,model,year,price,mileage,fuel,transmission,drive,color,body,engine,power,status,description,features,images)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb) RETURNING *`,
    [d.brand,d.model,d.year,d.price,d.mileage,d.fuel,d.transmission,d.drive,d.color,d.bodyType,d.engine,d.power,d.status,d.description,d.features,d.images]
  );
  res.status(201).json(rowToCar(rows[0]));
}));

app.put('/api/cars/:id', authenticate, asyncHandler(async (req, res) => {
  const d = normalizeCarPayload(req.body);
  const { rows } = await pool.query(
    `UPDATE cars SET brand=$1,model=$2,year=$3,price=$4,mileage=$5,fuel=$6,transmission=$7,
     drive=$8,color=$9,body=$10,engine=$11,power=$12,status=$13,description=$14,features=$15::jsonb,images=$16::jsonb
     WHERE id=$17 RETURNING *`,
    [d.brand,d.model,d.year,d.price,d.mileage,d.fuel,d.transmission,d.drive,d.color,d.bodyType,d.engine,d.power,d.status,d.description,d.features,d.images,Number(req.params.id)]
  );
  if (!rows.length) return res.status(404).json({ error: 'Табылмады' });
  res.json(rowToCar(rows[0]));
}));

app.delete('/api/cars/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('DELETE FROM cars WHERE id=$1 RETURNING id', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'Табылмады' });
  res.json({ success: true });
}));

// ─── Test-drive routes ────────────────────────────────────────────────────────
app.get('/api/testdrives', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM testdrives ORDER BY created_at DESC, id DESC');
  res.json(rows.map(rowToTestDrive));
}));

app.post('/api/testdrives', asyncHandler(async (req, res) => {
  const carId = Number.isNaN(Number(req.body.carId)) ? null : Number(req.body.carId);
  let carName = 'Белгісіз';
  if (carId !== null) {
    const { rows } = await pool.query('SELECT brand, model FROM cars WHERE id=$1', [carId]);
    if (rows.length) carName = `${rows[0].brand} ${rows[0].model}`;
  }
  const { rows } = await pool.query(
    `INSERT INTO testdrives (name,phone,email,car_id,car_name,date,time,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.body.name,req.body.phone,req.body.email,carId,carName,req.body.date,req.body.time,'Күтуде']
  );
  res.status(201).json(rowToTestDrive(rows[0]));
}));

app.put('/api/testdrives/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE testdrives SET status=$1 WHERE id=$2 RETURNING *',
    [req.body.status, Number(req.params.id)]
  );
  if (!rows.length) return res.status(404).json({ error: 'Табылмады' });
  res.json(rowToTestDrive(rows[0]));
}));

app.delete('/api/testdrives/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('DELETE FROM testdrives WHERE id=$1 RETURNING id', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'Табылмады' });
  res.json({ success: true });
}));

// ─── Stats ────────────────────────────────────────────────────────────────────
app.get('/api/stats', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM cars)                              AS "totalCars",
      (SELECT COUNT(*)::int FROM cars WHERE status='Жаңа')         AS "newCars",
      (SELECT COUNT(*)::int FROM cars WHERE status='Қолданылған')  AS "usedCars",
      (SELECT COUNT(*)::int FROM testdrives)                       AS "totalTestDrives",
      (SELECT COUNT(*)::int FROM testdrives WHERE status='Күтуде') AS "pendingTestDrives",
      (SELECT COUNT(*)::int FROM testdrives WHERE status='Расталды') AS "confirmedTestDrives"
  `);
  const s = rows[0];
  res.json({
    totalCars:          Number(s.totalCars)          || 0,
    newCars:            Number(s.newCars)            || 0,
    usedCars:           Number(s.usedCars)           || 0,
    totalTestDrives:    Number(s.totalTestDrives)    || 0,
    pendingTestDrives:  Number(s.pendingTestDrives)  || 0,
    confirmedTestDrives:Number(s.confirmedTestDrives)|| 0,
  });
}));

// ─── Pages ────────────────────────────────────────────────────────────────────
app.get('/',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/car/:id',(req, res) => res.sendFile(path.join(__dirname, 'public', 'car.html')));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

async function startServer() {
  await initializeDatabase();

  if (wantsCloudinary && !hasCloudinaryCredentials) {
    console.warn('⚠️  UPLOAD_PROVIDER=cloudinary, бірақ CLOUDINARY env vars толық емес.');
    console.warn(`   Fallback storage: Local disk (${UPLOAD_DIR})`);
  } else if (!useCloudinary) {
    console.warn('⚠️  Cloudinary өшірулі — суреттер жергілікті uploads бумасына сақталады.');
    console.warn(`   Local upload path: ${UPLOAD_DIR}`);
  }

  app.listen(PORT, HOST, () => {
    console.log(`✅ Сервер іске қосылды: http://${HOST}:${PORT}`);
    console.log(`📦 Database: PostgreSQL`);
    console.log(`🖼️  Storage: ${useCloudinary ? 'Cloudinary' : `Local disk (${UPLOAD_DIR})`}`);
  });
}

startServer().catch((err) => {
  console.error('Серверді іске қосу қатесі:', err);
  process.exit(1);
});
