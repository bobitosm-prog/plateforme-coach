import Cursor from './components/Cursor';
import ScrollBar from './components/ScrollBar';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MarqueeSection from './components/MarqueeSection';
import Results from './components/Results';
import NutritionSection from './components/NutritionSection';
import TrainingSection from './components/TrainingSection';
import TrackingSection from './components/TrackingSection';
import CoachIaSection from './components/CoachIaSection';
import CoachingPro from './components/CoachingPro';
import EconomicModel from './components/EconomicModel';
import Testimonials from './components/Testimonials';
import Steps from './components/Steps';
import PWASection from './components/PwaSection';
import PricingSection from './components/PricingSection';
import FaqSection from './components/FaqSection';
import GenevaSection from './components/GenevaSection';
import CtaSection from './components/CtaSection';
import FooterSection from './components/FooterSection';

export default function LandingPage() {
  return (
    <>
      <Cursor />
      <ScrollBar />

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997, opacity: 0.022,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '160px',
      }} />

      <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
        <Navbar />
        <Hero />
        <MarqueeSection />
        <Results />
        <NutritionSection />
        <TrainingSection />
        <TrackingSection />
        <CoachIaSection />
        <CoachingPro />
        <EconomicModel />
        <Testimonials />
        <Steps />
        <PWASection />
        <PricingSection />
        <FaqSection />
        <GenevaSection />
        <CtaSection />
        <FooterSection />
      </div>
    </>
  );
}
