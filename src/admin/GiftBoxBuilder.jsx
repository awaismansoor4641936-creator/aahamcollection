import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Icon, generateId, calculateBoxTotals } from './utils';
import WebcamCapture from './WebcamCapture';

const compressImage = (dataUrl, maxWidth = 600, quality = 0.6) => {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    if (dataUrl.startsWith('http')) return resolve(dataUrl);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // Fallback
    img.src = dataUrl;
  });
};

export default function GiftBoxBuilder({ items, giftBoxes, setGiftBoxes }) {
  const [boxName, setBoxName] = useState('');
  const [emptyCost, setEmptyCost] = useState('');
  const [emptySale, setEmptySale] = useState('');
  const [originalBoxPrice, setOriginalBoxPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [boxPhotos, setBoxPhotos] = useState([]);
  const [showWebcam, setShowWebcam] = useState(false);

  const galleryInputRef = useRef();

  const [customName, setCustomName] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [customSale, setCustomSale] = useState('');
  const [customQty, setCustomQty] = useState(1);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBoxPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (index) => {
    setBoxPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverPhoto = (index) => {
    if (index === 0) return;
    setBoxPhotos(prev => {
      const newArr = [...prev];
      const [moved] = newArr.splice(index, 1);
      newArr.unshift(moved);
      return newArr;
    });
  };

  const triggerCamera = () => setShowWebcam(true);
  const triggerGallery = () => galleryInputRef.current && galleryInputRef.current.click();

  const handleAddLink = (itemId) => {
    if(!itemId) return;
    const existing = selectedItems.find(i => (i.type || 'inventory') === 'inventory' && i.itemId === itemId);
    if(existing) {
      setSelectedItems(selectedItems.map(i => ((i.type || 'inventory') === 'inventory' && i.itemId === itemId) ? {...i, qty: i.qty + 1} : i));
    } else {
      setSelectedItems([...selectedItems, { type: 'inventory', itemId, qty: 1 }]);
    }
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if(!customName) return;
    setSelectedItems([...selectedItems, {
      type: 'custom',
      id: `CUST-${generateId()}`,
      name: customName,
      costPrice: parseFloat(customCost) || 0,
      salePrice: parseFloat(customSale) || 0,
      qty: parseInt(customQty, 10) || 1
    }]);
    setCustomName(''); setCustomCost(''); setCustomSale(''); setCustomQty(1);
  };

  const [editingBoxId, setEditingBoxId] = useState(null);

  const handleEditBox = (box) => {
    setEditingBoxId(box.id);
    setBoxName(box.name || '');
    setEmptyCost(box.emptyBoxCost || '');
    setOriginalBoxPrice(box.originalPrice || '');
    setEmptySale(box.emptyBoxSale || '');
    setSelectedItems(box.linked_items || []);
    setBoxPhotos(box.photos || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditBox = () => {
    setEditingBoxId(null);
    setBoxName('');
    setEmptyCost('');
    setEmptySale('');
    setOriginalBoxPrice('');
    setSelectedItems([]);
    setBoxPhotos([]);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleSaveBox = async (e) => {
    if(!boxName) return alert('Enter box name');
    
    const btn = e.target;
    const originalText = btn.innerText;
    btn.innerText = "SAVING...";
    btn.disabled = true;

    try {
      const compressedPhotos = await Promise.all(boxPhotos.map(p => compressImage(p)));

      const boxData = {
        name: boxName,
        emptyBoxCost: parseFloat(emptyCost) || 0,
        emptyBoxSale: parseFloat(emptySale) || 0,
        originalPrice: parseFloat(originalBoxPrice) || null,
        linked_items: selectedItems,
        image: compressedPhotos.length > 0 ? compressedPhotos[0] : null,
        photos: compressedPhotos,
      };

      if (editingBoxId) {
        const { error } = await supabase.from('gift_boxes').update(boxData).eq('id', editingBoxId);
        if (error) throw error;
        setGiftBoxes(prev => prev.map(b => b.id === editingBoxId ? { ...b, ...boxData } : b));
        cancelEditBox();
      } else {
        const newBox = { id: `BOX-${generateId()}`, ...boxData };
        const { data, error } = await supabase.from('gift_boxes').insert([newBox]).select();
        if (error) throw error;
        setGiftBoxes(prev => [...prev, data[0]]);
        cancelEditBox();
      }
    } catch(err) {
      console.error("Error saving box", err);
      alert("Failed to save box. Error: " + (err.message || err.details || JSON.stringify(err)));
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  };

  const handleDelete = async (boxId) => {
    if(confirm('Delete this gift box from the database?')) {
      await supabase.from('gift_boxes').delete().eq('id', boxId);
      setGiftBoxes(prev => prev.filter(b => b.id !== boxId));
    }
  };

  const eCost = parseFloat(emptyCost) || 0;
  const eSale = parseFloat(emptySale) || 0;

  const itemsSummary = selectedItems.reduce((acc, link) => {
    const lType = link.type || 'inventory';
    let c = 0, s = 0;
    if (lType === 'custom') {
      c = link.costPrice || 0; s = link.salePrice || 0;
    } else {
      const i = items.find(x => x.id === link.itemId);
      if (i) { c = i.costPrice; s = i.salePrice; }
    }
    return { cost: acc.cost + (c * link.qty), sale: acc.sale + (s * link.qty) };
  }, { cost: 0, sale: 0 });

  const totalBoxCost = eCost + itemsSummary.cost;
  const totalBoxSale = eSale + itemsSummary.sale;
  const totalBoxProfit = totalBoxSale - totalBoxCost;

  return (
    <div className="space-y-8 fade-in">
      <div className="bg-white p-8 rounded-xl luxury-shadow luxury-border grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h3 className="font-serif text-xl mb-6 text-gold-600">{editingBoxId ? "Edit Custom Gift Box" : "Create Custom Gift Box"}</h3>
          <div className="space-y-6">
            <div><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Box Name</label><input value={boxName} onChange={e=>setBoxName(e.target.value)} placeholder="e.g., Summer Collection Set" className="w-full border-b border-gray-300 py-2 outline-none bg-transparent font-medium" /></div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Box Photos (Can add multiple)</label>
              <input 
                type="file" 
                ref={galleryInputRef} 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />

              {boxPhotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  {boxPhotos.map((photo, idx) => (
                    <div key={idx} className="relative flex-shrink-0 mt-2">
                      <img src={photo} className={`w-16 h-16 object-cover rounded border ${idx === 0 ? 'border-gold-500 shadow-md' : 'border-gray-300'}`} />
                      {idx === 0 && <span className="absolute bottom-0 left-0 bg-gold-500 text-white text-[9px] px-1 font-bold uppercase rounded-bl">Cover</span>}
                      <button type="button" onClick={() => handleRemovePhoto(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-sm">&times;</button>
                      {idx !== 0 && (
                        <button type="button" onClick={() => handleSetCoverPhoto(idx)} className="absolute inset-0 bg-black/50 text-white text-[10px] uppercase font-bold opacity-0 hover:opacity-100 transition rounded flex items-center justify-center">Set Cover</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={triggerCamera}
                  className="flex-1 bg-charcoal text-white text-xs py-2 px-3 rounded hover:bg-black transition tracking-wider uppercase font-medium flex items-center justify-center gap-1.5 border border-charcoal"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={triggerGallery}
                  className="flex-1 bg-white text-charcoal text-xs py-2 px-3 rounded hover:bg-gray-50 transition tracking-wider uppercase font-medium flex items-center justify-center gap-1.5 border border-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a1 1 0 011.414 0L16 17m0 0l2.586-2.586a1 1 0 011.414 0L21 17m0 0V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2z" />
                  </svg>
                  From Gallery
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Empty Box Cost (Rs)</label><input type="number" step="0.01" value={emptyCost} onChange={e=>setEmptyCost(e.target.value)} className="w-full border-b border-gray-300 py-2 outline-none" /></div>
              <div><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Original Box Price (Rs)</label><input type="number" step="0.01" value={originalBoxPrice} onChange={e=>setOriginalBoxPrice(e.target.value)} placeholder="Optional" className="w-full border-b border-gray-300 py-2 outline-none" /></div>
              <div><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Empty Box Sale (Rs)</label><input type="number" step="0.01" value={emptySale} onChange={e=>setEmptySale(e.target.value)} className="w-full border-b border-gray-300 py-2 outline-none" /></div>
            </div>

            <div className="border border-gray-200 p-4 rounded bg-sand space-y-4">
              <h4 className="text-sm font-medium text-charcoal border-b border-gray-300 pb-2">Add Items to Box</h4>
              
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Select from Inventory</label>
                <select onChange={e => { handleAddLink(e.target.value); e.target.value = ''; }} className="w-full border border-gray-300 p-2 rounded outline-none text-sm bg-white">
                  <option value="">-- Add Inventory Item --</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} (Sale: Rs. {i.salePrice})</option>)}
                </select>
              </div>
              
              <div className="text-center text-xs text-gray-400 font-medium my-2">OR</div>
              
              <form onSubmit={handleAddCustom} className="space-y-3 bg-white p-3 rounded border border-gray-200 shadow-sm">
                <label className="block text-[11px] uppercase tracking-wider text-gray-500">Add Manual Custom Item</label>
                <div className="grid grid-cols-4 gap-2">
                  <input required placeholder="Item Name" value={customName} onChange={e=>setCustomName(e.target.value)} className="col-span-4 border-b border-gray-300 py-1 outline-none text-sm" />
                  <input type="number" min="1" placeholder="Qty" value={customQty} onChange={e=>setCustomQty(e.target.value)} className="col-span-1 border-b border-gray-300 py-1 outline-none text-sm" />
                  <input type="number" step="0.01" placeholder="Cost" value={customCost} onChange={e=>setCustomCost(e.target.value)} className="col-span-1 border-b border-gray-300 py-1 outline-none text-sm" />
                  <input type="number" step="0.01" required placeholder="Sale" value={customSale} onChange={e=>setCustomSale(e.target.value)} className="col-span-2 border-b border-gray-300 py-1 outline-none text-sm" />
                </div>
                <button type="submit" className="w-full bg-charcoal text-white text-xs py-2 rounded mt-2 hover:bg-black transition">Add Custom Item</button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="bg-sand p-6 rounded-lg flex flex-col h-full shadow-inner border border-gray-100">
          <h4 className="text-sm font-medium tracking-widest uppercase mb-4 text-charcoal border-b border-gray-200 pb-2">Box Contents</h4>
          <ul className="space-y-3 mb-6 flex-1 max-h-80 overflow-y-auto pr-2">
            {selectedItems.map((link, idx) => {
              const lType = link.type || 'inventory';
              let name = '', c = 0, s = 0;
              if(lType === 'custom') {
                name = link.name; c = link.costPrice || 0; s = link.salePrice || 0;
              } else {
                const i = items.find(x => x.id === link.itemId);
                if(i) { name = i.name; c = i.costPrice; s = i.salePrice; }
              }
              const profit = s - c;
              
              return (
                <li key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded border border-gray-100 shadow-sm">
                  <div>
                    <span className="font-medium text-charcoal">
                      {name} 
                      {lType === 'custom' && <span className="text-[10px] text-gold-600 bg-gold-100 uppercase ml-2 px-1.5 py-0.5 rounded tracking-wider">Custom</span>} 
                      <span className="text-gray-400 ml-1">x {link.qty}</span>
                    </span>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex gap-3 font-mono">
                      <span>Sale: Rs. {s.toFixed(2)}</span>
                      <span className="text-green-600 font-medium">Profit: +Rs. {profit.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={()=>setSelectedItems(selectedItems.filter((_, i)=>i!==idx))} className="text-red-400 hover:text-red-600 text-xs uppercase tracking-wider px-2">Remove</button>
                </li>
              )
            })}
            {selectedItems.length === 0 && <li className="text-xs text-gray-400 italic text-center py-6">No items added to this box yet.</li>}
          </ul>
          
          <div className="border-t border-gray-300 pt-4 space-y-2 text-sm bg-white p-4 rounded shadow-sm">
            <div className="flex justify-between text-gray-500 border-b border-gray-50 pb-2 mb-2">
              <span>Empty Box Only:</span> 
              <span className="text-right text-xs space-y-1">
                <div>Cost: Rs. {eCost.toFixed(2)}</div>
                <div>Sale: Rs. {eSale.toFixed(2)}</div>
              </span>
            </div>
            <div className="flex justify-between text-gray-500 border-b border-gray-100 pb-3 mb-2">
              <span>Items Combined:</span> 
              <span className="text-right text-xs space-y-1">
                <div>Cost: Rs. {itemsSummary.cost.toFixed(2)}</div>
                <div>Sale: Rs. {itemsSummary.sale.toFixed(2)}</div>
              </span>
            </div>
            
            <div className="flex justify-between font-bold text-charcoal pt-1">
              <span>Total Box Sale Price:</span> 
              <span className="text-lg">Rs. {totalBoxSale.toFixed(2)}</span>
            </div>
            {parseFloat(originalBoxPrice) > totalBoxSale && (
              <div className="flex justify-between text-gray-400 pt-1 text-xs">
                <span>Original Box Price:</span> 
                <span className="line-through">Rs. {parseFloat(originalBoxPrice).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-green-600 mt-1 text-base">
              <span>Final Combined Box Profit:</span> 
              <span>+Rs. {totalBoxProfit.toFixed(2)}</span>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleSaveBox}
                className="flex-1 w-full bg-gold-500 text-white py-3 rounded hover:bg-gold-600 transition font-medium tracking-widest uppercase shadow-md mt-4 text-sm"
              >
                {editingBoxId ? "Update Gift Box" : "Save Gift Box"}
              </button>
              {editingBoxId && (
                <button 
                  onClick={cancelEditBox}
                  className="flex-1 w-full bg-gray-200 text-charcoal py-3 rounded hover:bg-gray-300 transition font-medium tracking-widest uppercase shadow-md mt-4 text-sm"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl luxury-shadow overflow-hidden">
         <table className="w-full text-left">
          <thead className="bg-sand text-xs uppercase tracking-widest text-gray-500 border-b border-gray-200">
            <tr><th className="p-4 font-medium">Box ID / Image</th><th className="p-4 font-medium">Name & Contents</th><th className="p-4 font-medium">Auto Pricing</th><th className="p-4 font-medium">Profit / Box</th><th className="p-4 text-right font-medium">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {giftBoxes.map(box => {
               const totals = calculateBoxTotals(box, items);
               return (
              <tr key={box.id} className="hover:bg-gray-50 transition">
                <td className="p-4 flex items-center gap-4">
                  {box.image ? <img src={box.image} className="w-12 h-12 object-cover rounded-md border border-gray-200" /> : <div className="w-12 h-12 bg-gray-100 rounded-md"></div>}
                  <span className="text-xs text-gray-400 font-mono">{box.id}</span>
                </td>
                <td className="p-4">
                  <div className="font-medium text-charcoal">{box.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{(box.linked_items || []).map(l => {
                    const lType = l.type || 'inventory';
                    const n = lType === 'custom' ? l.name : items.find(x=>x.id===l.itemId)?.name;
                    return `${l.qty}x ${n}`;
                  }).join(', ')}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-gray-500 line-through decoration-gray-300">Cost: Rs. {totals.cost.toFixed(2)}</div>
                  <div className="text-sm font-medium text-charcoal">Sale: Rs. {totals.sale.toFixed(2)}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                    +Rs. {totals.profit.toFixed(2)}
                  </div>
                </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditBox(box)} className="text-blue-500 hover:text-blue-700 transition" title="Edit Box">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onClick={() => handleDelete(box.id)} className="text-red-400 hover:text-red-600 transition" title="Delete Box">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
              </tr>
            )})}
            {giftBoxes.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-gray-400 font-serif italic">No gift boxes created.</td></tr>}
          </tbody>
        </table>
      </div>

      {showWebcam && (
        <WebcamCapture 
          onCapture={(dataUrl) => {
            setBoxPhotos(prev => [...prev, dataUrl]);
            setShowWebcam(false);
          }} 
          onClose={() => setShowWebcam(false)} 
        />
      )}
    </div>
  )
}
