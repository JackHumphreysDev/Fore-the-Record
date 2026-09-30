# Fore the Record for iPhone

Native SwiftUI prototype targeting iOS 17 or later. Open `ForeTheRecord.xcodeproj` in Xcode, select an iPhone simulator, and run. No Apple Developer Program membership is needed for simulator development.

The app signs in with the existing Supabase account, searches the existing course catalogue, loads official tee scorecards, saves a round locally, and can sync the existing version-1 live-round draft to the account. History and Friends have read-only native views. The GPS tab uses MapKit satellite imagery and Core Location. A player can tap to measure a target and place **personal, unverified** front/middle/back green pins for a hole. The app never presents those pins as official course mapping.

On first launch, enter the Supabase project URL and publishable key in the app's connection screen. These are the same public values used by the website. The API defaults to `https://foretherecord.co.uk`. Credentials are stored in Keychain. The publishable key is public, but the signed-in session remains private.

This is an initial native pilot, not an App Store release. Final round submission remains on the website. Before field use, the backend needs versioned, verified hole geometry and draft revision/conflict handling. The current server accepts last-write-wins draft PUTs, so avoid editing the same live draft on the website and iPhone at the same time.

Run the distance smoke check with `swiftc ForeTheRecord/Models.swift Tests/DistanceSmoke.swift -o /tmp/fore-distance-smoke && /tmp/fore-distance-smoke` from this directory. The Xcode scheme builds for an iPhone simulator without a signing certificate; an actual iPhone or TestFlight requires choosing your Apple team in Signing & Capabilities.
