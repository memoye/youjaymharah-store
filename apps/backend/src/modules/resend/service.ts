import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";
import { Resend } from "resend";

type ResendOptions = {
  api_key: string;
  from: string;
  html_templates?: Record<
    string,
    {
      subject?: string;
      content: string;
    }
  >;
};

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend";
  private resendClient: Resend;
  private options: ResendOptions;
  private logger: Logger;

  // ...
}

export default ResendNotificationProviderService;
