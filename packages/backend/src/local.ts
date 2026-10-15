/**
 * Local dev server — wrap Lambda handlers phía sau Express.
 *
 * Dùng cho development, không deploy lên production.
 * Chạy: npm run dev (ở backend workspace)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Load .env (nếu có) — nhẹ, không cần dependency ngoài
function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnv();
import { handler as healthHandler } from './handlers/health.js';
import { handler as authHandler } from './handlers/auth.js';
import { handler as meHandler } from './handlers/me.js';
import { handler as resumesHandler } from './handlers/resumes.js';
import { handler as jobAnalysesHandler } from './handlers/job-analyses.js';
import { handler as aiWritingHandler } from './handlers/ai-writing.js';
import { handler as chatHandler } from './handlers/chat.js';
import type { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

const PORT = Number(process.env.PORT ?? 4000);

// ─── JWT Verifier ───────────────────────────────────
// Local server tự verify Cognito id token (trên AWS, việc này do API
// Gateway Cognito authorizer đảm nhận). Chỉ khởi tạo nếu có config.
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const jwtVerifier =
  userPoolId && clientId
    ? CognitoJwtVerifier.create({
        userPoolId,
        clientId,
        tokenUse: 'id',
      })
    : null;

if (!jwtVerifier) {
  console.warn(
    '⚠️  COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID chưa được set — protected routes sẽ không verify token.',
  );
}

/**
 * Verify Bearer token và trả về claims (mô phỏng API Gateway authorizer).
 */
async function verifyToken(
  authHeader: string | undefined,
): Promise<Record<string, unknown> | null> {
  if (!jwtVerifier || !authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const payload = await jwtVerifier.verify(token);
    return payload as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}



/**
 * Tạo mock APIGatewayProxyEvent từ Node.js request.
 */
function toApiGatewayEvent(
  req: http.IncomingMessage,
  body: string,
  claims: Record<string, unknown> | null,
  pathParameters: Record<string, string> | null,
): APIGatewayProxyEvent {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  return {
    httpMethod: req.method ?? 'GET',
    path: url.pathname,
    pathParameters,
    queryStringParameters: Object.fromEntries(url.searchParams),
    multiValueQueryStringParameters: null,
    headers: req.headers as Record<string, string>,
    multiValueHeaders: {},
    body: body || null,
    isBase64Encoded: false,
    resource: url.pathname,
    stageVariables: null,
    // Inject claims giống Cognito authorizer để extractUser đọc được
    requestContext: (claims
      ? { authorizer: { claims } }
      : {}) as APIGatewayProxyEvent['requestContext'],
  };
}

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'local',
  functionVersion: '1',
  invokedFunctionArn: 'local',
  memoryLimitInMB: '128',
  awsRequestId: 'local',
  logGroupName: 'local',
  logStreamName: 'local',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

// ─── Routing ────────────────────────────────────────

type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
) => Promise<APIGatewayProxyResult | void>;

interface Route {
  method: string;
  /** Pattern có thể chứa param dạng :name, vd /api/resumes/:resumeId */
  path: string;
  handler: LambdaHandler;
  protected?: boolean;
}

const routes: Route[] = [
  { method: 'GET', path: '/api/health', handler: healthHandler as LambdaHandler },
  { method: 'POST', path: '/api/auth', handler: authHandler as LambdaHandler },
  { method: 'GET', path: '/api/me', handler: meHandler as LambdaHandler, protected: true },

  // Resumes (tất cả protected)
  { method: 'POST', path: '/api/resumes/upload-url', handler: resumesHandler as LambdaHandler, protected: true },
  { method: 'GET', path: '/api/resumes', handler: resumesHandler as LambdaHandler, protected: true },
  { method: 'GET', path: '/api/resumes/:resumeId', handler: resumesHandler as LambdaHandler, protected: true },
  { method: 'DELETE', path: '/api/resumes/:resumeId', handler: resumesHandler as LambdaHandler, protected: true },
  { method: 'POST', path: '/api/resumes/:resumeId/default', handler: resumesHandler as LambdaHandler, protected: true },
  { method: 'POST', path: '/api/resumes/:resumeId/analyze', handler: resumesHandler as LambdaHandler, protected: true },

  // Job Analyses
  { method: 'POST', path: '/api/job-analyses', handler: jobAnalysesHandler as LambdaHandler, protected: true },
  { method: 'GET', path: '/api/job-analyses', handler: jobAnalysesHandler as LambdaHandler, protected: true },
  { method: 'GET', path: '/api/job-analyses/:analysisId', handler: jobAnalysesHandler as LambdaHandler, protected: true },
  { method: 'DELETE', path: '/api/job-analyses/:analysisId', handler: jobAnalysesHandler as LambdaHandler, protected: true },

  // AI writing
  { method: 'POST', path: '/api/ai/rewrite', handler: aiWritingHandler as LambdaHandler, protected: true },
  { method: 'POST', path: '/api/ai/cover-letter', handler: aiWritingHandler as LambdaHandler, protected: true },
  { method: 'GET', path: '/api/ai/documents', handler: aiWritingHandler as LambdaHandler, protected: true },

  // Chat
  { method: 'POST', path: '/api/chat/sessions', handler: chatHandler as LambdaHandler, protected: true },
  { method: 'GET', path: '/api/chat/sessions', handler: chatHandler as LambdaHandler, protected: true },
  { method: 'GET', path: '/api/chat/sessions/:sessionId/messages', handler: chatHandler as LambdaHandler, protected: true },
  { method: 'POST', path: '/api/chat/sessions/:sessionId/messages', handler: chatHandler as LambdaHandler, protected: true },
  { method: 'DELETE', path: '/api/chat/sessions/:sessionId', handler: chatHandler as LambdaHandler, protected: true },
];

/**
 * Match một pathname với route pattern, trả về params nếu khớp.
 */
function matchRoute(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const actual = pathParts[i];
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(actual);
    } else if (pp !== actual) {
      return null;
    }
  }
  return params;
}

// ─── Server ─────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', async () => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    // Tìm route khớp (hỗ trợ path params)
    let matchedRoute: Route | null = null;
    let pathParams: Record<string, string> | null = null;
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const params = matchRoute(r.path, url.pathname);
      if (params) {
        matchedRoute = r;
        pathParams = Object.keys(params).length ? params : null;
        break;
      }
    }

    if (!matchedRoute) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }),
      );
      return;
    }

    try {
      // Verify token cho protected routes
      let claims: Record<string, unknown> | null = null;
      if (matchedRoute.protected) {
        claims = await verifyToken(req.headers['authorization']);
        if (!claims) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' },
            }),
          );
          return;
        }
      }

      const event = toApiGatewayEvent(req, body, claims, pathParams);
      const result = await matchedRoute.handler(event, mockContext);

      if (!result) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: { code: 'NO_RESPONSE', message: 'Handler returned no response' } }));
        return;
      }

      res.writeHead(result.statusCode, {
        'Content-Type': 'application/json',
        ...result.headers,
      });
      res.end(result.body);
    } catch (err) {
      console.error('Local server error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 CV Coach AI local server running at http://localhost:${PORT}`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/auth`);
  console.log(`   GET  /api/me`);
  console.log(`   POST /api/resumes/upload-url`);
  console.log(`   GET  /api/resumes`);
  console.log(`   GET  /api/resumes/:resumeId`);
  console.log(`   DELETE /api/resumes/:resumeId`);
  console.log(`   POST /api/resumes/:resumeId/default`);
});
