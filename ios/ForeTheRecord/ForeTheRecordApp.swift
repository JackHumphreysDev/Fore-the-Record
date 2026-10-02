import SwiftUI

@main
struct ForeTheRecordApp: App {
    @StateObject private var store = RoundStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Palette.accent)
        }
    }
}
