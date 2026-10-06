# Mosaic Wellness App

A full-stack SaaS application for Mosaic Wellness featuring AI-powered health assistant, product catalog, services, and customer support.

## Features

✅ **AI Health Assistant** - Powered by GPT-3.5-turbo for real-time wellness consultations  
✅ **Product Catalog** - Man Matters, Be Bodywise, Little Joys, Root Labs  
✅ **Services Section** - Therapy, Coaching, Classes, Integrative Care  
✅ **Customer Support** - Chat and ticket system  
✅ **Appointment Booking** - Schedule consultations and services  
✅ **Responsive Design** - Mobile-friendly UI  
✅ **Conversation History** - Persistent AI chat conversations  

## Tech Stack

**Backend:**
- Node.js + Express.js
- SQLite3 (In-memory database)
- OpenAI API (GPT-3.5-turbo)

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- Axios for API calls

## Setup Instructions

### Prerequisites
- Node.js 16+
- OpenAI API Key (get from https://platform.openai.com/api-keys)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vanshvsh/mosaic-wellness-app.git
   cd mosaic-wellness-app
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-...
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:5000
   - Frontend: http://localhost:5173

## API Endpoints

### AI Chat
- `POST /api/chat` - Send message to AI assistant
- `GET /api/conversation/:id` - Get conversation history

### Support
- `POST /api/support/ticket` - Create support ticket
- `GET /api/support/tickets` - Get all tickets
- `PATCH /api/support/ticket/:id` - Update ticket status

### Appointments
- `POST /api/appointments` - Book appointment
- `GET /api/appointments` - Get all appointments

### Data
- `GET /api/products` - Get all products
- `GET /api/services` - Get all services

## Project Structure

```
mosaic-wellness-app/
├── server.js                 # Express server & API routes
├── package.json
├── .env.example
├── README.md
└── client/                   # React frontend
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── App.jsx
    │   └── main.jsx
    ├── public/
    ├── package.json
    └── vite.config.js
```

## Usage

### AI Assistant
1. Navigate to the "AI Assistant" section
2. Start typing your wellness question
3. The AI will respond with personalized advice
4. Conversation history is automatically saved

### Book Appointment
1. Go to "Services" section
2. Click "Book Appointment"
3. Fill in your details and preferred date/time
4. Submit to schedule

### Support Ticket
1. Click "Help & Support"
2. Describe your issue
3. Receive a ticket ID for tracking

## Environment Variables

```env
OPENAI_API_KEY=sk-...          # Your OpenAI API key
PORT=5000                       # Server port
NODE_ENV=development            # development or production
```

## Deployment

### Vercel / Railway
```bash
npm run build
npm start
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
