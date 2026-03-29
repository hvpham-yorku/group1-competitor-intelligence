# CI-Tracking (EECS 2311 Project)

Competitor intelligence web app built with Next.js, SQLite, and a layered architecture.

## Stack
- Next.js 16 (App Router)
- TypeScript
- SQLite (`sqlite3`)
- Jest (unit + integration)

## Repository Layout
- `src/` application code
- `test/unit/` business-layer unit tests (mocked dependencies)
- `test/integration/` real SQLite persistence tests
- `database/` local SQLite DB files
- `scripts/` helper scripts

## Local Setup
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`

## Database
- Default runtime DB path: `database/sqlite_database.db`
- Integration tests use a separate DB file: `database/sqlite_integration_test.db`
- Schema is initialized from [`src/persistence/database.ts`](C:/Users/yousi/OneDrive/Desktop/projects/competitor-intelligence/group1-competitor-intelligence/src/persistence/database.ts)

Optional sample tracked data:
- `node scripts/seed-tracked-products.mjs`

## Testing
- Run full suite: `npm test`
- Run unit tests only: `npm run test:unit`
- Run integration tests only (real SQLite): `npm run test:integration`

## Lint
- `npm run lint`

## Documentation
Primary project docs are on the GitHub Wiki:
- [Home](https://github.com/hvpham-yorku/group1-competitor-intelligence/wiki/Home)
- [Architecture Sketch](https://github.com/hvpham-yorku/group1-competitor-intelligence/wiki/Architecture-Sketch)
- [Development Setup](https://github.com/hvpham-yorku/group1-competitor-intelligence/wiki/Development-Setup)
- [UML Diagram](https://github.com/hvpham-yorku/group1-competitor-intelligence/wiki/UML-Diagram)
- [Iteration 2 (ITR2) Wiki Update](https://github.com/hvpham-yorku/group1-competitor-intelligence/wiki/Iteration-2-(ITR2)-Wiki-Update)
- [Iteration 3 (ITR3) Wiki Update](https://github.com/hvpham-yorku/group1-competitor-intelligence/wiki/Iteration-3-(ITR3)-Wiki-Update)
