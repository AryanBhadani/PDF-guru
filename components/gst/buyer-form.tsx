"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyFields } from "@/components/gst/seller-form";
import type { PartyDetails } from "@/types/invoice";

type BuyerFormProps = {
  value: PartyDetails;
  onChange: (value: PartyDetails) => void;
  disabled?: boolean;
};

export function BuyerForm({ value, onChange, disabled }: BuyerFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Buyer</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <PartyFields value={value} onChange={onChange} disabled={disabled} />
      </CardContent>
    </Card>
  );
}
