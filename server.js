// server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3 and set to verbose mode for detailed logs
const bcrypt = require('bcrypt'); // Still needed for password hashing
require('dotenv').config(); // Load environment variables from .env

const app = express();
const port = process.env.PORT || 5000;

// Database file path
// The SQLite database will be created in your my-pos-backend directory
const DB_FILE = './pos_system.db';
app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});

// Connect to SQLite database
// The database will be created if it doesn't exist
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
        process.exit(1); // Exit if database connection fails
    }
    console.log('Successfully connected to the SQLite database!');

    // Create tables if they don't exist and insert initial data
    db.serialize(() => {
        // Create products table
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                price REAL NOT NULL,
                stock_quantity INTEGER NOT NULL,
                category TEXT,
                description TEXT -- ADDED: Ensure this column is present
            );
        `, (err) => {
            if (err) {
                console.error('Error creating products table:', err.message);
            } else {
                console.log('Products table ensured.');

                // ADDED: ALTER TABLE to add 'description' column if it doesn't exist
                db.run("ALTER TABLE products ADD COLUMN description TEXT;", (alterErr) => {
                    if (alterErr && !alterErr.message.includes("duplicate column name")) {
                        // Log error only if it's not the "duplicate column" error (which means it already exists)
                        console.error('Error altering products table to add description column:', alterErr.message);
                    } else if (!alterErr) {
                        console.log('Products table altered to add description column (if it did not exist).');
                    }
                });

                // Insert sample data if the table was just created or is empty
                db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
                    if (err) {
                        console.error('Error checking product count:', err.message);
                        return;
                    }
                    if (row.count === 0) {
                        console.log('Inserting initial product data...');
                        const stmt = db.prepare(`
                            INSERT INTO products (name, price, stock_quantity, category, description) VALUES (?, ?, ?, ?, ?)
                        `);
                        const productsToInsert = [
                            ['Espresso', 3.50, 100, 'Beverages', 'Rich and intense espresso shot.'],
                            ['Latte', 4.00, 80, 'Beverages', 'Smooth latte with steamed milk.'],
                            ['Cappuccino', 4.25, 75, 'Beverages', 'Classic cappuccino with foamed milk.'],
                            ['Croissant', 2.75, 50, 'Food', 'Flaky, buttery pastry.'],
                            ['Blueberry Muffin', 3.20, 40, 'Food', 'Sweet muffin with real blueberries.'],
                            ['Cheesecake', 5.50, 30, 'Desserts', 'Creamy New York style cheesecake.'],
                            ['Sandwich', 7.80, 25, 'Food', 'Assorted fresh deli sandwich.'],
                            ['Orange Juice', 3.00, 60, 'Beverages', 'Freshly squeezed orange juice.'],
                            ['Chocolate Chip Cookie', 2.00, 70, 'Snacks', 'Classic chocolate chip cookie.'],
                            ['Brownie', 4.10, 35, 'Desserts', 'Fudgy chocolate brownie.']
                        ];
                        productsToInsert.forEach(product => stmt.run(product));
                        stmt.finalize(() => {
                            console.log('Initial product data inserted.');
                        });
                    }
                });
            }
        });

        // Create categories table (NEW)
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT
            );
        `, (err) => {
            if (err) {
                console.error('Error creating categories table:', err.message);
            } else {
                console.log('Categories table ensured.');
                db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
                    if (err) {
                        console.error('Error checking category count:', err.message);
                        return;
                    }
                    if (row.count === 0) {
                        console.log('Inserting initial category data...');
                        const stmt = db.prepare(`
                            INSERT INTO categories (name, description) VALUES (?, ?)
                        `);
                        const categoriesToInsert = [
                            ['Beverages', 'All types of drinks including coffee, tea, and juices.'],
                            ['Food', 'Savory items like sandwiches and pastries.'],
                            ['Desserts', 'Sweet treats and baked goods.'],
                            ['Snacks', 'Light bites and quick eats.']
                        ];
                        categoriesToInsert.forEach(category => stmt.run(category));
                        stmt.finalize(() => {
                            console.log('Initial category data inserted.');
                        });
                    }
                });
            }
        });

        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                email TEXT, -- Added email
                full_name TEXT -- Added full_name
            );
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Users table ensured.');
                // ADDED: ALTER TABLE to add 'email' and 'full_name' columns if they don't exist
                db.run("ALTER TABLE users ADD COLUMN email TEXT;", (alterErr) => {
                    if (alterErr && !alterErr.message.includes("duplicate column name")) {
                        console.error('Error altering users table to add email column:', alterErr.message);
                    } else if (!alterErr) {
                        console.log('Users table altered to add email column (if it did not exist).');
                    }
                });
                db.run("ALTER TABLE users ADD COLUMN full_name TEXT;", (alterErr) => {
                    if (alterErr && !alterErr.message.includes("duplicate column name")) {
                        console.error('Error altering users table to add full_name column:', alterErr.message);
                    } else if (!alterErr) {
                        console.log('Users table altered to add full_name column (if it did not exist).');
                    }
                });


                // Insert a default admin user if the table was just created or is empty
                db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
                    if (err) {
                        console.error('Error checking user count:', err.message);
                        return;
                    }
                    if (row.count === 0) {
                        console.log('Inserting default admin, cashier, waiter, and chef users...');
                        const usersToInsert = [
                            { username: 'admin', pin: '12345', role: 'admin', email: 'admin@example.com', full_name: 'Admin User' },
                            { username: 'cashier', pin: '12345', role: 'cashier', email: 'cashier@example.com', full_name: 'Cashier User' },
                            { username: 'waiter', pin: '12345', role: 'waiter', email: 'waiter@example.com', full_name: 'Waiter User' },
                            { username: 'chef', pin: '12345', role: 'chef', email: 'chef@example.com', full_name: 'Chef User' }
                        ];

                        const stmt = db.prepare(`INSERT INTO users (username, password, role, email, full_name) VALUES (?, ?, ?, ?, ?)`);
                        for (const user of usersToInsert) {
                            const hashedPassword = await bcrypt.hash(user.pin, 10);
                            stmt.run(user.username, hashedPassword, user.role, user.email, user.full_name);
                        }
                        stmt.finalize(() => {
                            console.log('Default users (admin, cashier, waiter, chef) inserted.');
                        });
                    }
                });
            }
        });

        // Create floors table (new)
        db.run(`
            CREATE TABLE IF NOT EXISTS floors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );
        `, (err) => {
            if (err) {
                console.error('Error creating floors table:', err.message);
            } else {
                console.log('Floors table ensured.');
                db.get("SELECT COUNT(*) as count FROM floors", (err, row) => {
                    if (err) return;
                    if (row.count === 0) {
                        db.run(`INSERT INTO floors (name) VALUES ('Ground Floor'), ('First Floor');`, (insertErr) => {
                            if (insertErr) console.error('Error inserting initial floors:', insertErr.message);
                            else console.log('Initial floor data inserted.');
                        });
                    }
                });
            }
        });

        // Create tables table (new)
        db.run(`
            CREATE TABLE IF NOT EXISTS tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                floor_id INTEGER NOT NULL,
                name TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'available', -- 'available', 'occupied'
                FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) {
                console.error('Error creating tables table:', err.message);
            } else {
                console.log('Tables table ensured.');
                db.get("SELECT COUNT(*) as count FROM tables", (err, row) => {
                    if (err) return;
                    if (row.count === 0) {
                        // Assuming Floor IDs: 1 for 'Ground Floor', 2 for 'First Floor' based on above inserts
                        db.run(`
                            INSERT INTO tables (floor_id, name, status) VALUES
                            ((SELECT id FROM floors WHERE name = 'Ground Floor'), 'Table 1', 'available'),
                            ((SELECT id FROM floors WHERE name = 'Ground Floor'), 'Table 2', 'available'),
                            ((SELECT id FROM floors WHERE name = 'First Floor'), 'Table 3', 'available'),
                            ((SELECT id FROM floors WHERE name = 'First Floor'), 'Table 4', 'available');
                        `, (insertErr) => {
                            if (insertErr) console.error('Error inserting initial tables:', insertErr.message);
                            else console.log('Initial table data inserted.');
                        });
                    }
                });
            }
        });


        // Create orders table
        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT UNIQUE NOT NULL,
                initial_total REAL NOT NULL,
                discount_percentage REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                final_total REAL NOT NULL,
                order_date TEXT NOT NULL,
                floor_id INTEGER, -- Changed to INTEGER to reference floors.id
                table_id INTEGER, -- Changed to INTEGER to reference tables.id
                cashier_id INTEGER,
                waiter_id INTEGER,
                payment_type TEXT,
                amount_paid REAL,
                change_due REAL,
                status TEXT NOT NULL, -- 'pending', 'completed', 'cancelled'
                FOREIGN KEY (cashier_id) REFERENCES users(id),
                FOREIGN KEY (waiter_id) REFERENCES users(id),
                FOREIGN KEY (floor_id) REFERENCES floors(id),
                FOREIGN KEY (table_id) REFERENCES tables(id)
            );
        `, (err) => {
            if (err) {
                console.error('Error creating orders table:', err.message);
            } else {
                console.log('Orders table ensured.');
            }
        });

        // Create order_items table
        db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price_at_sale REAL NOT NULL,
                item_status TEXT NOT NULL DEFAULT 'pending', -- NEW COLUMN: 'pending', 'cooked', 'ready'
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
        `, (err) => {
            if (err) {
                console.error('Error creating order_items table:', err.message);
            } else {
                console.log('Order_items table ensured.');
            }
        });
    });
});

// --- Helper Functions for Async SQLite Operations ---
// Define these globally so they can be reused across all API endpoints
const runDbAsync = (query, params) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) { // Use 'function' keyword for 'this.changes'
            if (err) reject(err);
            else resolve(this); // Resolve with 'this' to get changes, lastID etc.
        });
    });
};

const getDbAsync = (query, params) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const allDbAsync = (query, params) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Middleware - IMPORTANT: only define these once
app.use(cors());
app.use(express.json());

// --- API Endpoints ---

// GET /api/products: Fetches all products from the 'products' table
// Can optionally filter by category using a query parameter (e.g., /api/products?category=Beverages)
app.get('/api/products', async (req, res) => {
    const { category } = req.query; // Get category from query parameters

    let query = 'SELECT * FROM products';
    let params = [];

    if (category) {
        query += ' WHERE category = ?';
        params.push(category);
    }
    query += ' ORDER BY name ASC';

    try {
        const rows = await allDbAsync(query, params);
        res.json(rows); // Send the fetched products as a JSON response
    } catch (err) {
        console.error('Error fetching products from database:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch products.' });
    }
});

// POST /api/products: Adds a new product to the 'products' table
app.post('/api/products', async (req, res) => {
    // Frontend should send description and category
    const { name, description, price, stock_quantity, category } = req.body;

    // Basic validation
    if (!name || price === undefined || stock_quantity === undefined || !category) {
        return res.status(400).json({ message: 'Name, price, stock quantity, and category are required.' });
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({ message: 'Price must be a non-negative number.' });
    }
    if (isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0) {
        return res.status(400).json({ message: 'Stock quantity must be a non-negative integer.' });
    }

    try {
        const result = await runDbAsync(
            'INSERT INTO products (name, description, price, stock_quantity, category) VALUES (?, ?, ?, ?, ?)',
            [name, description || '', price, stock_quantity, category] // Use empty string for description if null/undefined
        );
        res.status(201).json({
            message: 'Product added successfully!',
            product: { id: result.lastID, name, description: description || '', price, stock_quantity, category }
        });
    } catch (err) {
        // Specifically check for unique constraint violation
        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
            return res.status(409).json({ message: `Product with name "${name}" already exists.` });
        }
        console.error('Error adding product to database:', err.message);
        res.status(500).json({ message: `Server Error: Could not add product. Details: ${err.message}` });
    }
});

// PUT /api/products/:id: Updates an existing product
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock_quantity, category } = req.body;

    if (!name || price === undefined || stock_quantity === undefined || !category) {
        return res.status(400).json({ message: 'Name, description, price, stock quantity, and category are required for update.' });
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({ message: 'Price must be a non-negative number.' });
    }
    if (isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0) {
        return res.status(400).json({ message: 'Stock quantity must be a non-negative integer.' });
    }

    try {
        const result = await runDbAsync(
            'UPDATE products SET name = ?, description = ?, price = ?, stock_quantity = ?, category = ? WHERE id = ?',
            [name, description || '', price, stock_quantity, category, id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Product not found or no changes made.' });
        }
        // Fetch the updated product to return it
        const updatedProduct = await getDbAsync('SELECT * FROM products WHERE id = ?', [id]);
        res.status(200).json({
            message: 'Product updated successfully!',
            product: updatedProduct
        });
    } catch (err) {
        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
            return res.status(409).json({ message: `Product with name "${name}" already exists.` });
        }
        console.error('Error updating product:', err.message);
        res.status(500).json({ message: `Server Error: Could not update product. Details: ${err.message}` });
    }
});

// DELETE /api/products/:id: Deletes a product
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await runDbAsync('DELETE FROM products WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.status(200).json({ message: 'Product deleted successfully!', deletedProductId: id });
    } catch (err) {
        console.error('Error deleting product:', err.message);
        res.status(500).json({ message: `Server Error: Could not delete product. Details: ${err.message}` });
    }
});

// GET /api/categories: Fetches all categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await allDbAsync('SELECT * FROM categories ORDER BY name ASC');
        res.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch categories.' });
    }
});

// POST /api/categories: Adds a new category
app.post('/api/categories', async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Category name is required.' });
    }

    try {
        const result = await runDbAsync(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || '']
        );
        res.status(201).json({
            message: 'Category added successfully!',
            category: { id: result.lastID, name, description: description || '' }
        });
    } catch (err) {
        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
            return res.status(409).json({ message: `Category with name "${name}" already exists.` });
        }
        console.error('Error adding category:', err.message);
        res.status(500).json({ message: `Server Error: Could not add category. Details: ${err.message}` });
    }
});

// DELETE /api/categories/:id: Deletes a category
app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Optional: Check if any products are linked to this category before deleting
        // const productsInCategory = await getDbAsync('SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)', [id]);
        // if (productsInCategory.count > 0) {
        //     return res.status(409).json({ message: `Cannot delete category. There are ${productsInCategory.count} products linked to it.` });
        // }

        const result = await runDbAsync('DELETE FROM categories WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Category not found.' });
        }
        res.status(200).json({ message: 'Category deleted successfully!', deletedCategoryId: id });
    } catch (err) {
        console.error('Error deleting category:', err.message);
        res.status(500).json({ message: `Server Error: Could not delete category. Details: ${err.message}` });
    }
});

// GET /api/floors: Fetches all floors
app.get('/api/floors', async (req, res) => {
    try {
        const floors = await allDbAsync('SELECT * FROM floors ORDER BY id ASC');
        res.json(floors);
    } catch (err) {
        console.error('Error fetching floors:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch floors.' });
    }
});

// POST /api/floors: Adds a new floor
app.post('/api/floors', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Floor name is required.' });
    }
    try {
        const result = await runDbAsync('INSERT INTO floors (name) VALUES (?)', [name]);
        res.status(201).json({ message: 'Floor added successfully!', id: result.lastID, name });
    } catch (err) {
        console.error('Error adding floor:', err.message);
        res.status(500).json({ message: `Server Error: Could not add floor. Details: ${err.message}` });
    }
});


// GET /api/tables: Fetches all tables
app.get('/api/tables', async (req, res) => {
    try {
        // Fetch tables along with their floor name
        const tables = await allDbAsync(`
            SELECT t.id, t.name, t.status, t.floor_id, f.name AS floor_name
            FROM tables t
            JOIN floors f ON t.floor_id = f.id
            ORDER BY f.name, t.name ASC
        `);
        res.json(tables);
    } catch (err) {
        console.error('Error fetching tables:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch tables.' });
    }
});

// POST /api/tables: Adds a new table
app.post('/api/tables', async (req, res) => {
    const { name, floorId } = req.body; // floorId is now the ID, not the name
    // Enhanced validation for floorId to ensure it's a valid number
    if (!name || floorId === undefined || floorId === null || isNaN(parseInt(floorId))) {
        return res.status(400).json({ message: 'Table name and a valid numeric floor ID are required.' });
    }
    try {
        const result = await runDbAsync('INSERT INTO tables (name, floor_id, status) VALUES (?, ?, ?)', [name, parseInt(floorId), 'available']);
        res.status(201).json({ message: 'Table added successfully!', id: result.lastID, name, floor_id: floorId, status: 'available' });
    } catch (err) {
        // Specifically check for unique constraint violation
        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
            return res.status(409).json({ message: `Table with name "${name}" already exists.` });
        }
        console.error('Error adding table:', err.message);
        res.status(500).json({ message: `Server Error: Could not add table. Details: ${err.message}` });
    }
});

// PUT /api/tables/:id: Updates a table
app.put('/api/tables/:id', async (req, res) => {
    const { id } = req.params;
    const { name, floorId, status } = req.body; // New: status can also be updated

    if (!name || floorId === undefined || floorId === null || isNaN(parseInt(floorId)) || !status) {
        return res.status(400).json({ message: 'Table name, valid numeric floor ID, and status are required for update.' });
    }

    const validStatuses = ['available', 'occupied'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value. Must be "available" or "occupied".' });
    }

    try {
        const result = await runDbAsync(
            'UPDATE tables SET name = ?, floor_id = ?, status = ? WHERE id = ?',
            [name, parseInt(floorId), status, id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Table not found or no changes made.' });
        }
        // Fetch the updated table to return it, including floor_name
        const updatedTable = await getDbAsync(`
            SELECT t.id, t.name, t.status, t.floor_id, f.name AS floor_name
            FROM tables t JOIN floors f ON t.floor_id = f.id WHERE t.id = ?
        `, [id]);
        res.status(200).json({ message: 'Table updated successfully!', table: updatedTable });
    } catch (err) {
        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
            return res.status(409).json({ message: `Table with name "${name}" already exists.` });
        }
        console.error('Error updating table:', err.message);
        res.status(500).json({ message: `Server Error: Could not update table. Details: ${err.message}` });
    }
});


// DELETE /api/tables/:id: Deletes a table
app.delete('/api/tables/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Check for associated orders before deleting the table
        const existingOrders = await getDbAsync('SELECT COUNT(*) as count FROM orders WHERE table_id = ?', [id]);
        if (existingOrders.count > 0) {
            return res.status(409).json({ message: `Cannot delete table. There are ${existingOrders.count} associated orders.` });
        }

        const result = await runDbAsync('DELETE FROM tables WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Table not found.' });
        }
        res.status(200).json({ message: 'Table deleted successfully!', deletedTableId: id });
    } catch (err) {
        console.error('Error deleting table:', err.message);
        res.status(500).json({ message: `Server Error: Could not delete table. Details: ${err.message}` });
    }
});


// PATCH /api/tables/:id/status: Updates the status of a table (e.g., from available to occupied)
app.patch('/api/tables/:id/status', async (req, res) => {
    const { id } = req.params; // Table ID
    const { status } = req.body; // New status (e.g., 'available', 'occupied')

    if (!status) {
        return res.status(400).json({ message: 'New status is required.' });
    }

    // Validate status value
    const validStatuses = ['available', 'occupied'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value. Must be "available" or "occupied".' });
    }

    try {
        const result = await runDbAsync(`
            UPDATE tables SET status = ? WHERE id = ?
        `, [status, id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Table not found or status already same.' });
        }
        res.status(200).json({ message: `Table ${id} status updated to ${status}.` });
    } catch (err) {
        console.error('Error updating table status:', err.message);
        res.status(500).json({ message: `Server Error: Could not update table status. Details: ${err.message}` });
    }
});


// POST /api/orders: Processes a new order (saves to DB and updates stock)
// This endpoint now handles both 'pending' orders (waiter) and 'completed' payments (cashier/manager/admin)
app.post('/api/orders', async (req, res) => {
    const { items, initialTotal, discountPercentage, discountAmount, finalTotal, orderDate, floorId, tableId, cashierId, waiterId, paymentType, amountPaid, changeDue, status } = req.body;

    let transactionId = `ORD-${Date.now()}`; // Generate a unique transaction ID
    let orderId; // To store the newly created order's ID

    try {
        // Start a transaction for atomicity (all or nothing)
        await runDbAsync('BEGIN TRANSACTION');

        // 1. Basic inventory check simulation before proceeding (only for new orders/pending status)
        if (status === 'pending' || status === 'completed') { // Deduct stock for both pending and immediate completed orders
            for (const item of items) {
                const product = await getDbAsync('SELECT id, name, stock_quantity FROM products WHERE id = ?', [item.product.id]);
                if (!product) {
                    await runDbAsync('ROLLBACK');
                    return res.status(400).json({ message: `Product with ID ${item.product.id} not found.` });
                }
                if (product.stock_quantity < item.quantity) {
                    await runDbAsync('ROLLBACK');
                    return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}.` });
                }
                // Deduct stock immediately when order is taken (pending or completed)
                await runDbAsync(
                    'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                    [item.quantity, item.product.id]
                );
                console.log(`Deducted stock for product ID ${item.product.id} by -${item.quantity} for new order.`);
            }
        }


        // 2. Insert into 'orders' table
        const orderInsertResult = await runDbAsync(
            `INSERT INTO orders (transaction_id, initial_total, discount_percentage, discount_amount, final_total, order_date, floor_id, table_id, cashier_id, waiter_id, payment_type, amount_paid, change_due, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [transactionId, initialTotal, discountPercentage, discountAmount, finalTotal, orderDate, floorId, tableId, cashierId, waiterId, paymentType, amountPaid, changeDue, status]
        );
        orderId = orderInsertResult.lastID; // Get the ID of the newly inserted order

        // 3. Insert into 'order_items' table for each item
        for (const item of items) {
            await runDbAsync(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_sale, item_status) VALUES (?, ?, ?, ?, ?, ?)', // Added item_status
                [orderId, item.product.id, item.product.name, item.quantity, item.product.price, 'pending'] // Default item_status to 'pending'
            );
        }

        // 4. Update Table Status based on order status (only if a table was associated)
        if (tableId !== null && tableId !== undefined) { // Check for null or undefined floorId/tableId for walk-in
            const newTableStatus = (status === 'pending') ? 'occupied' : 'available'; // Set occupied if pending, available if completed immediately
            await runDbAsync(`UPDATE tables SET status = ? WHERE id = ?`, [newTableStatus, tableId]);
            console.log(`Table ${tableId} status updated to ${newTableStatus}.`);
        }

        await runDbAsync('COMMIT'); // Commit the transaction
        console.log(`Order processed. Transaction ID: ${transactionId}. Status: ${status}`);
        res.status(201).json({ message: 'Order processed successfully!', transactionId, orderId });

    } catch (err) {
        await runDbAsync('ROLLBACK'); // Rollback if any error occurs
        console.error('Error processing order or updating stock/table:', err.message);
        res.status(500).json({ message: `Server Error: Could not process order. Details: ${err.message}` });
    }
});

// GET /api/transactions: Fetches all completed orders (for Transaction History)
app.get('/api/transactions', async (req, res) => {
    try {
        // Fetch all orders with 'completed' status, joining with users, floors, and tables
        const orders = await allDbAsync(`
            SELECT
                o.id, o.transaction_id, o.initial_total, o.discount_percentage, o.discount_amount, o.final_total,
                o.order_date, o.payment_type, o.amount_paid, o.change_due, o.status,
                f.name AS floor_name, t.name AS table_name,
                c.username AS cashier_username, w.username AS waiter_username
            FROM orders o
            LEFT JOIN floors f ON o.floor_id = f.id
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users c ON o.cashier_id = c.id
            LEFT JOIN users w ON o.waiter_id = w.id
            WHERE o.status = 'completed'
            ORDER BY o.order_date DESC
        `);

        // For each order, fetch its items
        const transactionsWithItems = await Promise.all(orders.map(async (order) => {
            const items = await allDbAsync('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
            return { ...order, items: items };
        }));

        res.json(transactionsWithItems);
    } catch (err) {
        console.error('Error fetching transactions:', err.message);
        res.status(500).json({ message: `Server Error: Could not fetch transactions. Details: ${err.message}` });
    }
});

// GET /api/pending-orders: Fetches all pending orders (for Manager/Admin/Cashier to view)
// Also includes order items and table/floor details
app.get('/api/pending-orders', async (req, res) => {
    try {
        // Fetch all orders with 'pending' status
        const orders = await allDbAsync(`
            SELECT
                o.id, o.transaction_id, o.initial_total, o.discount_percentage, o.discount_amount, o.final_total,
                o.order_date, o.payment_type, o.amount_paid, o.change_due, o.status, o.floor_id,
                f.name AS floor_name, t.name AS table_name, t.id AS table_id, t.status AS table_current_status,
                w.username AS waiter_username, w.id AS waiter_id
            FROM orders o
            LEFT JOIN floors f ON o.floor_id = f.id
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users w ON o.waiter_id = w.id
            WHERE o.status IN ('pending', 'prepared', 'served') -- Include 'prepared' and 'served' for visibility
            ORDER BY o.order_date ASC
        `);

        // For each order, fetch its items, including their item_status
        const pendingOrdersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await allDbAsync('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
            return { ...order, items: items.map(item => ({
                product: {
                    id: item.product_id,
                    name: item.product_name,
                    price: item.price_at_sale // This is price_at_sale, not current product price
                },
                quantity: item.quantity,
                item_id: item.id, // Include item_id for kitchen updates
                item_status: item.item_status // Include item_status
            })) };
        }));

        res.json(pendingOrdersWithItems);
    } catch (err) {
        console.error('Error fetching pending orders:', err.message);
        res.status(500).json({ message: `Server Error: Could not fetch pending orders. Details: ${err.message}` });
    }
});

// PATCH /api/orders/:id/status: Updates the status of an order (e.g., pending -> prepared -> served)
app.patch('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params; // Order ID
    const { status } = req.body; // New status (e.g., 'prepared', 'served')

    if (!status) {
        return res.status(400).json({ message: 'New status is required.' });
    }

    const validStatuses = ['pending', 'prepared', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}.` });
    }

    try {
        const result = await runDbAsync(
            `UPDATE orders SET status = ? WHERE id = ?`,
            [status, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Order not found or status already same.' });
        }
        res.status(200).json({ message: `Order ${id} status updated to ${status}.`, newStatus: status });
    } catch (err) {
        console.error('Error updating order status:', err.message);
        res.status(500).json({ message: `Server Error: Could not update order status. Details: ${err.message}` });
    }
});


