import { lazy, Suspense } from "react";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Experience from "@/components/sections/Experience";
import Projects from "@/components/sections/Projects";
import Skills from "@/components/sections/Skills";
import Contact from "@/components/sections/Contact";

import ScrollProgress from "@/components/ui/ScrollProgress";

// Code-split the sky so three.js and GSAP stay out of the initial bundle.
const SkyScene = lazy(() => import("@/components/sky/SkyScene"));

export default function App() {
  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <ScrollProgress />

      {/* Theme sky behind all content: moon + rain, or sun + spring petals */}
      <Suspense fallback={null}>
        <SkyScene />
      </Suspense>

      <div className="relative z-10">
        <Navigation />
        <main id="main" className="w-full">
          <Hero />
          <About />
          <Experience />
          <Projects />
          <Skills />
          <Contact />
        </main>
        <Footer />
      </div>
    </div>
  );
}
