# Refactoring Document

## Purpose
This document summarizes the main refactoring work completed in the project, the problems that motivated each change, and the solutions that were applied.

---

## 1. Persistence Layer Compatibility Refactor

### Problem
The project evolved across multiple schema versions while continuing to use local SQLite databases. Newer features such as `resource_type`, `store_id`, tracked-store ownership, and tracking runs created compatibility problems with older local databases.

### Solution
The persistence layer was refactored to detect schema capabilities at runtime and branch safely when newer columns are unavailable.

### Examples
- `src/persistence/database.ts`
- `src/persistence/scrapes-repository.ts`
- `src/persistence/tracking-runs-repository.ts`
- `src/persistence/tracked-stores-repository.ts`

### Outcome
- Older local databases can still run without immediate manual migration.
- Newer features remain usable where the columns exist.
- The repository layer owns schema compatibility instead of scattering it through UI and service code.

---

## 2. Service and Route Responsibility Cleanup

### Problem
Some service-layer code was tightly coupled to HTTP concepts, which made reuse and testing harder.

### Solution
Service logic was refactored to return plain typed results instead of route-specific response objects, while route files retained responsibility for HTTP responses.

### Examples
- `src/services/email_alerts/email_alerts.tsx`
- `src/app/api/tracked_products/route.ts`

### Outcome
- Services are easier to reason about and test.
- API routes remain the boundary for transport-specific behavior.
- Business logic is less coupled to Next.js route implementation details.

---

## 3. Scheduled Scraping Initialization Cleanup

### Problem
Scheduled scraping initialization previously happened as a module-load side effect in API routes. This made behavior less predictable and complicated testing.

### Solution
Initialization was moved out of module-load behavior and into explicit request-time setup guarded by a singleton flag.

### Examples
- `src/app/api/tracked_products/route.ts`
- `src/services/scheduled_scraping/scheduled_scraping.tsx`

### Outcome
- Importing a route no longer silently starts background behavior.
- Test behavior is more stable.
- The scheduler still initializes only once in runtime.

---

## 4. Scheduled Scraping Execution Hardening

### Problem
The scheduled scraping flow had fragile assumptions around async behavior and product payload shape, which caused failures in tests and reduced resilience when scraped payloads were incomplete.

### Solution
The flow was refactored to:
- await per-target scheduled scrapes correctly,
- skip incomplete products safely during alert comparison,
- and lazy-load heavy comparison helpers only when needed.

### Examples
- `src/services/scheduled_scraping/scheduled_scraping.tsx`

### Outcome
- Scheduled scrape tests pass reliably.
- Incomplete scrape payloads do not break the entire sweep.
- Database-backed comparison helpers are only loaded when required.

---

## 5. Tracking and Delta Read Model Refactor

### Problem
Recent delta reporting originally risked diverging from what users saw in history views because raw observations and summary calculations were not always aligned with scrape snapshots.

### Solution
The tracking read model was refactored to derive recent delta events from scrape snapshots and grouped product histories rather than from loosely ordered raw observation rows.

### Examples
- `src/persistence/tracked-products-repository.ts`
- `src/services/tracking/get-tracked-products.ts`
- `src/services/products/observation-utils.ts`

### Outcome
- Recent delta rows better match product history and scrape-run views.
- Tracking summaries and event feeds are more consistent.
- The logic is centralized in repository/service read models instead of duplicated in UI code.

---

## 6. Product Detail Comparison Refactor

### Problem
Product details needed to support both the main product history and approved matched-product comparison history without splitting the logic across multiple endpoints.

### Solution
The product detail repository was refactored to assemble one payload containing:
- the main product summary,
- history,
- recent events,
- matched product summaries,
- and comparison history.

### Examples
- `src/persistence/product-details-repository.ts`
- `src/services/products/get-product-details.ts`
- `src/components/product-detail-view.tsx`

### Outcome
- The details page can render tables and graph overlays from one coherent data model.
- Matched comparison logic is centralized.
- The UI is simpler because it consumes one aggregated response.

---

## 7. Search and Analysis Query Refactor

### Problem
Manual product selection and competitor analysis required better query structure and stronger user scoping so that users only search within their own scraped dataset.

### Solution
Search and analysis queries were refactored to be user-scoped and to support better ranking and filtering behavior.

### Examples
- `src/persistence/product-search-repository.ts`
- `src/persistence/matching-repository.ts`
- `src/app/analysis/analysis-client.tsx`

### Outcome
- Search results are more predictable.
- Matching and analysis surfaces operate on a user-scoped dataset.
- Comparative analysis uses approved matches as a stable source of truth.

---

## 8. UI Flow Cleanup for Authentication and Account UX

### Problem
Authentication-related UI flows had misleading behavior, especially around registration redirects and feedback visibility.

### Solution
The auth UI was refactored to provide inline feedback, correct client-side navigation, and clearer account/session behavior.

### Examples
- `src/app/register/client_form.tsx`
- `src/app/login/client_form.tsx`
- `src/components/AuthButton.tsx`
- `src/app/account/client_account.tsx`

### Outcome
- Failed registration no longer appears successful.
- Login feedback is clearer.
- Logout and account flows are easier for users to understand.

---

## 9. Documentation-Level Refactoring

### Problem
As features expanded across iterations, planning and project logs no longer reflected the real system structure and priorities.

### Solution
Iteration planning and log documents were updated to reflect the actual shift toward:
- universal scraping,
- tracking and alerts,
- competitor matching,
- and matched-product analysis.

### Examples
- `log.md`
- `Iteration-3 User Story Updates.pdf`
- external planning notes maintained by the team

### Outcome
- Documentation better matches the implemented system.
- Iteration rationale is clearer.
- Refactoring decisions are easier to explain in course deliverables.

---

## Summary
The main refactoring theme in this project was not cosmetic cleanup. It was structural tightening:
- moving compatibility logic into repositories,
- reducing route/service coupling,
- stabilizing scheduled workflows,
- centralizing read-model assembly,
- and making user-facing analytics and auth flows easier to reason about.

These changes improved maintainability, reduced hidden side effects, and made the codebase easier to extend for future iterations.
