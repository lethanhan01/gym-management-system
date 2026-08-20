# Vercel Configuration Guide for LIFF Integration

## Environment Variables Required

Add these environment variables to your Vercel project settings:

### Frontend Environment Variables (Client)
```env
VITE_LIFF_ID=your_actual_liff_id_from_line_console
VITE_LIFF_MOCK=false  # Set to true only for development
```

### Backend Environment Variables (Server - deployed on Render)
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@ep-host.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://user:pass@ep-host.supabase.com:5432/postgres
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=https://gym-management-system-teal-three.vercel.app
LINE_MOCK_ENABLED=false
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ID=your_line_channel_id
LINE_LIFF_URL=https://liff.line.me/2010144670-0RJwlyfv
```

## How to Configure

1. **Go to Vercel Dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the variables above with actual values

## Critical Configuration Points

### LIFF Configuration
- `VITE_LIFF_ID`: Must match exactly with the LIFF app ID in LINE Developer Console
- Redirect URI in LINE Console: `https://gym-management-system-teal-three.vercel.app/liff`

### CORS Configuration
Backend `CLIENT_URL` must match exactly with your Vercel frontend URL

### LIFF Flow
1. User opens LINE app → clicks Rich Menu → opens LIFF app
2. LIFF app redirects to `/liff` endpoint
3. LiffEntryPage handles authentication
4. If authenticated → redirect to member dashboard
5. If not → login flow → LINE → back to `/liff`

## Troubleshooting

If you still get infinite redirects:

1. Check that `VITE_LIFF_ID` is correctly set
2. Verify redirect URI in LINE Console matches your Vercel URL
3. Ensure CORS is properly configured
4. Check browser console for errors
5. Test in LINE Developer Console's LIFF tester

## LINE Developer Console Setup

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Select your channel
3. Go to **LIFF** section
4. Create new LIFF app with:
   - LIFF URL: `https://gym-management-system-teal-three.vercel.app/liff`
   - Size: Full (or appropriate size)
   - Always show homepage switch: ON
5. Save the LIFF ID and add to Vercel as `VITE_LIFF_ID`