// PATCH /api/orders/:id/complete: Updates the status of a pending order to 'completed'
app.patch('/api/orders/:id/complete', async (req, res) => {
    const { id } = req.params; // Order ID
    const { paymentType, amountPaid, discountPercentage, discountAmount, changeDue, cashierId } = req.body;

    try {
        await runDbAsync('BEGIN TRANSACTION');

        // Update the order status and payment details
        const result = await runDbAsync(
            `UPDATE orders SET
                status = ?,
                payment_type = ?,
                amount_paid = ?,
                discount_percentage = ?,
                discount_amount = ?,
                change_due = ?,
                cashier_id = ?
             WHERE id = ? AND status IN ('pending', 'prepared', 'served')`, // Allow completion from any active status
            ['completed', paymentType, amountPaid, discountPercentage, discountAmount, changeDue, cashierId, id]
        );

        if (result.changes === 0) {
            await runDbAsync('ROLLBACK');
            return res.status(404).json({ message: 'Active order not found or already completed/cancelled.' });
        }

        // Get the table_id associated with this order
        const order = await getDbAsync('SELECT table_id FROM orders WHERE id = ?', [id]);
        if (order && (order.table_id !== null && order.table_id !== undefined)) { // Only update if a table was associated
            await runDbAsync(`UPDATE tables SET status = 'available' WHERE id = ?`, [order.table_id]);
            console.log(`Table ${order.table_id} status updated to 'available' after order completion.`);
        }

        await runDbAsync('COMMIT');
        res.status(200).json({ message: 'Order completed successfully.', orderId: id, newStatus: 'completed' });
    }  catch (err) {
        // FIX: Corrected from 'runDb' to 'runDbAsync'
        await runDbAsync('ROLLBACK');
        console.error('Error completing order:', err.message);
        res.status(500).json({ message: `Server Error: Could not complete order. Details: ${err.message}` });
    }
});


