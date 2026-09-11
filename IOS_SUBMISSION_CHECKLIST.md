# Wayfare iOS Submission Checklist

## Build and upload

- [ ] Confirm the App Store Connect record uses bundle ID `com.harnoorbrar.wayfare`.
- [ ] Confirm version **1.8** is created in App Store Connect. Codemagic increments the build number above 6 automatically.
- [ ] In Codemagic, verify the `Codemagic Wayfare` App Store Connect integration is authorized and the signing profile is current.
- [ ] Confirm the iOS App target has the **In-App Purchase** capability and its automatic provisioning profile was refreshed after the capability was added.
- [ ] In App Store Connect > Business, confirm the latest Paid Applications Agreement is active and banking/tax status is complete.
- [ ] In RevenueCat, confirm the Wayfare iOS app has an In-App Purchase Key, the `plus` entitlement includes both products, and an Offering containing monthly and lifetime packages is marked as the default.
- [ ] Push the intended `main` commit. The `ios-release` workflow builds, tests, signs, uploads to TestFlight, and is configured to submit the selected build for review.
- [ ] Install the TestFlight build on a physical iPhone and test a full life, a 3D home, Free Drive, an interstitial ad, a purchase, and Restore Purchases.
- [ ] Companions QA: adopt with a typed name, rename from the card, run each care action (once per year), confirm the bond bar and trait badge update, age past a companion's lifespan and confirm the memorial entry, and load a pre-1.8 save to confirm existing pets survive with a backfilled bond and personality.

## App Store Connect

- [ ] Copy the title, subtitle, description, keywords, promotional text, category, review notes, and URLs from `STORE_LISTING.md`.
- [ ] Upload the six 6.7-inch iPhone screenshots from `screenshots/store-preview-v15` in filename order (Companions leads at slot 2). Add other required device sizes or use App Store Connect's screenshot scaling where available.
- [ ] Complete the age-rating questionnaire against the shipped build. The existing suggested answers are in `STORE_LISTING.md`; do not rely on the expected 13+ result without completing the current questionnaire.
- [ ] Set the support URL and privacy policy URL. Confirm both public GitHub Pages URLs load before submission.
- [ ] Attach `com.harnoorbrar.wayfare.plus.monthly` and `com.harnoorbrar.wayfare.plus.lifetime` to version 1.8 and submit them with the app if they have not already been approved.
- [ ] Confirm the Paid Applications Agreement, banking, and tax details are active.
- [ ] In RevenueCat, verify the production App Store API key, both products, the `plus` entitlement, and the current App Store Connect in-app purchase key.

## Privacy answers

The app itself retains game saves and preferences only on-device. The required disclosures come from AdMob and RevenueCat. Review the current vendor documentation while completing the form, because SDK behavior and Apple's questions can change.

- [ ] AdMob: disclose the applicable data types from Google's current iOS guidance: coarse location (derived from IP address), device ID, advertising data, product interaction, crash data, and performance data. Mark the relevant uses for third-party advertising and analytics, then answer Apple's linked-to-user and tracking questions to match the AdMob configuration.
- [ ] RevenueCat: disclose Purchase History for Analytics and App Functionality. This app uses RevenueCat's anonymous identifiers and does not provide a custom user ID; it does not use RevenueCat purchase data for tracking.
- [ ] Confirm the public privacy policy matches the final advertising and purchase configuration.

## Review safety net

- [ ] Confirm the live app offers a working Privacy Policy, Terms of Use, support route, Restore Purchases, and Ad privacy choices entry.
- [ ] Leave the review notes in `STORE_LISTING.md`, including how to reach the 3D home, Free Drive, ads, and the paywall.
- [ ] Do not enable automatic public release until the TestFlight build has been tested and the first in-app products have propagated.
