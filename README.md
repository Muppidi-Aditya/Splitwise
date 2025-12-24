# Splitwise - Expense Sharing Application

A full-stack expense sharing application similar to Splitwise, built with React and Node.js. This application allows users to create groups, add expenses, split bills, and settle debts with friends.

## 🚀 Features

- **User Authentication**: Email-based OTP authentication system
- **Group Management**: Create groups, invite members, and manage group settings
- **Expense Tracking**: Add expenses with multiple split types (Equal, Exact, Percentage)
- **Balance Management**: View balances and see who owes whom
- **Settlements**: Record settlements between users
- **Email Reminders**: Automated email reminders for pending dues
- **Real-time Updates**: Dynamic balance calculations and expense tracking

## 🛠️ Technology Stack

### Frontend (client-side)
- **React 19** - UI library
- **React Router** - Routing
- **Vite** - Build tool and dev server
- **CSS3** - Styling

### Backend (server-side)
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (Neon)
- **Redis** - Caching and OTP storage (Upstash)
- **JWT** - Authentication tokens
- **Nodemailer** - Email service
- **Node-cron** - Scheduled jobs

## 📁 Project Structure

```
credresolve-assignment/
├── client-side/          # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── Pages/        # Page components
│   │   └── services/     # API service layer
│   ├── .env              # Environment variables
│   └── package.json
│
└── server-side/          # Node.js backend application
    ├── routes/           # API route handlers
    ├── services/         # Business logic services
    ├── middleware/       # Express middleware
    ├── config/           # Configuration files
    ├── database/         # Database schema and initialization
    ├── jobs/             # Scheduled jobs
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)
- Email service credentials (Gmail or other SMTP)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Muppidi-Aditya/Splitwise.git
   cd Splitwise
   ```

2. **Setup Backend (server-side)**
   ```bash
   cd server-side
   npm install
   ```

3. **Setup Frontend (client-side)**
   ```bash
   cd ../client-side
   npm install
   ```

### Configuration

#### Backend Environment Variables

Create a `.env` file in the `server-side` directory:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=7d

# Email Service (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Rate Limiting
MAX_OTP_REQUESTS_PER_HOUR=5

# Reminder Job
ENABLE_REMINDER_JOB=true
TZ=Asia/Kolkata
```

#### Frontend Environment Variables

Create a `.env` file in the `client-side` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

### Database Setup

1. **Initialize the database**
   ```bash
   cd server-side
   npm run init-db
   ```

   This will create all necessary tables in your PostgreSQL database.

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd server-side
   npm run dev
   ```
   Server will run on `http://localhost:3000`

2. **Start the Frontend Development Server**
   ```bash
   cd client-side
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/register` - Register new user

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create a new group
- `GET /api/groups/:groupId/members` - Get group members
- `POST /api/groups/:groupId/invite` - Invite user to group
- `GET /api/groups/invites` - Get pending invites
- `POST /api/groups/invites/:inviteId/respond` - Respond to invite

### Expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/group/:groupId` - Get group expenses
- `PUT /api/expenses/:expenseId` - Update expense
- `DELETE /api/expenses/:expenseId` - Delete expense

### Settlements
- `POST /api/settlements` - Create settlement
- `GET /api/settlements/group/:groupId` - Get group settlements
- `DELETE /api/settlements/:settlementId` - Delete settlement

### Balances
- `GET /api/balances/group/:groupId` - Get group balances
- `GET /api/balances/group/:groupId/simplified` - Get simplified balances

## 🔐 Authentication Flow

1. User enters email and selects login/register
2. System sends OTP via email
3. User enters OTP to verify
4. System returns JWT token for authenticated requests

## 📧 Email Reminders

The application includes an automated reminder job that:
- Runs every 3 days at 6:30 PM (configurable)
- Sends email reminders to users with pending dues
- Shows detailed breakdown of debts by group

To manually trigger the reminder job:
```bash
cd server-side
npm run run-reminder
```

## 🧪 Development

### Backend Development
```bash
cd server-side
npm run dev  # Runs with --watch flag for auto-reload
```

### Frontend Development
```bash
cd client-side
npm run dev  # Vite dev server with hot module replacement
```

## 🏗️ Building for Production

### Backend
```bash
cd server-side
npm start
```

### Frontend
```bash
cd client-side
npm run build  # Creates optimized production build in dist/
npm run preview  # Preview production build
```

## 📝 Key Features Explained

### Expense Split Types
- **EQUAL**: Split expense equally among selected members
- **EXACT**: Specify exact amounts for each member
- **PERCENTAGE**: Split expense by percentage for each member

### Balance Calculation
- Automatically calculates balances based on expenses and settlements
- Shows who owes whom in simplified format
- Updates in real-time as expenses and settlements are added

### Group Management
- Group admins can invite/remove members
- Members can leave groups (if balance is zero)
- Admins cannot leave groups (must transfer admin rights first)

## 🔒 Security Features

- JWT-based authentication
- Rate limiting on OTP requests
- Input validation and sanitization
- SQL injection protection (parameterized queries)
- CORS configuration
- Environment variable protection

## 📄 License

This project is private and proprietary.

## 👤 Author

**Muppidi Aditya**
- GitHub: [@Muppidi-Aditya](https://github.com/Muppidi-Aditya)

## 🙏 Acknowledgments

- Inspired by Splitwise
- Built with modern web technologies
- Uses best practices for security and scalability

