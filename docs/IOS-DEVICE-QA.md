# iPhone field test

Use this guide for the first physical-device run of the native iOS app. The app targets iOS 17 or later. A simulator build does not verify device signing, location accuracy, background behaviour, or on-course usability.

## Prepare the iPhone

1. Open `ios/ForeTheRecord.xcodeproj` in Xcode. In **Xcode > Settings > Accounts**, add your Apple Account. Under the **ForeTheRecord** target's **Signing & Capabilities**, select your team and leave **Automatically manage signing** enabled. Keep the bundle identifier `co.uk.foretherecord.app` unless Xcode reports that it is already registered to a different team; if so, use a unique development-only identifier locally.
2. Connect and unlock the iPhone. Trust the Mac when prompted, choose the iPhone as Xcode's run destination, and enable **Developer Mode** on the device if requested. Build and Run. A personal Apple Account can run a development build on your own device; TestFlight and App Store distribution require Apple Developer Program membership.
3. Sign in with a dedicated test account. A submitted round writes to the live account's history and may affect its statistics, so use a real round if testing with a normal player account. Choose a tee with a complete scorecard, such as Sickleholme Men's White Tees.

## Test the round

| Check | Action | Expected result |
| --- | --- | --- |
| Startup and sign-in | Cold launch, sign in, close and reopen the app. | Session resumes; no connection setup is needed in a release build. |
| Start and score | Search for a course, choose a tee, start an 18-hole Stroke Play card, enter scores, use Previous and Next. Repeat on a nine-hole Stableford card. | Par, stroke index and yardage match the selected tee; strokes, putts, penalties and pickup state remain on the correct holes. |
| Local recovery | Enter a few scores, turn on Airplane Mode, edit another hole, force quit and relaunch. Reconnect and tap Sync. | The card survives restart; offline edits reach the account after reconnecting. |
| Two-device conflict | Edit the same live draft on the website and iPhone before syncing the iPhone. | A conflict is shown; both account and iPhone choices work without silently losing the unchosen card. |
| GPS | Open GPS outdoors, allow **While Using the App** location, tap a target, then place personal front/middle/back pins. Walk and check again. | Position and accuracy status update; target and pin distances change plausibly. Pins are labelled unverified. Denying permission gives a useful state and does not block scoring. |
| Submit | Complete a casual individual card, review every hole, then submit. | One round appears in History; the live draft clears only after confirmation. |
| Uncertain submit | During a separate test card, interrupt connectivity just after tapping Submit, then reopen Review and use Check submission after reconnecting. | The app confirms an existing submission or safely retries it; no duplicate round appears. |
| Account separation | Sign out with a saved draft and pins, sign in as another account, then return to the first account. | The second account cannot see the first account's local files; the first account's draft and pins return. |

Record the iPhone model, iOS version, app commit, course and tee, test date, results, and any screenshots in the PR or issue. Check battery use and screen readability during an actual round. Before relying on on-course yardages, independently verify green geometry; the current personal pins are estimates, not official course data.
