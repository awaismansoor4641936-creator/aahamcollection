import React, { useState, useRef } from 'react';
import { Icon, generateId } from './utils';

export default function PurchaseModule() {
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState('');
  const [purchaseSource, setPurchaseSource] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  const billRef = useRef();

  const handleAddItem = (e) => {
    e.preventDefault();
    if(!itemName || !itemCost) return alert('Name and Cost Price are required');
    
    const id = `PUR-${generateId()}`;
    setPurchaseItems([...purchaseItems, {
      id,
      name: itemName,
      qty: parseInt(itemQty, 10) || 1,
      cost: parseFloat(itemCost) || 0
    }]);
    
    setItemName('');
    setItemQty(1);
    setItemCost('');
  };

  const updateQty = (id, delta) => {
    setPurchaseItems(purchaseItems.map(o => {
      if(o.id === id) return {...o, qty: Math.max(1, o.qty + delta)};
      return o;
    }));
  };

  const removeItem = (id) => {
    setPurchaseItems(purchaseItems.filter(o => o.id !== id));
  };

  const grandTotal = purchaseItems.reduce((sum, o) => sum + (o.cost * o.qty), 0);

  const handlePreview = () => {
    if(purchaseItems.length === 0) return alert('Cannot generate a record for an empty purchase. Please add items first.');
    if(!purchaseSource) return alert('Please select a Purchase Source (Wallet or Profit) before generating the bill.');
    setShowPreview(true);
  };

  const downloadPDF = () => {
    const filename = `Purchase_Record_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
    window.html2pdf().set({
      margin: 0.5, 
      filename: filename, 
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { scale: 2, useCORS: true }, 
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(billRef.current).save();
  };

  if (showPreview) {
    return (
      <div className="fade-in max-w-4xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#fafafa] py-6 z-50 border-b border-gray-200 shadow-sm px-4 -mx-4">
          <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-charcoal flex items-center gap-2 font-medium">
            <Icon name="ArrowLeft" /> Back to Entry
          </button>
          <button onClick={downloadPDF} className="bg-charcoal text-white px-5 py-2.5 rounded hover:bg-black transition text-sm tracking-wider uppercase shadow-md flex items-center gap-2">
            <Icon name="Download" /> Download PDF
          </button>
        </div>

        <div className="space-y-16">
          <div className="relative pt-4">
            <div className="absolute top-0 left-4 bg-charcoal text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded shadow-sm z-10">Live Preview: Purchase Record</div>
            <div ref={billRef} className="bg-white p-12 shadow-md border border-gray-200 relative overflow-hidden">
              <div className={`absolute top-8 right-8 text-xs font-bold px-3 py-1 uppercase tracking-widest rounded ${purchaseSource === 'Wallet Purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {purchaseSource}
              </div>
              
              <div className="text-center mb-10 flex flex-col items-center">
                <h1 className="text-5xl font-serif tracking-widest text-charcoal mb-2 mt-4">AAHAM COLLECTION</h1>
                <p className="text-sm uppercase tracking-widest text-gray-500 mt-2 border-t border-gray-200 pt-3 inline-block">Internal Purchasing Record</p>
                
                <div className="w-full mt-8 text-left border-t border-b border-gray-200 py-4 flex justify-between text-sm bg-gray-50 px-6">
                  <div><span className="text-gray-500 uppercase tracking-wider text-xs block mb-1">Record Type</span> <span className="font-serif text-lg">Expense</span></div>
                  <div className="text-right"><span className="text-gray-500 uppercase tracking-wider text-xs block mb-1">Date</span> <span className="font-serif text-lg">{new Date().toLocaleDateString()}</span></div>
                </div>
              </div>
              
              <table className="w-full text-left mb-10 border-collapse">
                <thead className="border-b-2 border-charcoal">
                  <tr className="text-xs uppercase tracking-widest text-gray-500">
                    <th className="pb-3 font-medium">Item Name</th><th className="pb-3 font-medium text-center">Qty</th><th className="pb-3 font-medium text-right">Cost Price</th><th className="pb-3 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {purchaseItems.map(o => (
                    <tr key={o.id}>
                      <td className="py-4 font-serif text-lg">{o.name}</td>
                      <td className="py-4 text-center">{o.qty}</td>
                      <td className="py-4 text-right">Rs. {o.cost.toFixed(2)}</td>
                      <td className="py-4 text-right font-medium">Rs. {(o.cost * o.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="w-1/2 ml-auto mt-8">
                <div className="flex justify-between text-2xl font-serif border-t-2 border-charcoal pt-4 mt-2 text-charcoal"><span>Grand Total</span><span>Rs. {grandTotal.toFixed(2)}</span></div>
              </div>
              
              <div className="mt-24 text-center text-sm text-gray-500 tracking-wide border-t border-gray-200 pt-8 font-serif italic">
                Internal Document - Not for Customer Distribution
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-serif text-charcoal tracking-wide">Purchase Record</h2>
      </div>

      <div className="flex gap-8 items-start flex-col md:flex-row">
        <div className="flex-1 space-y-8 w-full">
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <h3 className="font-serif text-xl mb-6 text-gold-600">Add Purchase Line Item</h3>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Item Name</label>
                <input required value={itemName} onChange={e=>setItemName(e.target.value)} placeholder="e.g., Gold Thread" className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Quantity</label>
                <input required type="number" min="1" value={itemQty} onChange={e=>setItemQty(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Cost Price (Rs)</label>
                <input required type="number" step="0.01" value={itemCost} onChange={e=>setItemCost(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent" />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button type="submit" className="bg-gold-500 text-white px-6 py-2 rounded hover:bg-gold-600 transition text-sm tracking-widest uppercase shadow-md">Add to Record</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-widest text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-medium">Item Name</th><th className="p-4 font-medium text-center">Qty</th><th className="p-4 font-medium text-right">Cost Price</th><th className="p-4 font-medium text-right">Line Total</th><th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {purchaseItems.map(o => (
                  <tr key={o.id} className="group">
                    <td className="p-4 font-medium text-charcoal">{o.name}</td>
                    <td className="p-4 text-center flex justify-center items-center gap-3">
                      <button onClick={()=>updateQty(o.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center">-</button>
                      <span className="w-4 font-medium">{o.qty}</span>
                      <button onClick={()=>updateQty(o.id, 1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center">+</button>
                    </td>
                    <td className="p-4 text-right text-gray-500">Rs. {o.cost.toFixed(2)}</td>
                    <td className="p-4 text-right font-medium text-charcoal">Rs. {(o.cost * o.qty).toFixed(2)}</td>
                    <td className="p-4 text-right"><button onClick={()=>removeItem(o.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Icon name="Trash" /></button></td>
                  </tr>
                ))}
                {purchaseItems.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-serif italic">No purchase items added yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full md:w-80 bg-charcoal text-white p-8 rounded-xl shadow-md flex flex-col h-fit sticky top-8">
          <h3 className="font-serif text-2xl text-gold-400 mb-6 border-b border-gray-700 pb-4">Purchase Summary</h3>
          
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-3">Purchase Source *</label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition ${purchaseSource === 'Wallet Purchase' ? 'bg-gold-500/10 border-gold-500' : 'border-gray-600 hover:border-gray-500'}`}>
                <input type="radio" name="source" value="Wallet Purchase" checked={purchaseSource === 'Wallet Purchase'} onChange={(e)=>setPurchaseSource(e.target.value)} className="accent-gold-500 w-4 h-4" />
                <span className="text-sm">Wallet Purchase</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition ${purchaseSource === 'Profit Purchase' ? 'bg-gold-500/10 border-gold-500' : 'border-gray-600 hover:border-gray-500'}`}>
                <input type="radio" name="source" value="Profit Purchase" checked={purchaseSource === 'Profit Purchase'} onChange={(e)=>setPurchaseSource(e.target.value)} className="accent-gold-500 w-4 h-4" />
                <span className="text-sm">Profit Purchase</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 mb-8">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 uppercase tracking-wider text-xs">Grand Total</span>
              <span className="font-serif text-3xl text-gold-400">Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button onClick={handlePreview} className={`w-full font-bold py-4 rounded transition tracking-widest uppercase text-sm shadow-lg ${purchaseItems.length > 0 ? 'bg-gold-500 text-charcoal hover:bg-gold-400 shadow-gold-500/20' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            Preview Record
          </button>
        </div>
      </div>
    </div>
  );
}
