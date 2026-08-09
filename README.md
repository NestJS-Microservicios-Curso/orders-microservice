# Orders Microservice (`orders-ms`)

A microservice that manages order processing and order lifecycle using PostgreSQL and TCP transport.

## Features

- **Microservice Architecture**: Communicates via NestJS Microservices TCP transport.
- **Database**: PostgreSQL database containerized via Docker Compose.
- **Validation**: Strict DTO validation using `class-validator` and `class-transformer`.
- **Environment Configuration**: Environment variables validated with `joi`.

---

## Environment Variables

Copy `.env.template` to `.env` and set your configuration variables:

```bash
cp .env.template .env
```

Default variables:

| Variable | Description           | Default Value |
| -------- | --------------------- | ------------- |
| `PORT`   | Microservice TCP Port | `3002`        |

---

## Database Setup (Docker)

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

---

## Running the Microservice

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

---

## TCP Message Patterns

The microservice exposes the following TCP message patterns (`@MessagePattern`):

| Pattern (`cmd`)     | Payload                          | Description                             |
| ------------------- | -------------------------------- | --------------------------------------- |
| `createOrder`       | `CreateOrderDto`                 | Creates a new order                     |
| `findAllOrders`     | N/A                              | Fetches all orders                      |
| `findOneOrder`      | `{ id: number }`                 | Fetches a single order by ID            |
| `changeOrderStatus` | `{ id: number, status: string }` | Updates the status of an existing order |

---

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Transport**: TCP (`@nestjs/microservices`)
- **Database**: PostgreSQL
- **Validation**: `class-validator` & `class-transformer`
