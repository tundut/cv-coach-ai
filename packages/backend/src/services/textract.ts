import {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  type Block,
} from '@aws-sdk/client-textract';

let client: TextractClient | null = null;

function getClient(): TextractClient {
  if (!client) {
    client = new TextractClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
  }
  return client;
}

function blocksToText(blocks: Block[]): string {
  return blocks
    .filter((b) => b.BlockType === 'LINE' && b.Text)
    .map((b) => b.Text as string)
    .join('\n');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Service OCR bằng Amazon Textract.
 */
export class TextractService {
  /**
   * Trích xuất text từ document trong S3.
   *
   * Thử DetectDocumentText (đồng bộ, nhanh — PDF 1 trang / ảnh) trước.
   * Nếu document không hỗ trợ sync (vd PDF nhiều trang) thì chuyển sang
   * StartDocumentTextDetection (bất đồng bộ) và poll kết quả.
   */
  async extractText(bucket: string, key: string): Promise<string> {
    try {
      return await this.extractSync(bucket, key);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'UnsupportedDocumentException') {
        // PDF nhiều trang → dùng async
        return this.extractAsync(bucket, key);
      }
      throw err;
    }
  }

  private async extractSync(bucket: string, key: string): Promise<string> {
    const result = await getClient().send(
      new DetectDocumentTextCommand({
        Document: { S3Object: { Bucket: bucket, Name: key } },
      }),
    );
    const text = blocksToText(result.Blocks ?? []).trim();
    if (!text) {
      throw new Error('Textract không trích xuất được nội dung từ CV');
    }
    return text;
  }

  private async extractAsync(bucket: string, key: string): Promise<string> {
    // 1. Start job
    const start = await getClient().send(
      new StartDocumentTextDetectionCommand({
        DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
      }),
    );
    const jobId = start.JobId;
    if (!jobId) {
      throw new Error('Textract không khởi tạo được job OCR');
    }

    // 2. Poll trạng thái (tối đa ~90s, cách 3s)
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(3000);
      const status = await getClient().send(
        new GetDocumentTextDetectionCommand({ JobId: jobId }),
      );

      if (status.JobStatus === 'SUCCEEDED') {
        return this.collectAsyncResult(jobId, status.Blocks ?? [], status.NextToken);
      }
      if (status.JobStatus === 'FAILED') {
        throw new Error(
          `Textract OCR thất bại: ${status.StatusMessage ?? 'không rõ nguyên nhân'}`,
        );
      }
      // IN_PROGRESS → tiếp tục poll
    }

    throw new Error('Textract OCR quá thời gian xử lý');
  }

  /**
   * Ghép kết quả nhiều trang (phân trang qua NextToken).
   */
  private async collectAsyncResult(
    jobId: string,
    firstBlocks: Block[],
    firstToken?: string,
  ): Promise<string> {
    const allBlocks: Block[] = [...firstBlocks];
    let token = firstToken;

    while (token) {
      const page = await getClient().send(
        new GetDocumentTextDetectionCommand({ JobId: jobId, NextToken: token }),
      );
      allBlocks.push(...(page.Blocks ?? []));
      token = page.NextToken;
    }

    const text = blocksToText(allBlocks).trim();
    if (!text) {
      throw new Error('Textract không trích xuất được nội dung từ CV');
    }
    return text;
  }
}
