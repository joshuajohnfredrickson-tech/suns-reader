# PWA Verification Checklist

This document provides steps to verify that Suns Reader is working as an installable PWA.

## Local Testing

### 1. Start Development Server
```bash
npm run dev
# or if using a different package manager:
# pnpm dev
# yarn dev
# bun dev
```

### 2. Open in Browser
- Navigate to `http://localhost:3000`
- Open Chrome DevTools (F12 or Cmd+Option+I on Mac)

### 3. Check PWA Requirements

#### Manifest Check:
1. Go to DevTools → Application → Manifest
2. Verify all fields are populated:
   - Name: "Suns Reader"
   - Short name: "Suns Reader"
   - Start URL: "/"
   - Display: "standalone"
   - Icons: 192x192 and 512x512 listed

#### Service Worker Check:
1. Go to DevTools → Application → Service Workers
2. Verify service worker is registered
3. Check status shows "activated and running"
4. Click "Update" to test service worker updates

#### Icon Check:
1. Verify `/icon.svg` loads properly
2. Check that placeholder icons display correctly
3. For production, replace with actual branded icons

### 4. Install PWA Locally (Desktop)

#### Chrome/Edge:
1. Look for install icon (⊕) in address bar
2. Click to install
3. App should launch in standalone window
4. Verify no browser UI (address bar, tabs, etc.)

#### Safari (Mac):
1. Not available for localhost
2. Requires HTTPS deployment for testing

### 5. Test Dark Mode
1. Change system preferences → Dark mode
2. App should automatically switch to dark theme
3. Toggle back to light mode to verify it follows system setting

---

## Production Testing (After Deployment)

### Prerequisites:
- App deployed to HTTPS domain (required for PWA)
- Common hosts: Vercel, Netlify, CloudFlare Pages, etc.

### 1. Deploy Application
```bash
npm run build
npm run start
# or deploy to hosting platform
```

### 2. Desktop Testing

#### Chrome/Edge/Brave:
1. Visit your deployed URL (https://your-domain.com)
2. Open DevTools → Application → Manifest
3. Check for install prompt in address bar
4. Install and verify standalone mode

#### Safari (Mac):
1. Not fully supported for PWA install
2. Can add to Dock via File → Add to Dock

### 3. **iPhone Testing (Critical for iOS)**

#### Safari on iOS:
1. Open Safari and navigate to your deployed URL
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Confirm the name "Suns Reader" and tap "Add"
5. Close Safari
6. **Launch from Home Screen**:
   - Tap the Suns Reader icon on your home screen
   - App should open **full-screen** (no Safari UI)
   - No address bar or browser controls
   - Status bar should be visible at top
7. Verify app functionality:
   - Top bar with "Suns Reader" and refresh button
   - Two tabs: Trusted (default) and Discovery
   - Can switch between tabs
   - Articles display with read/unread dots
   - Dark mode follows system setting

#### iOS Dark Mode Test:
1. Go to Settings → Display & Brightness
2. Toggle Dark mode on
3. Relaunch Suns Reader from home screen
4. App should display in dark theme
5. Toggle back to light mode and verify

#### Common iOS Issues:
- **Icons not showing**: Verify icon paths in manifest.json are correct
- **Not full-screen**: Check `display: "standalone"` in manifest
- **Browser UI visible**: Make sure you launched from home screen icon, not Safari
- **Can't install**: Ensure site is served over HTTPS

### 4. Android Testing

#### Chrome/Edge:
1. Visit deployed URL in Chrome
2. Tap menu (three dots) → "Install app" or "Add to Home screen"
3. Alternatively, use install banner if it appears
4. Launch from home screen
5. Should open full-screen without browser UI
6. Test dark mode via system settings

---

## Lighthouse PWA Audit

### Run Lighthouse:
1. Open DevTools → Lighthouse tab
2. Select "Progressive Web App" category
3. Click "Analyze page load"
4. Should score 90+ for PWA criteria

### Key PWA Checks:
- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Has a web app manifest
- ✅ Configured for a custom splash screen
- ✅ Sets an address-bar theme color
- ✅ Content sized correctly for viewport
- ✅ Uses HTTPS (production only)

---

## Troubleshooting

### Service Worker Not Registering:
- Check browser console for errors
- Verify `/sw.js` is accessible
- Clear cache and hard reload (Cmd+Shift+R)

### Install Button Not Appearing:
- Must be on HTTPS (except localhost)
- May need to interact with site first
- Check if already installed
- Verify manifest is valid JSON

### Icons Not Loading:
- Check file paths in manifest.json
- Ensure icons exist in /public directory
- For production, replace placeholder icons with actual PNG files

### App Not Full-Screen on iPhone:
- Verify `display: "standalone"` in manifest
- Must launch from home screen icon (not Safari)
- Clear cache and re-add to home screen

### Dark Mode Not Working:
- Check browser/OS supports prefers-color-scheme
- Verify CSS has `@media (prefers-color-scheme: dark)` rules
- Test by toggling system dark mode

---

## Next Steps

After verification:
1. ✅ Replace placeholder icons with branded icons (192x192 and 512x512 PNG)
2. ✅ Update manifest colors to match brand
3. ✅ Test on multiple devices and browsers
4. ✅ Monitor service worker updates in production
5. ✅ Consider adding offline functionality
6. ✅ Add update notification for new versions

---

## Quick Reference

### Files Added/Modified:
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker
- `public/icon.svg` - App icon (SVG)
- `public/icon-192.png` - Placeholder 192x192 icon
- `public/icon-512.png` - Placeholder 512x512 icon
- `app/layout.tsx` - PWA metadata
- `app/page.tsx` - Main app shell
- `app/components/ArticleList.tsx` - Article list component
- `app/globals.css` - Dark mode styles

### URLs to Test:
- Manifest: `https://your-domain.com/manifest.json`
- Service Worker: `https://your-domain.com/sw.js`
- Icon: `https://your-domain.com/icon.svg`
