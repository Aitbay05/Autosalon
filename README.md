# 🚗 AutoPrime — Автосалон Веб-сайты

## Жоба құрылымы

```
autosalon/
├── server.js          ← Node.js + Express backend
├── package.json
└── public/
    ├── index.html     ← Негізгі сайт (каталог)
    ├── car.html       ← Жеке автомобиль беті
    └── admin.html     ← Админ панелі
```

## Іске қосу

### 1. Тәуелділіктерді орнату
```bash
npm install
```

### 2. Серверді іске қосу
```bash
node server.js
```

### 3. Браузерде ашу
- **Сайт:** http://localhost:3000
- **Админ:** http://localhost:3000/admin
- **Жеке авто:** http://localhost:3000/car/1

---

## Render-де дерек жоғалмауы үшін

Бұл жоба енді негізгі деректерді `Render PostgreSQL` ішінде сақтайды. Автомобильдер, өтінімдер және админ енгізген өзгерістер `DATABASE_URL` арқылы Postgres-ке жазылады. Local filesystem тек жүктелген суреттер үшін қолданылады.

### Міндетті баптау

1. Render ішінен `Postgres` жасаңыз.
2. Web service Environment Variables ішіне `DATABASE_URL` қосыңыз.
3. Егер сурет жүктеу қолданылса, `Persistent Disk` қосыңыз.
4. Disk `Mount Path` ретінде `/var/data` көрсетіңіз.
5. Environment Variables ішінде `DATA_DIR=/var/data` орнатыңыз.
6. Қайта deploy жасаңыз.

Сервер `DATABASE_URL` болмаса іске қосылмайды. `DATA_DIR` көрсетілмесе де Render ішінде `/var/data` әдепкі жолы қолданылады, бірақ суреттер сақталуы үшін disk дәл сол жолға mount етілуі керек.

### Маңызды ескерту

- Postgres деректері persistent disk-ке тәуелді емес, олар Render Postgres ішінде сақталады.
- Persistent disk тек uploads сияқты файлдарды сақтау үшін керек.
- `public/uploads/` емес, Render-де `/var/data/uploads` қолданылады.

### Ұсынылатын Render env vars

```env
DATABASE_URL=postgresql://...
DATA_DIR=/var/data
ADMIN_USER=admin
ADMIN_PASSWORD=strong-password
```

---

## API маршруттары

### Автомобильдер
| Метод | URL | Сипаттама |
|-------|-----|-----------|
| GET | /api/cars | Барлық автомобильдер |
| GET | /api/cars/:id | Бір автомобиль |
| POST | /api/cars | Жаңа қосу |
| PUT | /api/cars/:id | Өзгерту |
| DELETE | /api/cars/:id | Жою |

### Тест-драйв
| Метод | URL | Сипаттама |
|-------|-----|-----------|
| GET | /api/testdrives | Барлық өтінімдер |
| POST | /api/testdrives | Жаңа жазылу |
| PUT | /api/testdrives/:id | Статус өзгерту |
| DELETE | /api/testdrives/:id | Жою |

### Статистика
| Метод | URL | Сипаттама |
|-------|-----|-----------|
| GET | /api/stats | Жалпы статистика |

---

## Болашақта қосуға болатындар
- MongoDB/PostgreSQL мәліметтер базасы
- JWT авторизация (админ кіру)
- Фото жүктеу (multer)
- SMS хабарлама (тест-драйв растау)
"# Autosalon"  
