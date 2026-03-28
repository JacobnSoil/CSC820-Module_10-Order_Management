const express = require('express')
const sqlite = require('better-sqlite3')
const db = new sqlite('./database/orders.db')
const app = express()
const port = 3000

app.use(express.json())

db.exec(
    `CREATE TABLE IF NOT EXISTS order_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL,
    price REAL NOT NULL
  )`
);

app.get('/', (req, res) => {
    res.json({ message: 'API is running' })
})

function later(delay) {
    return new Promise(function (resolve) {
        setTimeout(resolve, delay);
    });
}

app.post('/orders', async (req, res) => {
    if (Object.keys(req.body).length === 0) {
        res.status(400).json({ message: "Bad Request" })
    } else if (!req.body.item) {
        res.status(400).json({ message: "Missing Item" })
    } else if (!req.body.quantity) {
        res.status(400).json({ message: "Missing Quantity" })
    } else if (!req.body.price) {
        res.status(400).json({ message: "Missing Price" })
    } else {
        try {
            let result = db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run(req.body.item, req.body.quantity, 'pending', req.body.price)
            let order = db.prepare('SELECT * FROM order_info WHERE id = ?').get(result.lastInsertRowid)
            await later(2000)
            res.status(201).json(order)
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
});

app.get('/orders', (req, res) => {
    let orders = db.prepare('SELECT * FROM order_info').all()
    res.status(200).json({ orders: orders })
});

app.get('/orders/:id', (req, res) => {
    if (isNaN(req.params.id)) {
        res.status(400).json({ message: "Bad Request" })
    } else {
        let CustomerId = parseInt(req.params.id)
        let CustomerOrder = db.prepare('SELECT * FROM order_info WHERE id = ?').get(CustomerId)
        if (CustomerOrder === undefined) {
            res.status(404).json({ message: "Not found" })
        } else {
            res.status(200).json({ CustomerOrder })
        }
    }
});

app.patch('/orders/:id', (req, res) => {
    if (Object.keys(req.body).length === 0) {
        res.status(400).json({ message: "Bad Request" })
    } else if (isNaN(req.params.id)) {
        res.status(400).json({ message: "Bad Request" })
    } else {
        let CustomerId = parseInt(req.params.id)
        let CustomerOrder = db.prepare('SELECT * FROM order_info WHERE id = ?').get(CustomerId)
        if (CustomerOrder === undefined) {
            res.status(404).json({ message: "Not found" })
        } else {
            let result = db.prepare('UPDATE order_info SET status = ? WHERE id = ?').run(req.body.status, CustomerId)
            if (result.changes === 0) {
                res.status(500).json({ message: "SQL Script Failure" })
            } else {
                let order = db.prepare('SELECT * FROM order_info WHERE id = ?').get(CustomerId)
                res.status(200).json({ order })
            }
        }
    }
});

app.delete('/orders/:id', (req, res) => {
    if (isNaN(req.params.id)) {
        res.status(400).json({ message: "Bad Request" })
    } else {
        let CustomerId = parseInt(req.params.id)
        let CustomerOrder = db.prepare('SELECT * FROM order_info WHERE id = ?').get(CustomerId)
        if (CustomerOrder === undefined) {
            res.status(404).json({ message: "Not found" })
        } else {
            let result = db.prepare('DELETE FROM order_info WHERE id = ?').run(CustomerId)
            if (result.changes === 0) {
                res.status(500).json({ message: "SQL Script Failure" })
            } else {
                res.status(200).json({ CustomerOrder })
            }
        }
    }
});

app.listen(port, () => {
    console.log(`Order Manager listening on port ${port}`)
})