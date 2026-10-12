# Advertising setup

House adverts work now on city balloons, electronic boards and TV breaks. Edit `advertising-config.js` to add campaign copy and colours. Only use advertising content and programme videos you have permission to publish. Online programmes are configured in the same file; the default is clearly labelled as a Google IMA sample programme.

The TV remote's Customer service button opens an advertising enquiry to `helpcenter@anotherworld.world`. Change `contactEmail` if needed. Clicking the mail link opens the visitor's email app; it does not send an enquiry automatically.

Google video ads are prepared with the HTML5 IMA SDK, but disabled by default. To activate them:

1. Set up your Google publisher/Ad Manager account and obtain a production VAST video ad tag for this site.
2. Configure your Google-certified consent management platform where required. Connect its consent-ready event to `window.__googleAdConsentReady = true`; keep that value false until the required consent state is available.
3. Put the production tag in `ADVERTISING_CONFIG.google.videoAdTagUrl`, set `enabled` to true, rebuild and deploy.
4. Verify ad requests, mobile playback and reporting on real devices.

Google ads render in the SDK's native TV-player overlay with its own controls and measurement. Google ad creatives are not copied onto 3D balloons or billboards. Those placements use owner-managed campaigns.

Official references:
- https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/get-started
- https://support.google.com/adsense/answer/1346295

The Google account, approval and production ad tag have not been supplied or configured. No Google ad script loads while the integration is disabled.
