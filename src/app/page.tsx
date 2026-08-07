import {
  Navbar,
  Hero,
  TrustedBy,
  Features,
  Benefits,
  AIWorkflow,
  Integrations,
  Demo,
  Testimonials,
  Pricing,
  FAQ,
  CTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustedBy />
        <Features />
        <Benefits />
        <AIWorkflow />
        <Integrations />
        <Demo />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
