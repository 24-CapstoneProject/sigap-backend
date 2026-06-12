#!/bin/bash

# SIGAP Backend Quick Setup Script

echo "🚀 SIGAP Backend Quick Setup"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    exit 1
fi

echo "✅ Node.js and MySQL are installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your database credentials."
    echo ""
    echo "Please edit .env file and set:"
    echo "  - DB_HOST=localhost"
    echo "  - DB_USER=root"
    echo "  - DB_PASSWORD=your_password"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env file with your database credentials"
echo "2. Run: npm run migrate (to create database tables)"
echo "3. Run: npm run seed (to insert sample data - optional)"
echo "4. Run: npm run dev (to start development server)"
echo ""
