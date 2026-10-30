import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export async function handle(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      const errorBody: { message: string; fieldErrors?: Record<string, string[]> } = {
        message: err.message,
      };
      if (err.fieldErrors) {
        errorBody.fieldErrors = err.fieldErrors;
      }
      return NextResponse.json({ error: errorBody }, { status: err.status });
    }

    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            message: "Validation failed",
            fieldErrors: err.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    console.error(err);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema.parse(body);
}