// GET /api/users: Fetches all users (for User Management page)
app.get('/api/users', async (req, res) => {
    try {
        // Include email and full_name for Sales Analysis User Report
        const users = await allDbAsync('SELECT id, username, role, email, full_name FROM users');
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({ message: `Server Error: Could not fetch users. Details: ${err.message}` });
    }
});

// PUT /api/users/:id: Updates an existing user's username or role (and optionally password)
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, role, newPin, email, full_name } = req.body; // Added email, full_name

    if (!username || !role) {
        return res.status(400).json({ message: 'Username and Role are required for update.' });
    }

    // Role validation
    const allowedRoles = ['admin', 'manager', 'cashier', 'waiter', 'chef'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role: ${role}. Allowed roles are: ${allowedRoles.join(', ')}.` });
    }

    try {
        // Check if the new username already exists for another user
        const existingUserWithUsername = await getDbAsync('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
        if (existingUserWithUsername) {
            return res.status(409).json({ message: 'Username already taken by another user.' });
        }

        let query = 'UPDATE users SET username = ?, role = ?, email = ?, full_name = ?';
        let params = [username, role, email || null, full_name || null]; // Allow null for email/full_name if not provided

        if (newPin) {
            // If a new PIN is provided, hash it and add to the update query
            const hashedPassword = await bcrypt.hash(newPin.toString(), 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        const result = await runDbAsync(query, params);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'User not found or no changes made.' });
        }
        // Fetch the updated user to return it (excluding password)
        const updatedUser = await getDbAsync('SELECT id, username, role, email, full_name FROM users WHERE id = ?', [id]);
        res.status(200).json({
            message: 'User updated successfully!',
            user: updatedUser
        });
    } catch (err) {
        console.error('Error updating user:', err.message);
        res.status(500).json({ message: `Server Error: Could not update user. Details: ${err.message}` });
    }
});


// DELETE /api/users/:id: Deletes a user
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await runDbAsync('DELETE FROM users WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err.message);
        res.status(500).json({ message: `Server Error: Could not delete user. Details: ${err.message}` });
    }
});

// POST /api/register: Allows an Admin to create new users
app.post('/api/register', async (req, res) => {
    const { username, pin, role, email, full_name } = req.body; // Added email, full_name

    if (!username || !pin || !role) {
        return res.status(400).json({ message: 'Username, PIN, and Role are required.' });
    }

    // Role validation
    const allowedRoles = ['admin', 'manager', 'cashier', 'waiter', 'chef'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role: ${role}. Allowed roles are: ${allowedRoles.join(', ')}.` });
    }


    try {
        // Check if username already exists
        const userExists = await getDbAsync('SELECT * FROM users WHERE username = ?', [username]);
        if (userExists) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(pin.toString(), saltRounds);

        await runDbAsync(
            'INSERT INTO users (username, password, role, email, full_name) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, role, email || null, full_name || null] // Allow null for email/full_name
        );

        res.status(201).json({
            message: 'User registered successfully!',
            user: { username, role, email, full_name } // Only return safe user info
        });
    } catch (err) {
        console.error('Error registering user:', err.message);
        res.status(500).json({ message: `Server Error: Could not register user. Details: ${err.message}` });
    }
});

