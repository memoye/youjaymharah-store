import { MedusaError, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export type CreateEmailpassIdentityInput = {
  email: string;
  password: string;
};

export type CreateEmailpassIdentityOutput = { auth_identity_id: string };

/**
 * Gives an account an email/password login it did not have.
 *
 * The emailpass provider keys identities by email, so registering here creates
 * a second auth identity for the same person; the workflow then points it at
 * their existing customer, exactly as a linked Google sign-in does.
 */
export const createEmailpassIdentityStep = createStep(
  "create-emailpass-identity",
  async (input: CreateEmailpassIdentityInput, { container }) => {
    const authService = container.resolve(Modules.AUTH);

    const { success, authIdentity, error } = await authService.register(
      "emailpass",
      { body: { email: input.email, password: input.password } },
    );

    if (!success || !authIdentity) {
      // The provider reports an existing identity rather than throwing.
      if (error?.includes("already exists")) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This account already has a password. Use the password reset flow to change it.",
        );
      }

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        error ?? "The password could not be set.",
      );
    }

    // Both generics matter: the second is the compensation input (the id to
    // delete), which is not the same shape as the step's output.
    return new StepResponse<CreateEmailpassIdentityOutput, string>(
      { auth_identity_id: authIdentity.id },
      authIdentity.id,
    );
  },
  async (authIdentityId, { container }) => {
    if (!authIdentityId) {
      return;
    }
    const authService = container.resolve(Modules.AUTH);
    await authService.deleteAuthIdentities([authIdentityId]);
  },
);
