export interface GooglePlacesSearchParams {
  query: string
  location: string
  radius?: number
  type?: string
  maxResults?: number
}

export class GooglePlacesQuotaError extends Error {
  constructor(message = "Google API quota has been exceeded.") {
    super(message)
    this.name = "GooglePlacesQuotaError"
  }
}

const QUOTA_ERROR_STATUSES = new Set(["OVER_QUERY_LIMIT", "OVER_DAILY_LIMIT"])

function throwIfQuotaExceeded(status: string, context: string) {
  if (QUOTA_ERROR_STATUSES.has(status)) {
    throw new GooglePlacesQuotaError(`${context}: Google API quota has been exceeded.`)
  }
}

export interface GooglePlaceDetails {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
  email?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
  opening_hours?: {
    open_now: boolean
    weekday_text: string[]
  }
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}

export class GooglePlacesService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async searchPlaces(params: GooglePlacesSearchParams): Promise<GooglePlaceDetails[]> {
    const { query, location, radius = 5000, type, maxResults = 20 } = params

    if (maxResults <= 60) {
      return this.searchWithPagination(params)
    } else {
      return this.searchWithMultipleQueries(params)
    }
  }

  private async searchWithPagination(params: GooglePlacesSearchParams): Promise<GooglePlaceDetails[]> {
    const { query, location, radius = 5000, maxResults = 20 } = params

    // Get coordinates for the location
    const coordinates = await this.getCoordinates(location)
    const { lat, lng } = coordinates

    const allResults: any[] = []
    let nextPageToken: string | undefined

    // Fetch up to 3 pages (60 results max)
    for (let page = 0; page < 3 && allResults.length < maxResults; page++) {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query,
      )}&location=${lat},${lng}&radius=${radius}&key=${this.apiKey}${
        nextPageToken ? `&pagetoken=${nextPageToken}` : ""
      }`

      const searchResponse = await fetch(searchUrl)
      const searchData = await searchResponse.json()
      throwIfQuotaExceeded(searchData.status, "Place search")

      if (searchData.status !== "OK") {
        break
      }

      allResults.push(...searchData.results)
      nextPageToken = searchData.next_page_token

      if (!nextPageToken) break

      // Wait 2 seconds before next page (Google requirement)
      if (page < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    // Get detailed information for each place
    const detailedPlaces = await Promise.all(
      allResults.slice(0, maxResults).map(async (place: any) => {
        return await this.getPlaceDetails(place.place_id)
      }),
    )

    return detailedPlaces.filter((place): place is GooglePlaceDetails => place !== null)
  }

  private async searchWithMultipleQueries(params: GooglePlacesSearchParams): Promise<GooglePlaceDetails[]> {
    const { query, location, radius = 5000, maxResults = 100 } = params

    const coordinates = await this.getCoordinates(location)
    const { lat, lng } = coordinates

    // Create multiple search variations to get more results
    const searchVariations = [
      query, // Original query
      `${query} near ${location}`, // Location-specific
      `best ${query} in ${location}`, // Quality-focused
      `top ${query} ${location}`, // Popular places
      `${query} services ${location}`, // Service-focused
    ]

    const allResults: any[] = []
    const seenPlaceIds = new Set<string>()

    // Search with each variation
    for (const searchQuery of searchVariations) {
      if (allResults.length >= maxResults) break

      try {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          searchQuery,
        )}&location=${lat},${lng}&radius=${radius}&key=${this.apiKey}`

        const searchResponse = await fetch(searchUrl)
        const searchData = await searchResponse.json()
        throwIfQuotaExceeded(searchData.status, "Place search")

        if (searchData.status === "OK") {
          // Add unique results only
          for (const place of searchData.results) {
            if (!seenPlaceIds.has(place.place_id) && allResults.length < maxResults) {
              seenPlaceIds.add(place.place_id)
              allResults.push(place)
            }
          }
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        if (error instanceof GooglePlacesQuotaError) {
          throw error
        }
        console.error(`Error with search variation "${searchQuery}":`, error)
      }
    }

    // Get detailed information for each place
    const detailedPlaces = await Promise.all(
      allResults.slice(0, maxResults).map(async (place: any) => {
        return await this.getPlaceDetails(place.place_id)
      }),
    )

    return detailedPlaces.filter((place): place is GooglePlaceDetails => place !== null)
  }

  private async getCoordinates(location: string): Promise<{ lat: number; lng: number }> {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      location,
    )}&key=${this.apiKey}`

    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()
    throwIfQuotaExceeded(geocodeData.status, "Geocoding")

    if (geocodeData.status !== "OK" || !geocodeData.results.length) {
      throw new Error("Invalid location provided")
    }

    return geocodeData.results[0].geometry.location
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    const fields = [
      "place_id",
      "name",
      "formatted_address",
      "formatted_phone_number",
      "website",
      "rating",
      "user_ratings_total",
      "business_status",
      "opening_hours",
      "geometry",
    ].join(",")

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`

    try {
      const response = await fetch(detailsUrl)
      const data = await response.json()
      throwIfQuotaExceeded(data.status, "Place details")

      if (data.status === "OK") {
        return data.result
      }
      return null
    } catch (error) {
      console.error("Error fetching place details:", error)
      return null
    }
  }
}
