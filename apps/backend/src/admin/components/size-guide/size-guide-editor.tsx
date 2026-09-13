import { Plus, Trash } from "@medusajs/icons";
import {
  Button,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { sdk } from "../../lib/sdk";
import {
  type AdminSizeGuide,
  columnKey,
  formatMeasurement,
  parseMeasurement,
  type SizeGuideCell,
  type SizeGuideColumn,
  type SizeGuideTable,
  type Unit,
} from "./size-guide-data";

type DraftRow = { id: number; size: string; cells: Record<string, string> };

let nextRowId = 1;

const STARTER_COLUMNS: SizeGuideColumn[] = [
  { key: "bust", label: "Bust", type: "measurement" },
  { key: "waist", label: "Waist", type: "measurement" },
  { key: "hips", label: "Hips", type: "measurement" },
];

function cellText(
  column: SizeGuideColumn,
  cell: SizeGuideCell | undefined,
  unit: Unit,
): string {
  if (cell === null || cell === undefined) {
    return "";
  }

  if (column.type === "text" || typeof cell === "string") {
    return String(cell);
  }

  return formatMeasurement(cell, unit);
}

function toDraftRows(
  table: SizeGuideTable | undefined,
  unit: Unit,
): DraftRow[] {
  return (table?.rows ?? []).map((row) => ({
    id: nextRowId++,
    size: row.size,
    cells: Object.fromEntries(
      (table?.columns ?? []).map((column) => [
        column.key,
        cellText(column, row.values[column.key], unit),
      ]),
    ),
  }));
}

/**
 * Builds the table to save, or explains the first problem in staff terms.
 * Sizes are checked against the Size option again on the server.
 */
function buildTable(
  columns: SizeGuideColumn[],
  rows: DraftRow[],
  unit: Unit,
): { table: SizeGuideTable } | { error: string } {
  if (!columns.length) {
    return { error: "Add at least one column." };
  }

  const blankColumn = columns.find((column) => !column.label.trim());

  if (blankColumn) {
    return { error: "Every column needs a name." };
  }

  if (!rows.length) {
    return { error: "Add at least one size." };
  }

  const tableRows: SizeGuideTable["rows"] = [];

  for (const row of rows) {
    if (!row.size) {
      return { error: "Pick a size for every row." };
    }

    const values: Record<string, SizeGuideCell> = {};

    for (const column of columns) {
      const text = row.cells[column.key] ?? "";

      if (column.type === "text") {
        values[column.key] = text.trim() || null;
        continue;
      }

      const parsed = parseMeasurement(text, unit);

      if (parsed === undefined) {
        return {
          error: `${column.label} for size ${row.size} is not a measurement. Use a number like 86, or a range like 86-90.`,
        };
      }

      values[column.key] = parsed;
    }

    tableRows.push({ size: row.size, values });
  }

  return {
    table: {
      columns: columns.map((column) => ({
        ...column,
        label: column.label.trim(),
      })),
      rows: tableRows,
    },
  };
}

type SizeGuideEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The guide to edit; omitted to create one. */
  guide?: AdminSizeGuide | null;
  /** Values of the shared Size option, in display order. */
  sizes: string[];
  onSaved: () => void;
};

/**
 * Create or edit a size guide. A full-screen modal for editing too: the table
 * needs the width a side drawer does not have.
 */
