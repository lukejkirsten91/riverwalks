import AuthCard from '../components/auth/auth-card';
import { MapPin, BarChart3, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

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
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid" />
      <div className="absolute h-full w-full bg-gradient-to-br from-transparent via-white/5 to-white/10" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Hero Section */}
        <div className={`text-center max-w-4xl mx-auto ${user ? 'mb-8' : 'mb-12'}`}>
          <div className="mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium mb-4">
              ✨ Perfect for GCSE Geography coursework
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
          
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Professional river study documentation and analysis for students and educators. 
            Create stunning visualizations and comprehensive reports.
          </p>

          {/* Feature highlights - only show when not logged in */}
          {!user && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
              <div className="glass rounded-xl p-6 text-center">
                <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Site Mapping</h3>
                <p className="text-muted-foreground text-sm">Document multiple measurement sites with precise location data</p>
              </div>
              
              <div className="glass rounded-xl p-6 text-center">
                <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Data Visualization</h3>
                <p className="text-muted-foreground text-sm">Generate professional 2D and 3D river profile charts</p>
              </div>
              
              <div className="glass rounded-xl p-6 text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">GCSE Ready</h3>
                <p className="text-muted-foreground text-sm">Export publication-ready reports for coursework submission</p>
              </div>
            </div>
          )}
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md">
          <AuthCard />
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-white/70">
          <p>© 2025 Riverwalks. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
