export interface GooglePlacesSearchParams {
  query: string
  location: string
  radius?: number
  type?: string
}

export interface GooglePlaceDetails {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
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
    const { query, location, radius = 5000, type } = params

    // First, get coordinates for the location
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      location,
    )}&key=${this.apiKey}`

    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()

    if (geocodeData.status !== "OK" || !geocodeData.results.length) {
      throw new Error("Invalid location provided")
    }

    const { lat, lng } = geocodeData.results[0].geometry.location

    // Search for places using Text Search API
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query,
    )}&location=${lat},${lng}&radius=${radius}&key=${this.apiKey}`

    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()

    if (searchData.status !== "OK") {
      throw new Error(`Google Places API error: ${searchData.status}`)
    }

    // Get detailed information for each place
    const detailedPlaces = await Promise.all(
      searchData.results.slice(0, 20).map(async (place: any) => {
        return await this.getPlaceDetails(place.place_id)
      }),
    )

    return detailedPlaces.filter(Boolean)
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
