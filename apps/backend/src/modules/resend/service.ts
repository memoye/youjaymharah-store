import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import { render } from "react-email";
import { Resend } from "resend";

import { resolveEmailTemplate } from "./emails";

type ResendOptions = {
  api_key: string;
  from: string;
};

type InjectedDependencies = {
  logger: Logger;
};

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend";
  private resendClient: Resend;
  private options: ResendOptions;
  private logger: Logger;

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super();
    this.resendClient = new Resend(options.api_key);
    this.options = options;
    this.logger = logger;
  }

  static validateOptions(options: Record<any, any>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `api_key` is required in the provider's options.",
      );
    }

    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `from` is required in the provider's options.",
      );
    }
  }

  async send(
    notification: ProviderSendNotificationDTO,
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No recipient was provided for the notification.",
      );
    }

    // A React Email template under ./emails wins when the name matches one.
    const resolved = resolveEmailTemplate(
      notification.template,
      notification.data,
    );

    // Otherwise the caller supplies the rendered body inline via `content`.
    const html = notification.content?.html;
    const text = notification.content?.text;

    if (!resolved && !html && !text) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No template registered under "${notification.template}" and no inline \`html\`/\`text\` content was provided.`,
      );
    }

    const base = {
      from: notification.from?.trim() || this.options.from,
      to: notification.to,
      // An explicit subject from the caller overrides the template's default.
      subject:
        notification.content?.subject ?? resolved?.subject ?? "Notification",
      attachments: notification.attachments?.map((attachment) => ({
        content: attachment.content,
        filename: attachment.filename,
        contentType: attachment.content_type,
        contentId: attachment.id,
      })),
    };

    // Templates are rendered here rather than handed to Resend as `react`, so
    // the HTML and plain-text parts come from the same render and nothing
    // depends on Resend resolving its optional @react-email/render peer. This
    // project is on React 18 because @medusajs/dashboard pins it; react-email's
    // `render` supports that (its Node build renders with
    // renderToPipeableStream), so no React 19 is needed.
    const rendered = resolved
      ? {
          html: await render(resolved.react),
          text: await render(resolved.react, { plainText: true }),
        }
      : undefined;

    // `CreateEmailOptions` requires at least one of react/html/text, so the
    // branches stay separate rather than spreading a possibly-undefined body.
    const { data, error } = await this.resendClient.emails.send(
      rendered
        ? { ...base, ...rendered }
        : html
          ? { ...base, html }
          : { ...base, text: text as string },
    );

    if (error) {
      // Throwing is what makes a failed send retry: the calling workflow step
      // fails and runs again per its `maxRetries`/`retryInterval`. With
      // REDIS_URL set (production), the Redis workflow engine keeps those
      // retries across restarts and deploys; only local dev on the in-memory
      // engine loses them. Callers that must not fail on a bad address catch
      // the error themselves.
      this.logger.error(
        `Resend failed to send "${notification.template}" to ${notification.to}: ${error.message}`,
      );

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend rejected the email: ${error.message}`,
      );
    }

    return { id: data?.id };
  }
}

export default ResendNotificationProviderService;
