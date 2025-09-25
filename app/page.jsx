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
              <span className="text-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Chrome extension
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground text-balance mb-12 max-w-4xl mx-auto leading-relaxed">
              Extract contact information, emails, and lead data directly from
              any website. Turn every webpage into a lead generation opportunity
              with just one click.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="https://chrome.google.com/webstore" target="_blank">
                <Button size="lg" className="text-lg px-10 py-6 h-auto">
                  <svg
                    className="w-6 h-6 mr-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Add to Chrome - Free
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

            {/* Video Placeholder */}
            <div className="relative max-w-5xl mx-auto">
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
                    Add LeadFinder to Chrome in seconds. No setup required,
                    works instantly on any website.
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
                    Visit any website and click the extension. Instantly extract
                    emails, phone numbers, and contact info.
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
                    Export your leads to CSV, integrate with your CRM, or manage
                    them in our dashboard.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Installation Guide */}
        <section className="py-24 bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Easy Installation Guide
              </h2>
              <p className="text-xl text-muted-foreground">
                Get started in under 2 minutes
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">
                      Visit Chrome Web Store
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Click the "Add to Chrome" button above to go directly to
                      our extension page.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">
                      Install Extension
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Click "Add to Chrome" and confirm the installation in the
                      popup.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">
                      Start Finding Leads
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Look for the LeadFinder icon in your browser toolbar and
                      start extracting leads!
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-muted to-muted/50 rounded-2xl p-12 border-2 border-dashed border-border">
                <div className="text-center">
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-muted-foreground">
                    Installation Screenshots
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload your installation guide images here
                  </p>
                </div>
              </div>
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
              <Link href="https://chrome.google.com/webstore" target="_blank">
                <Button size="lg" className="text-lg px-10 py-6 h-auto">
                  Get Started Free
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
