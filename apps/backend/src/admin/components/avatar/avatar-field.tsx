import { Button, Text } from "@medusajs/ui";
import { useRef } from "react";

export type AvatarFieldProps = {
  avatarUrl: string | null;
  /** Used for the alt text and the initials fallback. */
  name: string;
  busy: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

export const AvatarField = ({
  avatarUrl,
  name,
  busy,
  uploading,
  onUpload,
  onRemove,
}: AvatarFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ui-bg-subtle">
          <Text size="small" className="text-ui-fg-subtle">
            {initials(name) || "-"}
          </Text>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onUpload(file);
          }
          e.target.value = "";
        }}
      />

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="small"
            variant="secondary"
            disabled={busy}
            isLoading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Upload image
          </Button>
          {avatarUrl && (
            <Button
              size="small"
              variant="transparent"
              disabled={busy}
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          PNG or JPEG, square if possible.
        </Text>
      </div>
    </div>
  );
};
