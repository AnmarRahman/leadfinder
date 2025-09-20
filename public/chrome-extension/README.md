# LeadFinder Chrome Extension

## Installation Instructions

1. **Download the Extension Files**
   - Download all files from the `public/chrome-extension/` directory
   - Keep the folder structure intact

2. **Load the Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" button
   - Select the `chrome-extension` folder containing the manifest.json file

3. **Configure API Endpoint**
   - Open `popup.js` file
   - Change the `apiBase` URL from `http://localhost:3000` to your deployed backend URL
   - For example: `https://your-app.vercel.app`

4. **Test the Extension**
   - Click the LeadFinder icon in your Chrome toolbar
   - Sign up for a new account or sign in with existing credentials
   - Try searching for business leads

## Features

- **User Authentication**: Secure sign up and sign in
- **Business Search**: Find leads by business type and location
- **Quota Management**: Track monthly search limits
- **CSV Export**: Export all leads to CSV file
- **Real-time Results**: View search results instantly

## Usage

1. **Sign Up/Sign In**: Create an account or sign in to existing account
2. **Search for Leads**: Enter business type (e.g., "restaurants") and location (e.g., "New York, NY")
3. **View Results**: Browse found businesses with contact information
4. **Export Data**: Download all your leads as a CSV file

## Troubleshooting

- **Extension not loading**: Make sure all files are in the correct folder structure
- **API errors**: Verify the backend URL is correct in popup.js
- **Authentication issues**: Check that the backend server is running and accessible
