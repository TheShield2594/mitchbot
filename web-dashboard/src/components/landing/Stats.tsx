const stats = [
  { id: 1, name: 'Discord Servers', value: '10,000+' },
  { id: 2, name: 'Active Users', value: '500,000+' },
  { id: 3, name: 'Commands Executed', value: '10M+' },
  { id: 4, name: 'Uptime', value: '99.9%' },
]

export function Stats() {
  return (
    <section className="bg-accent/50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trusted by thousands of communities
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Join the growing network of servers using MitchBot
            </p>
          </div>
          <dl className="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="flex flex-col gap-y-3 border-l border-primary/20 pl-6">
                <dt className="text-sm leading-6 text-muted-foreground">{stat.name}</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-primary">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
