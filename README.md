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

## Project study and method

The FYP asks a product and engineering question: **how can a cycle tracker produce a useful, understandable estimate when personal history is short, incomplete, or irregular?** A fixed calendar that assumes every cycle is 28 days is easy to implement, but it does not reflect variation seen in real-world cycle data.

The work represented in this repository is a **literature-informed software prototype**, carried out in four steps:

1. **Model the tracking problem.** Store period start/end dates and daily observations so the prediction can use the person's own recent history and optional context.
2. **Review research relevant to the signals and prediction problem.** We used studies of real-world cycle variability, tracking adherence, stress, sleep, and exercise to frame what can vary and what data a tracker might collect.
3. **Implement an explainable baseline.** Combine a fixed prior with recent per-user cycle history, add small explicit rules for selected logged signals, and return both a date estimate and a confidence category.
4. **Check implementation behavior.** Unit tests exercise prior fallback, movement toward personal history, bounds, adjustments, and date roll-forward. These are software tests; they are not a user study or evidence of clinical accuracy.

No participant recruitment, survey, clinical measurement, original health-data collection, prospective trial, or prediction-accuracy study is documented in this repository. Flora therefore uses published work as **background and design rationale**; it does not claim to reproduce those studies or to have validated the current model.

## Research used and how it maps to Flora

The sources below informed the design decisions. The distinction between a study finding and Flora's implementation matters: the published studies did not test Flora, and their findings do not validate Flora's hard-coded adjustment weights.

| Research | What the researchers studied | How it informed this prototype | What it does **not** establish for Flora |
|---|---|---|---|
| **Bull et al. (2019), cycle variability** | Analyzed 612,613 ovulatory cycles from 124,648 users of a fertility app. The study reported a mean cycle length of 29.3 days and variation by age and BMI, among other cycle characteristics. | Motivates tracking each person's history and not treating one calendar length as universal. | It does not provide a validation set for Flora or prove that Flora's prior constants are right for its users. Its dataset was a particular app cohort and included cycles where ovulation was detected. |
| **Schliep et al. (2015), daily stress and reproductive function** | Followed 259 healthy women aged 18–44 for up to two cycles in the BioCycle Study. High versus low daily stress was associated with higher odds of sporadic anovulation (adjusted OR 2.2; 95% CI 1.0–4.7) and differences in reproductive hormone levels. | Supports collecting recent stress as contextual information and treating it as a possible correlate, not as a diagnosis. | The paper did not establish a universal delay in cycle length of 0.45 days per stress day. Flora's stress multiplier and 2.5-day cap are prototype rules, not effect sizes from the paper. |
| **Kim et al. (2018), sleep and irregularity** | A cross-sectional population study of 4,445 Korean women aged 19–49. Short sleep (≤5 hours/day) was associated with higher odds of severe irregularity, defined as a menstrual interval over three months (OR 2.67; 95% CI 1.35–5.27). | Gives a reason to let users record sleep and motivates further investigation of sleep/cycle associations. | It does not show that every hour below seven hours shifts the next period by 0.35 days. Flora's linear sleep adjustment is a prototype assumption, not the study's result. |
| **Jeon & Baek (2023), sleep review** | Systematically reviewed published evidence on sleep disturbances and menstrual disturbances, including observational studies with different populations and measures. | Provides broader context that the relationship is an active research area and that evidence comes from varied study designs. | A review of associations does not make sleep a validated individual prediction feature or support a particular day-level coefficient. The OR 2.67 above comes from the Kim et al. study summarized in the review, not from a Flora experiment. |
| **De Souza et al. (2010), exercise and menstrual disturbances** | Compared 67 exercising women with 20 sedentary women using daily reproductive hormone measures across two to three cycles. Half of the observed exercising-group cycles were classified as abnormal, compared with 4.2% of sedentary-group cycles. | Motivates recording intensive exercise as optional context for future analysis. | This was a selected exercise cohort, not a general population sample, and it does not estimate a universal number of cycle days added per intense-exercise day. Flora's +0.6-day-per-day adjustment is a hand-set heuristic. |
| **Li et al. (2022), cycle prediction and tracking adherence** | Developed a statistical predictive model for next cycle start date using mobile-app data from roughly 186,000 menstruators and over two million tracked cycles, explicitly accounting for missed or delayed tracking. | Informs the general idea that cycle estimates can combine population-level information with personal history, and that gaps in tracking matter. | Flora does not implement Li et al.'s model, use that dataset, or model skipped-cycle adherence in the same way. The symptom coefficients in Flora are not effect estimates from that paper. |

### How the current model works

