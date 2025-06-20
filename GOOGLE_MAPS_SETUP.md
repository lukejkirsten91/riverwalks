# Google Maps Static API Setup

## Overview
The Riverwalks app uses Google Maps Static API to display site location maps in the generated reports. This provides reliable, high-quality map images with your site markers overlaid.

## Setup Instructions

### 1. Get Your Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps Static API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > API Key**
6. Copy your API key

### 2. Configure API Key Restrictions (Recommended)
For security, restrict your API key:
1. In Google Cloud Console, click on your API key
2. Under **Application restrictions**, select **HTTP referrers**
3. Add your domains:
   - `https://riverwalks.vercel.app/*`
   - `https://*.vercel.app/*` (for preview deployments)
   - `http://localhost:3000/*` (for local development)
4. Under **API restrictions**, select **Restrict key**
5. Choose **Maps Static API**

### 3. Add API Key to Local Environment
1. Open `.env.local` in your project root
2. Replace `YOUR_API_KEY_HERE` with your actual API key:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBvOkBwBOlQ6N1xKKxKKxKKxKKxKKxKKxKK
   ```

### 4. Add API Key to Vercel (Production)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `riverwalks` project
3. Go to **Settings > Environment Variables**
4. Add new variable:
   - **Name**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key
   - **Environments**: Production, Preview, Development
5. Click **Save**
6. Redeploy your application

### 5. Test the Setup
1. Generate a report with sites that have GPS coordinates
2. The map should now display with Google Maps imagery
3. Check browser console for any API key errors

## Features
- **High-quality maps**: Google's detailed mapping data
- **Reliable service**: 99.9% uptime with Google's infrastructure  
- **Site markers**: Red circles showing each site location
- **Connecting lines**: Dashed lines showing the route between sites
- **Automatic zoom**: Fits all sites within the map bounds

## API Usage
The app uses Google Maps Static API with these parameters:
- **Size**: 600x400 pixels
- **Map type**: Roadmap (standard Google Maps view)
- **Zoom**: Automatically calculated based on site spread
- **Center**: Calculated from all site coordinates

## Troubleshooting
- **Blank map**: Check API key is set correctly in environment variables
- **"For development purposes only" watermark**: API key restrictions may be too strict
- **403 errors**: API key may not have Maps Static API enabled
- **Billing errors**: Ensure billing is enabled in Google Cloud Console

## Cost Information
Google Maps Static API pricing (as of 2024):
- **Free tier**: 28,000 map loads per month
- **Paid tier**: $2 per 1,000 additional map loads
- For typical school usage, you'll likely stay within the free tier

## Support
If you encounter issues:
1. Check the browser console for error messages
2. Verify your API key in Google Cloud Console
3. Ensure the Maps Static API is enabled
4. Check Vercel environment variables are set correctly