process.env.DB_PATH = ':memory:';
const request = require('supertest');
const app = require('../app');
const { db } = require('../app');

beforeEach(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS order_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL,
        price REAL NOT NULL
    )`);
    db.exec('DELETE FROM order_info');
    db.exec("DELETE FROM sqlite_sequence WHERE name='order_info'");
});

afterAll(() => { db.close(); });

describe('Integration: POST /orders', () => {

    it('CREATE-1: POSTed order is persisted in DB', async () => {
        await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: 1, price: 5.00 });

        const row = db.prepare('SELECT * FROM order_info WHERE item = ?').get('peach');
        expect(row).toBeDefined();
        expect(row.quantity).toBe(1);
        expect(row.status).toBe('pending');
        expect(row.price).toBe(5.00);
    });

    it('CREATE-2: sequential POSTs produce sequential IDs', async () => {
        const r1 = await request(app).post('/orders').send({ item: 'peach', quantity: 1, price: 5.00 });
        const r2 = await request(app).post('/orders').send({ item: 'apple', quantity: 2, price: 3.00 });
        expect(r2.body.id).toBe(r1.body.id + 1);
    });

    it('CREATE-3: Database error handled gracefully', async () => {
        db.exec('DROP TABLE order_info');
        const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: 1, price: 5.00 });
        expect(res.status).toBe(500);
        expect(res.body.message).toBeDefined();

        db.exec(`CREATE TABLE order_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL,
            price REAL NOT NULL
        )`);
    });

});

describe('Integration: GET /orders', () => {

    it('READ-1: GET returns list of orders', async () => {
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('peach', 1, 'pending', 5.00);
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('apple', 2, 'pending', 3.00);

        const res = await request(app).get('/orders');
        expect(res.status).toBe(200);
        expect(res.body.orders).toBeDefined();
        expect(res.body.orders.length).toBe(2);
        expect(res.body.orders[0].item).toBe('peach');
        expect(res.body.orders[1].item).toBe('apple');
    });

    it('READ-2: ID returns correct order', async () => {
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)')
        .run('peach', 1, 'pending', 5.00);
        const res = await request(app).get('/orders/1');
        expect(res.status).toBe(200);
        expect(res.body.CustomerOrder.id).toBe(1);
        expect(res.body.CustomerOrder.item).toBe('peach');
    });

    it('READ-3: GET reflects DB state after POST', async () => {
        await request(app).post('/orders').send({ item: 'peach', quantity: 1, price: 5.00 });
        const res = await request(app).get('/orders');
        expect(res.status).toBe(200);
        expect(res.body.orders).toBeDefined();
        expect(res.body.orders.length).toBe(1);
        expect(res.body.orders[0].item).toBe('peach');
    });
});

describe('Integration: PATCH /orders/:id', () => {

    it('UPDATE-1: Status change persists in DB', async () => {
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('peach', 1, 'pending', 5.00);
        const res = await request(app).patch('/orders/1').send({ status: 'completed' });
        expect(res.status).toBe(200);

        const row = db.prepare('SELECT * FROM order_info WHERE id = ?').get(1);
        expect(row).toBeDefined();
        expect(row.status).toBe('completed');
    });

    it('UPDATE-2: PATCH on non-existent ID leaves DB unchanged', async () => {
        const res = await request(app).patch('/orders/999').send({ status: 'completed' });
        expect(res.status).toBe(404);

        const rows = db.prepare('SELECT * FROM order_info').all();
        expect(rows.length).toBe(0);
    });

    it('UPDATE-3: Only target order is updated', async () => {
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('peach', 1, 'pending', 5.00);
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('apple', 2, 'pending', 3.00);

        const res = await request(app).patch('/orders/1').send({ status: 'completed' });
        expect(res.status).toBe(200);

        const row1 = db.prepare('SELECT * FROM order_info WHERE id = ?').get(1);
        const row2 = db.prepare('SELECT * FROM order_info WHERE id = ?').get(2);
        expect(row1.status).toBe('completed');
        expect(row2.status).toBe('pending');
    });
});

describe('Integration: DELETE /orders/:id', () => {
    
    it('DELETE-11: record is removed from DB', async () => {
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('peach', 1, 'pending', 5.00);
        const res = await request(app).delete('/orders/1');
        expect(res.status).toBe(200);

        const row = db.prepare('SELECT * FROM order_info WHERE id = ?').get(1);
        expect(row).toBeUndefined();
    });

    it('DELETE-12: Only target record is removed', async () => {
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('peach', 1, 'pending', 5.00);
        db.prepare('INSERT INTO order_info (item, quantity, status, price) VALUES (?, ?, ?, ?)').run('apple', 2, 'pending', 3.00);

        const res = await request(app).delete('/orders/1');
        expect(res.status).toBe(200);

        const row1 = db.prepare('SELECT * FROM order_info WHERE id = ?').get(1);
        const row2 = db.prepare('SELECT * FROM order_info WHERE id = ?').get(2);
        expect(row1).toBeUndefined();
        expect(row2).toBeDefined();
    });
});
