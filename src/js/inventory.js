export const LOW_STOCK_THRESHOLD = 3;

export function getStockState(stockQuantity) {
    const quantity = Number.isInteger(stockQuantity)
        ? stockQuantity
        : Number.parseInt(stockQuantity, 10);

    if (!Number.isFinite(quantity) || quantity <= 0) {
        return { key: 'OUT_OF_STOCK', label: 'Out of Stock', quantity: 0 };
    }

    if (quantity <= LOW_STOCK_THRESHOLD) {
        return { key: 'LOW_STOCK', label: 'Low Stock', quantity };
    }

    return { key: 'IN_STOCK', label: 'In Stock', quantity };
}
