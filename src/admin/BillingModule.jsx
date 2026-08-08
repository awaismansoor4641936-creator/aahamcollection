import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icon, generateId } from './utils';
import { supabase } from '../lib/supabase';

export default function BillingModule({ logoData, setLogoData }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'history', 'summary'
  
  // Database state
  const [dbOrders, setDbOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [delivery, setDelivery] = useState('');
  const [discount, setDiscount] = useState('');
  const [targetTotal, setTargetTotal] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // Item entry state
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState('');
  const [itemSale, setItemSale] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const slipARef = useRef();
  const slipBRef = useRef();
  const summaryRef = useRef();

  // Summary state
  const [summaryMonth, setSummaryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('billing-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setDbOrders(data || []);
    setIsLoading(false);
  };

  const handleAddManualItem = (e) => {
    e.preventDefault();
    if(!itemName || !itemSale) return alert('Name and Sale Price are required');
    
    const id = `ORD-${generateId()}`;
    setOrderItems([...orderItems, {
      id,
      name: itemName,
      qty: parseInt(itemQty, 10) || 1,
      cost: parseFloat(itemCost) || 0,
      salePrice: parseFloat(itemSale) || 0,
      originalSalePrice: parseFloat(itemSale) || 0
    }]);
    
    setItemName('');
    setItemQty(1);
    setItemCost('');
    setItemSale('');
  };

  const updateQty = (id, delta) => {
    setOrderItems(orderItems.map(o => {
      if(o.id === id) return {...o, qty: Math.max(1, o.qty + delta)};
      return o;
    }));
  };

  const removeOrderItem = (id) => {
    setOrderItems(orderItems.filter(o => o.id !== id));
  };

  const handleAutoAdjust = () => {
    const target = parseFloat(targetTotal);
    if (isNaN(target) || orderItems.length === 0) return;

    const targetItemsValue = target - (parseFloat(delivery) || 0) + (parseFloat(discount) || 0);
    const currentItemsValue = orderItems.reduce((sum, o) => sum + (o.salePrice * o.qty), 0);
    
    if (currentItemsValue === 0) return alert("Cannot auto-adjust prices when the current items total is 0.");

    let remainingTarget = targetItemsValue;
    
    const newItems = orderItems.map((o, index) => {
      if (index === orderItems.length - 1) {
        const newUnitPrice = remainingTarget / o.qty;
        return { ...o, salePrice: newUnitPrice };
      } else {
        const proportion = (o.salePrice * o.qty) / currentItemsValue;
        const allocatedTotal = targetItemsValue * proportion;
        const cleanUnitPrice = Math.round((allocatedTotal / o.qty) * 100) / 100;
        const cleanAllocatedTotal = cleanUnitPrice * o.qty;
        
        remainingTarget -= cleanAllocatedTotal;
        return { ...o, salePrice: cleanUnitPrice };
      }
    });
    
    setOrderItems(newItems);
    setTargetTotal('');
  };

  const subtotal = orderItems.reduce((sum, o) => sum + (o.salePrice * o.qty), 0);
  const originalSubtotal = orderItems.reduce((sum, o) => sum + ((o.originalSalePrice !== undefined ? o.originalSalePrice : o.salePrice) * o.qty), 0);
  const packagingCharges = subtotal - originalSubtotal;

  const totalCost = orderItems.reduce((sum, o) => sum + (o.cost * o.qty), 0);
  const grandTotal = Math.max(0, subtotal + (parseFloat(delivery) || 0) - (parseFloat(discount) || 0));
  const totalProfit = originalSubtotal - totalCost - (parseFloat(discount) || 0);

  const resetForm = () => {
    setOrderItems([]);
    setDelivery('');
    setDiscount('');
    setCustomerName('');
    setEditingId(null);
  };

  const handleSaveOrder = async () => {
    if(orderItems.length === 0) return alert('Cannot save an empty order.');
    
    const payload = {
      customer_name: customerName || 'Walk-in',
      items: orderItems,
      delivery: parseFloat(delivery) || 0,
      discount: parseFloat(discount) || 0,
      subtotal,
      grand_total: grandTotal,
      total_profit: totalProfit,
    };

    if (editingId) {
      const { error } = await supabase.from('orders').update(payload).eq('id', editingId);
      if (error) alert('Error updating order: ' + error.message);
      else {
        alert('Order updated successfully!');
        resetForm();
        setActiveTab('history');
      }
    } else {
      payload.order_id = `BILL-${generateId()}`;
      const { error } = await supabase.from('orders').insert([payload]);
      if (error) alert('Error saving order: ' + error.message);
      else {
        alert('Order saved successfully!');
        resetForm();
        setActiveTab('history');
      }
    }
  };

  const loadOrderIntoForm = (order) => {
    setCustomerName(order.customer_name === 'Walk-in' ? '' : order.customer_name);
    setOrderItems(order.items || []);
    setDelivery(order.delivery === 0 ? '' : order.delivery);
    setDiscount(order.discount === 0 ? '' : order.discount);
    setEditingId(order.id);
  };

  const handleEditOrder = (order) => {
    loadOrderIntoForm(order);
    setActiveTab('new');
  };

  const handlePreviewFromHistory = (order) => {
    loadOrderIntoForm(order);
    setShowPreview(true);
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this order record? This cannot be undone.")) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) alert("Error deleting order.");
    }
  };

  const downloadPDF = (type) => {
    setIsExporting(true);
    const targetRef = type === 'customer' ? slipARef.current : type === 'admin' ? slipBRef.current : summaryRef.current;
    let filename = '';
    
    if (type === 'summary') {
      filename = `Monthly_Sales_Summary_${summaryMonth}.pdf`;
    } else {
      filename = type === 'customer' 
        ? `Customer_Bill_${customerName || 'Walk-in'}.pdf` 
        : `Admin_Record_${customerName || 'Walk-in'}.pdf`;
    }

    setTimeout(() => {
      window.html2pdf().set({
        margin: 0.5, 
        filename: filename, 
        image: { type: 'jpeg', quality: 0.85 }, 
        html2canvas: { scale: 1.5, useCORS: true, logging: false }, 
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }).from(targetRef).save().then(() => {
        setIsExporting(false);
      }).catch(err => {
        console.error("PDF Export Error: ", err);
        alert("Failed to generate PDF.");
        setIsExporting(false);
      });
    }, 100);
  };

  const monthlyOrders = useMemo(() => {
    return dbOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      const orderMonthStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      return orderMonthStr === summaryMonth;
    });
  }, [dbOrders, summaryMonth]);

  const monthlySalesTotal = monthlyOrders.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const monthlyProfitTotal = monthlyOrders.reduce((sum, o) => sum + Number(o.total_profit), 0);

  if (showPreview && activeTab !== 'summary') {
    return (
      <div className="fade-in max-w-4xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#fafafa] py-6 z-50 border-b border-gray-200 shadow-sm px-4 -mx-4">
          <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-charcoal flex items-center gap-2 font-medium">
            <Icon name="ArrowLeft" /> Back
          </button>
          <div className="flex gap-4">
            <button disabled={isExporting} onClick={() => downloadPDF('customer')} className={`px-5 py-2.5 rounded transition text-sm tracking-wider uppercase shadow-md flex items-center gap-2 ${isExporting ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-charcoal text-white hover:bg-black'}`}>
              <Icon name="Download" /> {isExporting ? 'Wait...' : 'Download Customer Bill'}
            </button>
            <button disabled={isExporting} onClick={() => downloadPDF('admin')} className={`px-5 py-2.5 rounded transition text-sm tracking-wider uppercase font-bold shadow-md flex items-center gap-2 ${isExporting ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-gold-500 text-charcoal hover:bg-gold-600'}`}>
              <Icon name="Download" /> {isExporting ? 'Wait...' : 'Download Admin Bill'}
            </button>
          </div>
        </div>

        <div className="space-y-16">
          <div className="relative pt-4">
            <div className="absolute top-0 left-4 bg-charcoal text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded shadow-sm z-10">Live Preview: Customer Bill</div>
            <div ref={slipARef} className="bg-white p-12 shadow-md border border-gray-200">
              <div className="text-center mb-10 flex flex-col items-center">
                {logoData ? (
                  <img src={logoData} alt="AAHAM COLLECTION" className="h-32 object-contain mix-blend-multiply mb-4" />
                ) : (
                  <>
                    <h1 className="text-5xl font-serif tracking-widest text-charcoal mb-2">AAHAM COLLECTION</h1>
                    <p className="text-sm uppercase tracking-widest text-gray-500 mt-2 border-t border-gray-200 pt-3 inline-block">Fine Jewelry Customer Invoice</p>
                  </>
                )}
                <div className="w-full mt-8 text-left border-t border-b border-gray-200 py-4 flex justify-between text-sm">
                  <div><span className="text-gray-500 uppercase tracking-wider text-xs block mb-1">Customer</span> <span className="font-serif text-lg">{customerName || 'Walk-in'}</span></div>
                  <div className="text-right"><span className="text-gray-500 uppercase tracking-wider text-xs block mb-1">Date</span> <span className="font-serif text-lg">{new Date().toLocaleDateString()}</span></div>
                </div>
              </div>
              <table className="w-full text-left mb-10 border-collapse">
                <thead className="border-b-2 border-charcoal">
                  <tr className="text-xs uppercase tracking-widest text-gray-500">
                    <th className="pb-3 font-medium">Item Description</th><th className="pb-3 font-medium text-center">Qty</th><th className="pb-3 font-medium text-right">Unit Price</th><th className="pb-3 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {orderItems.map(o => (
                    <tr key={o.id}>
                      <td className="py-4 font-serif text-lg">{o.name}</td><td className="py-4 text-center">{o.qty}</td><td className="py-4 text-right">Rs. {o.salePrice.toFixed(2)}</td><td className="py-4 text-right font-medium">Rs. {(o.salePrice * o.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between mt-8">
                <div className="w-1/2 pr-8">
                  <div className="bg-gray-50 p-4 rounded border border-gray-100 text-xs text-gray-600">
                    <h4 className="font-bold text-charcoal mb-2 uppercase tracking-wider text-[10px]">Online Payment Details</h4>
                    <p className="mb-1"><span className="font-medium text-charcoal">Bank:</span> Mashreq Bank</p>
                    <p className="mb-1"><span className="font-medium text-charcoal">Title:</span> Mussarat Jabeen</p>
                    <p className="mb-1"><span className="font-medium text-charcoal">A/C No:</span> 089200056897</p>
                    <p className="mb-2"><span className="font-medium text-charcoal">IBAN:</span> PK48MSHQ0000089200056897</p>
                    <p className="pt-2 border-t border-gray-200 mt-2 font-medium text-charcoal">
                      WhatsApp Receipt To: 03260627568
                    </p>
                  </div>
                </div>
                
                <div className="w-1/2 pl-8">
                  <div className="flex justify-between text-sm mb-2 text-gray-500"><span>Items Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
                  {parseFloat(delivery) > 0 && <div className="flex justify-between text-sm mb-2 text-gray-500"><span>Delivery Charges</span><span>+Rs. {parseFloat(delivery).toFixed(2)}</span></div>}
                  {parseFloat(discount) > 0 && <div className="flex justify-between text-sm mb-2 text-gray-500"><span>Discount</span><span>-Rs. {parseFloat(discount).toFixed(2)}</span></div>}
                  <div className="flex justify-between text-2xl font-serif border-t-2 border-charcoal pt-4 mt-2 text-charcoal"><span>Total Due</span><span>Rs. {grandTotal.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="mt-24 text-center text-sm text-gray-500 tracking-wide border-t border-gray-200 pt-8 font-serif italic">
                "Your happiness is our finest gem.<br/>Thank you for shopping with AAHAM Collection."
              </div>
            </div>
          </div>

          <div className="relative pt-4">
            <div className="absolute top-0 left-4 bg-gold-500 text-charcoal font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded shadow-sm z-10">Live Preview: Admin Bill (Internal)</div>
            <div ref={slipBRef} className="bg-white p-12 shadow-md border border-gray-200 relative overflow-hidden">
              <div className="absolute top-8 right-8 bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 uppercase tracking-widest rounded">Internal Copy</div>
              <div className="text-center mb-10 flex flex-col items-center">
                {logoData ? (
                  <img src={logoData} alt="AAHAM COLLECTION" className="h-32 object-contain mix-blend-multiply mb-4 opacity-80" />
                ) : (
                  <h1 className="text-5xl font-serif tracking-widest text-charcoal opacity-50 mb-4">AAHAM COLLECTION</h1>
                )}
                <div className="w-full mt-8 text-left border-t border-b border-gray-200 py-4 flex justify-between text-sm bg-gray-50 px-6">
                  <div><span className="text-gray-500 uppercase tracking-wider text-xs block mb-1">Customer</span> <span className="font-serif text-lg">{customerName || 'Walk-in'}</span></div>
                  <div className="text-right"><span className="text-gray-500 uppercase tracking-wider text-xs block mb-1">Date</span> <span className="font-serif text-lg">{new Date().toLocaleDateString()}</span></div>
                </div>
              </div>
              <table className="w-full text-left mb-10 border-collapse">
                <thead className="border-b-2 border-charcoal">
                  <tr className="text-xs uppercase tracking-widest text-gray-500">
                    <th className="pb-3 font-medium">Item Description</th><th className="pb-3 font-medium text-center">Qty</th><th className="pb-3 font-medium text-right">Cost Price</th><th className="pb-3 font-medium text-right">Original Sale</th><th className="pb-3 font-medium text-right text-green-600">Profit/Unit</th><th className="pb-3 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {orderItems.map(o => {
                    const origSale = o.originalSalePrice !== undefined ? o.originalSalePrice : o.salePrice;
                    return (
                    <tr key={o.id}>
                      <td className="py-4 font-serif text-lg">{o.name}</td><td className="py-4 text-center">{o.qty}</td><td className="py-4 text-right">Rs. {o.cost.toFixed(2)}</td><td className="py-4 text-right">Rs. {origSale.toFixed(2)}</td><td className="py-4 text-right text-green-600 font-medium">+Rs. {(origSale - o.cost).toFixed(2)}</td><td className="py-4 text-right font-medium">Rs. {(origSale * o.qty).toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
              <div className="w-1/2 ml-auto mt-8">
                <div className="flex justify-between text-sm mb-2 text-gray-500"><span>Original Items Subtotal</span><span>Rs. {originalSubtotal.toFixed(2)}</span></div>
                {Math.abs(packagingCharges) > 0.01 && <div className="flex justify-between text-sm mb-2 text-gray-500"><span>Packaging Charges (Adj.)</span><span className={packagingCharges > 0 ? "text-green-600" : "text-red-500"}>{packagingCharges > 0 ? '+' : ''}Rs. {packagingCharges.toFixed(2)}</span></div>}
                {parseFloat(delivery) > 0 && <div className="flex justify-between text-sm mb-2 text-gray-500"><span>Delivery Charges</span><span>+Rs. {parseFloat(delivery).toFixed(2)}</span></div>}
                {parseFloat(discount) > 0 && <div className="flex justify-between text-sm mb-2 text-gray-500"><span>Discount</span><span>-Rs. {parseFloat(discount).toFixed(2)}</span></div>}
                <div className="flex justify-between text-xl font-serif border-t border-gray-200 pt-3 mt-2"><span>Total Collected</span><span>Rs. {grandTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-2xl font-serif border-t-2 border-charcoal pt-4 mt-3 text-green-600 bg-green-50 p-4 rounded mt-4"><span>Total Order Profit</span><span>Rs. {totalProfit.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 flex-col sm:flex-row gap-4">
        <h2 className="text-3xl font-serif text-charcoal tracking-wide">Order & Billing</h2>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => { setActiveTab('new'); if(!editingId) resetForm(); }} className={`px-4 py-2 rounded text-sm font-medium transition ${activeTab === 'new' ? 'bg-white shadow-sm text-charcoal' : 'text-gray-500 hover:text-charcoal'}`}>
            {editingId ? 'Edit Order' : 'New Order'}
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded text-sm font-medium transition ${activeTab === 'history' ? 'bg-white shadow-sm text-charcoal' : 'text-gray-500 hover:text-charcoal'}`}>
            Bill History
          </button>
          <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 rounded text-sm font-medium transition ${activeTab === 'summary' ? 'bg-white shadow-sm text-charcoal' : 'text-gray-500 hover:text-charcoal'}`}>
            Monthly Summary
          </button>
        </div>
      </div>
      
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="font-serif text-lg mb-4 text-gold-600">Add Item to Order</h3>
              <form onSubmit={handleAddManualItem} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-3"><input required placeholder="Item / Box Name" value={itemName} onChange={e=>setItemName(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent text-sm" /></div>
                <div className="md:col-span-1"><input required type="number" min="1" placeholder="Qty" value={itemQty} onChange={e=>setItemQty(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent text-sm" /></div>
                <div className="md:col-span-1"><input type="number" step="0.01" placeholder="Cost (Rs)" value={itemCost} onChange={e=>setItemCost(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent text-sm" /></div>
                <div className="md:col-span-1"><input required type="number" step="0.01" placeholder="Sale (Rs)" value={itemSale} onChange={e=>setItemSale(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent text-sm" /></div>
                <div className="md:col-span-6 flex justify-end">
                  <button type="submit" className="bg-gray-100 text-charcoal px-6 py-2 rounded hover:bg-gold-100 transition text-sm tracking-widest uppercase font-medium border border-gray-200 shadow-sm">+ Add Line Item</button>
                </div>
              </form>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
              <div className="mb-8 flex justify-between items-center">
                <input placeholder="Customer Name" value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-full md:w-1/2 border-b-2 border-gray-200 py-2 focus:border-gold-500 transition outline-none font-serif text-xl" />
                {editingId && (
                  <div className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded uppercase tracking-widest">Editing Mode</div>
                )}
              </div>

              <table className="w-full text-left">
                <thead className="border-b-2 border-gray-100">
                  <tr className="text-xs uppercase tracking-widest text-gray-400">
                    <th className="pb-3 font-medium">Item</th><th className="pb-3 font-medium text-center">Qty</th><th className="pb-3 font-medium text-right">Price</th><th className="pb-3 font-medium text-right">Total</th><th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orderItems.map(o => (
                    <tr key={o.id} className="group">
                      <td className="py-4 font-medium text-charcoal">{o.name}</td>
                      <td className="py-4 text-center flex justify-center items-center gap-3">
                        <button onClick={()=>updateQty(o.id, -1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center">-</button>
                        <span className="w-4 font-medium">{o.qty}</span>
                        <button onClick={()=>updateQty(o.id, 1)} className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center">+</button>
                      </td>
                      <td className="py-4 text-right text-gray-500">Rs. {o.salePrice.toFixed(2)}</td>
                      <td className="py-4 text-right font-medium text-charcoal">Rs. {(o.salePrice * o.qty).toFixed(2)}</td>
                      <td className="py-4 text-right"><button onClick={()=>removeOrderItem(o.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Icon name="Trash" /></button></td>
                    </tr>
                  ))}
                  {orderItems.length === 0 && <tr><td colSpan="5" className="py-12 text-center text-gray-400 font-serif italic">No items in the current order. Add items above.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-charcoal text-white p-8 rounded-xl shadow-md flex flex-col h-fit sticky top-8">
            <h3 className="font-serif text-2xl text-gold-400 mb-6 border-b border-gray-700 pb-4">Order Summary</h3>
            <div className="space-y-4 text-sm mb-6 flex-1">
              <div className="flex justify-between text-gray-300"><span>Items Subtotal</span> <span>Rs. {subtotal.toFixed(2)}</span></div>
              
              <div className="flex justify-between items-center text-gray-300">
                <span>Delivery Charges</span>
                <div className="flex items-center gap-1 border-b border-gray-600 focus-within:border-gold-400 transition pb-1">
                  <span className="text-gray-500">Rs.</span>
                  <input type="number" min="0" value={delivery} onChange={e=>setDelivery(e.target.value)} className="w-20 bg-transparent text-right outline-none text-white font-medium" />
                </div>
              </div>

              <div className="flex justify-between items-center text-gray-300">
                <span>Discount</span>
                <div className="flex items-center gap-1 border-b border-gray-600 focus-within:border-gold-400 transition pb-1">
                  <span className="text-gray-500">Rs.</span>
                  <input type="number" min="0" value={discount} onChange={e=>setDiscount(e.target.value)} className="w-20 bg-transparent text-right outline-none text-white font-medium" />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-6 mb-8">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 uppercase tracking-wider text-xs">Grand Total</span>
                <span className="font-serif text-4xl text-gold-400">Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg mb-8 border border-gray-700 shadow-inner">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Target Price Adjustment</div>
              <div className="flex gap-2">
                <input type="number" placeholder="Target Total" value={targetTotal} onChange={e=>setTargetTotal(e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-gold-500" />
                <button onClick={handleAutoAdjust} className="bg-gold-500 text-charcoal px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:bg-gold-400 transition shadow-md">Adjust</button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 leading-tight">Silently recalculates item prices so the final bill matches your target amount perfectly.</p>
            </div>

            <button onClick={handleSaveOrder} className={`w-full font-bold py-4 rounded transition tracking-widest uppercase text-sm shadow-lg mb-3 ${orderItems.length > 0 ? 'bg-gold-500 text-charcoal hover:bg-gold-400 shadow-gold-500/20' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
              {editingId ? 'Update & Save Order' : 'Save Order'}
            </button>
            <button onClick={() => setShowPreview(true)} className={`w-full font-bold py-3 rounded transition tracking-widest uppercase text-xs border ${orderItems.length > 0 ? 'border-gray-500 text-white hover:bg-gray-700' : 'border-gray-700 text-gray-500 cursor-not-allowed'}`}>
              Preview Current Bill
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 fade-in">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Loading history...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-widest text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium text-right">Grand Total</th>
                  <th className="p-4 font-medium text-right">Profit</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {dbOrders.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic font-serif">No saved orders found.</td></tr>
                ) : (
                  dbOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-gray-500 text-xs font-mono">{order.order_id}</td>
                      <td className="p-4 font-medium text-charcoal">{order.customer_name}</td>
                      <td className="p-4 text-right font-medium">Rs. {Number(order.grand_total).toFixed(2)}</td>
                      <td className="p-4 text-right text-green-600 font-medium">+Rs. {Number(order.total_profit).toFixed(2)}</td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handlePreviewFromHistory(order)} className="text-gray-500 hover:text-charcoal px-2 py-1 rounded border border-gray-200 text-xs uppercase tracking-wider bg-white shadow-sm">View</button>
                        <button onClick={() => handleEditOrder(order)} className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded border border-blue-200 text-xs uppercase tracking-wider bg-blue-50 shadow-sm">Edit</button>
                        <button onClick={() => handleDeleteOrder(order.id)} className="text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 text-xs uppercase tracking-wider bg-red-50 shadow-sm">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="fade-in space-y-6">
          <div className="flex justify-between items-end bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Select Month</label>
              <input 
                type="month" 
                value={summaryMonth} 
                onChange={e => setSummaryMonth(e.target.value)} 
                className="border-b-2 border-charcoal py-2 text-xl font-serif outline-none bg-transparent"
              />
            </div>
            <button disabled={isExporting} onClick={() => downloadPDF('summary')} className={`px-5 py-2.5 rounded transition text-sm tracking-wider uppercase shadow-md flex items-center gap-2 ${isExporting ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-charcoal text-white hover:bg-black'}`}>
              <Icon name="Download" /> {isExporting ? 'Generating...' : 'Download Summary PDF'}
            </button>
          </div>

          <div ref={summaryRef} className="bg-white p-12 shadow-md border border-gray-200 relative">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-serif tracking-widest text-charcoal mb-2">MONTHLY SALES SUMMARY</h1>
              <p className="text-sm uppercase tracking-widest text-gray-500 border-t border-gray-200 pt-3 inline-block">
                For the period: {new Date(summaryMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <table className="w-full text-left mb-10 border-collapse">
              <thead className="border-b-2 border-charcoal">
                <tr className="text-xs uppercase tracking-widest text-gray-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Order No.</th>
                  <th className="pb-3 font-medium">Customer Name</th>
                  <th className="pb-3 font-medium text-right">Order Price</th>
                  <th className="pb-3 font-medium text-right text-green-600">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {monthlyOrders.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-gray-400 italic font-serif">No sales recorded for this month.</td></tr>
                ) : (
                  monthlyOrders.map(order => (
                    <tr key={order.id}>
                      <td className="py-3 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="py-3 font-mono text-xs text-gray-500">{order.order_id}</td>
                      <td className="py-3 font-serif text-charcoal">{order.customer_name}</td>
                      <td className="py-3 text-right font-medium">Rs. {Number(order.grand_total).toFixed(2)}</td>
                      <td className="py-3 text-right text-green-600 font-medium">+Rs. {Number(order.total_profit).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="w-full md:w-1/2 ml-auto mt-8 border-t-2 border-charcoal pt-6">
              <div className="flex justify-between text-xl font-serif mb-4 text-charcoal">
                <span>Total Monthly Sales</span>
                <span>Rs. {monthlySalesTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-serif text-green-600 bg-green-50 p-4 rounded border border-green-100">
                <span>Total Monthly Profit</span>
                <span>Rs. {monthlyProfitTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-16 text-center text-xs text-gray-400 tracking-wide border-t border-gray-200 pt-6">
              Generated by AAHAM Collection Admin System
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
