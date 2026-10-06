import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  ChevronRight,
  HeartPulse,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const serviceList = [
  {
    icon: '💬',
    title: 'Therapy & Counseling',
    description: 'Individual, family, couples, and group counseling with licensed therapists.',
  },
  {
    icon: '🏃',
    title: 'Life Coaching',
    description: 'Personalized coaching to help you improve performance and wellbeing.',
  },
  {
    icon: '📚',
    title: 'Classes & Support Groups',
    description: 'Supportive group sessions covering relationships, emotional regulation, patience and resilience.',
  },
  {
    icon: '🧘',
    title: 'Integrative Care',
    description: 'Holistic support with nutrition, yoga therapy, and lifestyle improvement plans.',
  },
];

const productList = [
  {
    icon: '👨‍⚕️',
    name: 'Man Matters',
    category: "Men's Wellness",
    description: 'Hair care, sexual wellness, fitness tracking, and mental well-being designed for modern men.',
  },
  {
    icon: '👩‍⚕️',
    name: 'Be Bodywise',
    category: "Women's Wellness",
    description: 'Evidence-based solutions for skin, hair, hormone health, and everyday vitality.',
  },
  {
    icon: '👶',
    name: 'Little Joys',
    category: "Children's Wellness",
    description: 'Expert-developed wellness products for child growth, immunity, and healthy routines.',
  },
  {
    icon: '🌿',
    name: 'Root Labs',
    category: 'Ayurveda',
    description: 'Modern Ayurvedic remedies that blend tradition with science-backed formulation.',
  },
];

const stats = [
  { label: '10M+', text: 'happy customers' },
  { label: '16M', text: 'orders delivered' },
  { label: '24/7', text: 'customer support' },
  { label: '4', text: 'wellness brands' },
];

const quickPrompts = [
  'Tell me about your wellness products',
  'I need help with stress and anxiety',
  'Book a therapy session for me',
  'Which service is best for my needs?',
];

