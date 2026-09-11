"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyFields } from "@/components/gst/seller-form";
import type { PartyDetails } from "@/types/invoice";
import { useT } from "@/components/i18n/language-provider";

type BuyerFormProps = {
  value: PartyDetails;
  onChange: (value: PartyDetails) => void;
  disabled?: boolean;
};

export function BuyerForm({ value, onChange, disabled }: BuyerFormProps) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tools.gstInvoice.buyer")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <PartyFields value={value} onChange={onChange} disabled={disabled} />
      </CardContent>
    </Card>
  );
}
