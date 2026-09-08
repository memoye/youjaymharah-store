import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, toast } from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AvatarField } from "../../components/avatar/avatar-field";
import { sdk } from "../../lib/sdk";

type AdminUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

const ME_QUERY_KEY = ["profile-avatar"];

/**
 * The stock profile page never renders `avatar_url` even though the core user
 * model and update API support it, so this widget adds the missing section.
 */
const ProfileAvatarWidget = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => sdk.client.fetch<{ user: AdminUser }>("/admin/users/me"),
  });

  const user = data?.user;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : "";

  const setAvatar = useMutation({
    mutationFn: (url: string | null) =>
      sdk.client.fetch(`/admin/users/${user!.id}`, {
        method: "POST",
        body: { avatar_url: url },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
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

  if (isLoading || !user) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Profile picture</Heading>
      </div>
      <div className="px-6 py-4">
        <AvatarField
          avatarUrl={avatarUrl ?? user.avatar_url}
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
  zone: "profile.details.after",
});

export default ProfileAvatarWidget;
