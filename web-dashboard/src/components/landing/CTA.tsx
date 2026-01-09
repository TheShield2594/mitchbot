import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function CTA() {
  return (
    <section className="relative isolate overflow-hidden py-24 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden blur-3xl">
        <div className="relative left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/30" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to level up your Discord server?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Get started with MitchBot today. It's free to add and takes less than a minute to set up.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              to="/auth/discord"
              className="group flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              Add to Discord
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/dashboard"
              className="text-sm font-semibold leading-6 transition-colors hover:text-primary"
            >
              View Demo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 -z-10 flex transform-gpu overflow-hidden blur-3xl">
        <div className="relative left-3/4 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20" />
      </div>
    </section>
  )
}
