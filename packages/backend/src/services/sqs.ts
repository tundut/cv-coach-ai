import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { AnalyzeResumeMessage } from '@cv-coach/shared';

let client: SQSClient | null = null;

function getClient(): SQSClient {
  if (!client) {
    client = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
  }
  return client;
}

/**
 * Service đẩy task phân tích CV vào SQS queue.
 *
 * Dev local: nếu LOCAL_INLINE_PROCESSING=true thì chạy processor
 * trực tiếp thay vì gửi SQS (tiện test không cần queue).
 */
export class SqsService {
  async enqueueAnalysis(message: AnalyzeResumeMessage): Promise<void> {
    // Chế độ dev: xử lý inline, không cần SQS
    if (process.env.LOCAL_INLINE_PROCESSING === 'true') {
      await this.processInline(message);
      return;
    }

    const queueUrl = process.env.ANALYSIS_QUEUE_URL;
    if (!queueUrl) {
      throw new Error('ANALYSIS_QUEUE_URL environment variable is not set');
    }
    await getClient().send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
      }),
    );
  }

  /**
   * Chạy processor trực tiếp (chỉ dùng cho dev local).
   * Mô phỏng SQS event với một record.
   */
  private async processInline(message: AnalyzeResumeMessage): Promise<void> {
    const { handler } = await import('../handlers/processor.js');
    const event = {
      Records: [{ body: JSON.stringify(message) }],
    } as unknown as Parameters<typeof handler>[0];
    // Chạy nền, không chặn response trả về cho client
    void Promise.resolve(
      handler(event, {} as never, () => {}),
    ).catch((err) => console.error('Inline processing error:', err));
  }
}
