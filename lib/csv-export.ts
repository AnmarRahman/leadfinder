export interface CSVExportOptions {
  includeSearchInfo?: boolean
  dateFormat?: "US" | "ISO" | "EU"
  includeRatings?: boolean
  customFields?: string[]
}

export class CSVExporter {
  private leads: any[]
  private options: CSVExportOptions

  constructor(leads: any[], options: CSVExportOptions = {}) {
    this.leads = leads
    this.options = {
      includeSearchInfo: true,
      dateFormat: "US",
      includeRatings: true,
      ...options,
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString)

    switch (this.options.dateFormat) {
      case "ISO":
        return date.toISOString().split("T")[0]
      case "EU":
        return date.toLocaleDateString("en-GB")
      case "US":
      default:
        return date.toLocaleDateString("en-US")
    }
  }

  private escapeCSVField(field: string | null | undefined): string {
    if (!field) return ""
    const stringField = String(field)
    // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
    if (stringField.includes('"') || stringField.includes(",") || stringField.includes("\n")) {
      return `"${stringField.replace(/"/g, '""')}"`
    }
    return stringField
  }

  private getHeaders(): string[] {
    const baseHeaders = ["Business Name", "Address", "Phone", "Website"]

    if (this.options.includeRatings) {
      baseHeaders.push("Rating", "Total Ratings")
    }

    if (this.options.includeSearchInfo) {
      baseHeaders.push("Search Query", "Search Location")
    }

    baseHeaders.push("Date Found")

    return baseHeaders
  }

  private getRowData(lead: any): string[] {
    const row = [
      this.escapeCSVField(lead.business_name),
      this.escapeCSVField(lead.address),
      this.escapeCSVField(lead.phone),
      this.escapeCSVField(lead.website),
    ]

    if (this.options.includeRatings) {
      row.push(lead.rating ? String(lead.rating) : "", lead.total_ratings ? String(lead.total_ratings) : "")
    }

    if (this.options.includeSearchInfo && lead.searches) {
      row.push(this.escapeCSVField(lead.searches.query), this.escapeCSVField(lead.searches.location))
    }

    row.push(this.formatDate(lead.created_at))

    return row
  }

  public generateCSV(): string {
    const headers = this.getHeaders()
    const rows = this.leads.map((lead) => this.getRowData(lead))

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    return csvContent
  }

  public generateFileName(prefix = "leads"): string {
    const date = new Date().toISOString().split("T")[0]
    const timestamp = new Date().toTimeString().split(" ")[0].replace(/:/g, "-")
    return `${prefix}-${date}-${timestamp}.csv`
  }

  // Generate summary statistics
  public generateSummary(): {
    totalLeads: number
    businessesWithPhone: number
    businessesWithWebsite: number
    averageRating: number
    topSearchQueries: Array<{ query: string; count: number }>
  } {
    const totalLeads = this.leads.length
    const businessesWithPhone = this.leads.filter((lead) => lead.phone).length
    const businessesWithWebsite = this.leads.filter((lead) => lead.website).length

    const ratingsSum = this.leads.reduce((sum, lead) => sum + (lead.rating || 0), 0)
    const ratingsCount = this.leads.filter((lead) => lead.rating).length
    const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0

    // Count search queries
    const queryCount: Record<string, number> = {}
    this.leads.forEach((lead) => {
      if (lead.searches?.query) {
        queryCount[lead.searches.query] = (queryCount[lead.searches.query] || 0) + 1
      }
    })

    const topSearchQueries = Object.entries(queryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }))

    return {
      totalLeads,
      businessesWithPhone,
      businessesWithWebsite,
      averageRating: Math.round(averageRating * 10) / 10,
      topSearchQueries,
    }
  }
}
