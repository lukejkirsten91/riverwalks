# MapTiler Cloud API Setup

## Overview
The Riverwalks app now uses MapTiler Cloud API with UK Ordnance Survey maps to display site location maps in the generated reports.

## Getting Your API Key

1. **Sign up for MapTiler Cloud**
   - Go to https://cloud.maptiler.com/
   - Create a free account (includes 100,000 map loads per month)

2. **Get Your API Key**
   - Once logged in, go to **Account → Keys**
   - Copy your API key

3. **Update Environment Variables**

   **Local Development (.env.local):**
   ```
   NEXT_PUBLIC_MAPTILER_API_KEY=your_actual_api_key_here
   ```

   **Vercel Production:**
   1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
   2. Select your `riverwalks` project
   3. Go to **Settings → Environment Variables**
   4. Update the existing `NEXT_PUBLIC_MAPTILER_API_KEY` variable with your new key
   5. Set for: Production, Preview, Development
   6. **Redeploy** your application

## Map Style: UK Ordnance Survey

The app is configured to use UK OpenZoomStack (Ordnance Survey maps) which provides:
- Detailed UK mapping data
- Street-level detail for Great Britain
- Professional cartography style
- **Fallback to basic style** if OS maps aren't available

## API Key Permissions Required

Ensure your MapTiler API key has access to:
- ✅ **Static Maps API** 
- ✅ **UK OpenZoomStack** (if available in your plan)
- ✅ **Basic Maps** (fallback)

## Troubleshooting

**"Invalid key" error:**
1. Double-check the API key is correctly copied (no extra spaces)
2. Verify the key is set in Vercel environment variables
3. Redeploy the application after updating environment variables
4. Check your MapTiler account usage limits

**Map not loading:**
1. Check browser console for error messages
2. Verify API key permissions in MapTiler Cloud dashboard
3. The app will automatically fallback to basic maps if OS maps fail

**Testing Your Setup:**
```bash
# Test API key with curl (replace YOUR_KEY):
curl "https://api.maptiler.com/maps/uk-openzoomstack/static/-1.5,53.8,8/400x300.png?key=YOUR_KEY"
```

## Cost Information
- **Free tier**: 100,000 map loads per month
- **UK OS maps**: May require specific plan tier
- **Basic maps**: Available on all plans including free

## Support
If you encounter issues:
1. Check MapTiler Cloud dashboard for account status
2. Verify API key permissions and usage limits
3. Test with the curl command above
4. Check Vercel deployment logs for environment variable issues