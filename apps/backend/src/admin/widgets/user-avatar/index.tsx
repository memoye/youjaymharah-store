import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, toast } from "@medusajs/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AvatarField } from "../../components/avatar/avatar-field";
import { sdk } from "../../lib/sdk";

type AdminUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

const UserAvatarWidget = ({ data }: { data?: AdminUser }) => {
  const [avatarUrl, setAvatarUrl] = useState(data?.avatar_url ?? null);

  // Re-sync when the host page refetches the user.
  useEffect(() => {
    setAvatarUrl(data?.avatar_url ?? null);
  }, [data?.avatar_url]);

  const displayName = data
    ? [data.first_name, data.last_name].filter(Boolean).join(" ") || data.email
    : "";

  const setAvatar = useMutation({
    mutationFn: (url: string | null) =>
      sdk.admin.user.update(data!.id, { avatar_url: url }),
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
      toast.success("Profile picture saved.");
    },
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  const removeAvatar = useMutation({
    mutationFn: () => setAvatar.mutateAsync(null),
    onSuccess: () => {
      setAvatarUrl(null);
      toast.success("Profile picture removed.");
    },
  });

  const busy = setAvatar.isPending || uploadAvatar.isPending;

  if (!data) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Profile picture</Heading>
      </div>
      <div className="px-6 py-4">
        <AvatarField
          avatarUrl={avatarUrl}
          name={displayName}
          busy={busy}
          uploading={uploadAvatar.isPending}
          onUpload={(file: File) => uploadAvatar.mutate(file)}
          onRemove={() => removeAvatar.mutate()}
        />
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "user.details.after",
});

export default UserAvatarWidget;
