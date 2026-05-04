'use client';
import { useEffect } from 'react';

export default function ScrollAnimationInit() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    document.querySelectorAll('.animate-on-scroll')?.forEach((el) => io?.observe(el));
    return () => io?.disconnect();
  }, []);

  return null;
}
