import AuthCard from '../components/auth/auth-card';
import { LiveMetrics } from '../components/landing/LiveMetrics';
import { PWAInstallButton } from '../components/pwa/PWAInstallButton';
import { MapPin, BarChart3, Users, Waves, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { offlineDataService } from '../lib/offlineDataService';
import { isPWAMode, shouldRedirectAuthenticatedUser } from '../lib/pwaUtils';
import type { User } from '@supabase/supabase-js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showInteractiveDemo, setShowInteractiveDemo] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const heroRef = useRef(null);
  const metricsRef = useRef(null);
  const previewRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        const newUser = session?.user || null;
        setUser(newUser);
        
        // Handle PWA redirect for authenticated users
        if (newUser && shouldRedirectAuthenticatedUser(newUser)) {
          console.log('🚀 PWA mode detected - redirecting authenticated user to river-walks');
          router.push('/river-walks');
          return;
        }
        
        setIsCheckingAuth(false);
      }
    );

    // Initial session check with error handling and PWA redirect
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (error) {
          console.error('Index page session check error:', error);
          setUser(null);
          setIsCheckingAuth(false);
          return;
        }
        
        const sessionUser = session?.user || null;
        setUser(sessionUser);
        
        // Handle PWA redirect for authenticated users on initial load
        if (sessionUser && shouldRedirectAuthenticatedUser(sessionUser)) {
          console.log('🚀 PWA mode detected on initial load - redirecting to river-walks');
          router.push('/river-walks');
          return;
        }
        
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Index page session check exception:', error);
        if (!isMounted) return;
        setUser(null);
        setIsCheckingAuth(false);
      }
    };

    checkInitialSession();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // Only run animations if user is not logged in (showing landing page)
    if (!user) {
      // Hero section entrance animation
      gsap.timeline()
        .fromTo(heroRef.current, 
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
        )
        .fromTo(".hero-badge", 
          { opacity: 0, scale: 0.9, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }, "-=0.5"
        )
        .fromTo(".hero-svg", 
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }, "-=0.3"
        )
        .fromTo(".reports-section", 
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.2"
        );

      // Report stack interactive animation
      gsap.fromTo(".report-image", 
        { opacity: 0, scale: 0.8, rotation: 0 },
        { 
          opacity: 1, 
          scale: 1, 
          rotation: (index) => index === 0 ? 3 : index === 1 ? -2 : 0,
          duration: 0.8, 
          stagger: 0.2, 
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: ".reports-section",
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // Journey steps animation
      gsap.utils.toArray(".journey-step").forEach((step: any, index) => {
        gsap.fromTo(step,
          { opacity: 0, y: 50, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: step,
              start: "top 85%",
              toggleActions: "play none none reverse"
            }
          }
        );

        // Animate step numbers
        const stepNumber = step.querySelector(".step-number");
        if (stepNumber) {
          gsap.fromTo(stepNumber,
            { scale: 0, rotation: -180 },
            {
              scale: 1,
              rotation: 0,
              duration: 0.6,
              ease: "back.out(2)",
              scrollTrigger: {
                trigger: step,
                start: "top 85%",
                toggleActions: "play none none reverse"
              }
            }
          );
        }
      });

      // Staggered animations for main sections
      const sections = [metricsRef.current, featuresRef.current, ctaRef.current];
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

      // Feature cards animation with enhanced effects
      const featureCards = document.querySelectorAll('.feature-card');
      gsap.fromTo(featureCards,
        { opacity: 0, y: 30, scale: 0.9, rotationY: 15 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationY: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // Floating animation for report stack
      gsap.to(".report-front", {
        y: -5,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut"
      });

      // Parallax effect for background elements
      gsap.utils.toArray(".parallax-element").forEach((element: any) => {
        gsap.to(element, {
          yPercent: -50,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        });
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [user]);

  const handleSignIn = async () => {
    // Use the custom domain for OAuth callback to avoid domain mismatches
    const redirectUrl = 'https://www.riverwalks.co.uk/api/auth/callback';
    
    // Add PWA context to the redirect for better handling
    const redirectParams = new URLSearchParams();
    if (isPWAMode()) {
      redirectParams.set('pwa', 'true');
    }
    
    const finalRedirectUrl = redirectParams.toString() 
      ? `${redirectUrl}?${redirectParams.toString()}`
      : redirectUrl;
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: finalRedirectUrl,
        queryParams: {
          prompt: 'select_account',
          access_type: 'online'
        }
      },
    });
  };

  const handleSignOut = async () => {
    // Clear all offline data before signing out to prevent stale data
    await offlineDataService.clearAllOfflineData();
    await supabase.auth.signOut();
    window.location.reload(); // Force page refresh to clear cache
  };

  // Show loading state while checking authentication in PWA mode
  if (isCheckingAuth && isPWAMode()) {
    return (
      <div className="gradient-hero flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="flex items-center gap-2 text-white">
            <img src="/logo.png" alt="Riverwalks" className="h-8 w-8" />
            <span className="text-xl font-semibold">Riverwalks</span>
          </div>
          <p className="text-white/80 text-sm mt-2">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-hero" style={{ minHeight: '100vh', overflow: 'visible' }}>
      {/* Water Bubbles - Absolute container within gradient hero */}
      {!user && (
        <div className="bubbles-container">
          <div className="water-bubble bubble-1"></div>
          <div className="water-bubble bubble-2"></div>
          <div className="water-bubble bubble-3"></div>
          <div className="water-bubble bubble-4"></div>
          <div className="water-bubble bubble-5"></div>
          <div className="water-bubble bubble-6"></div>
          <div className="water-bubble bubble-7"></div>
          <div className="water-bubble bubble-8"></div>
          <div className="water-bubble bubble-9"></div>
          <div className="water-bubble bubble-10"></div>
          <div className="water-bubble bubble-11"></div>
          <div className="water-bubble bubble-12"></div>
          <div className="water-bubble bubble-13"></div>
          <div className="water-bubble bubble-14"></div>
          <div className="water-bubble bubble-15"></div>
          <div className="water-bubble bubble-16"></div>
          <div className="water-bubble bubble-17"></div>
          <div className="water-bubble bubble-18"></div>
          <div className="water-bubble bubble-19"></div>
          <div className="water-bubble bubble-20"></div>
          <div className="water-bubble bubble-21"></div>
          <div className="water-bubble bubble-22"></div>
          <div className="water-bubble bubble-23"></div>
          <div className="water-bubble bubble-24"></div>
          <div className="water-bubble bubble-25"></div>
          <div className="water-bubble bubble-26"></div>
          <div className="water-bubble bubble-27"></div>
          <div className="water-bubble bubble-28"></div>
          <div className="water-bubble bubble-29"></div>
          <div className="water-bubble bubble-30"></div>
          <div className="water-bubble bubble-31"></div>
          <div className="water-bubble bubble-32"></div>
          <div className="water-bubble bubble-33"></div>
          <div className="water-bubble bubble-34"></div>
          <div className="water-bubble bubble-35"></div>
          <div className="water-bubble bubble-36"></div>
          <div className="water-bubble bubble-37"></div>
          <div className="water-bubble bubble-38"></div>
          <div className="water-bubble bubble-39"></div>
          <div className="water-bubble bubble-40"></div>
          <div className="water-bubble bubble-41"></div>
          <div className="water-bubble bubble-42"></div>
          <div className="water-bubble bubble-43"></div>
          <div className="water-bubble bubble-44"></div>
          <div className="water-bubble bubble-45"></div>
          <div className="water-bubble bubble-46"></div>
          <div className="water-bubble bubble-47"></div>
          <div className="water-bubble bubble-48"></div>
          <div className="water-bubble bubble-49"></div>
          <div className="water-bubble bubble-50"></div>
          <div className="water-bubble bubble-51"></div>
          <div className="water-bubble bubble-52"></div>
          <div className="water-bubble bubble-53"></div>
          <div className="water-bubble bubble-54"></div>
          <div className="water-bubble bubble-55"></div>
          <div className="water-bubble bubble-56"></div>
          <div className="water-bubble bubble-57"></div>
          <div className="water-bubble bubble-58"></div>
          <div className="water-bubble bubble-59"></div>
          <div className="water-bubble bubble-60"></div>
          <div className="water-bubble bubble-61"></div>
          <div className="water-bubble bubble-62"></div>
          <div className="water-bubble bubble-63"></div>
          <div className="water-bubble bubble-64"></div>
          <div className="water-bubble bubble-65"></div>
          <div className="water-bubble bubble-66"></div>
          <div className="water-bubble bubble-67"></div>
          <div className="water-bubble bubble-68"></div>
          <div className="water-bubble bubble-69"></div>
          <div className="water-bubble bubble-70"></div>
          <div className="water-bubble bubble-71"></div>
          <div className="water-bubble bubble-72"></div>
          <div className="water-bubble bubble-73"></div>
          <div className="water-bubble bubble-74"></div>
          <div className="water-bubble bubble-75"></div>
          <div className="water-bubble bubble-76"></div>
          <div className="water-bubble bubble-77"></div>
          <div className="water-bubble bubble-78"></div>
          <div className="water-bubble bubble-79"></div>
          <div className="water-bubble bubble-80"></div>
          <div className="water-bubble bubble-81"></div>
          <div className="water-bubble bubble-82"></div>
          <div className="water-bubble bubble-83"></div>
          <div className="water-bubble bubble-84"></div>
          <div className="water-bubble bubble-85"></div>
          <div className="water-bubble bubble-86"></div>
          <div className="water-bubble bubble-87"></div>
          <div className="water-bubble bubble-88"></div>
          <div className="water-bubble bubble-89"></div>
          <div className="water-bubble bubble-90"></div>
          <div className="water-bubble bubble-91"></div>
          <div className="water-bubble bubble-92"></div>
          <div className="water-bubble bubble-93"></div>
          <div className="water-bubble bubble-94"></div>
          <div className="water-bubble bubble-95"></div>
          <div className="water-bubble bubble-96"></div>
          <div className="water-bubble bubble-97"></div>
          <div className="water-bubble bubble-98"></div>
          <div className="water-bubble bubble-99"></div>
          <div className="water-bubble bubble-100"></div>
          <div className="water-bubble bubble-101"></div>
          <div className="water-bubble bubble-102"></div>
          <div className="water-bubble bubble-103"></div>
          <div className="water-bubble bubble-104"></div>
          <div className="water-bubble bubble-105"></div>
          <div className="water-bubble bubble-106"></div>
          <div className="water-bubble bubble-107"></div>
          <div className="water-bubble bubble-108"></div>
          <div className="water-bubble bubble-109"></div>
          <div className="water-bubble bubble-110"></div>
          <div className="water-bubble bubble-111"></div>
          <div className="water-bubble bubble-112"></div>
          <div className="water-bubble bubble-113"></div>
          <div className="water-bubble bubble-114"></div>
          <div className="water-bubble bubble-115"></div>
          <div className="water-bubble bubble-116"></div>
          <div className="water-bubble bubble-117"></div>
          <div className="water-bubble bubble-118"></div>
          <div className="water-bubble bubble-119"></div>
          <div className="water-bubble bubble-120"></div>
        </div>
      )}
      
      <div className="relative" style={{ overflow: 'visible' }}>
        {/* Top Header */}
        <header className="absolute top-0 left-0 right-0 z-50 p-4 pointer-events-none">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Riverwalks" className="h-8 w-8" />
              <span className="text-white font-semibold text-lg">Riverwalks</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-3 pointer-events-auto">
              <PWAInstallButton className="pointer-events-auto" />
              {user ? (
                <div className="flex items-center gap-1 sm:gap-3">
                  <div className="flex items-center gap-2 text-white/90 text-sm bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    {user.user_metadata?.avatar_url && (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="hidden md:inline max-w-[200px] truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={() => window.location.href = '/river-walks'}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-2 py-1.5 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                  >
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">🏠</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white/90 px-2 py-1.5 sm:px-3 rounded-lg text-xs sm:text-sm transition-colors"
                  >
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">👋</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => window.location.href = '/signup'}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 backdrop-blur-sm border border-purple-400/50 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all hover:scale-105 shadow-lg"
                >
                  <span className="hidden sm:inline">🤿 Dive in</span>
                  <span className="sm:hidden">🤿 Dive in</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div ref={heroRef} className="flex flex-col items-center justify-center py-16 p-4 sm:p-6 lg:p-8">
          <div className={`text-center max-w-5xl mx-auto mb-8`}>
            <div className="mb-8">
              <div className="hero-badge bg-blue-600/90 backdrop-blur-sm border border-blue-400/60 rounded-xl p-4 mb-8 max-w-2xl mx-auto">
                <p className="text-blue-50 text-lg font-bold mb-1">🎓 #1 Tool for GCSE Geography Coursework</p>
                <p className="text-blue-100 text-sm">
                  The complete river study platform trusted by students and teachers across the UK
                </p>
              </div>
            </div>


            {/* What You Get - Reports Section */}
            {!user && (
              <div className="reports-section mb-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                    <span className="text-blue-900 font-bold">Get Top Grades</span> <span className="text-blue-700 font-bold">without the Grind</span>
                  </h2>
                  <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                    Skip the tedious work. Get a GCSE-ready report with professional charts and metrics without the hours of manual formatting.
                  </p>
                </div>
                
                {/* Interactive Report Images */}
                <div className="flex justify-center mb-8 gap-4 flex-wrap">
                  <img 
                    src="/scatter1.jpg" 
                    alt="Professional river study report" 
                    className="report-image w-32 sm:w-40 md:w-48 h-auto rounded-lg shadow-xl transform transition-all duration-300 relative z-10"
                    onMouseEnter={(e) => {
                      const allImages = document.querySelectorAll('.report-image');
                      const currentImage = e.currentTarget;
                      
                      // Zoom this one and shrink others
                      allImages.forEach((img: any) => {
                        if (img === currentImage) {
                          img.style.transform = 'scale(1.4)';
                          img.style.zIndex = '20';
                        } else {
                          img.style.transform = 'scale(0.8)';
                          img.style.zIndex = '5';
                        }
                      });
                    }}
                    onMouseLeave={() => {
                      const allImages = document.querySelectorAll('.report-image');
                      // Reset all to normal
                      allImages.forEach((img: any) => {
                        img.style.transform = 'scale(1)';
                        img.style.zIndex = '10';
                      });
                    }}
                  />
                  <img 
                    src="/scatter2.jpg" 
                    alt="River data visualisation report" 
                    className="report-image w-32 sm:w-40 md:w-48 h-auto rounded-lg shadow-xl transform transition-all duration-300 relative z-10"
                    onMouseEnter={(e) => {
                      const allImages = document.querySelectorAll('.report-image');
                      const currentImage = e.currentTarget;
                      
                      // Zoom this one and shrink others
                      allImages.forEach((img: any) => {
                        if (img === currentImage) {
                          img.style.transform = 'scale(1.4)';
                          img.style.zIndex = '20';
                        } else {
                          img.style.transform = 'scale(0.8)';
                          img.style.zIndex = '5';
                        }
                      });
                    }}
                    onMouseLeave={() => {
                      const allImages = document.querySelectorAll('.report-image');
                      // Reset all to normal
                      allImages.forEach((img: any) => {
                        img.style.transform = 'scale(1)';
                        img.style.zIndex = '10';
                      });
                    }}
                  />
                  <img 
                    src="/scatter3.jpg" 
                    alt="River analysis scatter plot report" 
                    className="report-image w-32 sm:w-40 md:w-48 h-auto rounded-lg shadow-xl transform transition-all duration-300 relative z-10"
                    onMouseEnter={(e) => {
                      const allImages = document.querySelectorAll('.report-image');
                      const currentImage = e.currentTarget;
                      
                      // Zoom this one and shrink others
                      allImages.forEach((img: any) => {
                        if (img === currentImage) {
                          img.style.transform = 'scale(1.4)';
                          img.style.zIndex = '20';
                        } else {
                          img.style.transform = 'scale(0.8)';
                          img.style.zIndex = '5';
                        }
                      });
                    }}
                    onMouseLeave={() => {
                      const allImages = document.querySelectorAll('.report-image');
                      // Reset all to normal
                      allImages.forEach((img: any) => {
                        img.style.transform = 'scale(1)';
                        img.style.zIndex = '10';
                      });
                    }}
                  />
                </div>
                
                {/* See exactly what you'll get with download link */}
                <div className="text-center mb-8">
                  <p className="text-white/90 text-lg font-medium">
                    See exactly what you'll get - 
                    📊 <a
                      href="/report_to_download.pdf"
                      download="riverwalks-example-report.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-900 underline underline-offset-4 font-semibold"
                    >
                      Download the full report
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Smaller Journey CTA */}
            {!user && (
              <div className="text-center mb-8">
                <button
                  onClick={() => window.location.href = '/signup'}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all hover:scale-105 shadow-lg"
                >
                  🤿 Dive in 🌊
                </button>
                <p className="text-white/70 text-sm mt-2">Create your account in under 30 seconds</p>
              </div>
            )}
            
            {/* Section Divider */}
            {!user && (
              <div className="flex items-center justify-center mb-8">
                <div className="h-px bg-white/20 flex-1 max-w-xs"></div>
                <div className="mx-4 text-white/40 text-sm">The Journey</div>
                <div className="h-px bg-white/20 flex-1 max-w-xs"></div>
              </div>
            )}

            {/* Journey: How to Get There */}
            {!user && (
              <div className="mb-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
                    Your Journey to <span className="text-yellow-300 font-bold">Success</span>
                  </h2>
                </div>

                {/* Step 1: Manage */}
                <div className="journey-step mb-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                      <span className="text-blue-800 font-bold">Access your Riverwalks</span> <span className="text-blue-600 font-bold">anywhere</span>
                    </h3>
                    <p className="text-white/80 text-base max-w-xl mx-auto">
                      Access your river studies anywhere with our mobile-optimised interface. 
                      View sites and collect data all from your phone.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <img 
                      src="/mockup1.png" 
                      alt="Riverwalks mobile app interface showing riverwalk management" 
                      className="max-w-sm w-full h-auto"
                    />
                  </div>
                </div>
                
                {/* No Mobile, No Problem section - after manage section */}
                {!user && (
                  <div className="bg-green-600/90 backdrop-blur-sm border border-green-400/60 rounded-xl p-4 mb-8 max-w-2xl mx-auto">
                    <p className="text-green-50 text-lg font-bold mb-1">📱 No Mobile, No Problem!</p>
                    <p className="text-green-100 text-sm">
                      Collect data on-site with our print templates, then digitise when you're back. Perfect for field trips where mobiles aren't allowed.
                    </p>
                  </div>
                )}

                {/* Step 2: Collect */}
                <div className="journey-step mb-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                      Collect comprehensive river data
                    </h3>
                    <p className="text-white/80 text-base max-w-2xl mx-auto">
                      <span className="text-blue-700 font-bold">Gather detailed measurements</span> for site information, cross-sections, velocity, and sediment analysis. <span className="text-blue-600 font-bold">Everything you need for your Geography fieldwork</span>.
                    </p>
                  </div>
                  <div className="flex justify-center px-4">
                    <div className="w-full max-w-4xl relative">
                      <img 
                        src="/mockup3_no_background_1920X1920.png" 
                        alt="Three phone screens showing data collection interfaces for site info, cross-sections, velocity and sediment" 
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                  
                  {/* Offline Functionality Box */}
                  <div className="text-center mt-8 mb-6">
                    <div className="bg-blue-900/30 border border-blue-600/40 rounded-xl p-6 max-w-xl mx-auto backdrop-blur-sm">
                      <p className="text-blue-100 text-lg font-medium mb-2">🌐 Works Offline!</p>
                      <p className="text-blue-200 text-sm">
                        Collect data offline at remote sites. Everything syncs automatically when you're back online.
                      </p>
                    </div>
                  </div>
                  
                  {/* Payment section underneath mockup3 */}
                  <div className="text-center mt-8">
                    <div className="bg-green-600/20 border border-green-400/40 rounded-xl p-6 max-w-xl mx-auto backdrop-blur-sm">
                      <p className="text-green-100 text-xl font-medium mb-2">💰 Just £1.99/year or £3.49 lifetime</p>
                      <p className="text-green-200 text-base">One payment. Unlimited reports. No hidden fees.</p>
                    </div>
                  </div>
                  
                  {/* Dive in CTA after pricing */}
                  <div className="text-center mt-6">
                    <p className="text-white/70 text-sm mb-3">Ready to start your river study?</p>
                    <button
                      onClick={() => window.location.href = '/signup'}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2.5 rounded-lg font-semibold text-base transition-all hover:scale-105 shadow-lg"
                    >
                      🤿 Dive in 🌊
                    </button>
                  </div>
                  
                  {/* Section Divider */}
                  <div className="flex items-center justify-center mt-8 mb-8">
                    <div className="h-px bg-white/20 flex-1 max-w-xs"></div>
                    <div className="mx-4 text-white/40 text-sm">The Community</div>
                    <div className="h-px bg-white/20 flex-1 max-w-xs"></div>
                  </div>
                </div>

              </div>
            )}



            {/* PWA Install Prompt */}
            {!user && (
              <PWAInstallButton variant="standalone" />
            )}

          </div>
        </div>

        {/* Live Metrics Section */}
        {!user && (
          <div ref={metricsRef} className="px-4 sm:px-6 lg:px-8">
            <LiveMetrics />
          </div>
        )}

        {/* Why Riverwalks Section */}
        {!user && (
          <div ref={featuresRef} className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
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
                  <p className="text-gray-200">Transform depth readings into stunning cross-sections, and sediment measurements into wind rose charts that tell stories.</p>
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

        {/* Final CTA Divider */}
        {!user && (
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-white/20 flex-1 max-w-lg"></div>
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
                Use basic features for free, then pay just £1.99/year or £3.49 lifetime (one-off payment) for reports and data export.
              </p>
              <button
                onClick={() => window.location.href = '/signup'}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all hover:scale-105 shadow-lg"
              >
                🤿 Dive in 🌊
              </button>
            </div>
          </div>
        )}

        {/* SVG at bottom of page */}
        <div className="flex justify-center mb-8">
          <img 
            src="/riverwalks-feature.png" 
            alt="Riverwalks platform overview" 
            className="max-w-2xl w-full h-auto rounded-xl shadow-modern drop-shadow-lg"
          />
        </div>
        
        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-white/70 pb-8">
          <p>© 2025 Riverwalks. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