The active engine is `BayesianPredictionEngine`. It uses up to the **12 most recent logged cycles**, ignores cycle lengths outside 21–45 days, and combines the valid personal history with a fixed prior configured in code: mean **28.1 days** and standard deviation **5.2 days**. These values are implementation defaults—not estimates from Flora users, and not the mean and standard deviation of the Bull et al. study. If no usable history exists, the prior supplies the starting estimate.

The current prototype then applies manually configured adjustments:

| Input | Current implementation rule | Evidence status |
|---|---|---|
| Symptoms | Per-symptom coefficient multiplied by reported average severity | Hand-set weights. They are not validated clinical effects; Li et al.'s adherence model does not establish these symptom-to-day values. |
| Stress | `+0.45` days per high-stress day, capped at `+2.5` days | Inspired by an observed association in Schliep et al.; the numeric day shift and cap are prototype choices. |
| Sleep | `+0.35` days per hour below 7 hours of average sleep | Motivated by observational sleep/cycle research; the linear conversion is a prototype choice. |
| Intensive exercise | `+0.6` days per logged intense-exercise day | Contextual feature inspired by research on menstrual disturbances in exercising women; the numeric day shift is a prototype choice. |
| Egg-white cervical mucus | `−0.8` days | Prototype rule to represent an ovulation-related signal; not a coefficient estimated by the cited studies. |
| Basal body temperature | A detected shift date can override formula-estimated ovulation; a separate `bbtConfirmedOvulationDate` field is only set when the date is inside the current estimated cycle | Uses a user-entered signal as a date override; it is not independent clinical confirmation. |

After adjustments, cycle length is rounded and clamped to 21–45 days. Ovulation is otherwise estimated as 14 days before the predicted next period, and the fertile window is set from five days before through one day after estimated ovulation. Old period dates are rolled forward to a current cycle; confidence is reduced when history is limited or several cycles had to be estimated. Confidence is a heuristic category, not a calibrated probability.

The calculation is inspectable, but the adjustment weights are **not learned from Flora data** and should not be interpreted as causal effects. Correlational findings do not justify translating a stress score, short sleep, or exercise report into a precise number of cycle days. Calibration, uncertainty evaluation, and an external accuracy study remain future work.

```mermaid
flowchart LR
  A[Up to 12 recent cycles] --> D[Bayesian prior + personal history]
  B[Symptoms] --> E[Prototype adjustments]
  C[Daily logs] --> E
  D --> F[Cycle length estimate]
  E --> F
  F --> G[Period, ovulation and phase dates]
  G --> H[Estimate, confidence and report]
```

### Why this version does not use machine learning

We did not have a suitable, large, representative, consented Flora dataset with enough complete cycle histories and reliable outcomes to train and validate a machine-learning model. Each person may have only a few observations, and cycles vary substantially. Training on sparse or unrepresentative data could produce confident-looking estimates that do not generalize.

For an initial version, a Bayesian baseline is easier to inspect, explain, and compare with the logged data. Its assumptions are visible in code and it can fall back to a population prior when personal history is missing. The tradeoff is that its adjustment weights are hand-specified and have **not** been validated against a clinical cohort. A future ML study would need appropriate consent, representative longitudinal data, privacy safeguards, and a measured comparison against this baseline before changing the product.

## Research and evaluation boundaries

This repository is an **implementation prototype**, not a clinical study. It does not contain a participant cohort, a collected research dataset, a prospective trial, or a clinical accuracy evaluation. The automated prediction tests check software behavior—such as prior use, history weighting, valid bounds, adjustments, and date handling—not medical correctness or real-world prediction accuracy.

### References

- Bull, J. R. et al. (2019). [Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles](https://doi.org/10.1038/s41746-019-0152-7). *npj Digital Medicine*, 2, 83.
- Schliep, K. C. et al. (2015). [Perceived stress, reproductive hormones, and ovulatory function: a prospective cohort study](https://doi.org/10.1097/EDE.0000000000000238). *Epidemiology*, 26(2), 177–184.
- Kim, T. H. et al. (2018). [Associations of mental health and sleep duration with menstrual cycle irregularity: a population-based study](https://doi.org/10.1007/s00737-018-0872-8). *Archives of Women's Mental Health*, 21(6), 619–626.
- Jeon, B. & Baek, J. (2023). [Menstrual disturbances and its association with sleep disturbances: a systematic review](https://doi.org/10.1186/s12905-023-02629-0). *BMC Women's Health*, 23, 470.
- De Souza, M. J. et al. (2010). [High prevalence of subtle and severe menstrual disturbances in exercising women: confirmation using daily hormone measures](https://doi.org/10.1093/humrep/dep411). *Human Reproduction*, 25(2), 491–503.
- Li, K. et al. (2022). [A predictive model for next cycle start date that accounts for adherence in menstrual self-tracking](https://doi.org/10.1093/jamia/ocab182). *Journal of the American Medical Informatics Association*, 29(1), 3–11.

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
