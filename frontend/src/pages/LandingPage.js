import React, { useEffect, useState } from "react";
import LandingNav from "../components/landing/LandingNav";
import LandingHero from "../components/landing/LandingHero";
import {
  ImpactStats,
  Features,
  HowItWorks,
} from "../components/landing/LandingSections";
import { CallToAction, LandingFooter } from "../components/landing/LandingFooter";

const SCROLL_THEME_BREAKPOINT_PX = 700;

export default function LandingPage() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const onScroll = () => {
      setTheme(window.scrollY > SCROLL_THEME_BREAKPOINT_PX ? "light" : "dark");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden" data-testid="landing-page">
      <LandingNav theme={theme} />
      <LandingHero />
      <ImpactStats />
      <Features />
      <HowItWorks />
      <CallToAction />
      <LandingFooter />
    </div>
  );
}
