# Orders Microservice (`orders-ms`)

A NestJS microservice that manages order processing and order lifecycle using PostgreSQL, Prisma ORM, and NATS transport. It integrates with the `products-ms` microservice to validate products and prices when processing orders.

## Features

- **Microservice Architecture**: Communicates via NestJS Microservices NATS transport.
- **Relational Data Model**: Manages `Order` and relational `OrderItem` records using Prisma ORM.
- **Products Integration**: Communicates with `products-ms` via NATS to validate product existence, prices, and names.
- **Transactional Order Creation**: Calculates total items and total amounts server-side using trusted product data.
- **Database**: PostgreSQL containerized via Docker Compose.
- **Validation**: Strict DTO validation using `class-validator` and `class-transformer`.
- **Environment Configuration**: Environment variables validated with `joi`.

---

## Database Models (Prisma)

### `Order`

| Field         | Type          | Description                                            |
| ------------- | ------------- | ------------------------------------------------------ |
| `id`          | `String`      | Primary Key (UUID)                                     |
| `totalAmount` | `Float`       | Total order cost calculated from validated item prices |
| `totalItems`  | `Int`         | Total item count across all order items                |
| `status`      | `OrderStatus` | Status enum (`PENDING`, `DELIVERED`, `CANCELLED`)      |
| `paid`        | `Boolean`     | Payment status flag (default `false`)                  |
| `paidAt`      | `DateTime?`   | Timestamp when payment was completed                   |
| `createdAt`   | `DateTime`    | Order creation timestamp                               |
| `updatedAt`   | `DateTime`    | Order last updated timestamp                           |
| `OrderItem`   | `OrderItem[]` | Array of related order items                           |

### `OrderItem`

| Field       | Type      | Description                                      |
| ----------- | --------- | ------------------------------------------------ |
| `id`        | `String`  | Primary Key (UUID)                               |
| `productId` | `Int`     | Foreign identifier of product from `products-ms` |
| `quantity`  | `Int`     | Number of units ordered                          |
| `price`     | `Float`   | Unit price snapshot at time of order creation    |
| `orderId`   | `String?` | Foreign Key referencing `Order(id)`              |

---

## Environment Variables

Copy `.env.template` to `.env` and set your configuration variables:

```bash
cp .env.template .env
```

Default variables:

| Variable       | Description                                    | Default Value           |
| -------------- | ---------------------------------------------- | ----------------------- |
| `PORT`         | Application port value used in startup logging | `3002`                  |
| `NATS_SERVERS` | Comma-separated list of NATS broker URLs       | `nats://localhost:4222` |

---

## Database Setup (Docker & Prisma)

To run the PostgreSQL database using Docker Compose:

```bash
docker compose up -d
```

Database connection details:

| Field      | Value       |
| ---------- | ----------- |
| `Host`     | `localhost` |
| `Port`     | `5432`      |
| `User`     | `postgres`  |
| `Password` | `postgres`  |
| `Database` | `ordersdb`  |

Run Prisma migrations & generate client:

```bash
npx prisma migrate dev
npx prisma generate
```

---

## Installation & Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start PostgreSQL Database**:

   ```bash
   docker compose up -d
   ```

3. **Run database migrations**:

   ```bash
   npx prisma migrate dev
   ```

---

## Running the Microservice

```bash
# Get Up PostgreSQL database
docker compose up -d

# Run Nats server (if not already running)
docker run -d --name nats-main -p 4222:4222 -p 6222:6222 -p 8222:8222 nats

# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

---

## NATS Message Patterns (Exposed)

The microservice exposes the following NATS message patterns (`@MessagePattern`):

| Pattern             | Payload Schema                                            | Description                                          |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `createOrder`       | `{ items: [{ productId: number, quantity: number }] }`    | Validates items with `products-ms` and creates order |
| `findAllOrders`     | `{ page?: number, limit?: number, status?: OrderStatus }` | Fetches paginated orders (optional status filter)    |
| `findOneOrder`      | `{ id: string }`                                          | Fetches an order by UUID with enriched item details  |
| `changeOrderStatus` | `{ id: string, status: OrderStatus }`                     | Updates the status of an existing order              |

---

## External Microservice Dependencies

| Microservice  | Transport | Command (`cmd`)     | Sent Payload | Purpose                                          |
| ------------- | --------- | ------------------- | ------------ | ------------------------------------------------ |
| `products-ms` | NATS      | `validate_products` | `number[]`   | Validates product IDs and fetches prices & names |

---

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Transport**: NATS (`@nestjs/microservices`)
- **Database & ORM**: PostgreSQL + [Prisma](https://www.prisma.io/)
- **Validation**: `class-validator` & `class-transformer`
