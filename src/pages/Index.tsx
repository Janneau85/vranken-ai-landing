import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative flex items-center justify-center py-32 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(0 0% 12%) 0%, hsl(0 0% 7%) 70%)'
          }}
        />
        <h1 
          className="relative text-[12rem] font-bold select-none"
          style={{
            color: 'hsl(0 0% 10%)',
            textShadow: 'var(--emboss-inset)',
            letterSpacing: '-0.02em',
            WebkitTextStroke: '1px hsl(0 0% 8%)',
          }}
        >
          Vranken.AI
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <p className="text-xl text-muted-foreground">
            Welcome to the future of AI
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
