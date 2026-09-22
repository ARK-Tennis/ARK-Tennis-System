import React from 'react';
import { Link } from 'react-router-dom';

export default function Waiver() {
  return (
    <div className="page">
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Waiver &amp; Release of Liability</h1>
        <div className="net-cord" />
      </header>

      <div className="booking-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>1. Assumption of Risk</h3>
          <p>
            I understand that participation in tennis instruction, clinics, drills, matches, and related activities
            offered by ARK Tennis LLC ("ARK Tennis") involves inherent risks, including but not limited to:
            collisions with other players, equipment, or fixed objects; falls, sprains, strains, fractures, and other
            physical injuries; impact from tennis balls, rackets, or other equipment; heat-related illness from
            outdoor play; and aggravation of pre-existing medical conditions.
          </p>
          <p>
            I voluntarily assume all such risks, known and unknown, arising from my (or my child's) participation,
            whether caused by negligence of ARK Tennis, its instructors, staff, or other participants, or otherwise.
          </p>
        </section>

        <section>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>2. Release and Waiver of Liability</h3>
          <p>
            In consideration of being permitted to participate in ARK Tennis programs, I, on behalf of myself and
            (if applicable) my minor child, release, waive, discharge, and covenant not to sue ARK Tennis LLC, its
            owners, instructors, employees, and any facility or venue where activities take place, from any and all
            liability, claims, demands, actions, or causes of action arising out of ordinary negligence related to
            participation in ARK Tennis activities.
          </p>
          <p>
            This release does not apply to claims arising from gross negligence, recklessness, or intentional
            misconduct, which cannot be waived under California law.
          </p>
        </section>

        <section>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>3. Medical Authorization</h3>
          <p>
            I authorize ARK Tennis staff to arrange or administer emergency medical care if I (or my child) am
            injured during a program, and to share relevant medical information with emergency responders or
            medical providers as needed. I understand ARK Tennis is not responsible for medical costs incurred.
          </p>
        </section>

        <section>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>4. Acknowledgment</h3>
          <p>
            By checking the acceptance box at booking, I confirm that I have read this document, understand its
            contents, and accept it voluntarily — either as the participant (if 18 or older), or as the parent/legal
            guardian of the minor participant, with full authority to accept on their behalf. This acceptance is
            recorded once and applies to all future bookings under the same email address.
          </p>
        </section>

        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Questions about this waiver? Contact ARK Tennis directly.
        </p>
      </div>

      <nav className="footer-nav">
        <Link to="/">← Back to Booking</Link>
      </nav>
    </div>
  );
}
