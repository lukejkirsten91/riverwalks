import AuthCard from '../components/auth/auth-card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Riverwalks</h1>
        <p className="text-muted-foreground">Explore and document your river adventures</p>
      </div>
      
      <AuthCard />
      
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>© 2025 Riverwalks. All rights reserved.</p>
      </footer>
    </div>
  );
}