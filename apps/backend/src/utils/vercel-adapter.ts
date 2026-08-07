/**
 * Adapta um handler no formato Lambda (event) => {statusCode, body}
 * para uma função serverless da Vercel (req, res).
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

interface VercelRequest {
  body?: unknown;
  query?: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

type LambdaHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

function toVercelHandler(lambdaFn: LambdaHandler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const event = {
      body: req.body ? JSON.stringify(req.body) : null,
      queryStringParameters: req.query || {},
      headers: req.headers,
    } as unknown as APIGatewayProxyEvent;

    const result = await lambdaFn(event);

    res.status(result.statusCode);

    const headers = result.headers || {};
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, String(value));
    }

    res.setHeader("Content-Type", "application/json");
    res.send(result.body);
  };
}

export { toVercelHandler };
