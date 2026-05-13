const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;
if (DATA_DIR) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = DATA_DIR
  ? path.join(DATA_DIR, 'uploads')
  : path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({ dest: UPLOADS_DIR });
const validTokens = new Set();
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const DB_PATH = DATA_DIR
  ? path.join(DATA_DIR, 'data.db')
  : path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

function parseJsonArray(value) {
  if (!value) return [];
  try { return JSON.parse(value); } catch (e) { return []; }
}

function rowToCar(row) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    price: row.price,
    mileage: row.mileage,
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
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    carId: row.carId,
    carName: row.carName,
    date: row.date,
    time: row.time,
    status: row.status,
    createdAt: row.createdAt
  };
}

function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      features TEXT,
      images TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS testdrives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      email TEXT,
      carId INTEGER,
      carName TEXT,
      date TEXT,
      time TEXT,
      status TEXT,
      createdAt TEXT
    )`);

    db.get('SELECT COUNT(*) AS count FROM cars', (err, row) => {
      if (err) return console.error('DB init error:', err);
      if (row.count === 0) {
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

        const stmt = db.prepare(`INSERT INTO cars (
          brand, model, year, price, mileage, fuel, transmission, drive, color, body, engine, power, status, description, features, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        defaultCars.forEach(car => {
          stmt.run(
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
          );
        });

        stmt.finalize();
      }
    });
  });
}

initializeDatabase();

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

app.get('/api/cars', (req, res) => {
  const { status, body, search } = req.query;
  db.all('SELECT * FROM cars', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    let result = rows.map(rowToCar);
    if (status && status !== 'Барлығы') result = result.filter(c => c.status === status);
    if (body && body !== 'Барлығы') result = result.filter(c => c.body === body);
    if (search) result = result.filter(c => `${c.brand} ${c.model}`.toLowerCase().includes(search.toLowerCase()));
    res.json(result);
  });
});

app.get('/api/cars/:id', (req, res) => {
  const carId = parseInt(req.params.id);
  db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Табылмады' });
    res.json(rowToCar(row));
  });
});

app.post('/api/cars', authenticate, (req, res) => {
  const data = {
    brand: req.body.brand,
    model: req.body.model,
    year: req.body.year,
    price: req.body.price,
    mileage: req.body.mileage || 0,
    fuel: req.body.fuel,
    transmission: req.body.transmission,
    drive: req.body.drive,
    color: req.body.color,
    body: req.body.body,
    engine: req.body.engine,
    power: req.body.power,
    status: req.body.status,
    description: req.body.description,
    features: JSON.stringify(Array.isArray(req.body.features) ? req.body.features : []),
    images: JSON.stringify(Array.isArray(req.body.images) ? req.body.images : [])
  };
  const stmt = db.prepare(`INSERT INTO cars (
    brand, model, year, price, mileage, fuel, transmission, drive, color, body, engine, power, status, description, features, images
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(
    data.brand,
    data.model,
    data.year,
    data.price,
    data.mileage,
    data.fuel,
    data.transmission,
    data.drive,
    data.color,
    data.body,
    data.engine,
    data.power,
    data.status,
    data.description,
    data.features,
    data.images,
    function(err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.status(201).json({ id: this.lastID, ...req.body, features: parseJsonArray(data.features), images: parseJsonArray(data.images) });
    }
  );
  stmt.finalize();
});

app.put('/api/cars/:id', authenticate, (req, res) => {
  const carId = parseInt(req.params.id);
  const data = {
    brand: req.body.brand,
    model: req.body.model,
    year: req.body.year,
    price: req.body.price,
    mileage: req.body.mileage || 0,
    fuel: req.body.fuel,
    transmission: req.body.transmission,
    drive: req.body.drive,
    color: req.body.color,
    body: req.body.body,
    engine: req.body.engine,
    power: req.body.power,
    status: req.body.status,
    description: req.body.description,
    features: JSON.stringify(Array.isArray(req.body.features) ? req.body.features : []),
    images: JSON.stringify(Array.isArray(req.body.images) ? req.body.images : [])
  };
  db.run(`UPDATE cars SET
    brand = ?, model = ?, year = ?, price = ?, mileage = ?, fuel = ?, transmission = ?, drive = ?, color = ?, body = ?, engine = ?, power = ?, status = ?, description = ?, features = ?, images = ?
    WHERE id = ?`, [
      data.brand,
      data.model,
      data.year,
      data.price,
      data.mileage,
      data.fuel,
      data.transmission,
      data.drive,
      data.color,
      data.body,
      data.engine,
      data.power,
      data.status,
      data.description,
      data.features,
      data.images,
      carId
    ], function(err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!this.changes) return res.status(404).json({ error: 'Табылмады' });
      db.get('SELECT * FROM cars WHERE id = ?', [carId], (err2, row) => {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.json(rowToCar(row));
      });
    }
  );
});

app.delete('/api/cars/:id', authenticate, (req, res) => {
  const carId = parseInt(req.params.id);
  db.run('DELETE FROM cars WHERE id = ?', [carId], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!this.changes) return res.status(404).json({ error: 'Табылмады' });
    res.json({ success: true });
  });
});

// ========== TEST DRIVE ROUTES ==========
app.get('/api/testdrives', (req, res) => {
  db.all('SELECT * FROM testdrives', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows.map(rowToTestDrive));
  });
});

app.post('/api/testdrives', (req, res) => {
  const carId = parseInt(req.body.carId);
  db.get('SELECT brand, model FROM cars WHERE id = ?', [carId], (err, car) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const carName = car ? `${car.brand} ${car.model}` : 'Белгісіз';
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`INSERT INTO testdrives (name, phone, email, carId, carName, date, time, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      req.body.name,
      req.body.phone,
      req.body.email,
      carId,
      carName,
      req.body.date,
      req.body.time,
      'Күтуде',
      createdAt,
      function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.status(201).json({
          id: this.lastID,
          name: req.body.name,
          phone: req.body.phone,
          email: req.body.email,
          carId,
          carName,
          date: req.body.date,
          time: req.body.time,
          status: 'Күтуде',
          createdAt
        });
      }
    );
    stmt.finalize();
  });
});

