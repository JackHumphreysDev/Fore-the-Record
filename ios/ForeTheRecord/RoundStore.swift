import Foundation

@MainActor
final class RoundStore: ObservableObject {
    @Published var session: Session? = Keychain.load()
    @Published var draft: LiveRoundState?
    @Published var courses: [CatalogueCourse] = []
    @Published var history: [HistoryRound] = []
    @Published var friends: FriendsResponse?
    @Published var busy = false
    @Published var message = ""
    @Published var syncStatus = "Saved on this iPhone"
    @Published var supabaseURL = UserDefaults.standard.string(forKey: "supabaseURL") ?? ""
    @Published var publishableKey = UserDefaults.standard.string(forKey: "publishableKey") ?? ""
    @Published var apiURL = UserDefaults.standard.string(forKey: "apiURL") ?? "https://foretherecord.co.uk"
    @Published var pins: [String: GreenPins] = [:]
    private var editSerial = 0

    private var client: APIClient? {
        guard let api = URL(string: apiURL), let supabase = URL(string: supabaseURL),
              api.scheme == "https", supabase.scheme == "https",
              !publishableKey.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        return APIClient(apiURL: api, supabaseURL: supabase, publishableKey: publishableKey)
    }

    private func token(for client: APIClient) async throws -> String {
        guard let session else { throw NetworkError.server("Sign in to continue.") }
        if let expiry = session.expiresAt, expiry > Date().addingTimeInterval(60) {
            return session.accessToken
        }
        let renewed = try await client.refresh(session)
        try Keychain.save(renewed)
        self.session = renewed
        return renewed.accessToken
    }

    private var storage: URL? {
        guard let id = session?.userId, UUID(uuidString: id) != nil else { return nil }
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        return support.appending(path: "live-\(id).json")
    }

    private var pinsStorage: URL? {
        guard let id = session?.userId, UUID(uuidString: id) != nil else { return nil }
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return support.appending(path: "pins-\(id).json")
    }

    init() {
        loadLocal()
    }

    func saveConfiguration() {
        UserDefaults.standard.set(supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "supabaseURL")
        UserDefaults.standard.set(publishableKey.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "publishableKey")
        UserDefaults.standard.set(apiURL.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "apiURL")
    }

    func signIn(email: String, password: String) async {
        guard let client else { message = NetworkError.notConfigured.localizedDescription; return }
        busy = true
        defer { busy = false }
        do {
            let result = try await client.signIn(email: email, password: password)
            try Keychain.save(result)
            session = result
            message = ""
            loadLocal()
            await resume()
        } catch { message = error.localizedDescription }
    }

    func signOut() {
        if let storage { try? FileManager.default.removeItem(at: storage) }
        if let pinsStorage { try? FileManager.default.removeItem(at: pinsStorage) }
        Keychain.clear()
        session = nil
        draft = nil
        pins = [:]
        courses = []
        history = []
        friends = nil
        message = ""
    }

    func search(_ term: String) async {
        guard let client, session != nil else { return }
        let query = term.trimmingCharacters(in: .whitespacesAndNewlines)
        guard query.count >= 2 else { message = "Enter at least two letters of the club name."; return }
        busy = true
        defer { busy = false }
        do {
            let token = try await token(for: client)
            courses = try await client.searchCourses(query, token: token)
            message = courses.isEmpty ? "No courses found. Try the club name." : ""
        } catch { message = error.localizedDescription }
    }

    func loadHistory() async {
        guard let client, session != nil else { return }
        do {
            let token = try await token(for: client)
            history = try await client.history(token: token)
            message = ""
        } catch { message = error.localizedDescription }
    }

    func loadFriends() async {
        guard let client, session != nil else { return }
        do {
            let token = try await token(for: client)
            friends = try await client.friends(token: token)
            message = ""
        } catch { message = error.localizedDescription }
    }

