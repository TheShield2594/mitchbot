import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Welcome to <span className="text-primary">Mitchbot Dashboard</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Modern Discord bot management made easy
          </p>
          <Button size="lg" asChild>
            <a href="/auth/login">Login with Discord</a>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Moderation</CardTitle>
              <CardDescription>
                Keep your server safe with powerful automod tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Word filters, spam detection, anti-raid protection, and more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Economy System</CardTitle>
              <CardDescription>
                Engage your community with rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Custom currency, shop items, and user economy tracking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>XP & Leveling</CardTitle>
              <CardDescription>
                Reward active members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Level-up announcements, role rewards, and leaderboards.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
