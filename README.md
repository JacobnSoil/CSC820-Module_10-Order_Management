# Order Management API

## Overview

A RESTful API for managing customer orders, built as part of CSC 820: Large-Scale Software Systems at Penn State. The API supports full CRUD operations across five endpoints and is implemented with Node.js and Express.js. Data is persisted with SQLite via the `better-sqlite3` package, ensuring orders survive server restarts. Order creation includes a simulated asynchronous payment processing step using Promise-based delays with async/await syntax, wrapped in try/catch error handling.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine

### Installation

1. Clone the repository and navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node app.js
   ```

The API will be available at `http://localhost:3000`.

## Endpoints

### 1. POST /orders

Creates a new order. Includes a simulated 2-second payment processing delay using a Promise-based async/await pattern. The entire operation is wrapped in a try/catch block to handle potential errors.

**Status Codes:** `201 Created`, `400 Bad Request`, `500 Internal Server Error`

**Request Body:**

```json
{
    "item": "watermelon",
    "quantity": 1,
    "price": 5.00
}
```

**Response:**

```json
{
    "id": 1,
    "item": "watermelon",
    "quantity": 1,
    "status": "pending",
    "price": 5.0
}
```

### 2. GET /orders

Retrieves all existing orders.

**Status Codes:** `200 OK`

**Response:**

```json
{
    "orders": [
        {
            "id": 1,
            "item": "watermelon",
            "quantity": 1,
            "status": "pending",
            "price": 5.0
        },
        {
            "id": 2,
            "item": "apple",
            "quantity": 3,
            "status": "pending",
            "price": 1.0
        },
        {
            "id": 3,
            "item": "pear",
            "quantity": 2,
            "status": "pending",
            "price": 2.0
        }
    ]
}
```

### 3. GET /orders/:id

Retrieves a specific order by ID.

**Example:** `GET /orders/2`

**Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`

**Response:**

```json
{
    "CustomerOrder": {
        "id": 2,
        "item": "apple",
        "quantity": 3,
        "status": "pending",
        "price": 1.0
    }
}
```

### 4. PATCH /orders/:id

Updates an order's status.

**Example:** `PATCH /orders/2`

**Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`

**Request Body:**

```json
{
    "status": "shipped"
}
```

**Response:**

```json
{
    "order": {
        "id": 2,
        "item": "apple",
        "quantity": 3,
        "status": "shipped",
        "price": 1.0
    }
}
```

### 5. DELETE /orders/:id

Removes an order.

**Example:** `DELETE /orders/2`

**Status Codes:** `200 OK`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`

**Response:**

```json
{
    "CustomerOrder": {
        "id": 1,
        "item": "watermelon",
        "quantity": 1,
        "status": "shipped",
        "price": 5
    }
}
```

## Error Handling

All endpoints include input validation and return appropriate HTTP status codes:

- `400 Bad Request` — Returned when the request body is missing required fields (POST, PATCH) or the ID parameter is not a valid number (GET, PATCH, DELETE).
- `404 Not Found` — Returned when no order exists with the given ID.
- `500 Internal Server Error` — Returned when an unexpected server-side error occurs, such as a database failure.

## Async Behavior

The `POST /orders` endpoint simulates a payment processing step by awaiting a 2-second Promise-based delay before confirming the order. This demonstrates non-blocking asynchronous operations using `async/await` syntax. The operation is wrapped in a `try/catch` block to gracefully handle any errors during processing.