export const SizeGuideEditor = ({
  open,
  onOpenChange,
  guide,
  sizes,
  onSaved,
}: SizeGuideEditorProps) => {
  const prompt = usePrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unit, setUnit] = useState<Unit>("cm");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [columns, setColumns] = useState<SizeGuideColumn[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([]);

  // Fresh draft each time the modal opens, from the guide or a starter table.
  useEffect(() => {
    if (!open) {
      return;
    }

    setUnit("cm");
    setName(guide?.name ?? "");
    setDescription(guide?.description ?? "");
    setDiagramUrl(guide?.diagram_url ?? "");
    setIsDefault(guide?.is_default ?? false);
    setColumns(guide?.table.columns ?? STARTER_COLUMNS);
    setRows(
      guide
        ? toDraftRows(guide.table, "cm")
        : sizes
            .slice(0, 1)
            .map((size) => ({ id: nextRowId++, size, cells: {} })),
    );
  }, [open, guide, sizes]);

  const uploadDiagram = useMutation({
    mutationFn: async (file: File) => {
      const { files } = await sdk.admin.upload.create({ files: [file] });
      return files[0]?.url;
    },
    onSuccess: (url) => url && setDiagramUrl(url),
    onError: (error: Error) => toast.error(`Upload failed: ${error.message}`),
  });

  const save = useMutation({
    mutationFn: (table: SizeGuideTable) =>
      sdk.client.fetch(
        guide ? `/admin/size-guides/${guide.id}` : "/admin/size-guides",
        {
          method: "POST",
          body: {
            name: name.trim(),
            description: description.trim() || null,
            diagram_url: diagramUrl || null,
            is_default: isDefault,
            table,
          },
        },
      ),
    onSuccess: () => {
      toast.success(guide ? "Size guide saved." : "Size guide created.");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/size-guides/${guide!.id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Size guide deleted.");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const busy = save.isPending || remove.isPending || uploadDiagram.isPending;

  const switchUnit = (next: Unit) => {
    if (next === unit) {
      return;
    }

    // Re-express what has been typed so far in the new unit.
    setRows((current) =>
      current.map((row) => ({
        ...row,
        cells: Object.fromEntries(
          Object.entries(row.cells).map(([key, text]) => {
            const column = columns.find((c) => c.key === key);
            const parsed =
              column?.type === "measurement"
                ? parseMeasurement(text, unit)
                : undefined;

            return [
              key,
              parsed === undefined || parsed === null
                ? text
                : formatMeasurement(parsed, next),
            ];
          }),
        ),
      })),
    );
    setUnit(next);
  };

  const addColumn = () => {
    const taken = new Set(columns.map((column) => column.key));
    setColumns([
      ...columns,
      { key: columnKey("column", taken), label: "", type: "measurement" },
    ]);
  };

  const updateColumn = (index: number, update: Partial<SizeGuideColumn>) => {
    setColumns((current) =>
      current.map((column, i) => {
        if (i !== index) {
          return column;
        }

        const next = { ...column, ...update };

        // New columns take their key from their first name; saved columns
        // keep theirs, so renaming "Bust" to "Chest" keeps its values.
        const isSaved = guide?.table.columns.some((c) => c.key === column.key);

        if (update.label !== undefined && !isSaved) {
          const taken = new Set(
            current.filter((_, j) => j !== index).map((c) => c.key),
          );
          const key = columnKey(update.label || "column", taken);

          setRows((currentRows) =>
            currentRows.map((row) => {
              const { [column.key]: value, ...rest } = row.cells;
              return { ...row, cells: { ...rest, [key]: value ?? "" } };
            }),
          );
          next.key = key;
        }

        return next;
      }),
    );
  };

  const removeColumn = (index: number) => {
    setColumns((current) => current.filter((_, i) => i !== index));
  };

  const usedSizes = new Set(rows.map((row) => row.size));

  const addRow = () => {
    const nextSize = sizes.find((size) => !usedSizes.has(size)) ?? "";
    setRows([...rows, { id: nextRowId++, size: nextSize, cells: {} }]);
  };

  const onSave = () => {
    if (!name.trim()) {
      toast.error("Give the size guide a name.");
      return;
    }

    const built = buildTable(columns, rows, unit);

    if ("error" in built) {
      toast.error(built.error);
      return;
    }

    save.mutate(built.table);
  };

  const onDelete = async () => {
    const confirmed = await prompt({
      title: `Delete "${guide?.name}"?`,
      description:
        "Products and categories using it will fall back to their category's guide or the store default. This can't be undone from the admin.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      remove.mutate();
    }
  };

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <div className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="flex w-full items-center justify-between gap-x-2">
              <div>
                {guide && (
                  <Button
                    size="small"
                    variant="danger"
                    disabled={busy}
                    isLoading={remove.isPending}
                    onClick={onDelete}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-x-2">
                <FocusModal.Close asChild>
                  <Button size="small" variant="secondary" disabled={busy}>
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button
                  size="small"
                  disabled={busy}
                  isLoading={save.isPending}
                  onClick={onSave}
                >
                  Save
                </Button>
              </div>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
            <div className="flex w-full max-w-[960px] flex-col gap-y-8 px-6 py-10">
              <Heading level="h1">
                {guide ? "Edit size guide" : "Create size guide"}
              </Heading>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="size-guide-name" size="small" weight="plus">
                    Name
                  </Label>
                  <Input
                    id="size-guide-name"
                    value={name}
                    placeholder="Women's clothing"
                    onChange={(event) => setName(event.target.value)}
                  />
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    Only staff see the name.
                  </Text>
                </div>

                <div className="flex items-start justify-between gap-x-4 rounded-lg border border-ui-border-base px-4 py-3">
                  <div className="flex flex-col gap-y-1">
                    <Label
                      htmlFor="size-guide-default"
                      size="small"
                      weight="plus"
                    >
                      Store default
                    </Label>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      Used for products whose category has no guide.
                    </Text>
                  </div>
                  <Switch
                    id="size-guide-default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-y-2">
                <Label
                  htmlFor="size-guide-description"
                  size="small"
                  weight="plus"
                >
                  How to measure
                </Label>
                <Textarea
                  id="size-guide-description"
                  rows={3}
                  value={description}
                  placeholder="Measure over underwear with a soft tape..."
                  onChange={(event) => setDescription(event.target.value)}
                />
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  Shown above the table on the website. Optional.
                </Text>
              </div>

              <div className="flex flex-col gap-y-2">
                <Label size="small" weight="plus">
                  Measuring diagram
                </Label>
                {diagramUrl && (
                  <img
                    src={diagramUrl}
                    alt="Measuring diagram preview"
                    className="h-32 w-auto self-start rounded-md object-contain"
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      uploadDiagram.mutate(file);
                    }
                    event.target.value = "";
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={busy}
                    isLoading={uploadDiagram.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {diagramUrl ? "Replace image" : "Upload image"}
                  </Button>
                  {diagramUrl && (
                    <Button
                      size="small"
                      variant="transparent"
                      disabled={busy}
                      onClick={() => setDiagramUrl("")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  Optional. A drawing of where to measure; the measurements
                  themselves go in the table below.
                </Text>
              </div>

              <div className="flex flex-col gap-y-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col gap-y-1">
                    <Heading level="h2">Measurements</Heading>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      Type a number (86) or a range (86-90). Shoppers can switch
                      between cm and inches on the website.
                    </Text>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Label htmlFor="size-guide-unit" size="small" weight="plus">
                      Enter in
                    </Label>
                    <Select
                      value={unit}
                      onValueChange={(value) => switchUnit(value as Unit)}
                    >
                      <Select.Trigger id="size-guide-unit" className="w-32">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="cm">Centimetres</Select.Item>
                        <Select.Item value="in">Inches</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-y-2">
                  <Text size="small" leading="compact" weight="plus">
                    Columns
                  </Text>
                  {columns.map((column, index) => (
                    <div key={column.key} className="flex items-center gap-x-2">
                      <Input
                        aria-label={`Column ${index + 1} name`}
                        value={column.label}
                        placeholder="Bust"
                        onChange={(event) =>
                          updateColumn(index, { label: event.target.value })
                        }
                      />
                      <Select
                        value={column.type}
                        onValueChange={(value) =>
                          updateColumn(index, {
                            type: value as SizeGuideColumn["type"],
                          })
                        }
                      >
                        <Select.Trigger
                          aria-label={`Column ${index + 1} type`}
                          className="w-56"
                        >
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="measurement">
                            Measurement (cm / in)
                          </Select.Item>
                          <Select.Item value="text">
                            Text (e.g. UK 10)
                          </Select.Item>
                        </Select.Content>
                      </Select>
                      <IconButton
                        size="small"
                        variant="transparent"
                        aria-label={`Remove column ${column.label || index + 1}`}
                        onClick={() => removeColumn(index)}
                      >
                        <Trash />
                      </IconButton>
                    </div>
                  ))}
                  <Button
                    size="small"
                    variant="secondary"
                    className="self-start"
                    onClick={addColumn}
                    disabled={columns.length >= 12}
                  >
                    <Plus />
                    Add column
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-ui-border-base">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Size</Table.HeaderCell>
                        {columns.map((column) => (
                          <Table.HeaderCell key={column.key}>
                            {column.label || "Untitled"}
                            {column.type === "measurement" ? ` (${unit})` : ""}
                          </Table.HeaderCell>
                        ))}
                        <Table.HeaderCell />
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {rows.map((row) => (
                        <Table.Row key={row.id}>
                          <Table.Cell className="min-w-28">
                            <Select
                              value={row.size || undefined}
                              onValueChange={(value) =>
                                setRows((current) =>
                                  current.map((r) =>
                                    r.id === row.id ? { ...r, size: value } : r,
                                  ),
                                )
                              }
                            >
                              <Select.Trigger aria-label="Size">
                                <Select.Value placeholder="Size" />
                              </Select.Trigger>
                              <Select.Content>
                                {sizes
                                  .filter(
                                    (size) =>
                                      size === row.size || !usedSizes.has(size),
                                  )
                                  .map((size) => (
                                    <Select.Item key={size} value={size}>
                                      {size}
                                    </Select.Item>
                                  ))}
                                {row.size && !sizes.includes(row.size) && (
                                  <Select.Item value={row.size}>
                                    {row.size} (not a Size value)
                                  </Select.Item>
                                )}
                              </Select.Content>
                            </Select>
                          </Table.Cell>
                          {columns.map((column) => (
                            <Table.Cell key={column.key} className="min-w-28">
                              <Input
                                size="small"
                                aria-label={`${column.label} for size ${row.size}`}
                                value={row.cells[column.key] ?? ""}
                                placeholder={
                                  column.type === "measurement" ? "86-90" : "10"
                                }
                                onChange={(event) =>
                                  setRows((current) =>
                                    current.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            cells: {
                                              ...r.cells,
                                              [column.key]: event.target.value,
                                            },
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              />
                            </Table.Cell>
                          ))}
                          <Table.Cell>
                            <IconButton
                              size="small"
                              variant="transparent"
                              aria-label={`Remove size ${row.size}`}
                              onClick={() =>
                                setRows((current) =>
                                  current.filter((r) => r.id !== row.id),
                                )
                              }
                            >
                              <Trash />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
                <div className="flex items-center gap-x-3">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={addRow}
                    disabled={rows.length >= 40}
                  >
                    <Plus />
                    Add size
                  </Button>
                  {!sizes.length && (
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      No shared Size option was found. Create one under Products
                      › Options to pick sizes here.
                    </Text>
                  )}
                </div>
              </div>
            </div>
          </FocusModal.Body>
        </div>
      </FocusModal.Content>
    </FocusModal>
  );
};
