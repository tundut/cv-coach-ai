import { describe, it, expect } from 'vitest';
import { handler } from './health.js';
import type { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';

function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/health',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    resource: '/health',
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    ...overrides,
  };
}

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:test',
  memoryLimitInMB: '128',
  awsRequestId: 'test-id',
  logGroupName: 'test',
  logStreamName: 'test',
  getRemainingTimeInMillis: () => 5000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

const noop: Callback = () => {};

describe('GET /health', () => {
  it('returns 200 with health status', async () => {
    const event = createMockEvent();
    const result = await handler(event, mockContext, noop);

    expect(result).toBeDefined();
    if (!result || typeof result === 'undefined') return;

    const response = result as { statusCode: number; body: string };
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toBeDefined();
    expect(body.data.timestamp).toBeDefined();
  });

  it('returns valid ISO timestamp', async () => {
    const event = createMockEvent();
    const result = await handler(event, mockContext, noop);

    const response = result as { statusCode: number; body: string };
    const body = JSON.parse(response.body);

    const date = new Date(body.data.timestamp);
    expect(date.toISOString()).toBe(body.data.timestamp);
  });

  it('returns CORS headers', async () => {
    const event = createMockEvent();
    const result = await handler(event, mockContext, noop);

    const response = result as { statusCode: number; headers: Record<string, string> };
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(response.headers['Content-Type']).toBe('application/json');
  });
});
