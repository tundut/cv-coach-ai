import { describe, it, expect } from 'vitest';
import { extractUser, getUserId, withAuth, assertOwnership } from './auth.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    resource: '/test',
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    ...overrides,
  };
}

describe('extractUser', () => {
  it('extracts user from Cognito authorizer claims', () => {
    const event = createEvent({
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      } as APIGatewayProxyEvent['requestContext'],
    });

    const user = extractUser(event);
    expect(user).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      fullName: 'Test User',
    });
  });

  it('extracts user from mock headers (local dev)', () => {
    const event = createEvent({
      headers: {
        'x-user-id': 'local-user-1',
        'x-user-email': 'dev@local.com',
        'x-user-name': 'Dev User',
      },
    });

    const user = extractUser(event);
    expect(user).toEqual({
      userId: 'local-user-1',
      email: 'dev@local.com',
      fullName: 'Dev User',
    });
  });

  it('returns null when no auth info present', () => {
    const event = createEvent();
    expect(extractUser(event)).toBeNull();
  });

  it('returns null when claims are incomplete (missing email)', () => {
    const event = createEvent({
      requestContext: {
        authorizer: {
          claims: { sub: 'user-123' },
        },
      } as APIGatewayProxyEvent['requestContext'],
    });
    expect(extractUser(event)).toBeNull();
  });
});

describe('getUserId', () => {
  it('returns userId from claims', () => {
    const event = createEvent({
      headers: { 'x-user-id': 'user-abc', 'x-user-email': 'a@b.com' },
    });
    expect(getUserId(event)).toBe('user-abc');
  });

  it('returns null when unauthenticated', () => {
    expect(getUserId(createEvent())).toBeNull();
  });
});

describe('withAuth', () => {
  it('calls handler with user when authenticated', async () => {
    const handler = withAuth(async (_event, user) => ({
      statusCode: 200,
      body: JSON.stringify({ userId: user.userId }),
      headers: {},
    }));

    const event = createEvent({
      headers: { 'x-user-id': 'user-1', 'x-user-email': 'a@b.com' },
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).userId).toBe('user-1');
  });

  it('returns 401 when not authenticated', async () => {
    const handler = withAuth(async () => ({
      statusCode: 200,
      body: '{}',
      headers: {},
    }));

    const result = await handler(createEvent());
    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('assertOwnership', () => {
  it('returns null when user owns the resource', () => {
    expect(assertOwnership('user-1', 'user-1')).toBeNull();
  });

  it('returns 403 when user does not own the resource', () => {
    const result = assertOwnership('user-1', 'user-2');
    expect(result).not.toBeNull();
    expect(result!.statusCode).toBe(403);
  });
});
