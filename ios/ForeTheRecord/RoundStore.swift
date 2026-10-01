import Foundation

@MainActor
final class RoundStore: ObservableObject {
    private static func configuration(_ userKey: String, bundleKey: String) -> String {
        let bundled = Bundle.main.object(forInfoDictionaryKey: bundleKey) as? String ?? ""
        #if DEBUG
        return UserDefaults.standard.string(forKey: userKey) ?? bundled
        #else
        return bundled
        #endif
    }

    @Published var session: Session? = Keychain.load()
    @Published var draft: LiveRoundState?
    @Published var courses: [CatalogueCourse] = []
    @Published var history: [HistoryRound] = []
    @Published var friends: FriendsResponse?
    @Published var busy = false
    @Published var message = ""
    @Published var syncStatus = "Saved on this iPhone"
    @Published var hasConflict = false
    @Published var accountCopy: LiveRoundState?
    @Published var supabaseURL = configuration("supabaseURL", bundleKey: "SupabaseURL")
    @Published var publishableKey = configuration("publishableKey", bundleKey: "SupabasePublishableKey")
    @Published var apiURL = configuration("apiURL", bundleKey: "APIURL")
    @Published var pins: [String: GreenPins] = [:]
    private var editSerial = 0
    private var serverRevision = 0
    private var syncTask: Task<Void, Never>?
    private var syncing = false
    private var pendingSync = false
    private var accountRevision = 0
    private var sessionEpoch = 0

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
        let epoch = sessionEpoch
        let renewed = try await client.refresh(session)
        guard sessionEpoch == epoch, self.session?.userId == session.userId else {
            throw NetworkError.server("The account changed. Sign in again to continue.")
        }
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
        #if DEBUG
        UserDefaults.standard.set(supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "supabaseURL")
        UserDefaults.standard.set(publishableKey.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "publishableKey")
        UserDefaults.standard.set(apiURL.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "apiURL")
        #endif
    }

    func signIn(email: String, password: String) async {
        guard let client else { message = NetworkError.notConfigured.localizedDescription; return }
        busy = true
        defer { busy = false }
        let epoch = sessionEpoch
        do {
            let result = try await client.signIn(email: email, password: password)
            guard sessionEpoch == epoch else { return }
            try Keychain.save(result)
            sessionEpoch += 1
            session = result
            message = ""
            loadLocal()
            await resume()
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func signOut() {
        sessionEpoch += 1
        syncTask?.cancel()
        Keychain.clear()
        session = nil
        draft = nil
        serverRevision = 0
        hasConflict = false
        accountCopy = nil
        pins = [:]
        courses = []
        history = []
        friends = nil
        message = ""
        syncStatus = "Saved on this iPhone"
        syncing = false
        pendingSync = false
    }

    func search(_ term: String) async {
        guard let client, session != nil else { return }
        let epoch = sessionEpoch
        let query = term.trimmingCharacters(in: .whitespacesAndNewlines)
        guard query.count >= 2 else { message = "Enter at least two letters of the club name."; return }
        busy = true
        defer { busy = false }
        do {
            let token = try await token(for: client)
            let found = try await client.searchCourses(query, token: token)
            guard sessionEpoch == epoch else { return }
            courses = found
            message = courses.isEmpty ? "No courses found. Try the club name." : ""
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func loadHistory() async {
        guard let client, session != nil else { return }
        let epoch = sessionEpoch
        do {
            let token = try await token(for: client)
            let loaded = try await client.history(token: token)
            guard sessionEpoch == epoch else { return }
            history = loaded
            message = ""
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func loadFriends() async {
        guard let client, session != nil else { return }
        let epoch = sessionEpoch
        do {
            let token = try await token(for: client)
            let loaded = try await client.friends(token: token)
            guard sessionEpoch == epoch else { return }
            friends = loaded
            message = ""
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func start(course: CatalogueCourse, tee: CatalogueTee, segment: String,
               scoringFormat: String, playingHandicap: String) async {
        guard let client, session != nil else { return }
        let epoch = sessionEpoch
        guard draft == nil else { message = "Finish or resume your current round first."; return }
        if scoringFormat == "STABLEFORD" &&
            (Int(playingHandicap).map { !(-20...54).contains($0) } ?? true) {
            message = "Enter a Playing Handicap from -20 to 54 for Stableford."
            return
        }
        busy = true
        defer { busy = false }
        do {
            let token = try await token(for: client)
            let existing = try await client.liveDraft(token: token)
            guard sessionEpoch == epoch else { return }
            if let existing {
                draft = existing.state
                serverRevision = existing.revision
                saveLocal()
                message = "Resumed the live round already saved to your account."
                return
            }
            let card = try await client.scorecard(teeId: tee.id, segment: segment, token: token)
            guard sessionEpoch == epoch else { return }
            let required = segment == "ALL" ? 18 : 9
            guard card.status == "available", card.holes.count == required else {
                message = "This tee needs a complete verified scorecard before the iPhone can start a round."
                return
            }
            draft = LiveRoundState.start(course: course, tee: tee, card: card,
                                         segment: segment == "ALL" ? "FRONT_NINE" : segment,
                                         scoringFormat: scoringFormat, playingHandicap: playingHandicap)
            serverRevision = 0
            editSerial += 1
            saveLocal()
            message = ""
            await sync()
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func resume() async {
        guard draft == nil, let client, session != nil else { return }
        let epoch = sessionEpoch
        busy = true
        defer { busy = false }
        do {
            let token = try await token(for: client)
            let accountDraft = try await client.liveDraft(token: token)
            guard sessionEpoch == epoch else { return }
            draft = accountDraft?.state
            serverRevision = accountDraft?.revision ?? 0
            if draft != nil { saveLocal(); syncStatus = "Saved to account" }
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func setScore(_ score: Int?) {
        guard var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].strokesTaken = score.map(String.init) ?? ""
        current.holeEntries[current.currentHoleIndex].pickedUp = false
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setPickedUp(_ pickedUp: Bool) {
        guard var current = draft, current.form.scoringFormat == "STABLEFORD" else { return }
        current.holeEntries[current.currentHoleIndex].pickedUp = pickedUp
        if pickedUp { current.holeEntries[current.currentHoleIndex].strokesTaken = "" }
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setPutts(_ value: Int?) {
        guard var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].putts = value.map(String.init) ?? ""
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setPenaltyStrokes(_ value: Int?) {
        guard var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].penaltyStrokes = value.map(String.init) ?? ""
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setHole(_ index: Int) {
        guard var current = draft, current.holeEntries.indices.contains(index) else { return }
        current.currentHoleIndex = index
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func sync() async {
        guard !hasConflict, let client, session != nil else { return }
        if syncing { pendingSync = true; return }
        let epoch = sessionEpoch
        syncing = true
        defer { if sessionEpoch == epoch { syncing = false } }
        repeat {
            guard sessionEpoch == epoch else { return }
            pendingSync = false
            guard let current = draft else { return }
            let sentSerial = editSerial
            let sentRevision = serverRevision
            syncStatus = "Syncing"
            do {
                let token = try await token(for: client)
                let saved = try await client.saveDraft(current, expectedRevision: sentRevision, token: token)
                guard sessionEpoch == epoch else { return }
                serverRevision = saved.revision
                saveLocal()
                if editSerial == sentSerial {
                    syncStatus = "Saved to account"
                    message = ""
                } else {
                    syncStatus = "New edits saved on this iPhone"
                    pendingSync = true
                }
            } catch NetworkError.conflict {
                do {
                    let token = try await token(for: client)
                    let latest = try await client.liveDraft(token: token)
                    guard sessionEpoch == epoch else { return }
                    accountCopy = latest?.state
                    accountRevision = latest?.revision ?? 0
                    hasConflict = true
                    syncStatus = "Sync conflict · scores kept on this iPhone"
                    message = latest == nil
                        ? "The account draft was removed. Your iPhone card is still safe here."
                        : "The account card changed elsewhere. Choose which card to keep."
                } catch {
                    guard sessionEpoch == epoch else { return }
                    syncStatus = "Saved on this iPhone · sync failed"
                    message = error.localizedDescription
                }
                return
            } catch {
                guard sessionEpoch == epoch else { return }
                syncStatus = "Saved on this iPhone · sync failed"
                message = error.localizedDescription
                return
            }
        } while pendingSync
    }

    func useAccountCopy() {
        guard hasConflict, let accountCopy else { return }
        syncTask?.cancel()
        draft = accountCopy
        serverRevision = accountRevision
        hasConflict = false
        self.accountCopy = nil
        editSerial += 1
        saveLocal()
        syncStatus = "Saved to account"
        message = ""
    }

    func keepIPhoneCopy() async {
        guard hasConflict else { return }
        serverRevision = accountRevision
        hasConflict = false
        accountCopy = nil
        saveLocal()
        await sync()
    }

    private func scheduleSync() {
        guard !hasConflict else { return }
        syncTask?.cancel()
        syncTask = Task {
            try? await Task.sleep(for: .milliseconds(800))
            if !Task.isCancelled { await sync() }
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
            let data = try JSONEncoder().encode(StoredRound(state: draft, revision: serverRevision))
            try data.write(to: storage, options: [.atomic, .completeFileProtection])
            syncStatus = "Saved on this iPhone"
        } catch {
            syncStatus = "Local save failed"
            message = "This score could not be saved on the iPhone."
        }
    }

    private func loadLocal() {
        draft = nil
        pins = [:]
        serverRevision = 0
        if let storage, let data = try? Data(contentsOf: storage) {
            let envelope = try? JSONDecoder().decode(StoredRound.self, from: data)
            let legacy = envelope == nil ? try? JSONDecoder().decode(LiveRoundState.self, from: data) : nil
            if let stored = envelope?.state ?? legacy,
               stored.holeEntries.indices.contains(stored.currentHoleIndex),
               stored.holeEntries.count == stored.form.holeCount {
                draft = stored
                serverRevision = envelope?.revision ?? 0
            }
        }
        if let pinsStorage, let data = try? Data(contentsOf: pinsStorage) {
            pins = (try? JSONDecoder().decode([String: GreenPins].self, from: data)) ?? [:]
        }
    }
}
