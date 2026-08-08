import React, { useState, useRef } from 'react';
import { Icon, calculateBoxTotals } from './utils';

export default function CatalogGrid({ items, giftBoxes, mode }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const catalogRef = useRef();

  const exportPDF = () => {
    setIsExporting(true);
    const filename = mode === 'internal' 
      ? `Visual_Inventory_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf` 
      : `AAHAM_Catalog_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
    
    setTimeout(() => {
      window.html2pdf().set({
        margin: 0.5, 
        filename: filename, 
        image: { type: 'jpeg', quality: 0.85 }, 
        html2canvas: { scale: 1.2, useCORS: true, logging: false }, 
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }).from(catalogRef.current).save().then(() => {
        setIsExporting(false);
      }).catch(err => {
        console.error("PDF Export Error: ", err);
        alert("Failed to generate PDF. The catalog might be too large or contain restricted images.");
        setIsExporting(false);
      });
    }, 100);
  };

  const itemsByType = items.reduce((acc, item) => {
    const t = item.type || 'Uncategorized';
    if (!acc[t]) acc[t] = [];
    acc[t].push(item);
    return acc;
  }, {});

  return (
    <div className="fade-in space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={exportPDF} 
          disabled={isExporting}
          className={`flex items-center gap-2 px-5 py-2.5 rounded transition text-sm tracking-wider uppercase font-medium shadow-lg ${isExporting ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-charcoal text-white hover:bg-black'}`}
        >
          {isExporting ? (
            <>Generating PDF... Please Wait</>
          ) : (
            <><Icon name="Download" /> {mode === 'internal' ? 'Download Visual Inventory PDF' : 'Download Customer Catalog PDF'}</>
          )}
        </button>
      </div>

      <div className="bg-white shadow-md p-12 relative border border-gray-100">
        <div ref={catalogRef} className="bg-white w-full">
          <div className="text-center mb-16 pt-8">
            <h1 className="text-5xl font-serif text-charcoal tracking-widest mb-4">AAHAM COLLECTION</h1>
            <div className="h-px w-24 bg-gold-400 mx-auto mb-4"></div>
            <p className="text-gray-400 tracking-widest text-sm uppercase">
              {mode === 'internal' ? 'Complete Internal Inventory' : 'Curated Fine Jewelry'}
            </p>
            <div className="mt-4 text-xs text-gray-300 italic">[ QR Code and Facebook Details will go here ]</div>
          </div>

          {items.length === 0 && giftBoxes.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-serif italic">The collection is currently empty.</div>
          ) : (
            <div className="pb-12">
              {Object.entries(itemsByType).map(([type, typeItems]) => (
                <div key={type} className="mb-16">
                  <h2 className="text-2xl font-serif text-charcoal border-b border-gray-200 pb-3 mb-8 tracking-wider uppercase px-4">{type}</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 px-8">
                    {typeItems.map(prod => (
                      <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="cursor-pointer group border border-transparent hover:border-gray-100 rounded-lg p-4 transition bg-white text-center">
                        <div className="aspect-[4/5] bg-gray-50 mb-6 overflow-hidden relative rounded shadow-sm">
                          {mode !== 'internal' && Number(prod.originalPrice) > 0 && Number(prod.originalPrice) > Number(prod.salePrice) && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white flex flex-col items-center justify-center rounded-sm z-10 px-1.5 py-1" style={{ minWidth: '40px' }}>
                              <span className="font-bold text-xs leading-none">{Math.round(((prod.originalPrice - prod.salePrice) / prod.originalPrice) * 100)}%</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest leading-none mt-0.5">OFF</span>
                            </div>
                          )}
                          {prod.image ? (
                            <img src={prod.image} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 font-serif italic bg-gray-50 border border-gray-100">
                              No Image
                            </div>
                          )}
                        </div>
                        <h3 className="text-xl font-serif text-charcoal mb-2">{mode === 'internal' ? prod.name : (prod.type || prod.name)}</h3>
                        
                        {mode === 'internal' ? (
                          <div className="space-y-2 mt-4 text-sm text-left border-t border-gray-100 pt-4">
                            <div className="flex justify-between"><span className="text-gray-500">Category:</span> <span className="font-medium text-charcoal">{prod.category}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Pieces / Qty:</span> <span className="font-medium text-charcoal">{prod.pieces}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Cost Price:</span> <span className="font-medium text-charcoal line-through">Rs. {prod.costPrice.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Sale Price:</span> <span className="font-bold text-charcoal">Rs. {prod.salePrice.toFixed(2)}</span></div>
                            <div className="flex justify-between mt-2 pt-2 border-t border-gray-100"><span className="text-gray-500">Profit:</span> <span className="font-bold text-green-600">+Rs. {(prod.salePrice - prod.costPrice).toFixed(2)}</span></div>
                          </div>
                        ) : prod.type === 'Celebration Hampers' ? (
                          <p className="text-gold-600 font-medium tracking-wider text-lg italic mt-2">Custom Pricing</p>
                        ) : (
                          <div className="flex items-center justify-center gap-3 mt-2">
                            {Number(prod.originalPrice) > 0 && Number(prod.originalPrice) > Number(prod.salePrice) ? (
                              <>
                                <span className="text-gray-400 text-sm line-through">Rs. {Number(prod.originalPrice).toFixed(2)}</span>
                                <span className="text-gold-600 font-medium tracking-wider text-lg">Rs. {Number(prod.salePrice).toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-gold-600 font-medium tracking-wider text-lg">Rs. {Number(prod.salePrice).toFixed(2)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {giftBoxes.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-2xl font-serif text-charcoal border-b border-gray-200 pb-3 mb-8 tracking-wider uppercase px-4">Gift Boxes</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 px-8">
                    {giftBoxes.map(box => {
                      const totals = calculateBoxTotals(box, items);
                      return (
                        <div key={box.id} onClick={() => setSelectedProduct(box)} className="cursor-pointer group border border-transparent hover:border-gray-100 rounded-lg p-4 transition bg-white text-center">
                          <div className="aspect-[4/5] bg-gray-50 mb-6 overflow-hidden relative rounded shadow-sm">
                            {mode !== 'internal' && Number(box.originalPrice) > 0 && Number(box.originalPrice) > Number(totals.sale) && (
                              <div className="absolute top-2 left-2 bg-red-600 text-white flex flex-col items-center justify-center rounded-sm z-10 px-1.5 py-1" style={{ minWidth: '40px' }}>
                                <span className="font-bold text-xs leading-none">{Math.round(((box.originalPrice - totals.sale) / box.originalPrice) * 100)}%</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest leading-none mt-0.5">OFF</span>
                              </div>
                            )}
                            {box.image ? (
                              <img src={box.image} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 font-serif italic bg-gray-50 border border-gray-100">
                                Gift Box Set
                              </div>
                            )}
                          </div>
                          <h3 className="text-xl font-serif text-charcoal mb-2">{box.name}</h3>
                          
                          {mode === 'internal' ? (
                            <div className="space-y-2 mt-4 text-sm text-left border-t border-gray-100 pt-4">
                              <div className="flex justify-between"><span className="text-gray-500">Category:</span> <span className="font-medium text-charcoal">Gift Box</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Pieces / Qty:</span> <span className="font-medium text-charcoal">1</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Cost Price:</span> <span className="font-medium text-charcoal line-through">Rs. {totals.cost.toFixed(2)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Sale Price:</span> <span className="font-bold text-charcoal">Rs. {totals.sale.toFixed(2)}</span></div>
                              <div className="flex justify-between mt-2 pt-2 border-t border-gray-100"><span className="text-gray-500">Profit:</span> <span className="font-bold text-green-600">+Rs. {totals.profit.toFixed(2)}</span></div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-3 mt-2">
                              {Number(box.originalPrice) > 0 && Number(box.originalPrice) > Number(totals.sale) ? (
                                <>
                                  <span className="text-gray-400 text-sm line-through">Rs. {Number(box.originalPrice).toFixed(2)}</span>
                                  <span className="text-gold-600 font-medium tracking-wider text-lg">Rs. {Number(totals.sale).toFixed(2)}</span>
                                </>
                              ) : (
                                <span className="text-gold-600 font-medium tracking-wider text-lg">Rs. {Number(totals.sale).toFixed(2)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 fade-in" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white p-6 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl text-charcoal">{selectedProduct.name}</h3>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-charcoal text-2xl">&times;</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(selectedProduct.photos && selectedProduct.photos.length > 0 ? selectedProduct.photos : (selectedProduct.image ? [selectedProduct.image] : [])).map((src, i) => (
                <img key={i} src={src} className="w-full aspect-square object-cover rounded shadow-sm border border-gray-200" />
              ))}
              {(!selectedProduct.photos || selectedProduct.photos.length === 0) && !selectedProduct.image && (
                <div className="col-span-full py-12 text-center text-gray-400 font-serif italic">No photos available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
