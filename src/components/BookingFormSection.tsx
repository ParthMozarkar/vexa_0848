"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';

const BookingFormSection = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <section className="py-24 bg-black relative overflow-hidden" id="booking">
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Book a VIP Demo</h2>
          <p className="text-gray-400">Experience the future of fashion try-on personally.</p>
        </div>

        {status === 'success' ? (
          <div className="p-12 text-center bg-blue-500/10 border border-blue-500/50 rounded-3xl">
            <h3 className="text-2xl font-bold text-white mb-2">Booking Received!</h3>
            <p className="text-blue-400">Our team will reach out shortly to schedule your demo.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-8 md:p-12 rounded-3xl border border-white/10 backdrop-blur-xl">
            <input name="name" placeholder="Full Name" required className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 transition-colors" />
            <input name="email" type="email" placeholder="Work Email" required className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 transition-colors" />
            <input name="company" placeholder="Company Name" required className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 transition-colors" />
            <input name="phone" placeholder="Phone Number" className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 transition-colors" />
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <input name="date" type="date" required className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 transition-colors" />
              <input name="time" type="time" required className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 transition-colors" />
            </div>
            <button 
              disabled={status === 'loading'}
              className="md:col-span-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status === 'loading' ? 'Scheduling...' : 'Reserve My Demo Time'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default BookingFormSection;
