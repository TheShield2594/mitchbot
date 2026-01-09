import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Stats } from '@/components/landing/Stats'
import { CTA } from '@/components/landing/CTA'
import { Footer } from '@/components/landing/Footer'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function Home() {
  const featuresAnim = useScrollAnimation()
  const statsAnim = useScrollAnimation()
  const ctaAnim = useScrollAnimation()

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <div
        ref={featuresAnim.ref}
        className={`transition-all duration-1000 ${
          featuresAnim.isVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-10 opacity-0'
        }`}
      >
        <Features />
      </div>

      {/* Stats Section */}
      <div
        ref={statsAnim.ref}
        className={`transition-all duration-1000 ${
          statsAnim.isVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-10 opacity-0'
        }`}
      >
        <Stats />
      </div>

      {/* CTA Section */}
      <div
        ref={ctaAnim.ref}
        className={`transition-all duration-1000 ${
          ctaAnim.isVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-10 opacity-0'
        }`}
      >
        <CTA />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
