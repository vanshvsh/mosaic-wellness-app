import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// Database Setup
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  // Conversations table
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT,
      messages TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Support tickets table
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      email TEXT,
      subject TEXT,
      message TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Appointments table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      email TEXT,
      phone TEXT,
      service TEXT,
      date TEXT,
      time TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful AI health and wellness assistant for Mosaic Wellness. 
You assist customers with:
1. Information about our wellness brands: Man Matters (men's health), Be Bodywise (women's health), Little Joys (children's wellness), Root Labs (Ayurveda)
2. Product recommendations based on customer health concerns
3. General wellness advice related to mental health, fitness, nutrition
4. Answering questions about our services including therapy, coaching, and integrative care
5. Helping with appointment booking and customer support

Be empathetic, knowledgeable, and professional. If unsure, offer to connect with a human specialist.`;

// ============== AI ASSISTANT ENDPOINTS ==============

// Chat with AI Assistant
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    // Get or create conversation
    let convId = conversationId || uuidv4();
    let messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    // Retrieve existing conversation
    db.get('SELECT messages FROM conversations WHERE id = ?', [convId], async (err, row) => {
      if (row) {
        try {
          messages = [...messages, ...JSON.parse(row.messages)];
        } catch (e) {
          console.error('Error parsing messages:', e);
        }
      }

      // Add new message
      messages.push({ role: 'user', content: message });

      try {
        // Call OpenAI API
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages.slice(-10), // Keep last 10 messages for context
          temperature: 0.7,
          max_tokens: 500,
        });

        const assistantMessage = response.choices[0].message.content;

        // Save conversation
        const conversationMessages = [
          ...messages.filter(m => m.role !== 'system').slice(-9),
          { role: 'user', content: message },
          { role: 'assistant', content: assistantMessage },
        ];

        db.run(
          'INSERT OR REPLACE INTO conversations (id, type, messages, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [convId, 'ai_chat', JSON.stringify(conversationMessages)],
          (err) => {
            if (err) console.error('DB Error:', err);
          }
        );

        res.json({
          conversationId: convId,
          message: assistantMessage,
          role: 'assistant',
        });
      } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation history
app.get('/api/conversation/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT messages FROM conversations WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (row) {
      res.json({ messages: JSON.parse(row.messages) });
    } else {
      res.json({ messages: [] });
    }
  });
});

// ============== SUPPORT TICKET ENDPOINTS ==============

// Create support ticket
app.post('/api/support/ticket', (req, res) => {
  const { customerName, email, subject, message } = req.body;
  const ticketId = uuidv4();

  db.run(
    'INSERT INTO tickets (id, customer_name, email, subject, message) VALUES (?, ?, ?, ?, ?)',
    [ticketId, customerName, email, subject, message],
    (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to create ticket' });
        return;
      }
      res.json({ ticketId, status: 'open', message: 'Ticket created successfully' });
    }
  );
});

// Get support tickets
app.get('/api/support/tickets', (req, res) => {
  db.all('SELECT * FROM tickets ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(rows);
  });
});

// Update ticket status
app.patch('/api/support/ticket/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run('UPDATE tickets SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to update ticket' });
      return;
    }
    res.json({ message: 'Ticket updated' });
  });
});

// ============== APPOINTMENT ENDPOINTS ==============

// Book appointment
app.post('/api/appointments', (req, res) => {
  const { customerName, email, phone, service, date, time, notes } = req.body;
  const appointmentId = uuidv4();

  db.run(
    'INSERT INTO appointments (id, customer_name, email, phone, service, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [appointmentId, customerName, email, phone, service, date, time, notes],
    (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to book appointment' });
        return;
      }
      res.json({ appointmentId, status: 'pending', message: 'Appointment booked successfully' });
    }
  );
});

// Get appointments
app.get('/api/appointments', (req, res) => {
  db.all('SELECT * FROM appointments ORDER BY date DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(rows);
  });
});

// ============== PRODUCT DATA ==============

app.get('/api/products', (req, res) => {
  const products = [
    {
      id: 1,
      name: 'Man Matters',
      category: "Men's Health",
      description: 'Complete men\'s wellness solutions including hair care, sexual wellness, fitness, and mental health.',
      image: '👨‍⚕️',
      features: ['Hair Loss Treatment', 'Sexual Wellness', 'Fitness Programs', 'Mental Health Support'],
      launched: 2020,
    },
    {
      id: 2,
      name: 'Be Bodywise',
      category: "Women's Health",
      description: 'Science-backed wellness products for women addressing skin, hair, PCOS, and overall health.',
      image: '👩‍⚕️',
      features: ['Skin Care', 'Hair Solutions', 'PCOS Management', 'Women\'s Health'],
      launched: 2021,
    },
    {
      id: 3,
      name: 'Little Joys',
      category: "Children's Wellness",
      description: 'Safe and effective wellness products for children, approved by parents and experts.',
      image: '👶',
      features: ['Nutrition', 'Immune Support', 'Growth', 'Development'],
      launched: 2024,
    },
    {
      id: 4,
      name: 'Root Labs',
      category: 'Ayurveda',
      description: 'Authentic Indian Ayurvedic wellness solutions bringing ancient wisdom to modern health.',
      image: '🌿',
      features: ['Herbal Remedies', 'Holistic Healing', 'Prevention', 'Balance'],
      launched: 2022,
    },
  ];
  res.json(products);
});

// ============== SERVICES DATA ==============

app.get('/api/services', (req, res) => {
  const services = [
    {
      id: 1,
      name: 'Therapy & Counseling',
      description: 'Individual, family, couples, and group counseling with licensed therapists.',
      icon: '💬',
    },
    {
      id: 2,
      name: 'Life Coaching',
      description: 'Personalized coaching for personal and professional growth.',
      icon: '🎯',
    },
    {
      id: 3,
      name: 'Classes & Support Groups',
      description: 'Workshops on emotional regulation, relationships, anger management, and more.',
      icon: '📚',
    },
    {
      id: 4,
      name: 'Integrative Care',
      description: 'Nutrition, yoga therapy, acupuncture, and lifestyle coaching.',
      icon: '🧘',
    },
  ];
  res.json(services);
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
