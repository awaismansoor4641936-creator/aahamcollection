import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import CatalogModule from './CatalogModule'
import PurchaseModule from './PurchaseModule'
import BillingModule from './BillingModule'
import CatalogGrid from './CatalogGrid'
import GiftBoxBuilder from './GiftBoxBuilder'
import WebcamCapture from './WebcamCapture'
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
  const [itemPhotos, setItemPhotos] = useState([])
  const [showWebcam, setShowWebcam] = useState(false)
  const formRef = useRef(null)
  const galleryInputRef = useRef()
  const [editingItemId, setEditingItemId] = useState(null)

  const handleEditItem = (item) => {
    setEditingItemId(item.id)
    setStickyType(item.type || '')
    setStickyCategory(item.category || '')
    setItemPhotos(item.photos || [])
    
    if (formRef.current) {
      formRef.current.pieces.value = item.pieces || 1
      formRef.current.costPrice.value = item.costPrice || 0
      formRef.current.originalPrice.value = item.originalPrice || ''
      formRef.current.salePrice.value = item.salePrice || 0
      formRef.current.description.value = item.description || ''
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const cancelEdit = () => {
    setEditingItemId(null)
    setStickyType('')
    setStickyCategory('')
    setItemPhotos([])
    if (formRef.current) formRef.current.reset()
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setItemPhotos(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (index) => setItemPhotos(prev => prev.filter((_, i) => i !== index));
  const handleSetCoverPhoto = (index) => {
    if (index === 0) return;
    setItemPhotos(prev => {
      const newArr = [...prev];
      const [moved] = newArr.splice(index, 1);
      newArr.unshift(moved);
      return newArr;
    });
  };

  const triggerCamera = () => setShowWebcam(true);
  const triggerGallery = () => galleryInputRef.current && galleryInputRef.current.click();

  const handleAddItem = async (e) => {
    e.preventDefault();
    const btn = e.nativeEvent.submitter;
    const originalText = btn?.innerText || "Add Item";
    if(btn) { btn.innerText = "SAVING..."; btn.disabled = true; }

    try {
      const formData = new FormData(e.target);
      const compressedPhotos = await Promise.all(itemPhotos.map(p => compressImage(p)));

      const itemData = {
        name: `${stickyType} - ${stickyCategory}`,
        type: stickyType,
        category: stickyCategory,
        pieces: parseInt(formData.get('pieces'), 10) || 1,
        costPrice: parseFloat(formData.get('costPrice')),
        originalPrice: parseFloat(formData.get('originalPrice')) || parseFloat(formData.get('salePrice')),
        salePrice: parseFloat(formData.get('salePrice')),
        description: formData.get('description') || '',
        image: compressedPhotos.length > 0 ? compressedPhotos[0] : null,
        photos: compressedPhotos,
      };
      
      if (editingItemId) {
        const { error } = await supabase.from('products').update(itemData).eq('id', editingItemId)
        if (!error) {
          setItems(prev => prev.map(i => i.id === editingItemId ? { ...i, ...itemData } : i))
          cancelEdit()
        } else {
          alert("Error updating item in Supabase.")
        }
      } else {
        const newItem = { id: `ITM-${generateId()}`, ...itemData }
        const { data, error } = await supabase.from('products').insert([newItem]).select()
        if (!error && data) {
          setItems(prev => [...prev, data[0]])
          cancelEdit()
        } else {
          alert("Error adding item to Supabase.")
        }
      }
    } catch(err) {
      console.error(err);
      alert("Failed to save item.");
    } finally {
      if(btn) { btn.innerText = originalText; btn.disabled = false; }
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
        <button onClick={() => setTab('boxes')} className={`pb-3 px-4 text-sm font-medium tracking-wider uppercase transition border-b-2 ${tab === 'boxes' ? 'border-gold-500 text-charcoal' : 'border-transparent text-gray-400'}`}>Gift Boxes</button>
        <button onClick={() => setTab('visual')} className={`pb-3 px-4 text-sm font-medium tracking-wider uppercase transition border-b-2 ${tab === 'visual' ? 'border-gold-500 text-charcoal' : 'border-transparent text-gray-400'}`}>Visual Inventory</button>
      </div>

      {tab === 'boxes' && (
        <GiftBoxBuilder items={items} giftBoxes={giftBoxes} setGiftBoxes={setGiftBoxes} />
      )}

      {tab === 'visual' && (
        <CatalogGrid items={items} giftBoxes={giftBoxes} mode="internal" />
      )}

      {tab === 'items' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-xl luxury-shadow luxury-border">
            <h3 className="font-serif text-xl mb-6 text-gold-600">{editingItemId ? "Edit Jewelry Item" : "Add Jewelry Item"}</h3>
            <form ref={formRef} onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="md:col-span-6">
                <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Item Photos (Multi-Upload)</label>
                <input type="file" ref={galleryInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />

                {itemPhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    {itemPhotos.map((photo, idx) => (
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
                  <button type="button" onClick={triggerCamera} className="bg-charcoal text-white text-xs py-2 px-3 rounded hover:bg-black transition uppercase font-medium flex items-center gap-1.5 border border-charcoal">Take Photo</button>
                  <button type="button" onClick={triggerGallery} className="bg-white text-charcoal text-xs py-2 px-3 rounded hover:bg-gray-50 transition uppercase font-medium flex items-center gap-1.5 border border-gray-300">From Gallery</button>
                </div>
              </div>

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
              <div className="md:col-span-6 flex items-end gap-4">
                <button type="submit" className="flex-1 bg-gold-500 text-white py-2.5 rounded hover:bg-gold-600 transition text-sm tracking-widest uppercase shadow-md">
                  {editingItemId ? "Update Item" : "Add Item"}
                </button>
                {editingItemId && (
                  <button type="button" onClick={cancelEdit} className="flex-1 bg-gray-200 text-charcoal py-2.5 rounded hover:bg-gray-300 transition text-sm tracking-widest uppercase shadow-md">
                    Cancel Edit
                  </button>
                )}
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
                    <td className="p-4 flex items-center gap-4">
                      {item.image ? <img src={item.image} className="w-12 h-12 object-cover rounded-md border border-gray-200" /> : <div className="w-12 h-12 bg-gray-100 rounded-md"></div>}
                      <span className="text-xs text-gray-400 font-mono">{item.id}</span>
                    </td>
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
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditItem(item)} className="text-blue-500 hover:text-blue-700 transition" title="Edit Item">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 transition" title="Delete Item">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showWebcam && (
        <WebcamCapture 
          onCapture={(dataUrl) => {
            setItemPhotos(prev => [...prev, dataUrl]);
            setShowWebcam(false);
          }} 
          onClose={() => setShowWebcam(false)} 
        />
      )}
    </div>
  )
}
