"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/gst";
import type { PartyDetails } from "@/types/invoice";

type SellerFormProps = {
  value: PartyDetails;
  onChange: (value: PartyDetails) => void;
  disabled?: boolean;
};

export function SellerForm({ value, onChange, disabled }: SellerFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <PartyFields value={value} onChange={onChange} disabled={disabled} />
      </CardContent>
    </Card>
  );
}

export function PartyFields({
  value,
  onChange,
  disabled,
}: {
  value: PartyDetails;
  onChange: (value: PartyDetails) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`name-${value.name}`}>Name</Label>
        <Input
          id={`name-${value.name}`}
          value={value.name}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="Business or person name"
        />
      </div>
      <div className="grid gap-2">
        <Label>Address</Label>
        <Textarea
          value={value.address}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          placeholder="Street, city, PIN"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>GSTIN</Label>
          <Input
            value={value.gstin}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, gstin: event.target.value.toUpperCase() })}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
          />
        </div>
        <div className="grid gap-2">
          <Label>State</Label>
          <NativeSelect
            value={value.state}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, state: event.target.value })}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </>
  );
}
