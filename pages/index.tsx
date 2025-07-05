import AuthCard from '../components/auth/auth-card';
import { LiveMetrics } from '../components/landing/LiveMetrics';
import { InteractivePreview } from '../components/landing/InteractivePreview';
import { MapPin, BarChart3, Users, Waves, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showInteractiveDemo, setShowInteractiveDemo] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);


  return (
    <div className="gradient-hero relative">
      {/* Background decoration */}
      <div className="fixed inset-0 bg-grid-white/[0.02] bg-grid -z-10" />
      
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
          <div className={`text-center max-w-5xl mx-auto ${user ? 'mb-8' : 'mb-12'}`}>
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium mb-4">
                <Waves className="w-4 h-4 mr-2" />
                Walk. Track. Learn.
              </span>
            </div>
            
            <div className="flex flex-col items-center mb-6">
              <img 
                src="/logo.png" 
                alt="Riverwalks Logo" 
                className="h-16 sm:h-20 lg:h-24 mb-4 drop-shadow-lg"
              />
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                Riverwalks
              </h1>
            </div>
            
            <p className="text-xl sm:text-2xl text-white/95 mb-4 max-w-4xl mx-auto leading-relaxed">
              Turn your river adventures into beautiful data stories
            </p>
            
            <p className="text-lg text-white/80 mb-6 max-w-3xl mx-auto">
              Whether you're studying for GCSE Geography, researching waterways, or just curious about rivers, 
              Riverwalks makes field data collection and analysis surprisingly engaging.
            </p>

            {/* Feature illustration */}
            <div className="mb-6 flex justify-center">
              <img 
                src="/riverwalks-feature.png" 
                alt="Riverwalks features visualization" 
                className="max-w-md w-full h-auto rounded-xl shadow-modern drop-shadow-lg"
              />
            </div>

            {/* Transparent pricing messaging */}
            <div className="bg-green-600/40 border border-green-400/60 rounded-xl p-4 mb-8 max-w-2xl mx-auto backdrop-blur-sm">
              <p className="text-green-50 text-sm font-medium mb-2">💡 Transparent Pricing - No Surprises</p>
              <p className="text-green-100 text-sm">
                Create your account and test all features for free. Reports and data export require a small subscription (£1.99/year or £3.49 lifetime) to support development.
              </p>
            </div>

            {/* Auth Card */}
            {!user && (
              <div className="w-full max-w-md mx-auto mb-8">
                <AuthCard />
              </div>
            )}

            {/* Scroll indicator */}
            {!user && (
              <div className="flex flex-col items-center animate-bounce">
                <p className="text-white/70 text-sm mb-2">See what the community is discovering</p>
                <ChevronDown className="w-6 h-6 text-white/70" />
              </div>
            )}
          </div>
        </div>

        {/* Live Metrics Section */}
        {!user && (
          <div className="pt-4 pb-12 px-4 sm:px-6 lg:px-8">
            <LiveMetrics />
          </div>
        )}

        {/* Interactive Preview Section */}
        {!user && (
          <div className="pt-12 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Experience it Yourself
              </h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                Jump in with real data from the River Dart. Add your own measurements 
                and watch professional reports generate in real-time.
              </p>
            </div>
            <InteractivePreview />
          </div>
        )}

        {/* Why Riverwalks Section */}
        {!user && (
          <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Why River Enthusiasts Love Riverwalks
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="feature-card glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md">
                  <MapPin className="w-10 h-10 text-blue-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-3">GPS-Precise Mapping</h3>
                  <p className="text-gray-200">Drop pins exactly where you take measurements. Build a network of study sites across the UK.</p>
                </div>
                
                <div className="feature-card glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md">
                  <BarChart3 className="w-10 h-10 text-green-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-3">Charts That Wow</h3>
                  <p className="text-gray-200">Transform depth readings into stunning cross-sections and 3D river profiles that tell stories.</p>
                </div>
                
                <div className="feature-card glass rounded-xl p-6 text-center hover:scale-105 transition-transform bg-gray-900/80 backdrop-blur-md">
                  <Users className="w-10 h-10 text-purple-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-3">Built for Learning</h3>
                  <p className="text-gray-200">Perfect for GCSE coursework, but designed for anyone curious about understanding rivers.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final CTA */}
        {!user && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 text-center">
            <div className="glass rounded-2xl p-8 max-w-2xl mx-auto bg-gray-900/80 backdrop-blur-md">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Ready to explore rivers like never before?
              </h2>
              <p className="text-gray-200 mb-4">
                Start your first river study in less than 2 minutes. No credit card required to get started.
              </p>
              <p className="text-gray-300 text-sm mb-6">
                Test all features free, then pay just £1.99/year or £3.49 lifetime for reports and data export.
              </p>
              <AuthCard />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-white/70 pb-8">
          <p>© 2025 Riverwalks. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
