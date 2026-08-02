import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const ProductCard = ({ p, index, onClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const salePrice = p.salePrice || 0;
  let validPhotos = Array.isArray(p.photos) ? p.photos.filter(url => typeof url === 'string' && url.trim() !== '') : [];
  if (validPhotos.length === 0 && (p.image || p.photo)) validPhotos = [p.image || p.photo];

  useEffect(() => {
    if (validPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % validPhotos.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [validPhotos.length]);

  return (
    <div className="product-card" style={{ animationDelay: `${index * 0.05}s` }} onClick={onClick}>
      <div className="product-image">
        {p.originalPrice && p.originalPrice > salePrice && (
          <div className="discount-badge">
            <span className="discount-num">{Math.round(((p.originalPrice - salePrice) / p.originalPrice) * 100)}%</span>
            <span className="discount-off">OFF</span>
          </div>
        )}
        {validPhotos.length > 1 && (
          <div className="photo-count-indicator">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a1 1 0 011.414 0L16 17m0 0l2.586-2.586a1 1 0 011.414 0L21 17m0 0V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2z"></path></svg>
            {validPhotos.length}
          </div>
        )}
        {validPhotos.length > 1 ? (
          <div className="auto-rotate-container">
            {validPhotos.map((src, i) => (
              <img key={i} src={src} alt={`${p.name} - ${i}`} loading="lazy" className={i === currentImageIndex ? 'active-rotate' : ''} />
            ))}
          </div>
        ) : validPhotos.length === 1 ? (
          <img src={validPhotos[0]} alt={p.name} loading="lazy" />
        ) : (
          <div className="no-image-placeholder">No Image</div>
        )}
      </div>
      <div className="product-info">
        <span className="product-type">{p.category || 'Jewelry'}</span>
        <h3 className="product-name">{p.name}</h3>
        {p.originalPrice && p.originalPrice > salePrice ? (
          <div className="price-container">
            <span className="price-original">Rs. {p.originalPrice.toFixed(2)}</span>
            <span className="product-price">Rs. {salePrice.toFixed(2)}</span>
          </div>
        ) : (
          <div className="product-price">Rs. {salePrice.toFixed(2)}</div>
        )}
      </div>
    </div>
  );
};

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState(() => {
    const saved = sessionStorage.getItem('aaham_cart')
    return saved ? JSON.parse(saved) : []
  })
  const [currentCategory, setCurrentCategory] = useState('Home')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalQty, setModalQty] = useState(1)
  const [modalImage, setModalImage] = useState(null)

  useEffect(() => {
    sessionStorage.setItem('aaham_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      const { data: itemsData, error: itemsError } = await supabase.from('products').select('*').order('created_at', { ascending: true })
      if (itemsError) throw itemsError

      const { data: boxesData, error: boxesError } = await supabase.from('gift_boxes').select('*').order('created_at', { ascending: true })
      if (boxesError) throw boxesError

      const processedGiftBoxes = (boxesData || []).map(box => {
        let itemsSale = 0;
        (box.linked_items || []).forEach(l => {
          const lType = l.type || 'inventory';
          if (lType === 'custom') {
            itemsSale += (l.salePrice || 0) * l.qty;
          } else {
            const i = (itemsData || []).find(x => x.id === l.itemId);
            if (i) {
              itemsSale += i.salePrice * l.qty;
            }
          }
        });
        return {
          ...box,
          type: 'Gift Box',
          category: 'Gift Box',
          salePrice: (box.emptyBoxSale || 0) + itemsSale
        };
      });

      const allProducts = [...(itemsData || []), ...processedGiftBoxes]
      setProducts(allProducts)
    } catch (err) {
      console.error("Error fetching products:", err)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const allTypes = useMemo(() => {
    const types = new Set(products.map(p => p.type || 'Uncategorized'))
    return ['Home', ...Array.from(types)]
  }, [products])

  const randomProducts = useMemo(() => {
    if (products.length === 0) return [];
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 8);
  }, [products])

  const filteredProducts = useMemo(() => {
    let filtered = products
    if (currentCategory !== 'Home') {
      filtered = filtered.filter(p => (p.type || 'Uncategorized') === currentCategory)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        (p.name || '').toLowerCase().includes(q) || 
        (p.category || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
      )
    }
    return filtered
  }, [products, currentCategory, searchQuery])

  const handleAddToCart = (product, qty) => {
    let validPhotos = Array.isArray(product.photos) ? product.photos.filter(url => typeof url === 'string' && url.trim() !== '') : [];
    const coverImage = validPhotos.length > 0 ? validPhotos[0] : (product.image || product.photo || '');

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + qty } : item)
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.salePrice,
        image: coverImage,
        qty: qty
      }]
    })
    setSelectedProduct(null)
    setIsCartOpen(true)
  }

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(1, item.qty + delta) }
      }
      return item
    }))
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const isSearchActive = searchQuery.trim().length > 0;
  const showHomeLayout = currentCategory === 'Home' && !isSearchActive;

  const renderProductCard = (p, index) => {
    let validPhotos = Array.isArray(p.photos) ? p.photos.filter(url => typeof url === 'string' && url.trim() !== '') : [];
    if (validPhotos.length === 0 && (p.image || p.photo)) validPhotos = [p.image || p.photo];

    return (
      <ProductCard 
        key={p.id}
        p={p}
        index={index}
        onClick={() => {
          setSelectedProduct(p);
          setModalQty(1);
          setModalImage(validPhotos[0] || null);
        }}
      />
    );
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const getCheckoutMessage = () => {
    let message = `AAHAM COLLECTION — Order Summary\n\n`;
    let total = 0;
    cart.forEach((item, index) => {
        const lineTotal = item.price * item.qty;
        total += lineTotal;
        message += `${index + 1}. ${item.name} (ID: ${item.id}) — Qty: ${item.qty} — Rs. ${lineTotal.toFixed(2)}\n`;
    });
    message += `\nGrand Total: Rs. ${total.toFixed(2)}\n\n`;
    if (total >= 2500) {
        message += `Free delivery included on this order.`;
    } else {
        message += `Note: Delivery charges are not included in this bill and will be informed separately.`;
    }
    return message;
  }

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    const message = getCheckoutMessage();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/923260627568?text=${encodedMessage}`, '_blank');
  }

  const handleEmailCheckout = () => {
    if (cart.length === 0) return;
    const message = getCheckoutMessage();
    const encodedSubject = encodeURIComponent("New Order Request - Aaham Collection");
    const encodedBody = encodeURIComponent(message);
    window.open(`mailto:aahamcollection@gmail.com?subject=${encodedSubject}&body=${encodedBody}`, '_blank');
  }

  return (
    <div className="relative">
      <div className="utility-bar">
        JEWELRY · CUSTOMIZED GIFT BOXES · SHIPPED WORLDWIDE
      </div>

      <div className="free-delivery-banner">
        <div className="marquee-content">
          <span>FREE DELIVERY ON ORDERS ABOVE RS. 2,500</span><span className="marquee-divider">•</span>
          <span>Personalized orders for your loved ones, just a WhatsApp message away!</span><span className="marquee-divider">•</span>
          <span>SAVE BIG ON ALMOST OUR ENTIRE COLLECTION—EXCLUSIVE DISCOUNTS FOR OUR FIRST 100 CUSTOMERS!</span><span className="marquee-divider">•</span>
          <span>FREE DELIVERY ON ORDERS ABOVE RS. 2,500</span><span className="marquee-divider">•</span>
          <span>Personalized orders for your loved ones, just a WhatsApp message away!</span><span className="marquee-divider">•</span>
          <span>SAVE BIG ON ALMOST OUR ENTIRE COLLECTION—EXCLUSIVE DISCOUNTS FOR OUR FIRST 100 CUSTOMERS!</span><span className="marquee-divider">•</span>
        </div>
      </div>

      <header className="navbar">
        <div className="navbar-container">
          <button className="hamburger-btn" aria-label="Open Menu" onClick={() => setIsMobileMenuOpen(true)}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div className="brand">
            <h1>AAHAM</h1>
            <span>COLLECTION</span>
          </div>
          <div className="nav-actions">
            <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              <span className="cart-count">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-category-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setIsMobileMenuOpen(false) }}>
        <div className="mobile-category-content">
          <div className="mobile-category-header">
            <h2 className="mobile-category-title">SHOP BY CATEGORIES</h2>
            <button className="close-mobile-category-btn" aria-label="Close Menu" onClick={() => setIsMobileMenuOpen(false)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div className="mobile-category-list">
            {allTypes.map(type => (
              <button 
                key={type}
                className={`nav-category-link ${currentCategory === type ? 'active' : ''}`}
                onClick={() => {
                  setCurrentCategory(type);
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
              >
                {type === 'Home' ? 'Home' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main>
        <section className="search-section">
          <div className="search-container-main">
            <input type="text" placeholder="Search by name or product ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <svg className="search-icon-main" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </section>

        {showHomeLayout ? (
          <>
            <section className="hero">
              <div className="hero-content">
                <h2 className="brand-title">AAHAM</h2>
                <span className="brand-subtitle">COLLECTION</span>
                <div className="hero-divider"></div>
                <p className="tagline">Jewelry | Customize Gift Boxes | Bouquets</p>
              </div>
            </section>
            
            <section className="featured-slider-section">
              <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: "'Playfair Display', serif", fontSize: '2.5rem' }}>SHOP BY COLLECTION</h2>
              {isLoading && <div className="loading-state">Loading featured products...</div>}
              {hasError && <div className="loading-state">Something went wrong.</div>}
              {!isLoading && !hasError && (
                <div className="slider-container">
                  {randomProducts.map((p, index) => (
                    <div className="slider-item" key={p.id}>
                      {renderProductCard(p, index)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="products-section" style={{ paddingTop: '2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem', fontFamily: "'Playfair Display', serif", fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {isSearchActive ? 'Search Results' : currentCategory}
            </h2>
            <div className="product-grid">
              {isLoading && <div className="loading-state">Loading collection...</div>}
              {hasError && <div className="loading-state">Something went wrong loading products. Please try again.</div>}
              {!isLoading && !hasError && filteredProducts.length === 0 && <div className="loading-state">No products found.</div>}
              {!isLoading && !hasError && filteredProducts.map((p, index) => renderProductCard(p, index))}
            </div>
          </section>
        )}
      </main>

      <section className="our-story-section">
        <div className="our-story-content">
          <div className="contact-eyebrow">OUR STORY</div>
          <div className="about-text">
            Aaham Collection began with a simple idea — jewelry and gifts that feel personal. We offer fine
            jewelry, customized gift boxes, and jewelry boxes, each one handpicked and thoughtfully packaged,
            made to be given, not just bought.
          </div>
          <div className="follow-pill">Follow us to stay tuned</div>
        </div>
      </section>

      <section className="get-in-touch-section" id="contact">
        <div className="contact-eyebrow">GET IN TOUCH</div>
        <div className="social-icons-row">
          <a href="https://instagram.com" className="plain-icon-link" aria-label="Instagram">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></rect>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></line>
            </svg>
          </a>
          <a href="https://facebook.com" className="plain-icon-link" aria-label="Facebook">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path>
            </svg>
          </a>
          <a href="tel:03260627568" className="plain-icon-link" aria-label="Call">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
          </a>
          <a href="mailto:aahamcollection@gmail.com" className="plain-icon-link" aria-label="Email">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </a>
        </div>
      </section>

      <footer>
        <div className="footer-content">
          <h3>AAHAM COLLECTION</h3>
          <p>Fine Jewelry</p>
        </div>
      </footer>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null) }}>
          <div className="modal-content">
            <button className="close-modal" onClick={() => setSelectedProduct(null)}>&times;</button>
            <div className="modal-body">
              <div className="detail-layout">
                <div className="detail-image-col">
                  <div className="main-image-container">
                    {modalImage ? <img src={modalImage} alt={selectedProduct.name} /> : <div className="no-image-placeholder">No Image</div>}
                  </div>
                  {Array.isArray(selectedProduct.photos) && selectedProduct.photos.length > 1 && (
                    <div className="thumbnail-row">
                      {selectedProduct.photos.map((src, i) => (
                        <img 
                          key={i} 
                          src={src} 
                          className={`thumbnail-img ${modalImage === src ? 'active' : ''}`} 
                          alt="thumbnail" 
                          onClick={() => setModalImage(src)} 
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="detail-info">
                  <span className="product-type">{selectedProduct.type} | {selectedProduct.category}</span>
                  <h2 className="product-name">{selectedProduct.name}</h2>
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.salePrice ? (
                    <div className="price-container" style={{ justifyContent: 'flex-start', marginBottom: '2rem' }}>
                      <span className="price-original">Rs. {selectedProduct.originalPrice.toFixed(2)}</span>
                      <span className="product-price">Rs. {selectedProduct.salePrice.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="product-price" style={{ marginBottom: '2rem' }}>Rs. {selectedProduct.salePrice.toFixed(2)}</div>
                  )}
                  <div className="detail-desc" dangerouslySetInnerHTML={{ __html: selectedProduct.description ? selectedProduct.description.replace(/\n/g, '<br>') : 'An exquisite piece from our collection.' }} />
                  <div className="add-to-cart-container">
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => setModalQty(Math.max(1, modalQty - 1))}>-</button>
                      <input type="number" className="qty-input" value={modalQty} readOnly />
                      <button className="qty-btn" onClick={() => setModalQty(modalQty + 1)}>+</button>
                    </div>
                    <button className="add-btn" onClick={() => handleAddToCart(selectedProduct, modalQty)}>Add to Cart</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <div className={`cart-overlay ${isCartOpen ? '' : 'hidden'}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`cart-drawer ${isCartOpen ? '' : 'hidden'}`}>
        <div className="cart-drawer-header">
          <h3>Your Selection</h3>
          <span className="cart-header-count">{cartCount} Items</span>
          <button className="close-cart" onClick={() => setIsCartOpen(false)}>&times;</button>
        </div>
        <div className="cart-drawer-body">
          {cart.length > 0 && cartTotal >= 2500 && <div className="cart-nudge success">You've unlocked free delivery! 🎉</div>}
          {cart.length > 0 && cartTotal < 2500 && <div className="cart-nudge pending">Add Rs. {(2500 - cartTotal).toFixed(2)} more to unlock free delivery!</div>}
          
          {cart.length === 0 ? (
            <div className="empty-cart">Your cart is empty.</div>
          ) : (
            cart.map(item => (
              <div key={item.id}>
                <div className="cart-item">
                  {item.image ? <img src={item.image} className="cart-item-img" alt={item.name} /> : <div className="cart-item-img no-image"></div>}
                  <div className="cart-item-details">
                    <div className="cart-item-header">
                      <div className="cart-item-title">{item.name}</div>
                      <button className="remove-btn" onClick={() => removeFromCart(item.id)}>&times;</button>
                    </div>
                    <div className="cart-item-id">ID: {item.id}</div>
                    <div className="cart-item-actions">
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => updateCartQty(item.id, -1)}>-</button>
                        <input type="number" readOnly className="qty-input" value={item.qty} />
                        <button className="qty-btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                      </div>
                      <div className="cart-item-price">Rs. {(item.price * item.qty).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <hr className="cart-item-divider" />
              </div>
            ))
          )}
        </div>
        <div className="cart-drawer-footer">
          <div className="cart-total">
            <span>Grand Total</span>
            <span>Rs. {cartTotal.toFixed(2)}</span>
          </div>
          <div className="cart-delivery-note">
            Delivery charges not included — informed separately.
          </div>
          {cart.length > 0 && (
            <div className="checkout-actions">
              <button className="checkout-btn whatsapp-btn" onClick={handleWhatsAppCheckout}>
                Order via WhatsApp
              </button>
              <button className="checkout-btn email-btn" onClick={handleEmailCheckout}>
                Order via Email
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
