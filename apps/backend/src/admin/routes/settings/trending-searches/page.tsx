import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Button,
  Container,
  Heading,
  Label,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { usePermissions } from "../../../lib/permissions";
import { sdk } from "../../../lib/sdk";

type Vocabulary = {
  terms: string[];
  revision: string | null;
  source: "admin" | "environment";
};
const KEY = ["search-vocabulary"];

function VocabularyEditor({ vocabulary }: { vocabulary: Vocabulary }) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [text, setText] = useState(vocabulary.terms.join("\n"));
  const terms = text
    .split(/\r?\n/)
    .map((term) => term.trim())
    .filter(Boolean);
  const canEdit = can("storefront_settings", "update");
  const dirty = text !== vocabulary.terms.join("\n");
  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ vocabulary: Vocabulary }>("/admin/search-vocabulary", {
        method: "POST",
        body: { terms, revision: vocabulary.revision },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(KEY, data);
      toast.success("Approved search phrases saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canEdit) save.mutate();
      }}
    >
      <div className="bg-ui-bg-subtle rounded-lg border p-4">
        <Heading level="h2">
          Approval controls trending, not product search
        </Heading>
        <Text size="small">
          Shoppers can search for any phrase, even if it is not on this list.
          Unapproved phrases still return normal product search results, but are
          not counted for trending, shown in trending suggestions, or collected
          into a pending-approval list.
        </Text>
        <Text size="small" className="mt-2">
          Removing a phrase stops future trending counts and hides it from
          trending suggestions. Previous counts remain until scheduled cleanup.
          Saving an empty list turns off trending, not product search.
        </Text>
      </div>
      <Text size="small">
        A phrase still needs five searches in seven days and a currently
        published matching product. Approval makes a phrase eligible; it does
        not guarantee a suggestion or manually change its ranking. Matching is
        exact after normalizing case and spacing: add singular and plural forms
        separately if you want both counted.
      </Text>
      <Text size="small" className="text-ui-fg-subtle">
        Approve catalog language only, never names, email addresses, phone
        numbers, order references or customer messages. Automatic validation
        cannot determine whether a name is personal information.
      </Text>
      <Label htmlFor="approved-search-phrases">
        Approved phrases — one per line
      </Label>
      <Textarea
        id="approved-search-phrases"
        aria-describedby="approved-search-help"
        rows={12}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={!canEdit || save.isPending}
      />
      <Text id="approved-search-help" size="small">
        {terms.length}/100 phrases. Each must contain 2–64 letters, spaces,
        apostrophes or hyphens. Capitalization, spacing and duplicates are
        normalized when saved.
      </Text>
      {vocabulary.source === "environment" && (
        <Text size="small">
          Currently using the deployment's initial vocabulary (empty by
          default). Your first save makes this editor authoritative, even when
          you save an empty list.
        </Text>
      )}
      {!canEdit && (
        <Text size="small">
          Read-only: you need permission to update Storefront settings.
        </Text>
      )}
      <div className="flex gap-2">
        {canEdit && (
          <Button
            type="submit"
            isLoading={save.isPending}
            disabled={
              (!dirty && vocabulary.source === "admin") ||
              terms.length > 100 ||
              save.isPending
            }
          >
            Save phrases
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={save.isPending}
          onClick={async () => {
            if (
              dirty &&
              !window.confirm(
                "Discard your unsaved changes and reload the latest phrases?",
              )
            )
              return;
            const data = await queryClient
              .fetchQuery({
                queryKey: KEY,
                staleTime: 0,
                queryFn: () =>
                  sdk.client.fetch<{ vocabulary: Vocabulary }>(
                    "/admin/search-vocabulary",
                  ),
              })
              .catch(() => null);
            if (data) setText(data.vocabulary.terms.join("\n"));
            else
              toast.error("Could not reload phrases. Your draft is unchanged.");
          }}
        >
          Reload latest
        </Button>
      </div>
    </form>
  );
}

const TrendingSearchesPage = () => {
  const query = useQuery({
    queryKey: KEY,
    queryFn: () =>
      sdk.client.fetch<{ vocabulary: Vocabulary }>("/admin/search-vocabulary"),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return (
    <Container className="flex flex-col gap-4">
      <Heading level="h1">Trending searches</Heading>
      {query.isPending ? (
        <Text>Loading approved phrases…</Text>
      ) : query.isError ? (
        <div role="alert">
          <Text>
            Unable to load phrases. Check your permissions and try again.
          </Text>
          <Button variant="secondary" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <VocabularyEditor
          key={query.data.vocabulary.revision ?? "environment"}
          vocabulary={query.data.vocabulary}
        />
      )}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Trending searches",
  rank: 5,
});
export default TrendingSearchesPage;
