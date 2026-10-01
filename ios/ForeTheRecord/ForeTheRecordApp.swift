import SwiftUI

@main
struct ForeTheRecordApp: App {
    @StateObject private var store = RoundStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Color(red: 0.12, green: 0.30, blue: 0.22))
        }
    }
}
