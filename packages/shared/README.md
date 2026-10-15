# @cv-coach/shared

Types và Zod schemas dùng chung giữa frontend, backend và infra.

- `types/` — domain models (User, Resume, JobAnalysis, GeneratedDocument, ChatSession, ChatMessage), enums, API request/response types
- `schemas/` — Zod schemas để validate AI output (structured profile, CV analysis, job match, rewrite, cover letter)
- `constants.ts` — giới hạn upload CV, Job Description, chat

Build trước khi dùng ở package khác: `npm run build --workspace @cv-coach/shared`.
