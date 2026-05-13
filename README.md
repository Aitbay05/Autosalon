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
