import { jsPDF } from "jspdf";
import type {
  InvoiceFormData,
  InvoiceItem,
  InvoiceTotals,
  LineTotals,
  PartyDetails,
} from "@/types/invoice";
import { createId } from "@/lib/utils";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export function createEmptyItem(): InvoiceItem {
  return {
    id: createId(),
    description: "",
    hsn: "",
    quantity: 1,
    rate: 0,
    gstPercent: 18,
  };
}

export function emptyParty(): PartyDetails {
  return { name: "", address: "", gstin: "", state: "" };
}

function normalizeState(value: string): string {
  return value.trim().toLowerCase();
}

export function isIntraState(sellerState: string, buyerState: string): boolean {
  if (!sellerState.trim() || !buyerState.trim()) return true;
  return normalizeState(sellerState) === normalizeState(buyerState);
}

function lineTotals(item: InvoiceItem, intraState: boolean): LineTotals {
  const taxable = roundMoney(item.quantity * item.rate);
  const gstAmount = roundMoney((taxable * item.gstPercent) / 100);
  if (intraState) {
    const half = roundMoney(gstAmount / 2);
    return { taxable, cgst: half, sgst: half, igst: 0, total: roundMoney(taxable + half + half) };
  }
  return { taxable, cgst: 0, sgst: 0, igst: gstAmount, total: roundMoney(taxable + gstAmount) };
}

