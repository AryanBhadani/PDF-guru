export type PartyDetails = {
  name: string;
  address: string;
  gstin: string;
  state: string;
};

export type InvoiceItem = {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  gstPercent: number;
};

export type InvoiceMeta = {
  invoiceNumber: string;
  date: string;
};

export type InvoiceFormData = {
  seller: PartyDetails;
  buyer: PartyDetails;
  meta: InvoiceMeta;
  items: InvoiceItem[];
};

export type LineTotals = {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

export type InvoiceTotals = LineTotals & {
  isIntraState: boolean;
  lines: Array<InvoiceItem & LineTotals>;
};