    func start(course: CatalogueCourse, tee: CatalogueTee, segment: String) async {
        guard let client, session != nil else { return }
        guard draft == nil else { message = "Finish or resume your current round first."; return }
        busy = true
        defer { busy = false }
        do {
            let token = try await token(for: client)
            if let existing = try await client.liveDraft(token: token) {
                draft = existing
                saveLocal()
                message = "Resumed the live round already saved to your account."
                return
            }
            let card = try await client.scorecard(teeId: tee.id, segment: segment, token: token)
            let required = segment == "ALL" ? 18 : 9
            guard card.status == "available", card.holes.count == required else {
                message = "This tee needs a complete verified scorecard before the iPhone can start a round."
                return
            }
            draft = LiveRoundState.start(course: course, tee: tee, card: card,
                                         segment: segment == "ALL" ? "FRONT_NINE" : segment)
            editSerial += 1
            saveLocal()
            message = ""
            await sync()
        } catch { message = error.localizedDescription }
    }

    func resume() async {
        guard draft == nil, let client, session != nil else { return }
        busy = true
        defer { busy = false }
        do {
            let token = try await token(for: client)
            draft = try await client.liveDraft(token: token)
            if draft != nil { saveLocal(); syncStatus = "Saved to account" }
        } catch { message = error.localizedDescription }
    }

    func setScore(_ score: Int?) {
        guard var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].strokesTaken = score.map(String.init) ?? ""
        current.holeEntries[current.currentHoleIndex].pickedUp = false
        draft = current
        editSerial += 1
        saveLocal()
    }

    func setHole(_ index: Int) {
        guard var current = draft, current.holeEntries.indices.contains(index) else { return }
        current.currentHoleIndex = index
        draft = current
        editSerial += 1
        saveLocal()
    }

    func sync() async {
        guard let current = draft, let client, session != nil else { return }
        let syncedSerial = editSerial
        syncStatus = "Syncing"
        do {
            let token = try await token(for: client)
            try await client.saveDraft(current, token: token)
            if editSerial == syncedSerial { syncStatus = "Saved to account" }
            else { syncStatus = "New edits saved on this iPhone" }
            message = ""
        } catch {
            syncStatus = "Saved on this iPhone · sync failed"
            message = error.localizedDescription
        }
    }

    func pinsForCurrentHole() -> GreenPins {
        guard let draft else { return GreenPins() }
        return pins[pinKey(course: draft.tee.courseId, hole: draft.currentHole.holeNumber)] ?? GreenPins()
    }

    func setPin(_ coordinate: Coordinate, kind: String) {
        guard let draft, coordinate.isValid else { return }
        let key = pinKey(course: draft.tee.courseId, hole: draft.currentHole.holeNumber)
        var value = pins[key] ?? GreenPins()
        switch kind {
        case "front": value.front = coordinate
        case "middle": value.middle = coordinate
        case "back": value.back = coordinate
        default: return
        }
        pins[key] = value
        if let pinsStorage, let data = try? JSONEncoder().encode(pins) {
            try? data.write(to: pinsStorage, options: [.atomic, .completeFileProtection])
        }
    }

    private func pinKey(course: String, hole: Int) -> String { "\(course):\(hole)" }

    private func saveLocal() {
        guard let draft, let storage else { return }
        do {
            let data = try JSONEncoder().encode(draft)
            try data.write(to: storage, options: [.atomic, .completeFileProtection])
            syncStatus = "Saved on this iPhone"
        } catch {
            syncStatus = "Local save failed"
            message = "This score could not be saved on the iPhone."
        }
    }

    private func loadLocal() {
        if let storage, let data = try? Data(contentsOf: storage) {
            let stored = try? JSONDecoder().decode(LiveRoundState.self, from: data)
            if let stored, stored.holeEntries.indices.contains(stored.currentHoleIndex),
               stored.holeEntries.count == stored.form.holeCount {
                draft = stored
            }
        }
        if let pinsStorage, let data = try? Data(contentsOf: pinsStorage) {
            pins = (try? JSONDecoder().decode([String: GreenPins].self, from: data)) ?? [:]
        }
    }
}
