"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceItem } from "@/types/invoice";

type InvoiceItemsProps = {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
  onAdd: () => void;
  disabled?: boolean;
};

export function InvoiceItems({ items, onChange, onAdd, disabled }: InvoiceItemsProps) {
  const update = (id: string, patch: Partial<InvoiceItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Items</CardTitle>
        <Button type="button" size="sm" onClick={onAdd} disabled={disabled}>
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Item {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || items.length === 1}
                aria-label="Remove item"
                onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="grid gap-2 sm:col-span-2 lg:col-span-2">
                <Label>Description</Label>
                <Input
                  value={item.description}
                  disabled={disabled}
                  onChange={(event) => update(item.id, { description: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>HSN</Label>
                <Input
                  value={item.hsn}
                  disabled={disabled}
                  onChange={(event) => update(item.id, { hsn: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.quantity}
                  disabled={disabled}
                  onChange={(event) => update(item.id, { quantity: Number(event.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Rate</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.rate}
                  disabled={disabled}
                  onChange={(event) => update(item.id, { rate: Number(event.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>GST %</Label>
                <Input
                  type="number"
                  min={0}
                  max={28}
                  step="0.01"
                  value={item.gstPercent}
                  disabled={disabled}
                  onChange={(event) => update(item.id, { gstPercent: Number(event.target.value) })}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
