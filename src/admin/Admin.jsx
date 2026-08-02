import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import CatalogModule from './CatalogModule'
import PurchaseModule from './PurchaseModule'
import BillingModule from './BillingModule'
import CatalogGrid from './CatalogGrid'
import { Icon, generateId } from './utils'

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
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const calculateBoxTotals = (box, allItems) => {
  const eCost = box.emptyBoxCost || 0;
  let itemsCost = 0;
  let itemsSale = 0;
  
  (box.linked_items || []).forEach(l => {
    const lType = l.type || 'inventory';
    if (lType === 'custom') {
      itemsCost += (l.costPrice || 0) * l.qty;
      itemsSale += (l.salePrice || 0) * l.qty;
    } else {
      const i = allItems.find(x => x.id === l.itemId);
      if (i) {
        itemsCost += i.costPrice * l.qty;
        itemsSale += i.salePrice * l.qty;
      }
    }
  });

  const tCost = eCost + itemsCost;
  const tSale = box.emptyBoxSale !== undefined ? (box.emptyBoxSale + itemsSale) : (box.salePrice || 0);
  
  return { cost: tCost, sale: tSale, profit: tSale - tCost };
};

// Icon moved to utils.jsx

const LoginGate = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('aaham_auth_v2') === 'true');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return children;

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'aahamcollection' && password === 'aaham588786') {
      localStorage.setItem('aaham_auth_v2', 'true');
      setIsAuthenticated(true);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="bg-white p-10 rounded-xl shadow-md max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-charcoal tracking-widest mb-2">AAHAM</h1>
          <div className="h-px w-12 bg-gold-400 mx-auto mb-2"></div>
          <p className="text-xs uppercase tracking-widest text-gray-400">Admin Portal</p>
        </div>
        {error && <div className="bg-red-50 text-red-500 text-sm p-3 rounded text-center mb-4">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Username</label>
            <input required value={username} onChange={e=>setUsername(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Password</label>
            <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none bg-transparent" />
          </div>
          <button type="submit" className="w-full bg-charcoal text-white py-3 mt-4 rounded hover:bg-black transition text-sm tracking-widest uppercase font-medium shadow-md">
            Access System
          </button>
        </form>
      </div>
    </div>
  );
};

// Main Admin Component
export default function Admin() {
  const [items, setItems] = useState([])
  const [giftBoxes, setGiftBoxes] = useState([])
  const [activeModule, setActiveModule] = useState('inventory')
  const [logoData, setLogoData] = useState(() => localStorage.getItem('jwl_logo') || null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: iData } = await supabase.from('products').select('*').order('created_at', { ascending: true })
      if (iData) setItems(iData)
      const { data: gData } = await supabase.from('gift_boxes').select('*').order('created_at', { ascending: true })
      if (gData) setGiftBoxes(gData)
    }
    fetchData()
  }, [])

  return (
    <LoginGate>
      <div className="min-h-screen bg-[#fafafa]">
        <nav className="bg-charcoal text-white px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-6">
            <div className="font-serif text-xl tracking-widest">AAHAM</div>
            <div className="h-6 w-px bg-gray-600"></div>
            <div className="flex gap-2">
              <button onClick={() => setActiveModule('inventory')} className={`px-4 py-2 rounded text-sm uppercase tracking-wider font-medium transition ${activeModule === 'inventory' ? 'bg-gold-500 text-charcoal' : 'text-gray-300 hover:text-white'}`}>Inventory</button>
              <button onClick={() => setActiveModule('catalog')} className={`px-4 py-2 rounded text-sm uppercase tracking-wider font-medium transition ${activeModule === 'catalog' ? 'bg-gold-500 text-charcoal' : 'text-gray-300 hover:text-white'}`}>Catalog</button>
              <button onClick={() => setActiveModule('purchase')} className={`px-4 py-2 rounded text-sm uppercase tracking-wider font-medium transition ${activeModule === 'purchase' ? 'bg-gold-500 text-charcoal' : 'text-gray-300 hover:text-white'}`}>Purchases</button>
              <button onClick={() => setActiveModule('billing')} className={`px-4 py-2 rounded text-sm uppercase tracking-wider font-medium transition ${activeModule === 'billing' ? 'bg-gold-500 text-charcoal' : 'text-gray-300 hover:text-white'}`}>Billing</button>
            </div>
          </div>
          <div className="text-xs uppercase tracking-widest text-gray-400">Admin Panel v2 (Supabase)</div>
        </nav>

        <div className="p-8">
          {activeModule === 'inventory' && <InventoryModule items={items} setItems={setItems} giftBoxes={giftBoxes} setGiftBoxes={setGiftBoxes} />}
          {activeModule === 'catalog' && <CatalogModule items={items} giftBoxes={giftBoxes} />}
          {activeModule === 'purchase' && <PurchaseModule />}
          {activeModule === 'billing' && <BillingModule logoData={logoData} setLogoData={setLogoData} />}
        </div>
      </div>
    </LoginGate>
  )
}