export function calculateInvoice(data: InvoiceFormData): InvoiceTotals {
  const intra = isIntraState(data.seller.state, data.buyer.state);
  const lines = data.items.map((item) => ({ ...item, ...lineTotals(item, intra) }));
  return lines.reduce<InvoiceTotals>(
    (acc, line) => ({
      ...acc,
      taxable: roundMoney(acc.taxable + line.taxable),
      cgst: roundMoney(acc.cgst + line.cgst),
      sgst: roundMoney(acc.sgst + line.sgst),
      igst: roundMoney(acc.igst + line.igst),
      total: roundMoney(acc.total + line.total),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, isIntraState: intra, lines }
  );
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type InvoiceErrorKey =
  | "gst.errors.sellerName"
  | "gst.errors.sellerAddress"
  | "gst.errors.sellerState"
  | "gst.errors.sellerGstin"
  | "gst.errors.buyerName"
  | "gst.errors.buyerAddress"
  | "gst.errors.buyerState"
  | "gst.errors.buyerGstin"
  | "gst.errors.invoiceNumber"
  | "gst.errors.date"
  | "gst.errors.items"
  | "gst.errors.itemDescription"
  | "gst.errors.itemQty"
  | "gst.errors.itemRate"
  | "gst.errors.itemGst";

export type InvoiceValidationError = {
  key: InvoiceErrorKey;
  vars?: { n: number };
};

export function validateInvoice(data: InvoiceFormData): InvoiceValidationError | null {
  if (!data.seller.name.trim()) return { key: "gst.errors.sellerName" };
  if (!data.seller.address.trim()) return { key: "gst.errors.sellerAddress" };
  if (!data.seller.state.trim()) return { key: "gst.errors.sellerState" };
  if (data.seller.gstin.trim() && !GSTIN_REGEX.test(data.seller.gstin.trim().toUpperCase())) {
    return { key: "gst.errors.sellerGstin" };
  }
  if (!data.buyer.name.trim()) return { key: "gst.errors.buyerName" };
  if (!data.buyer.address.trim()) return { key: "gst.errors.buyerAddress" };
  if (!data.buyer.state.trim()) return { key: "gst.errors.buyerState" };
  if (data.buyer.gstin.trim() && !GSTIN_REGEX.test(data.buyer.gstin.trim().toUpperCase())) {
    return { key: "gst.errors.buyerGstin" };
  }
  if (!data.meta.invoiceNumber.trim()) return { key: "gst.errors.invoiceNumber" };
  if (!data.meta.date) return { key: "gst.errors.date" };
  if (data.items.length === 0) return { key: "gst.errors.items" };

  for (let i = 0; i < data.items.length; i += 1) {
    const item = data.items[i];
    const n = i + 1;
    if (!item.description.trim()) return { key: "gst.errors.itemDescription", vars: { n } };
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return { key: "gst.errors.itemQty", vars: { n } };
    }
    if (!Number.isFinite(item.rate) || item.rate < 0) {
      return { key: "gst.errors.itemRate", vars: { n } };
    }
    if (!Number.isFinite(item.gstPercent) || item.gstPercent < 0 || item.gstPercent > 28) {
      return { key: "gst.errors.itemGst", vars: { n } };
    }
  }

  return null;
}

export function generateInvoicePdf(data: InvoiceFormData): Blob {
  const totals = calculateInvoice(data);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 48;

  doc.setFillColor(13, 110, 96);
  doc.rect(0, 0, pageWidth, 72, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("TAX INVOICE", margin, 36);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("PDF Guru", margin, 56);
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice # ${data.meta.invoiceNumber}`, pageWidth - margin, 36, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${data.meta.date}`, pageWidth - margin, 56, { align: "right" });

  y = 100;
  doc.setTextColor(20, 20, 20);
  drawPartyBlock(doc, "Seller (From)", data.seller, margin, y);
  drawPartyBlock(doc, "Buyer (Bill To)", data.buyer, pageWidth / 2 + 8, y);

  y = 210;
  const colX = {
    sn: margin,
    desc: margin + 28,
    hsn: margin + 210,
    qty: margin + 270,
    rate: margin + 320,
    gst: margin + 385,
    tax: margin + 430,
    total: pageWidth - margin,
  };

  doc.setFillColor(13, 110, 96);
  doc.rect(margin, y, pageWidth - margin * 2, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("#", colX.sn + 4, y + 15);
  doc.text("Description", colX.desc, y + 15);
  doc.text("HSN", colX.hsn, y + 15);
  doc.text("Qty", colX.qty, y + 15);
  doc.text("Rate", colX.rate, y + 15);
  doc.text("GST%", colX.gst, y + 15);
  doc.text("Taxable", colX.tax, y + 15);
  doc.text("Total", colX.total, y + 15, { align: "right" });

  y += 22;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");

  totals.lines.forEach((line, index) => {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    if (index % 2 === 0) {
      doc.setFillColor(245, 247, 246);
      doc.rect(margin, y, pageWidth - margin * 2, 22, "F");
    }
    doc.text(String(index + 1), colX.sn + 4, y + 15);
    doc.text(truncate(line.description, 34), colX.desc, y + 15);
    doc.text(line.hsn || "-", colX.hsn, y + 15);
    doc.text(String(line.quantity), colX.qty, y + 15);
    doc.text(formatMoney(line.rate), colX.rate, y + 15);
    doc.text(`${line.gstPercent}%`, colX.gst, y + 15);
    doc.text(formatMoney(line.taxable), colX.tax, y + 15);
    doc.text(formatMoney(line.total), colX.total, y + 15, { align: "right" });
    y += 22;
  });

  y += 16;
  const boxX = pageWidth - margin - 220;
  const rows: Array<[string, string]> = [
    ["Taxable Amount", formatMoney(totals.taxable)],
    ["CGST", formatMoney(totals.cgst)],
    ["SGST", formatMoney(totals.sgst)],
    ["IGST", formatMoney(totals.igst)],
    ["Grand Total", formatMoney(totals.total)],
  ];

  rows.forEach(([label, value], index) => {
    const isTotal = index === rows.length - 1;
    if (isTotal) {
      doc.setFillColor(13, 110, 96);
      doc.rect(boxX, y, 220, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    }
    doc.setFontSize(9);
    doc.text(label, boxX + 10, y + 15);
    doc.text(value, boxX + 210, y + 15, { align: "right" });
    y += 22;
  });

  y += 28;
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const taxNote = totals.isIntraState
    ? "Intra-state supply: CGST and SGST applied."
    : "Inter-state supply: IGST applied.";
  doc.text(taxNote, margin, y);
  doc.text("Generated with PDF Guru. This is a computer-generated invoice.", margin, y + 14);

  return doc.output("blob");
}

function drawPartyBlock(
  doc: jsPDF,
  title: string,
  party: PartyDetails,
  x: number,
  y: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 110, 96);
  doc.text(title, x, y);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text(party.name || "-", x, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const addressLines = doc.splitTextToSize(party.address || "-", 230);
  doc.text(addressLines, x, y + 32);
  const afterAddress = y + 32 + addressLines.length * 12;
  doc.text(`GSTIN: ${party.gstin || "Unregistered"}`, x, afterAddress + 4);
  doc.text(`State: ${party.state || "-"}`, x, afterAddress + 18);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
