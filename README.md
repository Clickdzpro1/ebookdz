# 🇩🇿 EBOOKDZ - Algeria's First Digital E-Book Marketplace

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

> **Transform how Algeria reads** - Modern 3D interactive platform connecting readers with local and international e-books.

## 🌟 Features

### 🎨 Premium Frontend
- ✨ **Interactive 3D UI** with glassmorphism effects
- 🎭 **Animated gradients** and smooth transitions
- 📱 **Fully responsive** mobile-first design
- 🚀 **Smart scroll header** that hides/shows intelligently
- 🎯 **Modern Algerian theme** with green, white & red colors
- 💫 **Particle effects** and hover animations

### 🔐 Authentication & Users
- JWT-based secure authentication
- Three user roles: Client, Vendor, Admin
- Role-specific dashboards
- Profile management

### 📚 Book Management
- Browse 5000+ e-books across all categories
- Advanced search and filtering
- Category browsing (Academic, Professional, Literature, Islamic, Children's)
- Book preview and reviews
- Vendor book uploads with cover & PDF

### 💳 Payment Integration
- **SlickPay** payment gateway (Algerian DZD)
- Secure transaction processing
- Purchase history tracking
- Vendor payout management

### 📊 Analytics & Admin
- Vendor sales analytics
- Admin dashboard with platform statistics
- User management
- Revenue tracking across 48 wilayas

## 🏗️ Tech Stack

### Frontend
- Pure HTML5, CSS3, JavaScript (ES6+)
- No framework dependencies
- Modern CSS with CSS Variables
- Intersection Observer API for animations

### Backend
- Node.js + Express.js
- MySQL database
- JWT authentication
- Multer for file uploads
- bcrypt for password hashing

### Payment
- SlickPay API integration
- Webhook handling for payment confirmation

## 📁 Project Structure

```
ebookdz/
├── frontend/
│   └── index.html          # Complete single-page app
├── backend/
│   ├── server.js          # Express server
│   ├── config/
│   │   └── db.js          # MySQL connection
│   ├── controllers/       # Business logic
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth & validation
│   └── uploads/          # Book covers & PDFs
├── database/
│   └── ebookdz-database.sql  # Complete schema + sample data
├── docs/                 # Documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- MySQL 8.0+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/Clickdzpro1/ebookdz.git
cd ebookdz

# Setup database
mysql -u root -p < database/ebookdz-database.sql

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your MySQL credentials and SlickPay API keys
npm run dev

# Setup frontend
cd ../frontend
# Open index.html in browser or use:
npx serve
```

### Environment Variables

Create `.env` in backend directory:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ebookdz
JWT_SECRET=your-super-secret-jwt-key-here
SLICKPAY_API_KEY=your_slickpay_api_key
SLICKPAY_SECRET=your_slickpay_secret
```

## 🎯 Usage

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Client | ahmed@example.dz | demo123 |
| Vendor | fatima@example.dz | vendor123 |
| Admin | admin@ebookdz.dz | admin123 |

### API Endpoints

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

**Books**
- `GET /api/books` - Get all books (paginated)
- `GET /api/books/:id` - Get book details
- `POST /api/books` - Upload new book (vendors only)
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

**Payments**
- `POST /api/payments/initiate` - Start payment
- `POST /api/payments/webhook` - SlickPay webhook

**Users**
- `GET /api/users/profile` - Get user profile
- `GET /api/users/purchases` - Get purchase history
- `GET /api/vendors/analytics` - Vendor stats

## 🎨 Design System

The app uses a custom design system inspired by Algeria's national colors:

- **Primary**: Teal/Green (#21808D)
- **Accent**: Red (#C0152F)
- **Background**: Cream (#FCFCF9)
- **Text**: Slate (#13343B)

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **ClickDzPro** - Initial work - [@Clickdzpro1](https://github.com/Clickdzpro1)

## 🙏 Acknowledgments

- SlickPay for Algerian payment integration
- The Algerian developer community
- All contributors and testers

## 📞 Contact

- Email: clickdz.usa@gmail.com
- GitHub: [@Clickdzpro1](https://github.com/Clickdzpro1)

---

**Made with ❤️ in Algeria 🇩🇿**
