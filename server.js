import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'client/dist')));

// Simple password hashing (instead of bcrypt which causes issues)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const comparePassword = (password, hash) => {
  return hashPassword(password) === hash;
};

// Simple JWT implementation (instead of jsonwebtoken)
const generateToken = (data) => {
  return Buffer.from(JSON.stringify({ ...data, iat: Date.now() })).toString('base64');
};

const verifyToken = (token) => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
  } catch (e) {
    return null;
  }
};

const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Database error:', err);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Users table error:', err);
  });

  // Admin users table
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Admin users table error:', err);
  });

  // Conversations table
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      messages TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Conversations table error:', err);
  });

  // Support tickets table
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_name TEXT,
      email TEXT,
      subject TEXT,
      message TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Tickets table error:', err);
  });

  // Appointments table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_name TEXT,
      email TEXT,
      phone TEXT,
      service TEXT,
      date TEXT,
      time TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Appointments table error:', err);
  });

  // Analytics table
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      event_type TEXT,
      user_id TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Analytics table error:', err);
  });
});

// ============== HELPER FUNCTIONS ==============

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });

  req.user = decoded;
  next();
};

const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

function buildFallbackAssistantReply(message) {
  const lower = message.toLowerCase();

  if (lower.includes('stress') || lower.includes('anxiety') || lower.includes('mental')) {
    return "Stress and anxiety can improve with structured routines, sleep support, therapy, and supportive habits. I recommend our Therapy & Counseling and Life Coaching services.";
  }

  if (lower.includes('product') || lower.includes('brand') || lower.includes('wellness')) {
    return "Mosaic Wellness offers four core brands: Man Matters (men's health), Be Bodywise (women's wellness), Little Joys (children), and Root Labs (Ayurveda).";
  }

  if (lower.includes('therapy') || lower.includes('counseling')) {
    return "We offer individual, family, couples, and group therapy sessions. You can book through the support section.";
  }

  if (lower.includes('book') || lower.includes('appointment')) {
    return "You can book a consultation through the support section. Tell me your needs and I can help you choose the right service.";
  }

  return "Mosaic Wellness can help with wellness products, therapy, coaching, and lifestyle support. What's your concern?";
}

// ============== USER AUTHENTICATION ==============

app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = uuidv4();
    const passwordHash = hashPassword(password);

    db.run(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, name, email, passwordHash],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Email already registered' });
          }
          console.error('Registration error:', err);
          return res.status(500).json({ error: 'Registration failed' });
        }

        const token = generateToken({ userId, email, role: 'user' });
        res.json({ userId, name, email, token });
      }
    );
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = comparePassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({ userId: user.id, email: user.email, role: user.role });
      res.json({ userId: user.id, name: user.name, email: user.email, token });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== ADMIN AUTHENTICATION ==============

