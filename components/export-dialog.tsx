"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText } from "lucide-react"
import { useState } from "react"

interface ExportDialogProps {
  searchId?: string
  triggerText?: string
}

export function ExportDialog({ searchId, triggerText = "Export to CSV" }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [includeRatings, setIncludeRatings] = useState(true)
  const [includeSearchInfo, setIncludeSearchInfo] = useState(true)
  const [dateFormat, setDateFormat] = useState<"US" | "ISO" | "EU">("US")

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const params = new URLSearchParams({
        includeRatings: includeRatings.toString(),
        includeSearchInfo: includeSearchInfo.toString(),
        dateFormat,
      })

      if (searchId) {
        params.append("searchId", searchId)
      }

      const response = await fetch(`/api/leads/export/advanced?${params}`)

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      // Get filename from response headers
      const contentDisposition = response.headers.get("content-disposition")
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "leads-export.csv"

      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)

      setIsOpen(false)
    } catch (error) {
      console.error("Export error:", error)
      alert("Export failed. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleSummary = async () => {
    try {
      const params = new URLSearchParams({ format: "summary" })
      if (searchId) {
        params.append("searchId", searchId)
      }

      const response = await fetch(`/api/leads/export/advanced?${params}`)
      const summary = await response.json()

      alert(`Export Summary:
Total Leads: ${summary.totalLeads}
With Phone: ${summary.businessesWithPhone}
With Website: ${summary.businessesWithWebsite}
Average Rating: ${summary.averageRating}
Top Search: ${summary.topSearchQueries[0]?.query || "N/A"} (${summary.topSearchQueries[0]?.count || 0} results)`)
    } catch (error) {
      console.error("Summary error:", error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Leads</DialogTitle>
          <DialogDescription>Customize your CSV export with the options below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include Data</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ratings"
                  checked={includeRatings}
                  onCheckedChange={(checked) => setIncludeRatings(checked === true)}
                />
                <Label htmlFor="ratings" className="text-sm">
                  Ratings and reviews
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="search-info"
                  checked={includeSearchInfo}
                  onCheckedChange={(checked) => setIncludeSearchInfo(checked === true)}
                />
                <Label htmlFor="search-info" className="text-sm">
                  Search query and location
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-format" className="text-sm font-medium">
              Date Format
            </Label>
            <Select value={dateFormat} onValueChange={(value: "US" | "ISO" | "EU") => setDateFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">US Format (MM/DD/YYYY)</SelectItem>
                <SelectItem value="ISO">ISO Format (YYYY-MM-DD)</SelectItem>
                <SelectItem value="EU">EU Format (DD/MM/YYYY)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSummary} className="gap-2 bg-transparent">
            <FileText className="h-4 w-4" />
            View Summary
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
