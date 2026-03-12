'use client'
import CTASection from '../components/cta'
import Features from '../components/features'
import Footer from '../components/footer'
import HeroSection from '../components/hero'
import Navbar from '../components/navbar'
import Steps from '../components/steps'
import AIChatWidget from '../components/ai-chat-widget'
import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

function App() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  return (
    <>
      <Navbar />
      <HeroSection />
      <Features />
      <Steps />
      <CTASection />
      <Footer />
      <AIChatWidget />
    </>
  )
}

export default App
