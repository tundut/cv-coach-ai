# CV Coach AI

**Intelligent Resume Analysis and Career Assistant Platform**

Nền tảng web giúp người tìm việc phân tích và cải thiện CV bằng AI: phân tích CV, so sánh với Job Description, gợi ý cải thiện, tạo cover letter, và trò chuyện với AI Career Assistant.

> Dự án cá nhân, triển khai MVP. Tập trung vào người tìm việc, không có chức năng dành cho nhà tuyển dụng.

---

## Kiến trúc

Serverless trên AWS, TypeScript xuyên suốt frontend, backend và infrastructure.

```
React (Vite)  →  CloudFront/S3  →  API Gateway  →  Lambda  →  DynamoDB
                                                      │
                                   Cognito ◄──────────┤
                                                      │
                              S3 (CV) ─ S3 Event ─ SQS ─ Lambda Processor
                                                           │
                                        Textract · OpenAI · CloudWatch
```

## Công nghệ

| Thành phần      | Công nghệ                     |
| --------------- | ----------------------------- |
| Ngôn ngữ        | TypeScript                    |
| Frontend        | React, Vite, Tailwind CSS     |
| Backend         | Node.js, AWS Lambda           |
| API             | Amazon API Gateway            |
| Authentication  | Amazon Cognito                |
| Database        | Amazon DynamoDB               |
| File storage    | Amazon S3                     |
| OCR             | Amazon Textract               |
| AI              | OpenAI API (→ Amazon Bedrock) |
| Queue           | Amazon SQS                    |
| Secrets         | AWS Secrets Manager           |
| Monitoring      | Amazon CloudWatch             |
| Infrastructure  | AWS CDK                       |
| Validation      | Zod                           |
| Testing         | Vitest                        |

## Cấu trúc monorepo

```
cv-coach-ai/
├── packages/
│   ├── shared/      # Types + Zod schemas dùng chung
│   ├── frontend/    # React + Vite + Tailwind
│   ├── backend/     # Lambda handlers (TypeScript)
│   └── infra/       # AWS CDK
├── package.json     # npm workspaces
└── tsconfig.base.json
```

## Yêu cầu

- Node.js >= 20 (xem `.nvmrc`)
- npm >= 10
- AWS CLI đã cấu hình (để deploy)
- AWS CDK CLI (`npx cdk`)

## Bắt đầu

```bash
# 1. Cài dependencies cho toàn bộ workspace
npm install

# 2. Build package shared trước (frontend/backend phụ thuộc)
npm run build:shared

# 3. Tạo file env từ mẫu
cp packages/frontend/.env.example packages/frontend/.env
cp packages/backend/.env.example packages/backend/.env

# 4. Chạy frontend dev server (http://localhost:3000)
npm run dev:frontend
```

## Scripts

| Lệnh                     | Mô tả                              |
| ------------------------ | ---------------------------------- |
| `npm run build`          | Build tất cả packages              |
| `npm run build:shared`   | Build riêng package shared         |
| `npm run typecheck`      | Typecheck toàn bộ                  |
| `npm run test`           | Chạy test toàn bộ                 |
| `npm run lint`           | Lint toàn bộ                      |
| `npm run format`         | Format code bằng Prettier          |
| `npm run dev:frontend`   | Chạy frontend dev server          |

## Deploy infrastructure

```bash
cd packages/infra

# Build backend trước (CDK đóng gói từ backend/dist)
npm run build --workspace @cv-coach/backend

# Synth / deploy
npm run synth
npm run deploy -- --context stage=dev
```

## Lộ trình phát triển

- [x] **Giai đoạn 1** — Khởi tạo dự án (monorepo, scaffolding, health check)
- [x] **Giai đoạn 2** — Authentication (Cognito, đăng ký/đăng nhập/quên mật khẩu, protected routes)
- [x] **Giai đoạn 3** — Upload CV (S3 private, presigned URL, DynamoDB, CRUD + trạng thái)
- [x] **Giai đoạn 4** — Phân tích CV (SQS + DLQ, Textract, OpenAI/Mock provider, Zod validation)
- [x] **Giai đoạn 5** — Job Description analysis (fit level, matched/missing skills, suggestions)
- [x] **Giai đoạn 6** — AI writing (rewrite, cover letter)
- [x] **Giai đoạn 7** — Career Assistant (chat với context từ CV + JD)
- [x] **Giai đoạn 8** — Kiểm thử và triển khai (25 unit tests, deploy AWS, E2E verified)

> **MVP hoàn thành.** Toàn bộ 8 giai đoạn đã triển khai và kiểm thử end-to-end trên AWS.

## Bảo mật

- S3 bucket private, chỉ dùng presigned URL ngắn hạn
- OpenAI API key lưu trong AWS Secrets Manager, không hard-code
- Kiểm tra quyền sở hữu dữ liệu (`userId` từ Cognito claims) ở mọi API
- Người dùng có thể xóa CV và dữ liệu phân tích

## Lưu ý về AI

- AI output có schema cố định, validate bằng Zod trước khi lưu
- Phần AI thiết kế qua abstraction `AiAnalysisService` để chuyển sang Amazon Bedrock sau này
- AI chỉ đưa ra đánh giá hỗ trợ, không khẳng định kết quả tuyển dụng tuyệt đối

## License

MIT
