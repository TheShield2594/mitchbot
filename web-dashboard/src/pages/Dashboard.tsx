import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Servers</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Server List</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Loading your servers...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
