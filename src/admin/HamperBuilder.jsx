import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { generateId } from './utils';
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
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export default function HamperBuilder({ items, setItems }) {
  const [hamperName, setHamperName] = useState('');
  const [hamperDescription, setHamperDescription] = useState('');
  const [hamperPhotos, setHamperPhotos] = useState([]);
  const [showWebcam, setShowWebcam] = useState(false);
  const galleryInputRef = useRef();
  const [editingHamperId, setEditingHamperId] = useState(null);

  // Filter items to show only hampers
  const hampers = items.filter(item => item.type === 'Celebration Hampers');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHamperPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (index) => {
    setHamperPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverPhoto = (index) => {
    if (index === 0) return;
    setHamperPhotos(prev => {
      const newArr = [...prev];
      const [moved] = newArr.splice(index, 1);
      newArr.unshift(moved);
      return newArr;
    });
  };

  const triggerCamera = () => setShowWebcam(true);
  const triggerGallery = () => galleryInputRef.current && galleryInputRef.current.click();

  const handleEditHamper = (hamper) => {
    setEditingHamperId(hamper.id);
    setHamperName(hamper.name || '');
    setHamperDescription(hamper.description || '');
    setHamperPhotos(hamper.photos || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditHamper = () => {
    setEditingHamperId(null);
    setHamperName('');
    setHamperDescription('');
    setHamperPhotos([]);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleSaveHamper = async (e) => {
    e.preventDefault();
    if(!hamperName) return alert('Enter hamper name');
    
    const btn = e.nativeEvent?.submitter || e.target;
    const originalText = btn?.innerText || "Save Hamper";
    if(btn && btn.innerText) { btn.innerText = "SAVING..."; btn.disabled = true; }

    try {
      const compressedPhotos = await Promise.all(hamperPhotos.map(p => compressImage(p)));

      const hamperData = {
        name: hamperName,
        type: 'Celebration Hampers',
        category: 'Customized',
        description: hamperDescription,
        pieces: 1,
        costPrice: 0,
        originalPrice: 0,
        salePrice: 0,
        image: compressedPhotos.length > 0 ? compressedPhotos[0] : null,
        photos: compressedPhotos,
      };

      if (editingHamperId) {
        const { error } = await supabase.from('products').update(hamperData).eq('id', editingHamperId);
        if (error) throw error;
        setItems(prev => prev.map(b => b.id === editingHamperId ? { ...b, ...hamperData } : b));
        cancelEditHamper();
      } else {
        const newHamper = { id: `HMP-${generateId()}`, ...hamperData };
        const { data, error } = await supabase.from('products').insert([newHamper]).select();
        if (error) throw error;
        setItems(prev => [...prev, data[0]]);
        cancelEditHamper();
      }
    } catch(err) {
      console.error("Error saving hamper", err);
      alert("Failed to save hamper.");
    } finally {
      if(btn && btn.innerText) { btn.innerText = originalText; btn.disabled = false; }
    }
  };

  const handleDelete = async (hamperId) => {
    if(confirm('Delete this Celebration Hamper from the database?')) {
      await supabase.from('products').delete().eq('id', hamperId);
      setItems(prev => prev.filter(b => b.id !== hamperId));
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="bg-white p-8 rounded-xl luxury-shadow luxury-border">
        <h3 className="font-serif text-xl mb-6 text-gold-600">{editingHamperId ? "Edit Celebration Hamper" : "Add Celebration Hamper"}</h3>
        <form onSubmit={handleSaveHamper} className="grid grid-cols-1 gap-6">
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Hamper Photos (Multi-Upload)</label>
            <input type="file" ref={galleryInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />

            {hamperPhotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {hamperPhotos.map((photo, idx) => (
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

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Hamper Name</label>
            <input required value={hamperName} onChange={e=>setHamperName(e.target.value)} placeholder="e.g., Anniversary Special Hamper" className="w-full border-b border-gray-300 py-2 focus:border-gold-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Description</label>
            <textarea rows="3" value={hamperDescription} onChange={e=>setHamperDescription(e.target.value)} placeholder="Hamper details..." className="w-full border border-gray-300 rounded p-2 focus:border-gold-500 outline-none"></textarea>
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Pricing</label>
            <div className="w-full border border-gray-200 bg-sand py-2 px-3 rounded text-sm text-gray-600 italic">Custom Pricing</div>
          </div>

          <div className="flex items-end gap-4 mt-4">
            <button type="submit" className="flex-1 bg-gold-500 text-white py-3 rounded hover:bg-gold-600 transition text-sm tracking-widest uppercase shadow-md">
              {editingHamperId ? "Update Hamper" : "Save Hamper"}
            </button>
            {editingHamperId && (
              <button type="button" onClick={cancelEditHamper} className="flex-1 bg-gray-200 text-charcoal py-3 rounded hover:bg-gray-300 transition text-sm tracking-widest uppercase shadow-md">
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl luxury-shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-sand text-xs uppercase tracking-widest text-gray-500 border-b border-gray-200">
            <tr><th className="p-4 font-medium">Image / ID</th><th className="p-4 font-medium">Name & Details</th><th className="p-4 font-medium">Pricing</th><th className="p-4 text-right font-medium">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {hampers.map(hamper => (
              <tr key={hamper.id} className="hover:bg-gray-50 transition">
                <td className="p-4 flex items-center gap-4">
                  {hamper.image ? <img src={hamper.image} className="w-12 h-12 object-cover rounded-md border border-gray-200" /> : <div className="w-12 h-12 bg-gray-100 rounded-md"></div>}
                  <span className="text-xs text-gray-400 font-mono">{hamper.id}</span>
                </td>
                <td className="p-4">
                  <div className="font-medium text-charcoal">{hamper.name}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">{hamper.description}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm font-medium text-gray-600 italic">Custom Pricing</div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEditHamper(hamper)} className="text-blue-500 hover:text-blue-700 transition" title="Edit Hamper">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onClick={() => handleDelete(hamper.id)} className="text-red-400 hover:text-red-600 transition" title="Delete Hamper">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {hampers.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-gray-400 font-serif italic">No celebration hampers created.</td></tr>}
          </tbody>
        </table>
      </div>

      {showWebcam && (
        <WebcamCapture 
          onCapture={(dataUrl) => {
            setHamperPhotos(prev => [...prev, dataUrl]);
            setShowWebcam(false);
          }} 
          onClose={() => setShowWebcam(false)} 
        />
      )}
    </div>
  )
}
