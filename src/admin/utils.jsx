import React from 'react';

export const generateId = () => Math.random().toString(36).substr(2, 6).toUpperCase();

export const calculateBoxTotals = (box, allItems) => {
  const eCost = box.emptyBoxCost || box.empty_box_cost || 0;
  let itemsCost = 0;
  let itemsSale = 0;
  
  const linkedItems = box.linkedItems || box.linked_items || [];
  
  linkedItems.forEach(l => {
    const lType = l.type || 'inventory';
    if (lType === 'custom') {
      itemsCost += (l.costPrice || l.cost_price || 0) * l.qty;
      itemsSale += (l.salePrice || l.sale_price || 0) * l.qty;
    } else {
      const i = allItems.find(x => x.id === l.itemId || x.id === l.item_id);
      if (i) {
        itemsCost += (i.costPrice || i.cost_price || 0) * l.qty;
        itemsSale += (i.salePrice || i.sale_price || 0) * l.qty;
      }
    }
  });

  const tCost = eCost + itemsCost;
  
  const rawESale = box.emptyBoxSale !== undefined ? box.emptyBoxSale : box.empty_box_sale;
  // Automatically include empty box cost in the sale price if no explicit sale price is set
  const eSale = (!rawESale && eCost > 0) ? eCost : (rawESale || 0);
  
  const bSale = box.salePrice !== undefined ? box.salePrice : box.sale_price;
  const tSale = (box.emptyBoxSale !== undefined || box.empty_box_sale !== undefined) ? (eSale + itemsSale) : (bSale || 0);
  
  return { cost: tCost, sale: tSale, profit: tSale - tCost };
};

export const Icon = ({ name }) => {
  const paths = {
    Box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    Grid: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    FileText: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    Trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    Download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
    Plus: "M12 4v16m8-8H4",
    ArrowLeft: "M10 19l-7-7m0 0l7-7m-7 7h18"
  };
  return (
    <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[name]} />
    </svg>
  );
};
