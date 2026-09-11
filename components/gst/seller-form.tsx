"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/gst";
import type { PartyDetails } from "@/types/invoice";
import { useT } from "@/components/i18n/language-provider";

type SellerFormProps = {
  value: PartyDetails;
  onChange: (value: PartyDetails) => void;
  disabled?: boolean;
};

export function SellerForm({ value, onChange, disabled }: SellerFormProps) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tools.gstInvoice.seller")}</CardTitle>
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
  const t = useT();
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`name-${value.name}`}>{t("tools.gstInvoice.name")}</Label>
        <Input
          id={`name-${value.name}`}
          value={value.name}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder={t("tools.gstInvoice.namePlaceholder")}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("tools.gstInvoice.address")}</Label>
        <Textarea
          value={value.address}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          placeholder={t("tools.gstInvoice.addressPlaceholder")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>{t("tools.gstInvoice.gstin")}</Label>
          <Input
            value={value.gstin}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, gstin: event.target.value.toUpperCase() })}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("tools.gstInvoice.state")}</Label>
          <NativeSelect
            value={value.state}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, state: event.target.value })}
          >
            <option value="">{t("tools.gstInvoice.selectState")}</option>
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