// POST /api/login: Handles user authentication
app.post('/api/login', async (req, res) => {
    const { username, pin } = req.body;

    if (!username || !pin) {
        return res.status(400).json({ message: 'Username and PIN are required.' });
    }

    try {
        const user = await getDbAsync('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(pin.toString(), user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        res.status(200).json({
            message: 'Login successful!',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.full_name || user.username // Use full_name if available, otherwise username
            }
        });

    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).json({ message: `Server Error: Could not log in. Details: ${err.message}` });
    }
});

// --- NEW KITCHEN DISPLAY ENDPOINTS ---

// GET /api/kitchen/pending-items: Fetches all individual order items that are part of pending orders
// and are not yet 'ready'.
app.get('/api/kitchen/pending-items', async (req, res) => {
    try {
        const kitchenItems = await allDbAsync(`
            SELECT
                oi.id AS item_id,
                oi.order_id,
                oi.product_name,
                oi.quantity,
                oi.item_status,
                o.transaction_id,
                o.order_date,
                o.floor_id,
                f.name AS floor_name,
                o.table_id,
                t.name AS table_name
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            LEFT JOIN floors f ON o.floor_id = f.id
            LEFT JOIN tables t ON o.table_id = t.id
            WHERE o.status IN ('pending', 'prepared') AND oi.item_status != 'ready' -- Only show items from active orders that are not yet ready
            ORDER BY o.order_date ASC, o.table_id ASC, oi.id ASC;
        `);
        res.json(kitchenItems);
    } catch (err) {
        console.error('Error fetching kitchen pending items:', err.message);
        res.status(500).json({ message: `Server Error: Could not fetch kitchen items. Details: ${err.message}` });
    }
});

