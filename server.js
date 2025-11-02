const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = './sweetshop.db';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeTables();
    }
});

// Create tables if they don't exist
function initializeTables() {
    db.serialize(() => {
        // Users table for authentication
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sweets table (renamed from products to match requirements)
        db.run(`CREATE TABLE IF NOT EXISTS sweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            category TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Keep products table for backward compatibility during migration
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            category TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Customers table
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT DEFAULT 'N/A',
            total_purchases INTEGER DEFAULT 0,
            total_amount REAL DEFAULT 0,
            last_purchase DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sales table
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            total REAL NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES sweets(id)
        )`);

        // Create default admin user if not exists
        const defaultAdminPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
                VALUES ('admin', 'admin@sweetshop.com', ?, 'admin')`, 
                [defaultAdminPassword], (err) => {
                    if (err) console.error('Error creating admin user:', err);
                });

        console.log('Database tables initialized.');
    });
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Admin Only Middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ========== AUTHENTICATION API ==========

// Register new user
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, existingUser) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        db.run(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username.trim(), email.trim(), hashedPassword, 'user'],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                const token = jwt.sign(
                    { id: this.lastID, username, email, role: 'user' },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: { id: this.lastID, username, email, role: 'user' }
                });
            }
        );
    });
});

// Login user
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    });
});

// ========== SWEETS API (Protected) ==========

// Get all sweets (Protected)
app.get('/api/sweets', authenticateToken, (req, res) => {
    db.all('SELECT * FROM sweets ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Search sweets by name, category, or price range (Protected)
app.get('/api/sweets/search', authenticateToken, (req, res) => {
    const { name, category, minPrice, maxPrice } = req.query;
    let query = 'SELECT * FROM sweets WHERE 1=1';
    let params = [];

    if (name) {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`);
    }

    if (category) {
        query += ' AND category LIKE ?';
        params.push(`%${category}%`);
    }

    if (minPrice) {
        query += ' AND price >= ?';
        params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
        query += ' AND price <= ?';
        params.push(parseFloat(maxPrice));
    }

    query += ' ORDER BY id DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add new sweet (Protected - Admin only)
app.post('/api/sweets', authenticateToken, requireAdmin, (req, res) => {
    const { name, price, quantity, category } = req.body;

    if (!name || !price || !category || quantity === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (price <= 0) {
        return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    if (quantity < 0) {
        return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    db.run(
        'INSERT INTO sweets (name, price, quantity, category) VALUES (?, ?, ?, ?)',
        [name.trim(), parseFloat(price), parseInt(quantity), category.trim()],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({
                id: this.lastID,
                name: name.trim(),
                price: parseFloat(price),
                quantity: parseInt(quantity),
                category: category.trim()
            });
        }
    );
});

// Update sweet (Protected - Admin only)
app.put('/api/sweets/:id', authenticateToken, requireAdmin, (req, res) => {
    const id = req.params.id;
    const { name, price, quantity, category } = req.body;

    if (!name || !price || !category || quantity === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (price <= 0) {
        return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    if (quantity < 0) {
        return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    db.run(
        'UPDATE sweets SET name = ?, price = ?, quantity = ?, category = ? WHERE id = ?',
        [name.trim(), parseFloat(price), parseInt(quantity), category.trim(), id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Sweet not found' });
                return;
            }
            res.json({
                message: 'Sweet updated successfully',
                id: parseInt(id),
                name: name.trim(),
                price: parseFloat(price),
                quantity: parseInt(quantity),
                category: category.trim()
            });
        }
    );
});

// Delete sweet (Protected - Admin only)
app.delete('/api/sweets/:id', authenticateToken, requireAdmin, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM sweets WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Sweet not found' });
            return;
        }
        res.json({ message: 'Sweet deleted successfully' });
    });
});

// Purchase a sweet - decrease quantity (Protected)
app.post('/api/sweets/:id/purchase', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { quantity: purchaseQuantity } = req.body;

    if (!purchaseQuantity || purchaseQuantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Get sweet details
    db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, sweet) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!sweet) {
            return res.status(404).json({ error: 'Sweet not found' });
        }

        if (sweet.quantity < purchaseQuantity) {
            return res.status(400).json({
                error: `Insufficient quantity! Only ${sweet.quantity} items available.`
            });
        }

        // Update quantity
        db.run(
            'UPDATE sweets SET quantity = quantity - ? WHERE id = ?',
            [purchaseQuantity, id],
            function(updateErr) {
                if (updateErr) {
                    return res.status(500).json({ error: updateErr.message });
                }

                // Get updated sweet
                db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, updatedSweet) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        message: 'Purchase successful',
                        sweet: updatedSweet,
                        purchasedQuantity: purchaseQuantity
                    });
                });
            }
        );
    });
});

// Restock a sweet - increase quantity (Protected - Admin only)
app.post('/api/sweets/:id/restock', authenticateToken, requireAdmin, (req, res) => {
    const id = req.params.id;
    const { quantity: restockQuantity } = req.body;

    if (!restockQuantity || restockQuantity <= 0) {
        return res.status(400).json({ error: 'Restock quantity must be greater than 0' });
    }

    // Get sweet details
    db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, sweet) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!sweet) {
            return res.status(404).json({ error: 'Sweet not found' });
        }

        // Update quantity
        db.run(
            'UPDATE sweets SET quantity = quantity + ? WHERE id = ?',
            [restockQuantity, id],
            function(updateErr) {
                if (updateErr) {
                    return res.status(500).json({ error: updateErr.message });
                }

                // Get updated sweet
                db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, updatedSweet) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        message: 'Restock successful',
                        sweet: updatedSweet,
                        restockedQuantity: restockQuantity
                    });
                });
            }
        );
    });
});

// ========== SALES API ==========

