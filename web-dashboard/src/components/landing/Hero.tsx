import { ArrowRight, Bot } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background py-20 sm:py-32">
      {/* Gradient orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute right-0 top-1/2 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-primary/10 p-4">
              <Bot className="h-16 w-16 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Supercharge Your Discord Server with{' '}
            <span className="text-primary">MitchBot</span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            The all-in-one Discord bot with moderation, leveling, economy, and analytics.
            Manage your community effortlessly with our powerful dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              to="/auth/discord"
              className="group flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
            >
              View Dashboard
            </Link>
          </div>

          {/* Stats preview */}
          <div className="mt-16 grid grid-cols-3 gap-4 text-center sm:gap-8">
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="mt-1 text-sm text-muted-foreground">Servers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500K+</div>
              <div className="mt-1 text-sm text-muted-foreground">Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="mt-1 text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
