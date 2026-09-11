"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { DownloadButton } from "@/components/pdf/download-button";
import { BuyerForm } from "@/components/gst/buyer-form";
import { InvoiceItems } from "@/components/gst/invoice-items";
import { InvoicePreview } from "@/components/gst/invoice-preview";
import { SellerForm } from "@/components/gst/seller-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateInvoice,
  createEmptyItem,
  emptyParty,
  generateInvoicePdf,
  validateInvoice,
} from "@/lib/gst";
import { downloadBlob, todayIsoDate } from "@/lib/utils";
import type { InvoiceFormData } from "@/types/invoice";
import { useT } from "@/components/i18n/language-provider";

const initialData: InvoiceFormData = {
  seller: emptyParty(),
  buyer: emptyParty(),
  meta: {
    invoiceNumber: "INV-001",
    date: todayIsoDate(),
  },
  items: [createEmptyItem()],
};

export function GstInvoiceClient() {
  const t = useT();
  const [data, setData] = useState<InvoiceFormData>(initialData);
  const [loading, setLoading] = useState(false);
  const totals = useMemo(() => calculateInvoice(data), [data]);

  const generate = () => {
    const error = validateInvoice(data);
    if (error) {
      toast.error(t(error.key, error.vars));
      return;
    }
    setLoading(true);
    try {
      const blob = generateInvoicePdf(data);
      downloadBlob(blob, `pdf-guru-invoice-${data.meta.invoiceNumber}.pdf`);
      toast.success(t("success.invoiceReady"));
    } catch {
      toast.error(t("errors.processing"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout title={t("tools.gstInvoice.pageTitle")} description={t("tools.gstInvoice.pageDesc")}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SellerForm
              value={data.seller}
              disabled={loading}
              onChange={(seller) => setData((current) => ({ ...current, seller }))}
            />
            <BuyerForm
              value={data.buyer}
              disabled={loading}
              onChange={(buyer) => setData((current) => ({ ...current, buyer }))}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("tools.gstInvoice.invoice")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="invoice-number">{t("tools.gstInvoice.invoiceNumber")}</Label>
                <Input
                  id="invoice-number"
                  value={data.meta.invoiceNumber}
                  disabled={loading}
                  onChange={(event) =>
                    setData((current) => ({
                      ...current,
                      meta: { ...current.meta, invoiceNumber: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-date">{t("tools.gstInvoice.date")}</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={data.meta.date}
                  disabled={loading}
                  onChange={(event) =>
                    setData((current) => ({
                      ...current,
                      meta: { ...current.meta, date: event.target.value },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
          <InvoiceItems
            items={data.items}
            disabled={loading}
            onChange={(items) => setData((current) => ({ ...current, items }))}
            onAdd={() => setData((current) => ({ ...current, items: [...current.items, createEmptyItem()] }))}
          />
          <DownloadButton
            label={t("tools.gstInvoice.download")}
            loadingLabel={t("tools.gstInvoice.creating")}
            loading={loading}
            onClick={generate}
          />
        </div>
        <InvoicePreview data={data} totals={totals} />
      </div>
    </PdfToolLayout>
  );
}
