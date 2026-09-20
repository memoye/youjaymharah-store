import { Resend } from "resend";

export class BoundedResend extends Resend {
  override fetchRequest<T>(path: string, options: RequestInit = {}) {
    return super.fetchRequest<T>(path, {
      ...options,
      signal: AbortSignal.timeout(15_000),
    });
  }
}
