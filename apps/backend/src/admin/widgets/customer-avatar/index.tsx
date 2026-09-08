import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text, toast } from "@medusajs/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AvatarField } from "../../components/avatar/avatar-field";
import { sdk } from "../../lib/sdk";

type AdminCustomer = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * The customer model has no avatar column, so the URL is stored under
 * `metadata.avatar_url`. The store API accepts metadata on
 * `POST /store/customers/me`, so a customer will be able to set their own
 * picture from the storefront without any backend change.
 */
const CustomerAvatarWidget = ({ data }: { data?: AdminCustomer }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (data?.metadata?.avatar_url as string | undefined) ?? null,
  );

  // Re-sync when the host page refetches the customer.
  useEffect(() => {
    setAvatarUrl((data?.metadata?.avatar_url as string | undefined) ?? null);
  }, [data?.metadata?.avatar_url]);

  const displayName = data
    ? [data.first_name, data.last_name].filter(Boolean).join(" ") || data.email
    : "";

  const setAvatar = useMutation({
    mutationFn: (url: string | null) =>
      sdk.admin.customer.update(data!.id, {
        metadata: { ...data!.metadata, avatar_url: url },
      }),
    onError: (error: Error) => toast.error(error.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const { files } = await sdk.admin.upload.create({ files: [file] });
      const url = files[0]?.url;
      if (!url) {
        throw new Error("Upload produced no file URL");
      }
      return url;
    },
    onSuccess: (url) => {
      setAvatarUrl(url);
      setAvatar.mutate(url);
      toast.success("Customer picture saved.");
    },
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  const removeAvatar = useMutation({
    mutationFn: () => setAvatar.mutateAsync(null),
    onSuccess: () => {
      setAvatarUrl(null);
      toast.success("Customer picture removed.");
    },
  });

  const busy = setAvatar.isPending || uploadAvatar.isPending;

  if (!data) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Picture</Heading>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        <AvatarField
          avatarUrl={avatarUrl}
          name={displayName}
          busy={busy}
          uploading={uploadAvatar.isPending}
          onUpload={(file: File) => uploadAvatar.mutate(file)}
          onRemove={() => removeAvatar.mutate()}
        />
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Stored on the customer's metadata, so the customer can also change it
          from their own account.
        </Text>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "customer.details.after",
});

export default CustomerAvatarWidget;
