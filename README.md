# Flora 🌸

### A cycle-aware health tracking API, built as a first-step research prototype

Flora helps people record period cycles, symptoms, and daily wellbeing signals, then turns those personal logs into cycle estimates, trend reports, and reminders. This repository contains the **NestJS backend API** for the Flora application.

> **Project status:** Initial FYP version. Predictions are estimates for personal tracking and reflection. Flora is not a medical device, diagnostic service, or contraceptive method.

---

## At a glance

| | |
|---|---|
| **Purpose** | Menstrual cycle and wellbeing tracking |
| **API** | NestJS, TypeScript, REST, Swagger |
| **Data** | PostgreSQL with TypeORM |
| **Prediction approach** | Explainable Bayesian estimate with explicit adjustments |
| **Integrations** | SMTP email and Firebase Cloud Messaging |
| **API prefix** | `/api/v1` |
| **Interactive API docs** | `/docs` |

## What Flora includes

- **Accounts and security:** registration, email verification, login, password reset, access/refresh tokens, and single-device or all-device logout.
- **Cycle tracking:** start and end periods, browse cycle history, and record period and cycle lengths.
- **Daily logs:** record flow, symptoms and severity, basal body temperature, cervical mucus, sleep, stress, mood, energy, exercise, medications, and contraception.
- **Personalized estimates:** next period, estimated ovulation and fertile window, current cycle day and phase, confidence, and reasons an estimate may be uncertain.
- **Reports:** recent cycle statistics and trends, with a downloadable PDF report.
- **Reminders:** register device tokens for Firebase push notifications and configure period, fertility, and daily logging reminders.
- **API documentation:** Swagger UI for exploring the endpoints and request schemas.

## How we approached the project

The design question for this first version was: **how can a tracker provide a useful, understandable estimate when a person has only a small or incomplete history?** A fixed calendar rule that assumes every cycle lasts 28 days cannot reflect the variation people actually log.

We used a research-informed software design process:

1. **Identify the information a tracker can collect.** Cycle start dates provide the main personal history; symptoms and daily logs add context such as stress, sleep, exercise, cervical mucus, and temperature.
2. **Review relevant published work.** Research on real-world cycle variability and studies of stress and reproductive function informed the problem framing. These papers provide context; they do not validate Flora's coefficients or predictions.
3. **Turn the design into explicit calculations.** The current engine combines a population prior with an individual's recent cycle history, then applies small, visible adjustments for selected logged signals.
4. **Handle missing and stale logs deliberately.** The engine returns a conservative estimate when no cycle history exists, lowers confidence when data is limited, and rolls an old cycle date forward instead of presenting a prediction anchored in the past.
5. **Build the surrounding product API.** Authentication, private user records, cycle and daily-log endpoints, reports, and notifications make the prediction available as part of a usable tracking service.

### What the current prediction does

The API uses the most recent **up to 12 logged cycles**. The Bayesian engine starts with a fixed prior configured as a mean of **28.1 days** and standard deviation of **5.2 days**, then combines it with the person's observed cycle lengths. These constants are implementation defaults, not values estimated from Flora users. The engine adds explicit symptom and daily-log adjustments, rounds and bounds the estimate to 21–45 days, and derives cycle dates and phases from it.

When available, a basal-temperature shift can confirm an ovulation date in the current cycle. The engine also reports confidence based on the amount of usable history and how many cycles have been estimated forward. Confidence is a product heuristic, not a clinically calibrated probability.

```mermaid
flowchart LR
  A[Recent cycle history] --> D[Bayesian estimate]
  B[Symptoms] --> E[Explicit adjustments]
  C[Daily logs] --> E
  D --> F[Cycle date and phase estimates]
  E --> F
  F --> G[Estimate, confidence, and report]
```

### Why this version does not use machine learning

We did not have a suitable, large, representative, consented Flora dataset with enough complete cycle histories and reliable outcomes to train and validate a machine-learning model. Each person may have only a few observations, and cycles vary substantially. Training on sparse or unrepresentative data could produce confident-looking estimates that do not generalize.

For an initial version, a Bayesian baseline is easier to inspect, explain, and compare with the logged data. Its assumptions are visible in code and it can fall back to a population prior when personal history is missing. The tradeoff is that its adjustment weights are hand-specified and have **not** been validated against a clinical cohort. A future ML study would need appropriate consent, representative longitudinal data, privacy safeguards, and a measured comparison against this baseline before changing the product.

## Research and evaluation boundaries

This repository is an **implementation prototype**, not a clinical study. It does not contain a participant cohort, a collected research dataset, a prospective trial, or a clinical accuracy evaluation. The automated prediction tests check software behavior—such as prior use, history weighting, valid bounds, adjustments, and date handling—not medical correctness or real-world prediction accuracy.

Selected background reading:

