import React from 'react';
import CatalogGrid from './CatalogGrid';

export default function CatalogModule({ items, giftBoxes }) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-charcoal tracking-wide">Customer Catalog</h2>
      </div>
      <CatalogGrid items={items} giftBoxes={giftBoxes} mode="customer" />
    </div>
  );
}
