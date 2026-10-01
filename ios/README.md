# Fore the Record for iPhone

Native SwiftUI prototype targeting iOS 17 or later. Open `ForeTheRecord.xcodeproj` in Xcode, select an iPhone simulator, and run. No Apple Developer Program membership is needed for simulator development.

The app signs in with the existing Supabase account, searches the existing course catalogue, loads official tee scorecards, saves a round locally, and can sync the existing version-1 live-round draft to the account. History and Friends have read-only native views. The GPS tab uses MapKit satellite imagery and Core Location. A player can tap to measure a target and place **personal, unverified** front/middle/back green pins for a hole. The app never presents those pins as official course mapping.

The app bundles the same public Supabase project URL and publishable key used by the website, and connects to `https://foretherecord.co.uk`. Family members can sign in without connection setup. Debug builds retain a connection-settings screen for local testing; release builds use the bundled production configuration. Session credentials are stored in Keychain.

Signing out clears the Keychain session and in-memory account state, but retains the locally protected round draft and personal pins under that account's user ID. Only signing back in as the same account loads those files. Removing the app deletes its local files.

This is an initial native pilot, not an App Store release. A completed casual individual Stroke Play or Stableford card can be reviewed and submitted on the iPhone. Other formats still finish on the website. Before relying on on-course yardages, the backend needs versioned, verified hole geometry. The iPhone and website send revision-checked draft updates, keep the current card visible after a conflict, and ask which copy to keep when the account draft changed. Submitted rounds record their source draft ID once, and the app checks that ID before retrying an uncertain submission.

Run the distance smoke check with `swiftc ForeTheRecord/Models.swift Tests/DistanceSmoke.swift -o /tmp/fore-distance-smoke && /tmp/fore-distance-smoke` from this directory. CI builds the iPhone simulator without signing; for a physical iPhone, choose your Apple team in Signing & Capabilities. Follow [the iPhone field-test guide](../docs/IOS-DEVICE-QA.md) before treating native round submission as field-verified.
