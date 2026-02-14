# 📝 Project Log: Group 1 

**Sprint:** SCRUM Sprint 1


---

## 1. Meeting Minutes

### **Meeting 1: Sprint Planning & Kickoff**
* **Date:** Monday, Feb 3rd
* **Time:** 6:00 PM - 7:00 PM
* **Agenda:**
    * Review project requirements and Vision Statement.
    * Select technology stack (Next.js vs. React + Python).
    * Define Epics and create initial backlog items.
    * Assign initial tasks for the "Walking Skeleton" (MVP).
* **Decisions Made:**
    * **Tech Stack:** Agreed to use **Next.js (App Router)** for both frontend and backend to keep the codebase unified.
    * **Database:** Selected **SQLite** for local development simplicity, to be migrated to Postgres if needed later.
    
* **Action Items:**
    * Set up User Auth (NextAuth).
    * Begin researching Shopify scraping logic.
    * Set up the database schema for Price History.
    * Handle system architecture documentation and Wiki setup.

### **Meeting 2: Mid-Sprint Check-in**
* **Date:** Monday, Feb 10th
* **Time:** 6:00 PM - 7:00 PM
* **Agenda:**
    * Review progress on Scrapers and Auth.
    * Discuss "Scope Creep" regarding the scraping engine.
    * **New Task:** Discussed adding a "CSV Export" feature requested by potential users.
* **Updates:**
    * Auth is functional.
    * Scraping is harder than expected due to anti-bot protections.
    * Architecture diagram needed immediately for the report.
* **Changes to Plan:**
    * Added **SCRUM-28 (Export to CSV)** to the sprint as a "Quick Win" feature.
    * Added **SCRUM-27 (Username Database)** to fix a bug where user profiles weren't saving correctly.

---

## 2. Rationale Behind Design Decisions & Changes

### **Design Decision: Monolithic Architecture (Next.js)**
* **Context:** We considered splitting the project into a React Frontend and a Python Backend.
* **Rationale:** We chose a **Monolithic Next.js** structure. This allows us to share TypeScript types between the frontend and backend, reducing bugs. It also simplifies deployment (one server instead of two).
    * *Evidence:* See **SCRUM-25 (Architecture Diagram)** in the Wiki.

### **Design Decision: SQLite for Database**
* **Context:** We needed a database to store price history.
* **Rationale:** We opted for **SQLite** (file-based) instead of a cloud-hosted database (like AWS RDS) for this sprint. This removes the need for internet connectivity during development and prevents "connection timeout" issues during demos.

### **Change on Plan: Added "Export to CSV" (SCRUM-28)**
* **Context:** Originally not in the plan.
* **Rationale:** During testing, we realized that viewing data on screen wasn't enough; users need to download data to Excel to perform their own calculations. We added SCRUM-28 to address this usability gap.

---

## 3. Concerns & Blockers
* **Scraping Difficulty:** The team is facing challenges with dynamic classes on competitor websites (Shopify/WooCommerce). The scraper breaks when sites update their CSS.
* **Learning Curve:** Some members are new to certain tools and applications, leading to slower frontend development times than estimated.

---

## 4. Task Assignments & Time Tracking (Sprint 1)

**User Story 1: User Authentication & Account Management**
*(Epic: SCRUM-22)*

| Task ID | Task Name | Est. Time | Actual Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-23** | Add ability to add/retrieve account info | 2h | 3h | Done |
| **SCRUM-24** | Add login/register frontend (Client Side) | 3h | 2.5h | Done |
| **SCRUM-27** | Add username to DB & update accounts page | 1h | 1h | Done |
| **SCRUM-34** | Login Page and Register Page UI | 2.5h | 3h | Done |

**User Story 2: Documentation & Architecture**
*(Internal Tasks)*

| Task ID | Task Name | Est. Time | Actual Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-25** | Create System Architecture Diagram | 2h | 1h | Done |
| **SCRUM-26** | Initialize GitHub Wiki (Vision & Setup) | 2h | 1.5h | Done |

**User Story 3: Competitor Data Ingestion**
*(Epic: SCRUM-4)*

| Task ID | Task Name | Est. Time | Actual Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-8** | Scrape Competitor Product Price (JSON) | 5h | 7.5h | Done |
| **SCRUM-14** | Manual Competitor Configuration | 3h | 4h | Done |

**User Story 4: Analytics Platform & History**
*(Epic: SCRUM-5)*

| Task ID | Task Name | Est. Time | Actual Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-11** | Store and Query Price History | 3h | 3h | Done |
| **SCRUM-12** | Price History and Data View (Basic UI) | 4h | 5.5h | Done |
| **SCRUM-28** | Ability to export products to CSV | 1h | 1h | Done |
