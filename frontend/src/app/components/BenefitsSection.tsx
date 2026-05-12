import React from 'react';

const stats = [
  {
    value: '40%',
    label: 'Fewer Returns',
    desc: 'Customers who try before they buy return 40% less on average across VEXA-integrated storefronts.',
    accent: '#4A6741',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045a1.5 1.5 0 0 1 2.09-.003L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    value: '3.1×',
    label: 'Higher Conversions',
    desc: 'Shoppers who use the virtual try-on feature convert at 3× the rate of those viewing standard images.',
    accent: '#6B8C5E',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
  {
    value: '2 sec',
    label: 'Avatar Generation',
    desc: 'From photo upload to fully rendered 3D avatar in under 2 seconds. No waiting, no friction.',
    accent: '#8B7D3C',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    value: '99.2%',
    label: 'Size Accuracy',
    desc: 'VEXA body mapping achieves 99.2% dimensional accuracy — reducing size-related returns to near zero.',
    accent: '#4A6741',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

export default function BenefitsSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-white/30">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80rem] h-[40rem] rounded-full blur-[120px] opacity-10" style={{ background: 'radial-gradient(circle, #4A6741 0%, transparent 70%)' }} />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div
          className="text-center mb-16 md:mb-24 opacity-100 animate-on-scroll"
          style={{ animation: 'animationIn 0.8s ease-out 0.2s forwards', opacity: 0 }}
        >
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#4A6741] mb-4 block">
            The ROI
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#1a1a1a]">
            Numbers that{' '}
            <span className="text-gradient-primary">move the needle.</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto mt-6 text-base md:text-lg leading-relaxed font-medium">
            Real metrics from VEXA-integrated storefronts. Not projections — production data verified across 200+ brands.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats?.map((stat, i) => (
            <div
              key={i}
              className="relative glass-card rounded-[2rem] p-8 group hover:border-[#4A6741]/30 transition-all duration-500 overflow-hidden opacity-100 animate-on-scroll bg-white shadow-2xl shadow-slate-200/10"
              style={{
                animation: `animationIn 0.8s ease-out ${0.2 + i * 0.12}s forwards`,
                opacity: 0,
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 30%, ${stat?.accent}10 0%, transparent 70%)` }}
              />

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform group-hover:scale-110"
                style={{ background: `${stat?.accent}10`, color: stat?.accent }}
              >
                {stat?.icon}
              </div>

              <div
                className="text-5xl font-black tracking-tighter mb-3 leading-none"
                style={{ color: stat?.accent }}
              >
                {stat?.value}
              </div>
              <div className="text-sm font-black text-[#1a1a1a] uppercase tracking-widest mb-4">{stat?.label}</div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{stat?.desc}</p>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: `linear-gradient(90deg, transparent, ${stat?.accent}, transparent)` }}
              />
            </div>
          ))}
        </div>

        {/* Integration logos */}
        <div
          className="mt-20 md:mt-32 pt-12 border-t border-slate-100 opacity-100 animate-on-scroll"
          style={{ animation: 'animationIn 0.8s ease-out 0.6s forwards', opacity: 0 }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 text-center mb-10">
            Integrates with your stack
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
            {['Shopify', 'WooCommerce', 'Magento', 'React Native', 'Flutter', 'Next.js']?.map((platform) => (
              <div
                key={platform}
                className="text-sm md:text-base font-black text-slate-400 hover:text-[#4A6741] transition-colors cursor-default grayscale hover:grayscale-0"
              >
                {platform}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}