const initialChat = [
  {
    sender: 'assistant',
    text: 'Hi! I'm Mosaic Wellness AI. I can help with product recommendations, therapy options, support, and booking. Ask me anything!',
  },
];

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(initialChat);
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  
  // Booking state
  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    service: 'Therapy & Counseling',
    date: '',
    time: '',
    notes: '',
  });
  const [bookingStatus, setBookingStatus] = useState('');
  
  // Support ticket state
  const [ticketForm, setTicketForm] = useState({
    customerName: '',
    email: '',
    subject: '',
    message: '',
  });
  const [ticketStatus, setTicketStatus] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serviceRes, productRes] = await Promise.all([
          axios.get(`${API_BASE}/api/services`),
          axios.get(`${API_BASE}/api/products`),
        ]);
        setServices(serviceRes.data);
        setProducts(productRes.data);
      } catch (error) {
        console.error('Error loading app data:', error);
        setServices(serviceList);
        setProducts(productList);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const displayServices = useMemo(() => (services.length ? services : serviceList), [services]);
  const displayProducts = useMemo(() => (products.length ? products : productList), [products]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const mockUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: authMode === 'signup' ? authForm.name : authForm.email.split('@')[0],
      email: authForm.email,
    };
    setUser(mockUser);
    setShowAuth(false);
    setAuthForm({ email: '', password: '', name: '' });
  };

  const handleLogout = () => {
    setUser(null);
  };

  const sendChat = async (messageText = chatInput) => {
    const trimmed = messageText.trim();
    if (!trimmed || chatLoading) return;

    const userMessage = { sender: 'user', text: trimmed };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/chat`, {
        message: trimmed,
        conversationId,
      });

      setConversationId(res.data.conversationId);
      setChatMessages((prev) => [...prev, { sender: 'assistant', text: res.data.message }]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'I'm having trouble responding right now. Please try again or contact our support team.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/api/appointments`, bookingForm);
      setBookingStatus(`✅ Appointment booked successfully. Ref: ${res.data.appointmentId.slice(0, 8)}`);
      setBookingForm({
        customerName: '',
        email: '',
        phone: '',
        service: 'Therapy & Counseling',
        date: '',
        time: '',
        notes: '',
      });
    } catch (error) {
      setBookingStatus('❌ There was a problem scheduling your appointment. Please try again.');
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/api/support/ticket`, ticketForm);
      setTicketStatus(`✅ Support ticket raised successfully. Ticket ID: ${res.data.ticketId.slice(0, 8)}`);
      setTicketForm({ customerName: '', email: '', subject: '', message: '' });
    } catch (error) {
      setTicketStatus('❌ Unable to raise ticket. Please contact our team directly.');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container nav-wrap">
          <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="brand-block">
            <div className="brand-mark">M</div>
            <div>
              <div className="brand-name">Mosaic Wellness</div>
              <div className="brand-tag">Health • Care • Balance</div>
            </div>
          </div>

          <nav className={`main-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#" onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}>Home</a>
            <a href="#" onClick={() => { setCurrentPage('services'); setMobileMenuOpen(false); }}>Services</a>
            <a href="#" onClick={() => { setCurrentPage('products'); setMobileMenuOpen(false); }}>Products</a>
            <a href="#" onClick={() => { setCurrentPage('assistant'); setMobileMenuOpen(false); }}>AI Assistant</a>
            <a href="#" onClick={() => { setCurrentPage('support'); setMobileMenuOpen(false); }}>Support</a>
          </nav>

          <div className="auth-section">
            {user ? (
              <div className="user-menu">
                <span>👤 {user.name}</span>
                <button onClick={handleLogout} className="logout-btn">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <button onClick={() => { setShowAuth(true); setAuthMode('login'); }} className="primary-btn small-btn">
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {showAuth && (
        <div className="auth-modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuth(false)}>×</button>
            <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
            
            <form onSubmit={handleAuth}>
              {authMode === 'signup' && (
                <input
                  type="text"
                  placeholder="Full name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
              <button type="submit" className="primary-btn">Continue</button>
            </form>
            
            <p className="auth-toggle">
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      )}

      <main>
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'services' && <ServicesPage displayServices={displayServices} />}
        {currentPage === 'products' && <ProductsPage displayProducts={displayProducts} />}
        {currentPage === 'assistant' && (
          <AssistantPage
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChat={sendChat}
            chatLoading={chatLoading}
          />
        )}
        {currentPage === 'support' && (
          <SupportPage
            bookingForm={bookingForm}
            setBookingForm={setBookingForm}
            handleBookingSubmit={handleBookingSubmit}
            bookingStatus={bookingStatus}
            ticketForm={ticketForm}
            setTicketForm={setTicketForm}
            handleTicketSubmit={handleTicketSubmit}
            ticketStatus={ticketStatus}
          />
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div>
            <div className="brand-name">Mosaic Wellness</div>
            <p>Helping people live with more balance, clarity, and care.</p>
          </div>
          <div className="footer-links">
            <a href="#" onClick={() => setCurrentPage('services')}>Services</a>
            <a href="#" onClick={() => setCurrentPage('products')}>Products</a>
            <a href="#" onClick={() => setCurrentPage('assistant')}>AI Assistant</a>
            <a href="#" onClick={() => setCurrentPage('support')}>Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomePage() {
  const [currentPage, setCurrentPage] = useState('home');
  
  return (
    <section className="hero-section">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Science-backed wellness for everyday life</span>
          <h1>Wellness that supports the whole you.</h1>
          <p>
            Mosaic Wellness brings expert-led therapy, lifestyle guidance, and trusted health products to help people feel better, heal deeper, and live stronger.
          </p>

          <div className="cta-row">
            <button className="primary-btn" onClick={() => window.location.href = '#support'}>
              Book an appointment
            </button>
            <button className="secondary-btn" onClick={() => window.location.href = '#assistant'}>
              Talk to AI
            </button>
          </div>

          <div className="hero-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <strong>{stat.label}</strong>
                <span>{stat.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-card">
          <div className="mini-panel">
            <div className="mini-label"><HeartPulse size={16} /> Personalized Care</div>
            <h3>Tailored support for mind, body, and lifestyle</h3>
            <ul>
              <li><CheckCircle2 size={16} /> Therapy & counseling</li>
              <li><CheckCircle2 size={16} /> Nutrition and coaching</li>
              <li><CheckCircle2 size={16} /> Science-based wellness plans</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="logo-band">
        <div className="container brand-strip">
          <span>Man Matters</span>
          <span>Be Bodywise</span>
          <span>Little Joys</span>
          <span>Root Labs</span>
        </div>
      </div>
    </section>
  );
}

function ServicesPage({ displayServices }) {
  return (
    <section className="section-block">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">What we offer</span>
          <h2>Services designed to help you thrive</h2>
        </div>

        <div className="service-grid">
          {displayServices.map((service) => (
            <article key={service.title || service.name} className="info-card">
              <div className="icon-badge">{service.icon}</div>
              <h3>{service.title || service.name}</h3>
              <p>{service.description}</p>
              <a href="#support">Learn more <ChevronRight size={16} /></a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsPage({ displayProducts }) {
  return (
    <section className="section-block alt-bg">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Our wellness brands</span>
          <h2>Products built around real health needs</h2>
        </div>

        <div className="product-grid">
          {displayProducts.map((product) => (
            <article key={product.name} className="product-card">
              <div className="product-icon">{product.icon}</div>
              <div className="product-meta">{product.category}</div>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <ul>
                {product.features?.map((feat) => (
                  <li key={feat}><CheckCircle2 size={14} /> {feat}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AssistantPage({ chatMessages, chatInput, setChatInput, sendChat, chatLoading }) {
  return (
    <section className="section-block">
      <div className="container assistant-layout">
        <div className="assistant-copy">
          <span className="eyebrow">AI wellness support</span>
          <h2>Talk to a wellness assistant anytime</h2>
          <p>
            Our AI assistant helps customers understand products, recommended services, and wellness guidance in a conversational way.
          </p>

          <div className="assistant-features">
            <div>
              <Bot size={18} />
              <span>Instant guidance</span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <span>Safe & empathetic</span>
            </div>
            <div>
              <Sparkles size={18} />
              <span>Personalized suggestions</span>
            </div>
          </div>
        </div>

        <div className="chat-panel">
          <div className="chat-header">
            <div className="assistant-badge"><Bot size={16} /> Mosaic AI</div>
            <span>Online</span>
          </div>

          <div className="chat-window">
            {chatMessages.map((msg, index) => (
              <div key={`${msg.sender}-${index}`} className={`chat-bubble ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {chatLoading && <div className="chat-bubble assistant typing">Typing...</div>}
          </div>

          <div className="prompt-row">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendChat(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              value={chatInput}
              placeholder="Ask about wellness services or products..."
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendChat();
              }}
            />
            <button type="button" onClick={() => sendChat()} className="primary-btn small-btn">Send</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportPage({ bookingForm, setBookingForm, handleBookingSubmit, bookingStatus, ticketForm, setTicketForm, handleTicketSubmit, ticketStatus }) {
  return (
    <section className="section-block alt-bg">
      <div className="container support-grid">
        <div className="support-card">
          <div className="section-heading left">
            <span className="eyebrow">Book a consultation</span>
            <h2>Schedule a care session</h2>
          </div>

          <form onSubmit={handleBookingSubmit} className="form-stack">
            <div className="two-col">
              <input
                type="text"
                placeholder="Full name"
                value={bookingForm.customerName}
                onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={bookingForm.email}
                onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                required
              />
            </div>

            <div className="two-col">
              <input
                type="tel"
                placeholder="Phone"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
              />
              <select
                value={bookingForm.service}
                onChange={(e) => setBookingForm({ ...bookingForm, service: e.target.value })}
              >
                <option>Therapy & Counseling</option>
                <option>Life Coaching</option>
                <option>Classes & Support Groups</option>
                <option>Integrative Care</option>
              </select>
            </div>

            <div className="two-col">
              <input
                type="date"
                value={bookingForm.date}
                onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                required
              />
              <input
                type="time"
                value={bookingForm.time}
                onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                required
              />
            </div>

            <textarea
              placeholder="Notes (optional)"
              rows="4"
              value={bookingForm.notes}
              onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
            />

            <button type="submit" className="primary-btn">Confirm booking</button>
            {bookingStatus && <p className="status-note">{bookingStatus}</p>}
          </form>
        </div>

        <div className="support-card support-ticket-card">
          <div className="section-heading left">
            <span className="eyebrow">We're here to help</span>
            <h2>Customer support</h2>
          </div>

          <form onSubmit={handleTicketSubmit} className="form-stack">
            <input
              type="text"
              placeholder="Your name"
              value={ticketForm.customerName}
              onChange={(e) => setTicketForm({ ...ticketForm, customerName: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email address"
              value={ticketForm.email}
              onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Subject"
              value={ticketForm.subject}
              onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
              required
            />
            <textarea
              placeholder="Tell us how we can help..."
              rows="4"
              value={ticketForm.message}
              onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
              required
            />

            <button type="submit" className="secondary-btn full-width">Submit support ticket</button>
            {ticketStatus && <p className="status-note">{ticketStatus}</p>}
          </form>

          <div className="contact-strip">
            <div><Phone size={16} /> +91 98765 43210</div>
            <div><Mail size={16} /> hello@mosaicwellness.in</div>
            <div><MapPin size={16} /> India • Global virtual care</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;
