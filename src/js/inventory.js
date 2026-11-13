export const LOW_STOCK_THRESHOLD = 3;

export function getProductAvailability(product) {
    const availability = String(product?.availability || '').toUpperCase();
    if (availability === 'OUT_OF_STOCK') return 'OUT_OF_STOCK';
    if (availability === 'IN_STOCK' || availability === 'LIMITED' || availability === 'CONFIRM_ON_WA') {
        return 'IN_STOCK';
    }

    return getAvailabilityFromStock(product?.stock_quantity);
}

export function getAvailabilityLabel(availability) {
    return availability === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Available';
}

export function getAvailabilityFromStock(stockQuantity) {
    const quantity = Number.isInteger(stockQuantity)
        ? stockQuantity
        : Number.parseInt(stockQuantity, 10);

    return Number.isFinite(quantity) && quantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

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
