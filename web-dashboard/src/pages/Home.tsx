import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Stats } from '@/components/landing/Stats'
import { CTA } from '@/components/landing/CTA'
import { Footer } from '@/components/landing/Footer'
import { AnimatedSection } from '@/components/AnimatedSection'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <AnimatedSection>
        <Features />
      </AnimatedSection>

      {/* Stats Section */}
      <AnimatedSection>
        <Stats />
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection>
        <CTA />
      </AnimatedSection>

      {/* Footer */}
      <Footer />
    </div>
  )
}
