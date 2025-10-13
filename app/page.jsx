import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-4 bg-gradient-to-br from-background via-background to-muted/30">
          <div className="container max-w-6xl mx-auto text-center">
            <Badge variant="secondary" className="mb-8 text-sm px-4 py-2">
              🚀 Chrome Extension Available Now
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold text-balance mb-8 leading-tight">
              Find leads instantly with our{" "}
              <span className="text-primary bg-gradient-to-r from-primary to-accent bg-clip-text">
                Chrome extension
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground text-balance mb-8 max-w-4xl mx-auto leading-relaxed">
              Extract contact information, emails, and lead data directly from
              any website. Turn every webpage into a lead generation opportunity
              with just one click.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-6">
              {/* Direct ZIP download until listed on Chrome Web Store */}
              <Link href="/chrome-extension.zip" download>
                <Button size="lg" className="text-lg px-10 py-6 h-auto">
                  <svg
                    className="w-6 h-6 mr-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 16l4-5h-3V4h-2v7H8l4 5zm-7 2h14v2H5v-2z" />
                  </svg>
                  Download Chrome Extension
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-10 py-6 h-auto bg-transparent border-2"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Demo
              </Button>
            </div>

            {/* Manual install hint */}
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Not on the Chrome Web Store yet. Download the ZIP, then open{" "}
              <span className="font-semibold">chrome://extensions</span>, enable{" "}
              <span className="font-semibold">Developer mode</span>, click{" "}
              <span className="font-semibold">Load unpacked</span>, and select
              the unzipped{" "}
              <span className="font-semibold">chrome-extension folder</span>{" "}
              folder.
            </p>

            {/* Video Placeholder */}
            <div className="relative max-w-5xl mx-auto mt-10">
              <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-2xl border-2 border-dashed border-border flex items-center justify-center shadow-2xl">
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-muted-foreground">
                    Extension Demo Video
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload your demo video here
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-background">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                How LeadFinder Works
              </h2>
              <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
                Three simple steps to transform any website into a lead
                generation machine
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                <CardContent className="pt-12 pb-8">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">
                    1. Install Extension
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Download the ZIP and load it into Chrome via Developer Mode.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                <CardContent className="pt-12 pb-8">
                  <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">
                    2. Browse & Extract
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Click the extension on any site to extract emails, phones
                    and lead data.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                <CardContent className="pt-12 pb-8">
                  <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">
                    3. Export & Use
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Export to CSV or manage leads in your dashboard.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-background">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3">
                  10K+
                </div>
                <div className="text-muted-foreground text-lg">
                  Active Users
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3">
                  1M+
                </div>
                <div className="text-muted-foreground text-lg">Leads Found</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3">
                  95%
                </div>
                <div className="text-muted-foreground text-lg">
                  Accuracy Rate
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-3">
                  24/7
                </div>
                <div className="text-muted-foreground text-lg">Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-balance">
              Ready to supercharge your lead generation?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 text-balance">
              Join thousands of sales professionals who are already using
              LeadFinder to find more leads faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/chrome-extension.zip" download>
                <Button size="lg" className="text-lg px-10 py-6 h-auto">
                  Download Extension
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-10 py-6 h-auto bg-transparent border-2"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
