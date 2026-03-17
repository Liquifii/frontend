# Fonbnk Setup Guide

## Step 1: Get Your Fonbnk Credentials

1. Go to **[Fonbnk Sandbox Dashboard](https://sandbox-dashboard.fonbnk.com)**
2. Sign up or log in to your account
3. Navigate to **API Settings** section
4. You'll need:
   - **Source ID** (FONBNK_SOURCE)
   - **URL Signature Secret** (FONBNK_URL_SIGNATURE_SECRET)

## Step 2: Add to .env File

Add these variables to your `.env` file in the frontend root directory:

```env
# Fonbnk Configuration
# Get these from https://sandbox-dashboard.fonbnk.com → API Settings

# Required for onramp-url and offramp-url endpoints
FONBNK_SOURCE=your_source_id_from_dashboard
FONBNK_URL_SIGNATURE_SECRET=your_url_signature_secret_from_api_settings

# Required for webhook verification (optional for now, but needed for production)
FONBNK_WEBHOOK_SECRET=your_webhook_secret_from_dashboard_webhooks_section

# Use sandbox (true) or production (false)
# Set to true for testing, false for production
FONBNK_SANDBOX=true
```

## Step 3: Where to Find Each Value

### FONBNK_SOURCE
- Location: Dashboard → API Settings → **Source** field
- This is your public identifier for the integration
- Example: `abc123xyz`

### FONBNK_URL_SIGNATURE_SECRET
- Location: Dashboard → API Settings → **URL Signature Secret** field
- Used to sign JWT tokens for widget URLs
- **Keep this secret!** Never commit it to git
- Example: `sk_live_abc123...` or `sk_sandbox_xyz789...`

### FONBNK_WEBHOOK_SECRET (Optional for now)
- Location: Dashboard → Webhooks → Settings
- Only needed if you want to receive webhook notifications
- Can be added later

### FONBNK_SANDBOX
- Set to `true` for testing (uses sandbox-pay.fonbnk.com)
- Set to `false` for production (uses pay.fonbnk.com)
- **Always use `true` during development!**

## Step 4: Restart Your Dev Server

After adding the variables:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 5: Test

1. Go to `/deposits` page
2. Click the **Fiat** tab
3. You should see the on-ramp form with country selector
4. Select a country, payment method, and amount
5. Click "Buy cUSD" - it should redirect to Fonbnk widget

## Troubleshooting

### Error: "Fonbnk not configured"
- Make sure you added `FONBNK_SOURCE` and `FONBNK_URL_SIGNATURE_SECRET` to `.env`
- Restart your dev server after adding variables
- Check that there are no typos in variable names

### Error: "Invalid signature"
- Double-check your `FONBNK_URL_SIGNATURE_SECRET` is correct
- Make sure you copied the entire secret (no truncation)

### Widget not loading
- Check that `FONBNK_SANDBOX=true` for testing
- Verify your Source ID is correct
- Check browser console for errors

## Production Setup

When ready for production:

1. Get credentials from **[Fonbnk Production Dashboard](https://dashboard.fonbnk.com)**
2. Update `.env`:
   ```env
   FONBNK_SOURCE=your_production_source_id
   FONBNK_URL_SIGNATURE_SECRET=your_production_secret
   FONBNK_SANDBOX=false
   ```
3. Set up webhook URL in Fonbnk dashboard pointing to your production server
4. Add `FONBNK_WEBHOOK_SECRET` for webhook verification