app.put('/api/testdrives/:id', authenticate, (req, res) => {
  const tdId = parseInt(req.params.id);
  db.run('UPDATE testdrives SET status = ? WHERE id = ?', [req.body.status, tdId], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!this.changes) return res.status(404).json({ error: 'Табылмады' });
    db.get('SELECT * FROM testdrives WHERE id = ?', [tdId], (err2, row) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      if (!row) return res.status(404).json({ error: 'Табылмады' });
      res.json(rowToTestDrive(row));
    });
  });
});

app.delete('/api/testdrives/:id', authenticate, (req, res) => {
  const tdId = parseInt(req.params.id);
  db.run('DELETE FROM testdrives WHERE id = ?', [tdId], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!this.changes) return res.status(404).json({ error: 'Табылмады' });
    res.json({ success: true });
  });
});

// ========== STATS ==========
app.get('/api/stats', (req, res) => {
  db.get(`SELECT
    COUNT(*) AS totalCars,
    SUM(CASE WHEN status = 'Жаңа' THEN 1 ELSE 0 END) AS newCars,
    SUM(CASE WHEN status = 'Қолданылған' THEN 1 ELSE 0 END) AS usedCars
    FROM cars`, (err, carStats) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    db.get('SELECT COUNT(*) AS totalTestDrives FROM testdrives', (err2, tdStats) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      db.get("SELECT COUNT(*) AS pendingTestDrives FROM testdrives WHERE status = 'Күтуде'", (err3, pendingStats) => {
        if (err3) return res.status(500).json({ error: 'DB error' });
        db.get("SELECT COUNT(*) AS confirmedTestDrives FROM testdrives WHERE status = 'Расталды'", (err4, confirmedStats) => {
          if (err4) return res.status(500).json({ error: 'DB error' });
          res.json({
            totalCars: carStats.totalCars,
            newCars: carStats.newCars || 0,
            usedCars: carStats.usedCars || 0,
            totalTestDrives: tdStats.totalTestDrives,
            pendingTestDrives: pendingStats.pendingTestDrives || 0,
            confirmedTestDrives: confirmedStats.confirmedTestDrives || 0
          });
        });
      });
    });
  });
});

// ========== SERVE HTML ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/car/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'car.html')));

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

if (process.env.RENDER && !DATA_DIR) {
  console.warn('DATA_DIR көрсетілмеген: Render ішінде data.db және uploads уақытша сақталады.');
}

app.listen(PORT, HOST, () => console.log(`Сервер іске қосылды: http://${HOST}:${PORT}`));