app.post('/api/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;

    db.get('SELECT * FROM admin_users WHERE email = ?', [email], (err, admin) => {
      if (err || !admin) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      const isValid = comparePassword(password, admin.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      const token = generateToken({ adminId: admin.id, email: admin.email, role: 'admin' });
      res.json({ adminId: admin.id, name: admin.name, email: admin.email, token });
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create default admin if not exists
app.post('/api/admin/init', (req, res) => {
  const adminId = uuidv4();
  const passwordHash = hashPassword('admin123');

  db.run(
    'INSERT OR IGNORE INTO admin_users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [adminId, 'Admin', 'admin@mosaicwellness.in', passwordHash],
    (err) => {
      if (err) {
        console.error('Init error:', err);
        return res.status(500).json({ error: 'Failed to initialize admin' });
      }
      res.json({ message: 'Admin initialized. Email: admin@mosaicwellness.in, Password: admin123' });
    }
  );
});

// ============== AI CHAT ==============

app.post('/api/chat', authMiddleware, (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const convId = conversationId || uuidv4();

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Log analytics
    db.run('INSERT INTO analytics (id, event_type, user_id) VALUES (?, ?, ?)', [
      uuidv4(),
      'chat_message',
      req.user.userId,
    ], (err) => {
      if (err) console.error('Analytics error:', err);
    });

    const fallback = buildFallbackAssistantReply(message);
    const conversationMessages = [
      { role: 'user', content: message },
      { role: 'assistant', content: fallback },
    ];

    db.run(
      'INSERT OR REPLACE INTO conversations (id, user_id, type, messages, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [convId, req.user.userId, 'ai_chat', JSON.stringify(conversationMessages)],
      (err) => {
        if (err) console.error('Conversation error:', err);
      }
    );

    res.json({
      conversationId: convId,
      message: fallback,
      role: 'assistant',
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// ============== SUPPORT TICKETS ==============

app.post('/api/support/ticket', authMiddleware, (req, res) => {
  try {
    const { customerName, email, subject, message } = req.body;
    const ticketId = uuidv4();

    db.run(
      'INSERT INTO tickets (id, user_id, customer_name, email, subject, message) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketId, req.user.userId, customerName, email, subject, message],
      (err) => {
        if (err) {
          console.error('Ticket creation error:', err);
          return res.status(500).json({ error: 'Failed to create ticket' });
        }

        db.run('INSERT INTO analytics (id, event_type, user_id) VALUES (?, ?, ?)', [
          uuidv4(),
          'support_ticket',
          req.user.userId,
        ]);

        res.json({ ticketId, status: 'open', message: 'Ticket created successfully' });
      }
    );
  } catch (error) {
    console.error('Support ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/support/tickets', authMiddleware, (req, res) => {
  db.all('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId], (err, rows) => {
    if (err) {
      console.error('Tickets query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// ============== APPOINTMENTS ==============

app.post('/api/appointments', authMiddleware, (req, res) => {
  try {
    const { customerName, email, phone, service, date, time, notes } = req.body;
    const appointmentId = uuidv4();

    db.run(
      'INSERT INTO appointments (id, user_id, customer_name, email, phone, service, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [appointmentId, req.user.userId, customerName, email, phone, service, date, time, notes || ''],
      (err) => {
        if (err) {
          console.error('Appointment creation error:', err);
          return res.status(500).json({ error: 'Failed to book appointment' });
        }

        db.run('INSERT INTO analytics (id, event_type, user_id) VALUES (?, ?, ?)', [
          uuidv4(),
          'appointment_booked',
          req.user.userId,
        ]);

        res.json({ appointmentId, status: 'pending', message: 'Appointment booked successfully' });
      }
    );
  } catch (error) {
    console.error('Appointment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/appointments', authMiddleware, (req, res) => {
  db.all('SELECT * FROM appointments WHERE user_id = ? ORDER BY date DESC', [req.user.userId], (err, rows) => {
    if (err) {
      console.error('Appointments query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

// ============== DATA ENDPOINTS ==============

app.get('/api/services', (req, res) => {
  const services = [
    {
      id: 1,
      title: 'Therapy & Counseling',
      description: 'Individual, family, couples, and group counseling with licensed therapists.',
      icon: '💬',
    },
    {
      id: 2,
      title: 'Life Coaching',
      description: 'Personalized coaching for personal and professional growth.',
      icon: '🎯',
    },
    {
      id: 3,
      title: 'Classes & Support Groups',
      description: 'Supportive group sessions covering relationships, emotional regulation, and resilience.',
      icon: '📚',
    },
    {
      id: 4,
      title: 'Integrative Care',
      description: 'Nutrition, yoga therapy, acupuncture, and lifestyle coaching support.',
      icon: '🧘',
    },
  ];
  res.json(services);
});

app.get('/api/products', (req, res) => {
  const products = [
    {
      name: 'Man Matters',
      category: "Men's Wellness",
      description: 'Hair care, sexual wellness, fitness, and mental wellbeing.',
      icon: '👨‍⚕️',
      features: ['Hair support', 'Fitness guidance', 'Sexual wellness', 'Mental wellbeing'],
    },
    {
      name: 'Be Bodywise',
      category: "Women's Wellness",
      description: 'Evidence-based solutions for skin, hair, hormone health, and vitality.',
      icon: '👩‍⚕️',
      features: ['Skin care', 'Hair solutions', 'PCOS support', 'Women\'s wellness'],
    },
    {
      name: 'Little Joys',
      category: "Children's Wellness",
      description: 'Expert-developed products for child growth, immunity, and routines.',
      icon: '👶',
      features: ['Immunity support', 'Growth care', 'Routine health', 'Child wellbeing'],
    },
    {
      name: 'Root Labs',
      category: 'Ayurveda',
      description: 'Modern Ayurvedic remedies blending tradition with science.',
      icon: '🌿',
      features: ['Herbal care', 'Holistic support', 'Daily wellness', 'Balance'],
    },
  ];
  res.json(products);
});

// ============== ADMIN ROUTES ==============

app.get('/api/admin/dashboard', adminMiddleware, (req, res) => {
  const stats = {
    totalUsers: 0,
    totalAppointments: 0,
    openTickets: 0,
    totalRevenue: 0,
  };

  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (!err && row) stats.totalUsers = row.count;
  });

  db.get('SELECT COUNT(*) as count FROM appointments', (err, row) => {
    if (!err && row) stats.totalAppointments = row.count;
  });

  db.get("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'", (err, row) => {
    if (!err && row) stats.openTickets = row.count;
  });

  setTimeout(() => res.json(stats), 100);
});

app.get('/api/admin/tickets', adminMiddleware, (req, res) => {
  db.all('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100', (err, rows) => {
    if (err) {
      console.error('Admin tickets error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

app.patch('/api/admin/ticket/:id', adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status, response, priority } = req.body;

    db.run(
      'UPDATE tickets SET status = ?, response = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status || 'open', response || '', priority || 'medium', id],
      (err) => {
        if (err) {
          console.error('Ticket update error:', err);
          return res.status(500).json({ error: 'Failed to update ticket' });
        }
        res.json({ message: 'Ticket updated' });
      }
    );
  } catch (error) {
    console.error('Ticket patch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/appointments', adminMiddleware, (req, res) => {
  db.all('SELECT * FROM appointments ORDER BY date DESC LIMIT 100', (err, rows) => {
    if (err) {
      console.error('Admin appointments error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

app.patch('/api/admin/appointment/:id', adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status || 'pending', id], (err) => {
      if (err) {
        console.error('Appointment update error:', err);
        return res.status(500).json({ error: 'Failed to update appointment' });
      }
      res.json({ message: 'Appointment updated' });
    });
  } catch (error) {
    console.error('Appointment patch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users', adminMiddleware, (req, res) => {
  db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 100', (err, rows) => {
    if (err) {
      console.error('Admin users error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

app.get('/api/admin/analytics', adminMiddleware, (req, res) => {
  db.all(
    'SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type ORDER BY count DESC',
    (err, rows) => {
      if (err) {
        console.error('Analytics error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows || []);
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mosaic Wellness API is running' });
});

// Serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Frontend not built. Run: cd client && npm run build' });
    }
  });
});

app.listen(PORT, () => {
  console.log('\n🌿 ============================================');
  console.log('   Mosaic Wellness Server Started');
  console.log('============================================');
  console.log(`\n✅ Server running on: http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`🏥 API Health: http://localhost:${PORT}/api/health`);
  console.log('\n💻 Frontend will load on: http://localhost:5173');
  console.log('\n🌿 ============================================\n');
});

export default app;
