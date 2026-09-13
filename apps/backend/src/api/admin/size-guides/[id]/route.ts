import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import type { AdminUpdateSizeGuideType } from "../../../middlewares";
import {
  deleteSizeGuidesWorkflow,
  updateSizeGuideWorkflow,
} from "../../../../workflows/size-guides";
import { listAdminSizeGuides } from "../helpers";

async function retrieve(req: AuthenticatedMedusaRequest) {
  const [sizeGuide] = await listAdminSizeGuides(req.scope, {
    id: req.params.id,
  });

  if (!sizeGuide) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Size guide ${req.params.id} was not found.`,
    );
  }

  return sizeGuide;
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  res.json({ size_guide: await retrieve(req) });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateSizeGuideType>,
  res: MedusaResponse,
) => {
  await updateSizeGuideWorkflow(req.scope).run({
    input: { id: req.params.id, ...req.validatedBody },
  });

  res.json({ size_guide: await retrieve(req) });
};

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  // Reports an unknown ID as not found rather than deleting nothing quietly.
  await retrieve(req);

  await deleteSizeGuidesWorkflow(req.scope).run({
    input: { ids: [req.params.id] },
  });

  res.json({ id: req.params.id, object: "size_guide", deleted: true });
};
