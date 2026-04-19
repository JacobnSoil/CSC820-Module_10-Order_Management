jest.mock('better-sqlite3', () => {
  const mockStmt = {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
  };
  const mockDb = {
    prepare: jest.fn().mockReturnValue(mockStmt),
    exec: jest.fn(),
  };
  return jest.fn(() => mockDb);
});

const request = require('supertest');
const Database = require('better-sqlite3');
const app = require('../app');

describe('Order API', () => {
  let mockStmt;
  beforeEach(() => {
    jest.clearAllMocks();
    mockStmt = Database().prepare();
  });

    describe('POST /orders', () => {

        it('POST-1: creates order with valid input', async () => {
            mockStmt.run.mockReturnValue({ lastInsertRowid: 1 });
            mockStmt.get.mockReturnValue({
            id: 1, item: 'peach', quantity: 1, status: 'pending', price: 5.00,
            });

            const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: 1, price: 5.00 });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(
            expect.objectContaining({ item: 'peach', status: 'pending' })
            );
            expect(mockStmt.run).toHaveBeenCalled();
        });

        it('POST-2: returns 400 on empty body', async () => {
            const res = await request(app).post('/orders').send({});
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
            expect(mockStmt.run).not.toHaveBeenCalled(); 
        });

        it('POST-3: returns 400 when item missing', async () => {
            const res = await request(app)
            .post('/orders')
            .send({ quantity: 1, price: 5.00 });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Missing Item' });
        });

        it('POST-4: returns 400 when quantity missing', async () => {
            const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', price: 5.00 });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Missing Quantity' });
        });

        it('POST-5: returns 400 when price missing', async () => {
            const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: 1 });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Missing Price' });
        });

        it('POST-6: returns 400 when quantity is 0', async () => {
            const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: 0, price: 5.00 });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Missing Quantity' });
        });

        it('POST-7: returns 400 when quantity is negative', async () => {
            const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: -1, price: 5.00 });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });

        it('POST-8: returns 400 when price is negative', async () => {
            const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: 1, price: -5.00 });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });

        it('POST-9: returns 201 but extra fields are ignored', async () => {
            mockStmt.run.mockReturnValue({ lastInsertRowid: 1 });
            mockStmt.get.mockReturnValue({
            id: 1, item: 'peach', quantity: 1, status: 'pending', price: 5.00,
            });
            const res = await request(app)
            .post('/orders')
            .send({ item: 'peach', quantity: 1, price: 5.00, extra: 'ignored' });
            expect(res.status).toBe(201);
            expect(res.body).toEqual(
            expect.objectContaining({ item: 'peach', status: 'pending' })
            );
            expect(res.body).not.toHaveProperty('extra');
        });
    });

    describe('GET /orders', () => {

        it('GET-1: returns 200 with list of orders', async () => {
            const mockOrders = [
                { id: 1, item: 'peach', quantity: 1, status: 'pending', price: 5.00 },
                { id: 2, item: 'apple', quantity: 2, status: 'pending', price: 3.00 },
            ];
            mockStmt.all.mockReturnValue(mockOrders); 
            const res = await request(app).get('/orders');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ orders: mockOrders });
            expect(mockStmt.all).toHaveBeenCalled();
        });

        it('GET-2: Returns 200 with empty array when no orders', async () => {
            mockStmt.all.mockReturnValue([]);
            const res = await request(app).get('/orders');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ 'orders': [] });
        });
    });

    describe('GET /orders/:id', () => {

        it('GETID-1: returns 200 with order details', async () => {
            const mockOrder = { id: 1, item: 'peach', quantity: 1, status: 'pending', price: 5.00 };
            mockStmt.get.mockReturnValue(mockOrder);
            const res = await request(app).get('/orders/1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ 'CustomerOrder': mockOrder });
            expect(mockStmt.get).toHaveBeenCalledWith(1);
        });

        it('GETID-2: returns 404 when order number does not exist', async () => {
            mockStmt.get.mockReturnValue(undefined);
            const res = await request(app).get('/orders/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: 'Not found' });
        });

        it('GETID-3: returns 400 when order number is string', async () => {
            const res = await request(app).get('/orders/abc');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });

        it('GETID-4: returns 400 when order number is 0', async () => {
            const res = await request(app).get('/orders/0');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });

        it('GETID-5: returns 400 when order number is negative', async () => {
            const res = await request(app).get('/orders/-1');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });

        it('GETID-6: returns 400 when order number is a float', async () => {
            const res = await request(app).get('/orders/1.5');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });
    });

    describe('PATCH /orders/:id', () => {

        it('PATCH-1: Valid ID with valid status updates order', async () => {
            const originalOrder = { id: 1, item: 'peach', quantity: 1, status: 'pending', price: 5.00 };
            const updatedOrder  = { ...originalOrder, status: 'completed' };
            mockStmt.get
                .mockReturnValueOnce(originalOrder)   // initial fetch (existence check)
                .mockReturnValueOnce(updatedOrder);   // re-fetch after UPDATE
            mockStmt.run.mockReturnValue({ changes: 1 });

            const res = await request(app)
                .patch('/orders/1')
                .send({ status: 'completed' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(
                expect.objectContaining({ order: expect.objectContaining({ status: 'completed' }) })
            );
            expect(mockStmt.run).toHaveBeenCalledWith('completed', 1);
        });
        
        it('PATCH-2: returns 400 when status is missing', async () => {
            const res = await request(app)
            .patch('/orders/1')
            .send({});
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });  

        it('PATCH-3: returns 400 when id is a string', async () => {
            const res = await request(app)
            .patch('/orders/abc')
            .send({ status: 'invalid' });
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });

        it('PATCH-4: returns 404 when order number does not exist', async () => {
            mockStmt.get.mockReturnValue(undefined);
            const res = await request(app)
            .patch('/orders/999')
            .send({ status: 'completed' });
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: 'Not found' });
        });
    });

    describe('DELETE /orders/:id', () => {

        it('DELETE-1: returns 200 when order deleted successfully', async () => {
            const mockOrder = { id: 1, item: 'peach', quantity: 1, status: 'pending', price: 5.00 };
            mockStmt.get.mockReturnValue(mockOrder);
            mockStmt.run.mockReturnValue({ changes: 1 });

            const res = await request(app).delete('/orders/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ CustomerOrder: mockOrder });
            expect(mockStmt.run).toHaveBeenCalledWith(1);
        });
        
        it('DELETE-2: returns 404 when order number does not exist', async () => {
            mockStmt.get.mockReturnValue(undefined); 
            mockStmt.run.mockReturnValue({ changes: 0 });
            const res = await request(app).delete('/orders/999');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: 'Not found' });
        });
        
        it('DELETE-3: returns 400 when order number is string', async () => {
            const res = await request(app).delete('/orders/abc');
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ message: 'Bad Request' });
        });

        it('DELETE-4: Delete valid ID twice returns 404 second time', async () => {
            const mockOrder = { id: 1, item: 'peach', quantity: 1, status: 'pending', price: 5.00 };
            mockStmt.get
                .mockReturnValueOnce(mockOrder)
                .mockReturnValueOnce(undefined);
            mockStmt.run
                .mockReturnValueOnce({ changes: 1 })
                .mockReturnValueOnce({ changes: 0 });

            const res1 = await request(app).delete('/orders/1');
            expect(res1.status).toBe(200);
            expect(res1.body).toEqual({ CustomerOrder: mockOrder });

            const res2 = await request(app).delete('/orders/1');
            expect(res2.status).toBe(404);
            expect(res2.body).toEqual({ message: 'Not found' });
        });
    });
});