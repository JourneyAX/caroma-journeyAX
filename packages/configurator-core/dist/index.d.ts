import { BomItem } from '@journeyax/shared-types';
/**
 * Calculates subtotals, GST, applied discounts, and grand totals for a Bill of Materials (BOM)
 */
export declare function calculateTotals(bom: BomItem[], taxRate: number, discountRate: number): {
    subtotal: number;
    discount: number;
    gst: number;
    total: number;
};
