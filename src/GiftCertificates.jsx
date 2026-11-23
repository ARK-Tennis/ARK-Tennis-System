import React from 'react';
import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'ark@ark-tennis.com';
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Gift certificate request')}&body=${encodeURIComponent(
  'Hi Anthony,\n\nI\'d like to purchase a gift certificate.\n\nMy name:\nRecipient\'s name:\nGift:\n\nThank you!'
)}`;

const GIFTS = [
  ['Clinic session', '$25'],
  ['Private lesson', '$85'],
  ['Split private lesson (half)', '$42.50'],
  ['Stringing labor', '$20'],
  ['String + labor', '$40'],
];

/** Public page: information about gift certificates and a button to email Anthony. */
export default function GiftCertificates() {
  return (
    <div className="page">
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Gift Certificates</h1>
        <div className="net-cord" />
      </header>

      <div className="booking-form">
        <img
          src="/gift-certificate.jpg"
          alt="ARK Tennis gift certificate and envelope"
          style={{ width: '100%', borderRadius: 12, display: 'block' }}
        />

        <p style={{ margin: 0 }}>
          Hello Players! Welcome to my gift certificate portal. To purchase a gift certificate, contact me via the button
          below with the following information: your name, your recipient, and the gift that you&rsquo;re giving. The
          options for gifts are listed below. If you have a request for an additional gift, please communicate that in
          your message.
        </p>

        <div className="field">
          <label>Gift options</label>
          <div className="confirmation" style={{ margin: 0 }}>
            {GIFTS.map(([name, price]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{name}</span><strong>{price}</strong>
              </div>
            ))}
          </div>
        </div>

        <p style={{ margin: 0 }}>
          A $25 gift gives you a free overgrip, and a gift of $85 or more gives you free labor or free strings for your
          next re-stringing.
        </p>
        <p style={{ margin: 0 }}>
          After you purchase the gift, you&rsquo;ll receive your physical copy from me on court.
        </p>

        <a className="submit-btn" href={MAILTO} style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          Contact Me
        </a>
      </div>

      <nav className="footer-nav"><Link to="/">&larr; Back to Booking</Link></nav>
    </div>
  );
}