// PATCH /api/kitchen/order-items/:item_id/status: Updates the status of a specific order item.
app.patch('/api/kitchen/order-items/:item_id/status', async (req, res) => {
    const { item_id } = req.params;
    const { status } = req.body; // 'pending', 'cooked', 'ready'

    if (!status) {
        return res.status(400).json({ message: 'New item status is required.' });
    }

    const validStatuses = ['pending', 'cooked', 'ready'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid item status. Must be one of: ${validStatuses.join(', ')}.` });
    }

    try {
        const result = await runDbAsync(`
            UPDATE order_items SET item_status = ? WHERE id = ?
        `, [status, item_id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Order item not found or status already same.' });
        }
        res.status(200).json({ message: `Order item ${item_id} status updated to ${status}.`, newItemStatus: status });
    } catch (err) {
        console.error('Error updating order item status:', err.message);
        res.status(500).json({ message: `Server Error: Could not update order item status. Details: ${err.message}` });
    }
});


// --- NEW SALES ANALYSIS ENDPOINTS ---

// Helper function to get date in YYYY-MM-DD format
const getFormattedDate = (date) => {
    return date.toISOString().split('T')[0];
};

// Helper to calculate start and end of current and previous periods for sales analysis
const getSqliteDateRangeWithPrevious = (period) => {
    const now = new Date();
    let currentStartDate;
    let currentEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // End of current day
    let previousStartDate;
    let previousEndDate;

    switch (period) {
        case 'today':
            currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
            break;
        case 'month':
            currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // Last day of previous month
            break;
        case 'year':
            currentStartDate = new Date(now.getFullYear(), 0, 1);
            previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
            previousEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999); // Last day of previous year
            break;
        case 'last7days': // For daily trend, no direct 'previous' equivalent for percentage change, but kept for consistency
            currentStartDate = new Date(now);
            currentStartDate.setDate(now.getDate() - 6);
            break;
        case 'last6months': // For monthly comparison, no direct 'previous' equivalent for percentage change, but kept for consistency
            currentStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            break;
        default:
            currentStartDate = new Date(0); // Epoch for 'all time'
            previousStartDate = new Date(0); // Also epoch
            previousEndDate = new Date(0);
    }

    return {
        current: { start: currentStartDate.toISOString(), end: currentEndDate.toISOString() },
        previous: { start: previousStartDate?.toISOString(), end: previousEndDate?.toISOString() }
    };
};

const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? 100 : 0; // If previous was 0 and current is > 0, it's a 100% "gain". If both 0, 0% change.
    }
    return parseFloat(((current - previous) / previous * 100).toFixed(1)); // Format to one decimal place
};

// GET /api/sales/metrics: Provides overall sales metrics with dynamic gains
app.get('/api/sales/metrics', async (req, res) => {
    try {
        // Today's Sales
        const todayRanges = getSqliteDateRangeWithPrevious('today');
        const todaySalesRow = await getDbAsync(
            `SELECT SUM(final_total) AS total FROM orders WHERE status = 'completed' AND order_date >= ? AND order_date <= ?`,
            [todayRanges.current.start, todayRanges.current.end]
        );
        const yesterdaySalesRow = await getDbAsync(
            `SELECT SUM(final_total) AS total FROM orders WHERE status = 'completed' AND order_date >= ? AND order_date <= ?`,
            [todayRanges.previous.start, todayRanges.previous.end]
        );
        const todaySales = todaySalesRow.total || 0;
        const yesterdaySales = yesterdaySalesRow.total || 0;
        const todaySalesChange = calculatePercentageChange(todaySales, yesterdaySales);

        // This Month's Sales
        const monthRanges = getSqliteDateRangeWithPrevious('month');
        const thisMonthSalesRow = await getDbAsync(
            `SELECT SUM(final_total) AS total FROM orders WHERE status = 'completed' AND order_date >= ? AND order_date <= ?`,
            [monthRanges.current.start, monthRanges.current.end]
        );
        const lastMonthSalesRow = await getDbAsync(
            `SELECT SUM(final_total) AS total FROM orders WHERE status = 'completed' AND order_date >= ? AND order_date <= ?`,
            [monthRanges.previous.start, monthRanges.previous.end]
        );
        const thisMonthSales = thisMonthSalesRow.total || 0;
        const lastMonthSales = lastMonthSalesRow.total || 0;
        const thisMonthSalesChange = calculatePercentageChange(thisMonthSales, lastMonthSales);

        // Total Sales YTD (Year-to-Date)
        const yearRanges = getSqliteDateRangeWithPrevious('year');
        const totalSalesYTDRow = await getDbAsync(
            `SELECT SUM(final_total) AS total FROM orders WHERE status = 'completed' AND order_date >= ? AND order_date <= ?`,
            [yearRanges.current.start, yearRanges.current.end]
        );
        const lastYearSalesSamePeriodRow = await getDbAsync(
            `SELECT SUM(final_total) AS total FROM orders WHERE status = 'completed' AND order_date >= ? AND order_date <= ?`,
            [yearRanges.previous.start, yearRanges.previous.end]
        );
        const totalSalesYTD = totalSalesYTDRow.total || 0;
        const lastYearSalesSamePeriod = lastYearSalesSamePeriodRow.total || 0;
        const totalSalesYTDChange = calculatePercentageChange(totalSalesYTD, lastYearSalesSamePeriod);

        // Overall Sales and Change (e.g., from app's inception to today vs. prior similar period, or simply overall YTD vs previous YTD)
        // For simplicity, let's make overall change compare current YTD against previous YTD.
        const salesChangeOverall = totalSalesYTD - lastYearSalesSamePeriod;
        const salesChangeOverallPercent = calculatePercentageChange(totalSalesYTD, lastYearSalesSamePeriod);


        res.json({
            todaySales: todaySales,
            todaySalesChange: todaySalesChange,
            thisMonthSales: thisMonthSales,
            thisMonthSalesChange: thisMonthSalesChange,
            totalSalesYTD: totalSalesYTD,
            totalSalesYTDChange: totalSalesYTDChange,
            salesChangeOverall: salesChangeOverall,
            salesChangeOverallPercent: salesChangeOverallPercent,
        });
    } catch (err) {
        console.error('Error fetching sales metrics:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch sales metrics.' });
    }
});

// GET /api/sales/daily-trend: Provides daily sales data for the last 7 days
app.get('/api/sales/daily-trend', async (req, res) => {
    try {
        const { current: { start, end } } = getSqliteDateRangeWithPrevious('last7days'); // Get range for last 7 days

        // Query to group by date and sum sales, formatted as YYYY-MM-DD
        const dailySales = await allDbAsync(`
            SELECT
                SUBSTR(order_date, 1, 10) AS date,
                SUM(final_total) AS sales
            FROM orders
            WHERE status = 'completed' AND order_date >= ? AND order_date <= ?
            GROUP BY date
            ORDER BY date ASC;
        `, [start, end]);

        // Create a map for easy lookup
        const salesMap = new Map();
        dailySales.forEach(row => {
            salesMap.set(row.date, row.sales);
        });

        // Generate data for the last 7 days, filling in 0 for days with no sales
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getFormattedDate(d);
            result.push({
                name: dateStr.substring(5), // Format as MM-DD
                sales: salesMap.get(dateStr) || 0
            });
        }

        res.json(result);
    } catch (err) {
        console.error('Error fetching daily sales trend:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch daily sales trend.' });
    }
});

// GET /api/sales/monthly-comparison: Provides monthly sales comparison for the last 6 months
app.get('/api/sales/monthly-comparison', async (req, res) => {
    try {
        const { current: { start, end } } = getSqliteDateRangeWithPrevious('last6months'); // Get range for last 6 months

        // Query to group by year-month and sum sales
        const monthlySales = await allDbAsync(`
            SELECT
                STRFTIME('%Y-%m', order_date) AS month_year,
                SUM(final_total) AS total_sales
            FROM orders
            WHERE status = 'completed' AND order_date >= ? AND order_date <= ?
            GROUP BY month_year
            ORDER BY month_year ASC;
        `, [start, end]);

        const salesMap = new Map();
        monthlySales.forEach(row => {
            salesMap.set(row.month_year, row.total_sales);
        });

        const result = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();

        for (let i = 5; i >= 0; i--) { // Last 6 months including current
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthYear = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; // Correctly format for map key
            const monthName = monthNames[d.getMonth()];

            // To get a "previous" value, we would need to fetch data from the same month of the previous year
            // or a preceding period. For simplicity, we'll assign 'previous' a value based on mock logic.
            // Let's make it a simple derived value for the demo.
            const currentMonthSales = salesMap.get(monthYear) || 0;
            // Simulate previous month sales: 80% of current sales for earlier months, 90% for recent
            let previousMonthSalesMock;
            if (i >= 3) { // Older months
                previousMonthSalesMock = currentMonthSales * 0.8;
            } else { // More recent months
                previousMonthSalesMock = currentMonthSales * 0.9;
            }


            result.push({
                name: monthName,
                current: currentMonthSales,
                previous: Math.max(0, parseFloat(previousMonthSalesMock.toFixed(2))) // Ensure not negative and formatted
            });
        }

        res.json(result);
    } catch (err) {
        console.error('Error fetching monthly comparison:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch monthly comparison data.' });
    }
});


// GET /api/sales/user-report: Provides sales data aggregated by user
app.get('/api/sales/user-report', async (req, res) => {
    try {
        // Aggregate sales by cashier
        const cashierSales = await allDbAsync(`
            SELECT
                u.id,
                u.username,
                u.role,
                u.email,
                u.full_name,
                SUM(o.final_total) AS totalSales,
                COUNT(o.id) AS orders
            FROM orders o
            JOIN users u ON o.cashier_id = u.id
            WHERE o.status = 'completed'
            GROUP BY u.id, u.username, u.role, u.email, u.full_name
            ORDER BY totalSales DESC;
        `);

        // Aggregate sales by waiter (for orders where waiter_id is present and a cashier eventually completed it)
        const waiterSales = await allDbAsync(`
            SELECT
                u.id,
                u.username,
                u.role,
                u.email,
                u.full_name,
                SUM(o.final_total) AS totalSales,
                COUNT(o.id) AS orders
            FROM orders o
            JOIN users u ON o.waiter_id = u.id
            WHERE o.status = 'completed' AND o.waiter_id IS NOT NULL
            GROUP BY u.id, u.username, u.role, u.email, u.full_name
            ORDER BY totalSales DESC;
        `);

        // Combine and de-duplicate (if a user is both cashier and waiter, combine their stats)
        const userMap = new Map();

        [...cashierSales, ...waiterSales].forEach(user => {
            if (userMap.has(user.id)) {
                const existingUser = userMap.get(user.id);
                existingUser.totalSales += user.totalSales;
                existingUser.orders += user.orders;
            } else {
                // Add a mock 'change' value for display consistency with frontend
                userMap.set(user.id, {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    totalSales: user.totalSales,
                    orders: user.orders,
                    change: (Math.random() * 30 - 15).toFixed(1) // Random change between -15% and +15%
                });
            }
        });

        const result = Array.from(userMap.values()).sort((a, b) => b.totalSales - a.totalSales);

        res.json(result);
    } catch (err) {
        console.error('Error fetching user sales report:', err.message);
        res.status(500).json({ message: 'Server Error: Could not fetch user sales report.' });
    }
});


// Start the Node.js Express server
app.listen(port, () => {
    console.log(`Node.js backend server is running on http://localhost:${port}`);
});
