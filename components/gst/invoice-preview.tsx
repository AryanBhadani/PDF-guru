"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/gst";
import type { InvoiceFormData, InvoiceTotals } from "@/types/invoice";
import { useT } from "@/components/i18n/language-provider";

type InvoicePreviewProps = {
  data: InvoiceFormData;
  totals: InvoiceTotals;
};

export function InvoicePreview({ data, totals }: InvoicePreviewProps) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tools.gstInvoice.preview")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">{t("tools.gstInvoice.seller")}</p>
            <p className="font-medium">{data.seller.name || "—"}</p>
            <p className="text-muted-foreground">{data.seller.state || t("tools.gstInvoice.selectState")}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">{t("tools.gstInvoice.buyer")}</p>
            <p className="font-medium">{data.buyer.name || "—"}</p>
            <p className="text-muted-foreground">{data.buyer.state || t("tools.gstInvoice.selectState")}</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          {totals.isIntraState ? t("tools.gstInvoice.intra") : t("tools.gstInvoice.inter")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-2">{t("tools.gstInvoice.item")}</th>
                <th className="py-2 pr-2">{t("tools.gstInvoice.qty")}</th>
                <th className="py-2 pr-2">{t("tools.gstInvoice.rate")}</th>
                <th className="py-2 pr-2">{t("tools.gstInvoice.taxable")}</th>
                <th className="py-2">{t("tools.gstInvoice.grandTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {totals.lines.map((line) => (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">{line.description || "—"}</td>
                  <td className="py-2 pr-2">{line.quantity}</td>
                  <td className="py-2 pr-2">{formatMoney(line.rate)}</td>
                  <td className="py-2 pr-2">{formatMoney(line.taxable)}</td>
                  <td className="py-2">{formatMoney(line.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 border-t pt-3">
          <Row label={t("tools.gstInvoice.taxable")} value={formatMoney(totals.taxable)} />
          <Row label={t("tools.gstInvoice.cgst")} value={formatMoney(totals.cgst)} />
          <Row label={t("tools.gstInvoice.sgst")} value={formatMoney(totals.sgst)} />
          <Row label={t("tools.gstInvoice.igst")} value={formatMoney(totals.igst)} />
          <Row label={t("tools.gstInvoice.grandTotal")} value={formatMoney(totals.total)} strong />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
