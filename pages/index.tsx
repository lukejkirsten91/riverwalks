import AuthCard from '../components/auth/auth-card';
import { LiveMetrics } from '../components/landing/LiveMetrics';
import { InteractivePreview } from '../components/landing/InteractivePreview';
import { MapPin, BarChart3, Users, Waves, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showInteractiveDemo, setShowInteractiveDemo] = useState(false);
  const heroRef = useRef(null);
  const metricsRef = useRef(null);
  const previewRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);

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

  useEffect(() => {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // Only run animations if user is not logged in (showing landing page)
    if (!user) {
      // Hero section animation
      gsap.fromTo(heroRef.current, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
      );

      // Staggered animations for sections
      const sections = [metricsRef.current, previewRef.current, featuresRef.current, ctaRef.current];
      sections.forEach((section, index) => {
        if (section) {
          gsap.fromTo(section,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play none none reverse"
              }
            }
          );
        }
      });

      // Feature cards animation
      const featureCards = document.querySelectorAll('.feature-card');
      gsap.fromTo(featureCards,
        { opacity: 0, y: 30, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [user]);

  const handleSignIn = async () => {
    // Use the custom domain for OAuth callback to avoid domain mismatches
    const redirectUrl = 'https://www.riverwalks.co.uk/api/auth/callback';
    
    console.log('🚀 Starting OAuth with redirect URL:', redirectUrl);
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account',
          access_type: 'online'
        }
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Force page refresh to clear cache
  };

  return (
    <div className="gradient-hero" style={{ minHeight: '100vh', overflow: 'visible' }}>
      <div className="relative" style={{ overflow: 'visible' }}>
        {/* Top Header */}
        <header className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Riverwalks" className="h-8 w-8" />
              <span className="text-white font-semibold text-lg">Riverwalks</span>
            </div>
            
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    {user.user_metadata?.avatar_url && (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="hidden sm:inline">{user.email}</span>
                  </div>
                  <button
                    onClick={() => window.location.href = '/river-walks'}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white/90 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div ref={heroRef} className="flex flex-col items-center justify-center py-16 p-4 sm:p-6 lg:p-8">
          <div className={`text-center max-w-5xl mx-auto ${user ? 'mb-8' : 'mb-12'}`}>
            <div className="mb-6">
              <div className="bg-blue-600/90 backdrop-blur-sm border border-blue-400/60 rounded-xl p-4 mb-4 max-w-2xl mx-auto">
                <p className="text-blue-50 text-lg font-bold mb-1">🎓 #1 Tool for GCSE Geography Coursework</p>
                <p className="text-blue-100 text-sm">
                  The complete river study platform trusted by students and teachers across the UK
                </p>
              </div>
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium">
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
          <div ref={metricsRef} className="pt-4 pb-12 px-4 sm:px-6 lg:px-8">
            <LiveMetrics />
          </div>
        )}

        {/* Interactive Preview Section */}
        {!user && (
          <div ref={previewRef} className="pt-12 pb-8 px-4 sm:px-6 lg:px-8">
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
          <div ref={featuresRef} className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
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
          <div ref={ctaRef} className="py-12 px-4 sm:px-6 lg:px-8 text-center">
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
