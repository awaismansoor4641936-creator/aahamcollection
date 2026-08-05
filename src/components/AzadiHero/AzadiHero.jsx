import React from "react";
import "./AzadiHero.css";

/**
 * AzadiHero
 * Drop-in replacement for the homepage hero banner.
 * Pure CSS/SVG — no image assets required, fully responsive.
 *
 * Usage:
 *   import AzadiHero from "./components/AzadiHero/AzadiHero";
 *   ...
 *   <AzadiHero onShopClick={() => navigate("/collections/azadi")} />
 */
export default function AzadiHero({ onShopClick }) {
  return (
    <section className="azadi-hero">
      {/* decorative layers */}
      <div className="azadi-hero__sunburst" />
      <div className="azadi-hero__frame" />
      <span className="azadi-hero__corner azadi-hero__corner--tl" />
      <span className="azadi-hero__corner azadi-hero__corner--tr" />
      <span className="azadi-hero__corner azadi-hero__corner--bl" />
      <span className="azadi-hero__corner azadi-hero__corner--br" />

      <div className="azadi-hero__moon">
        <div className="azadi-hero__moon-cut" />
        <span className="azadi-hero__moon-star">★</span>
      </div>

      <div className="azadi-hero__sparkles" aria-hidden="true">
        {sparklePositions.map((pos, i) => (
          <span
            key={i}
            className="azadi-hero__sparkle"
            style={{ top: pos.top, left: pos.left, fontSize: pos.size, opacity: pos.opacity }}
          >
            ★
          </span>
        ))}
      </div>

      {/* content */}
      <div className="azadi-hero__content">
        <div className="azadi-hero__ribbon">
          <span>JASHN-E-AZADI SALE</span>
        </div>

        <div className="azadi-hero__badge">
          <span className="azadi-hero__laurel azadi-hero__laurel--left" />
          <span>79 YEARS OF AZADI</span>
          <span className="azadi-hero__laurel azadi-hero__laurel--right" />
        </div>

        <h1 className="azadi-hero__title">AAHAM</h1>
        <p className="azadi-hero__subtitle">COLLECTION</p>

        <div className="azadi-hero__divider">
          <span />
          <i />
          <span />
        </div>

        <p className="azadi-hero__tagline">
          Jewelry | Customize Gift Boxes | Bouquets
        </p>

        <button className="azadi-hero__cta" onClick={onShopClick}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          SHOP THE AZADI COLLECTION
        </button>
      </div>

      {/* bottom wave transition into the next section */}
      <svg
        className="azadi-hero__wave"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" />
      </svg>
    </section>
  );
}

// fixed sparkle positions so they don't shift on re-render
const sparklePositions = [
  { top: "14%", left: "8%", size: "14px", opacity: 0.5 },
  { top: "38%", left: "5%", size: "10px", opacity: 0.35 },
  { top: "58%", left: "12%", size: "12px", opacity: 0.4 },
  { top: "22%", left: "92%", size: "12px", opacity: 0.45 },
  { top: "48%", left: "88%", size: "16px", opacity: 0.4 },
  { top: "68%", left: "94%", size: "10px", opacity: 0.35 },
  { top: "10%", left: "48%", size: "10px", opacity: 0.3 },
  { top: "72%", left: "30%", size: "9px", opacity: 0.3 },
  { top: "78%", left: "70%", size: "11px", opacity: 0.35 },
];
