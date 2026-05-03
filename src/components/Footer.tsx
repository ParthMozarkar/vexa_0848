"use client";
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-black/50 border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4 block">VEXA</span>
            <p className="text-gray-400 max-w-sm">Revolutionizing fashion with AI-powered virtual try-on experiences. Reduce returns and boost engagement.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/products" className="text-gray-400 hover:text-blue-400 transition-colors">Marketplace</Link></li>
              <li><Link href="/studio" className="text-gray-400 hover:text-blue-400 transition-colors">Vexa Studio</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-blue-400 transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">Terms of Service</Link></li>
              <li><a href="mailto:support@vexatryon.in" className="text-gray-400 hover:text-blue-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Vexa Solutions. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
