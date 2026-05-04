import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/app/components/HeroSection';
import DemoSection from '@/app/components/DemoSection';
import HowItWorksSection from '@/app/components/HowItWorksSection';
import FeaturesSection from '@/app/components/FeaturesSection';
import BenefitsSection from '@/app/components/BenefitsSection';
import TestimonialsSection from '@/app/components/TestimonialsSection';
import CTASection from '@/app/components/CTASection';
import ScrollAnimationInit from '@/app/components/ScrollAnimationInit';
import BookingFormSection from '@/components/BookingFormSection';

export default function HomePage() {
  return (
    <main className="marketing-theme min-h-screen bg-background overflow-x-hidden text-foreground">
      <style dangerouslySetInnerHTML={{ __html: `
        body { background: none !important; animation: none !important; filter: none !important; background-color: var(--background) !important; }
        body::before { display: none !important; }
      `}} />
      <ScrollAnimationInit />
      <Header />
      <HeroSection />
      <DemoSection />
      <HowItWorksSection />
      <FeaturesSection />
      <BenefitsSection />
      <TestimonialsSection />
      <BookingFormSection />
      <CTASection />
      <Footer />
    </main>
  );
}