- Bull, J. R. et al. (2019). [Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles](https://doi.org/10.1038/s41746-019-0152-7). *npj Digital Medicine*.
- Schliep, K. C. et al. (2015). [Perceived stress, reproductive hormones, and ovulatory function: a prospective cohort study](https://doi.org/10.1097/EDE.0000000000000238). *Epidemiology*.
- Kim, T. H. et al. (2018). [Associations of mental health and sleep duration with menstrual cycle irregularity: a population-based study](https://doi.org/10.1007/s00737-018-0872-8). *Archives of Women's Mental Health*.

These studies inform the topic and design rationale. Their findings should not be read as evidence that Flora's particular adjustment values are proven effects or that Flora's predictions are clinically accurate.

## Technology and architecture

- **NestJS + TypeScript** for modular API services and controllers
- **PostgreSQL + TypeORM** for persistence
- **JWT** access and refresh tokens for authentication
- **SMTP** for email verification and password reset codes
- **Firebase Admin / FCM** for device notifications
- **Swagger** for interactive API exploration
- **Docker Compose** for local API and PostgreSQL development

```mermaid
flowchart LR
  Client[Web or mobile client] --> API[NestJS REST API<br/>/api/v1]
  API --> Auth[Auth and user modules]
  API --> Tracking[Cycles and daily logs]
  Tracking --> Predict[Prediction engine]
  Predict --> Reports[Reports and PDF export]
  API --> DB[(PostgreSQL)]
  API --> Mail[SMTP]
  API --> Push[Firebase Cloud Messaging]
```

### Main API routes

| Area | Routes | Purpose |
|---|---|---|
| Authentication | `/auth/*` | Register, verify email, log in, reset password, refresh tokens, log out |
| User | `/users/me` | Read/update account, profile, and notification preferences |
| Period cycles | `/period-cycles/*` | Start/end a period and manage cycle history |
| Daily logs | `/daily-logs/*` | Create, read, update, and delete daily wellbeing logs |
| Predictions | `/predictions/me` | Get the signed-in user's current estimate and phase |
| Reports | `/reports/me`, `/reports/me/pdf` | Read trends or download a PDF summary |
| Notifications | `/notifications/*` | Register a device, remove a token, or send a test prediction push |

Open `/docs` while the API is running for the complete request and response schemas.

## Run locally

### Requirements

- Node.js 20+
- npm
- Docker Desktop or Docker Engine with the Compose plugin
- SMTP and Firebase credentials for email and push features

### 1. Configure environment variables

Create a **local, untracked** `.env.docker` file in the repository root. The app validates these variables at startup:

```dotenv
PORT=4000
NODE_ENV=development

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace-with-a-local-only-password
POSTGRES_DB=flora
POSTGRES_SSL=false

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=replace-me
SMTP_PASSWORD=replace-me
SMTP_FROM=Flora <noreply@example.com>

FIREBASE_PROJECT_ID=replace-me
FIREBASE_CLIENT_EMAIL=replace-me
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nreplace-with-a-valid-key\n-----END PRIVATE KEY-----\n"
```

Use real provider credentials only in your private local environment or secret manager. Generate new JWT secrets; never reuse values that were committed or shared. The Firebase key must be a valid service-account private key, with newlines represented as `\n`. The example values above are placeholders and will not authenticate with SMTP or Firebase.

### 2. Start the API and database

```bash
docker compose --env-file .env.docker up --build
```

The API listens on `http://localhost:4000`; PostgreSQL is published on port `5433` for host connections. For local development the API enables TypeORM schema synchronization. Use managed migrations and reviewed database changes for production.

### 3. Explore the API

- Swagger: `http://localhost:4000/docs`
- API prefix: `http://localhost:4000/api/v1`

Or run the API directly with a PostgreSQL instance available at the configured host:

```bash
npm ci
npm run start:dev
```

## Project layout

```text
src/
├── module/
│   ├── auth/                  # registration, verification, sessions, password reset
│   ├── daily-logs-symptoms/   # daily signals and symptom insights
│   ├── notifications/        # device tokens, reminders, push notifications
│   ├── period-cycles/         # period and cycle history
│   ├── predictions/           # Bayesian cycle prediction
│   ├── reports/               # summaries and PDF export
│   └── user/                  # account profile and preferences
└── shared/                    # configuration, auth helpers, logging, API plumbing
```

## Useful commands

```bash
npm run start:dev   # start NestJS in watch mode
npm run build       # compile the API
npm test            # run unit tests
npm run test:e2e    # run end-to-end tests
```

## Responsible use and next steps

- Treat cycle, symptom, and reproductive-health records as sensitive personal data.
- Predictions and fertile-window dates can be wrong, especially with missing or irregular logs. They must not be used to prevent pregnancy, diagnose a condition, or replace medical advice.
- The current adjustment weights and confidence labels need validation; they are transparent prototype rules, not clinical thresholds.
- Future work should include documented requirements and study methods, privacy and consent review, data-quality checks, evaluation against appropriate baselines, and participant testing before any health claims are made.

---

**Flora is an early version:** a working backend foundation for cycle logging, personalized estimates, and reports—designed to be understandable now and measurable in future research.