function InventoryModule({ items, setItems, giftBoxes, setGiftBoxes }) {
  const [tab, setTab] = useState('items')
  
  // Basic states for adding item
  const [stickyType, setStickyType] = useState('')
  const [stickyCategory, setStickyCategory] = useState('')
  
  const handleAddItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newItem = {
      id: `ITM-${generateId()}`,
      name: `${stickyType} - ${stickyCategory}`,
      type: stickyType,
      category: stickyCategory,
      pieces: parseInt(formData.get('pieces'), 10) || 1,
      costPrice: parseFloat(formData.get('costPrice')),
      originalPrice: parseFloat(formData.get('originalPrice')) || parseFloat(formData.get('salePrice')),
      salePrice: parseFloat(formData.get('salePrice')),
      description: formData.get('description') || '',
      image: null,
      photos: [],
    };
    
    const { data, error } = await supabase.from('products').insert([newItem]).select()
    if (!error && data) {
      setItems(prev => [...prev, data[0]])
      e.target.reset()
    } else {
      alert("Error adding item to Supabase.")
    }
  }

  const handleDeleteItem = async (id) => {
    if(confirm('Delete this item?')) {
      await supabase.from('products').delete().eq('id', id)
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-serif text-charcoal tracking-wide">Inventory Management</h2>
      </div>
      
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('items')} className={`pb-3 px-4 text-sm font-medium tracking-wider uppercase transition border-b-2 ${tab === 'items' ? 'border-gold-500 text-charcoal' : 'border-transparent text-gray-400'}`}>Jewelry Items</button>
        <button onClick={() => setTab('visual')} className={`pb-3 px-4 text-sm font-medium tracking-wider uppercase transition border-b-2 ${tab === 'visual' ? 'border-gold-500 text-charcoal' : 'border-transparent text-gray-400'}`}>Visual Inventory</button>
      </div>

      {tab === 'visual' && (
        <CatalogGrid items={items} giftBoxes={giftBoxes} mode="internal" />
      )}

      {tab === 'items' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-xl luxury-shadow luxury-border">
            <h3 className="font-serif text-xl mb-6 text-gold-600">Add Jewelry Item</h3>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Type</label>
                <input required value={stickyType} onChange={e=>setStickyType(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Category</label>
                <input required value={stickyCategory} onChange={e=>setStickyCategory(e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" />
              </div>
              <div className="md:col-span-1"><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Pieces</label><input required type="number" min="1" name="pieces" defaultValue="1" className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" /></div>
              <div className="md:col-span-1"><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Cost Price (Rs)</label><input required type="number" step="0.01" name="costPrice" className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" /></div>
              <div className="md:col-span-1"><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Original Price (Rs)</label><input type="number" step="0.01" name="originalPrice" className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" /></div>
              <div className="md:col-span-1"><label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Sale Price (Rs)</label><input required type="number" step="0.01" name="salePrice" className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" /></div>
              <div className="md:col-span-4">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Description</label>
                <input name="description" className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" />
              </div>
              <div className="md:col-span-6 flex items-end">
                <button type="submit" className="w-full bg-gold-500 text-white py-2.5 rounded hover:bg-gold-600 transition text-sm tracking-widest uppercase shadow-md">Add Item</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl luxury-shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-sand text-xs uppercase tracking-widest text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Details</th>
                  <th className="p-4 font-medium text-center">Stock</th>
                  <th className="p-4 font-medium">Pricing</th>
                  <th className="p-4 font-medium">Profit / Unit</th>
                  <th className="p-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 text-xs text-gray-400 font-mono">{item.id}</td>
                    <td className="p-4"><div className="font-medium text-charcoal">{item.type || item.name}</div><div className="text-sm text-gray-500">{item.category}</div></td>
                    <td className="p-4 text-center font-medium">{item.pieces}</td>
                    <td className="p-4">
                      <div className="text-sm text-gray-500 line-through">Cost: Rs. {item.costPrice?.toFixed(2)}</div>
                      <div className="text-sm font-medium text-charcoal">Sale: Rs. {item.salePrice?.toFixed(2)}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                        +Rs. {(item.salePrice - item.costPrice).toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4 text-right"><button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 transition p-2"><Icon name="Trash" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
