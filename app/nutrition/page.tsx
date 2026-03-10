export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white selection:bg-orange-500/30">
      {/* Container principal optimisé pour mobile */}
      <div className="max-w-md mx-auto px-6 py-12 flex flex-col min-h-screen justify-between">
        
        <header className="text-center mt-10 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-block bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-500/20">
            Plateforme Coaching v1.0
          </div>
          <h1 className="text-6xl font-black italic tracking-tighter mb-2 italic">
            MARCO<span className="text-orange-500">FIT</span>
          </h1>
          <p className="text-zinc-400 text-sm font-light leading-relaxed">
            L'excellence du coaching sportif et <br /> nutritionnel dans votre poche.
          </p>
        </header>

        <section className="space-y-4 animate-in fade-in zoom-in-95 duration-700 delay-300">
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95 transition-all">
            COMMENCER LE PROGRAMME
          </button>
          <button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-5 rounded-2xl active:scale-95 transition-all border border-zinc-800">
            ME CONNECTER
          </button>
        </section>

        <footer className="grid grid-cols-3 gap-4 border-t border-zinc-900 pt-8 text-center text-[10px] uppercase tracking-widest text-zinc-500">
          <div className="flex flex-col gap-1">
            <span className="text-white text-lg font-bold font-mono">100%</span>
            SÉCURISÉ
          </div>
          <div className="flex flex-col gap-1 border-x border-zinc-900 px-2">
            <span className="text-white text-lg font-bold font-mono">HD</span>
            VIDÉOS
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-white text-lg font-bold font-mono">IA</span>
            RECETTES
          </div>
        </footer>

      </div>
    </main>
  );
}