import { MedusaError } from "@medusajs/framework/utils";
import { Resend } from "resend";

/**
 * Thin wrapper over the Resend audience APIs.
 *
 * The notification provider handles transactional sends; audience membership
 * is a separate concern with its own failure modes, so it gets its own client
 * rather than being squeezed through the provider interface.
 */
export class ResendAudienceClient {
  private readonly client: Resend;

  constructor(apiKey = process.env.RESEND_API_KEY) {
    this.client = new Resend(apiKey);
  }

  async listAudiences() {
    const { data, error } = await this.client.audiences.list();

    if (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Could not list Resend audiences: ${error.message}`,
      );
    }

    return data?.data ?? [];
  }

  async addContact(args: { audienceId: string; email: string }) {
    const { data, error } = await this.client.contacts.create({
      email: args.email,
      unsubscribed: false,
      segments: [{ id: args.audienceId }],
    });

    if (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Could not add ${args.email} to audience: ${error.message}`,
      );
    }

    return data?.id;
  }

  /**
   * Marks the contact unsubscribed rather than deleting it. Resend keeps
   * suppressing the address that way, so a later broadcast cannot reach
   * someone who opted out.
   */
  async unsubscribeContact(args: { audienceId: string; email: string }) {
    const { error } = await this.client.contacts.update({
      email: args.email,
      audienceId: args.audienceId,
      unsubscribed: true,
    });

    if (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Could not unsubscribe ${args.email} in Resend: ${error.message}`,
      );
    }
  }
}
