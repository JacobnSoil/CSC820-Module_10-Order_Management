const request = require('supertest')
const app = require('../app')

describe('POST /orders', () => {
    it('should create a new order', async () => {
        const res = await request(app)
            .post('/orders')
            .send({ item: 'watermelon', quantity: 1, price: 5 })

        expect(res.status).toBe(201)
    })
});

describe('GET /orders', () => {
    it('should retrieve all orders', async () => {
        const res = await request(app)
            .get('/orders')

        expect(res.status).toBe(200)
    })
});

describe('GET /orders/:id', () => {
    it('should retrieve one order', async () => {
        const res = await request(app)
            .get('/orders/100')

        expect(res.status).toBe(404)
    })
});

describe('PATCH /orders/:id', () => {
    it('should change status of order', async () => {
        const res = await request(app)
            .patch('/orders/1')
            .send({ status: 'shipped' })

        expect(res.status).toBe(200)
    })
});

describe('DELETE /orders/:id', () => {
    it('should delete an order', async () => {
        const res = await request(app)
            .delete('/orders/1')

        expect(res.status).toBe(200)
    })
});


