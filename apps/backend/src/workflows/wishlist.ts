import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { copyWishlistItemsStep } from "./steps/copy-wishlist-items";
import { createGuestWishlistStep } from "./steps/create-guest-wishlist";
import {
  hardDeleteWishlistsStep,
  softDeleteWishlistsStep,
} from "./steps/delete-wishlists";
import { findCustomerWishlistStep } from "./steps/find-customer-wishlist";
import { getOrCreateWishlistStep } from "./steps/get-or-create-wishlist";
import { removeWishlistItemStep } from "./steps/remove-wishlist-item";
import { resolveGuestWishlistStep } from "./steps/resolve-guest-wishlist";
import { saveWishlistItemStep } from "./steps/save-wishlist-item";
import { validateWishlistProductStep } from "./steps/validate-wishlist-product";

// Customer wishlists

export type AddToWishlistInput = {
  customer_id: string;
  product_id: string;
  product_variant_id?: string | null;
};

export const addToWishlistWorkflow = createWorkflow(
  "add-to-wishlist",
  function (input: AddToWishlistInput) {
    validateWishlistProductStep(input);

    const wishlist = getOrCreateWishlistStep({
      customer_id: input.customer_id,
    });

    const itemInput = transform({ input, wishlist }, (data) => ({
      wishlist_id: data.wishlist.id,
      product_id: data.input.product_id,
      product_variant_id: data.input.product_variant_id,
    }));

    const item = saveWishlistItemStep(itemInput);

    return new WorkflowResponse({ wishlist_id: wishlist.id, item });
  },
);

export type RemoveFromWishlistInput = {
  customer_id: string;
  item_id: string;
};

export const removeFromWishlistWorkflow = createWorkflow(
  "remove-from-wishlist",
  function (input: RemoveFromWishlistInput) {
    const wishlist = findCustomerWishlistStep({
      customer_id: input.customer_id,
    });

    const removeInput = transform({ input, wishlist }, (data) => ({
      wishlist_id: data.wishlist.id,
      item_id: data.input.item_id,
    }));

    const removed = removeWishlistItemStep(removeInput);

    return new WorkflowResponse(removed);
  },
);

// Guest wishlists

export type CreateGuestWishlistInput = {
  product_id: string;
  product_variant_id?: string | null;
};

/**
 * A guest's list is created by their first save, never empty, so browsing
 * alone does not leave rows behind.
 */
export const createGuestWishlistWorkflow = createWorkflow(
  "create-guest-wishlist",
  function (input: CreateGuestWishlistInput) {
    validateWishlistProductStep(input);

    const wishlist = createGuestWishlistStep();

    const itemInput = transform({ input, wishlist }, (data) => ({
      wishlist_id: data.wishlist.id,
      product_id: data.input.product_id,
      product_variant_id: data.input.product_variant_id,
    }));

    const item = saveWishlistItemStep(itemInput);

    return new WorkflowResponse({ wishlist_id: wishlist.id, item });
  },
);

export type AddToGuestWishlistInput = {
  wishlist_id: string;
  product_id: string;
  product_variant_id?: string | null;
};

export const addToGuestWishlistWorkflow = createWorkflow(
  "add-to-guest-wishlist",
  function (input: AddToGuestWishlistInput) {
    const wishlist = resolveGuestWishlistStep({
      wishlist_id: input.wishlist_id,
    });

    validateWishlistProductStep(input);

    const itemInput = transform({ input, wishlist }, (data) => ({
      wishlist_id: data.wishlist.id,
      product_id: data.input.product_id,
      product_variant_id: data.input.product_variant_id,
    }));

    const item = saveWishlistItemStep(itemInput);

    return new WorkflowResponse({ wishlist_id: wishlist.id, item });
  },
);

export type RemoveFromGuestWishlistInput = {
  wishlist_id: string;
  item_id: string;
};

export const removeFromGuestWishlistWorkflow = createWorkflow(
  "remove-from-guest-wishlist",
  function (input: RemoveFromGuestWishlistInput) {
    const wishlist = resolveGuestWishlistStep({
      wishlist_id: input.wishlist_id,
    });

    const removeInput = transform({ input, wishlist }, (data) => ({
      wishlist_id: data.wishlist.id,
      item_id: data.input.item_id,
    }));

    const removed = removeWishlistItemStep(removeInput);

    return new WorkflowResponse(removed);
  },
);

export type MergeGuestWishlistInput = {
  customer_id: string;
  guest_wishlist_id: string;
};

/**
 * Runs when a guest signs in: their saves join the customer's list, and the
 * guest list is deleted so its ID stops working.
 */
export const mergeGuestWishlistWorkflow = createWorkflow(
  "merge-guest-wishlist",
  function (input: MergeGuestWishlistInput) {
    const guest = resolveGuestWishlistStep({
      wishlist_id: input.guest_wishlist_id,
    });

    const wishlist = getOrCreateWishlistStep({
      customer_id: input.customer_id,
    });

    const copyInput = transform({ guest, wishlist }, (data) => ({
      from_wishlist_id: data.guest.id,
      to_wishlist_id: data.wishlist.id,
    }));

    const result = copyWishlistItemsStep(copyInput);

    const deleteInput = transform({ guest }, (data) => ({
      ids: [data.guest.id],
    }));

    softDeleteWishlistsStep(deleteInput);

    return new WorkflowResponse({
      wishlist_id: wishlist.id,
      copied: result.copied,
      updated: result.updated,
    });
  },
);

export type DeleteGuestWishlistsInput = { ids: string[] };

export const deleteGuestWishlistsWorkflow = createWorkflow(
  "delete-guest-wishlists",
  function (input: DeleteGuestWishlistsInput) {
    const result = hardDeleteWishlistsStep(input);

    return new WorkflowResponse(result);
  },
);