// Get all sales
app.get('/api/sales', (req, res) => {
    const date = req.query.date;
    let query = 'SELECT * FROM sales';
    let params = [];

    if (date) {
        query += ' WHERE DATE(sale_date) = ?';
        params = [date];
    }

    query += ' ORDER BY sale_date DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Add new sale
app.post('/api/sales', (req, res) => {
    const { productId, quantity, customerName, customerPhone } = req.body;

    if (!productId || !quantity || !customerName) {
        return res.status(400).json({ error: 'Product, quantity, and customer name are required' });
    }

    if (quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    // Get product details
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (product.stock < quantity) {
            return res.status(400).json({ error: `Insufficient stock! Only ${product.stock} items available.` });
        }

        const total = product.price * quantity;

        // Create sale
        db.run(
            'INSERT INTO sales (product_id, product_name, quantity, price, total, customer_name, customer_phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [productId, product.name, quantity, product.price, total, customerName.trim(), customerPhone || 'N/A'],
            function(saleErr) {
                if (saleErr) {
                    return res.status(500).json({ error: saleErr.message });
                }

                // Update product stock
                db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [quantity, productId],
                    (stockErr) => {
                        if (stockErr) {
                            return res.status(500).json({ error: stockErr.message });
                        }

                        // Update or create customer
                        const saleId = this.lastID;
                        updateCustomer(customerName, customerPhone || '', total, () => {
                            res.json({
                                id: saleId,
                                productId,
                                productName: product.name,
                                quantity,
                                price: product.price,
                                total,
                                customerName,
                                customerPhone: customerPhone || 'N/A'
                            });
                        });
                    }
                );
            }
        );
    });
});

// Helper function to update customer
function updateCustomer(name, phone, amount, callback) {
    const phoneValue = phone.trim() || 'N/A';
    
    // Try to find customer by phone first
    db.get('SELECT * FROM customers WHERE phone = ?', [phoneValue], (err, customer) => {
        if (err) {
            console.error('Error finding customer:', err);
            return callback();
        }

        if (customer) {
            // Update existing customer
            db.run(
                'UPDATE customers SET total_purchases = total_purchases + 1, total_amount = total_amount + ?, last_purchase = CURRENT_TIMESTAMP WHERE id = ?',
                [amount, customer.id],
                callback
            );
        } else if (phoneValue === 'N/A') {
            // If no phone, try to find by name
            db.get('SELECT * FROM customers WHERE name = ? AND phone = ?', [name.trim(), 'N/A'], (err, customerByName) => {
                if (customerByName) {
                    db.run(
                        'UPDATE customers SET total_purchases = total_purchases + 1, total_amount = total_amount + ?, last_purchase = CURRENT_TIMESTAMP WHERE id = ?',
                        [amount, customerByName.id],
                        callback
                    );
                } else {
                    // Create new customer
                    db.run(
                        'INSERT INTO customers (name, phone, total_purchases, total_amount, last_purchase) VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)',
                        [name.trim(), phoneValue, amount],
                        callback
                    );
                }
            });
        } else {
            // Create new customer with phone
            db.run(
                'INSERT INTO customers (name, phone, total_purchases, total_amount, last_purchase) VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)',
                [name.trim(), phoneValue, amount],
                callback
            );
        }
    });
}

// ========== CUSTOMERS API ==========

// Get all customers
app.get('/api/customers', (req, res) => {
    const search = req.query.search || '';
    let query = 'SELECT * FROM customers';
    let params = [];

    if (search) {
        query += ' WHERE name LIKE ? OR phone LIKE ?';
        params = [`%${search}%`, `%${search}%`];
    }

    query += ' ORDER BY last_purchase DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// ========== DASHBOARD API ==========

// Get dashboard stats
app.get('/api/dashboard', (req, res) => {
    const stats = {};

    // Total products
    db.get('SELECT COUNT(*) as count FROM products', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalProducts = row.count;

        // Low stock items
        db.get('SELECT COUNT(*) as count FROM products WHERE stock < 10', [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.lowStockItems = row.count;

            // Today's sales
            const today = new Date().toISOString().split('T')[0];
            db.get('SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE DATE(sale_date) = ?', [today], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.todaySales = row.total;

                // Total customers
                db.get('SELECT COUNT(*) as count FROM customers', [], (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.totalCustomers = row.count;

                    // Recent sales (last 5)
                    db.all('SELECT * FROM sales ORDER BY sale_date DESC LIMIT 5', [], (err, rows) => {
                        if (err) return res.status(500).json({ error: err.message });
                        stats.recentSales = rows;

                        res.json(stats);
                    });
                });
            });
        });
    });
});

// ========== REPORTS API ==========

// Get reports data
app.get('/api/reports', (req, res) => {
    const reports = {};

    // Total sales
    db.get('SELECT COALESCE(SUM(total), 0) as total, COALESCE(SUM(quantity), 0) as items FROM sales', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        reports.totalSales = row.total;
        reports.totalItems = row.items;
        reports.avgSale = row.items > 0 ? row.total / row.items : 0;

        // Top products
        db.all(`
            SELECT product_name as name, SUM(quantity) as quantity
            FROM sales
            GROUP BY product_id, product_name
            ORDER BY quantity DESC
            LIMIT 5
        `, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            reports.topProducts = rows;

            // Category sales
            db.all(`
                SELECT p.category, COALESCE(SUM(s.total), 0) as total
                FROM products p
                LEFT JOIN sales s ON p.id = s.product_id
                GROUP BY p.category
                ORDER BY total DESC
            `, [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                reports.categorySales = rows;

                res.json(reports);
            });
        });
    });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'frontend/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
    });
} else {
    // Default route - serve old HTML for backward compatibility
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Sweet Shop Management System is ready!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

