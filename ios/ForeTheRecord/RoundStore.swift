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
    @Published var roundPaused = false
    @Published var courses: [CatalogueCourse] = []
    @Published var history: [HistoryRound] = []
    @Published var historyError = ""
    @Published var friends: FriendsResponse?
    @Published var pendingGroupCards: [PendingGroupCard] = []
    @Published var busy = false
    @Published var message = ""
    @Published var syncStatus = "Saved on this iPhone"
    @Published var submitting = false
    @Published var submissionPendingVerification = false
    @Published var lastSubmittedRoundId: String?
    @Published var hasConflict = false
    @Published var accountCopy: LiveRoundState?
    @Published var supabaseURL = configuration("supabaseURL", bundleKey: "SupabaseURL")
    @Published var publishableKey = configuration("publishableKey", bundleKey: "SupabasePublishableKey")
    @Published var apiURL = configuration("apiURL", bundleKey: "APIURL")
    @Published var pins: [String: GreenPins] = [:]
    private var editSerial = 0
    private var serverRevision = 0
    private var serverDraftId: String?
    private var syncTask: Task<Void, Never>?
    private var syncing = false
    private var pendingSync = false
    private var accountRevision = 0
    private var accountDraftId: String?
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
        roundPaused = draft != nil
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
        roundPaused = false
        serverRevision = 0
        serverDraftId = nil
        lastSubmittedRoundId = nil
        submitting = false
        submissionPendingVerification = false
        hasConflict = false
        accountCopy = nil
        accountDraftId = nil
        pins = [:]
        courses = []
        history = []
        historyError = ""
        friends = nil
        pendingGroupCards = []
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
            historyError = ""
        } catch {
            if sessionEpoch == epoch { historyError = error.localizedDescription }
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
            pendingGroupCards = try await client.pendingGroupCards(token: token)
            message = ""
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func answerGroupCard(_ id: String, approve: Bool) async {
        guard let client, session != nil else { return }
        busy = true
        defer { busy = false }
        do {
            let token = try await token(for: client)
            try await client.answerGroupCard(id: id, approve: approve, token: token)
            pendingGroupCards.removeAll { $0.id == id }
            message = approve ? "The approved card is now in your History." : "Group card declined."
            if approve { await loadHistory() }
        } catch { message = error.localizedDescription }
    }

    func start(course: CatalogueCourse, tee: CatalogueTee, segment: String,
               scoringFormat: String, playingHandicap: String,
               playedDate: Date, playedTime: Date) async {
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
                roundPaused = false
                serverRevision = existing.revision
                serverDraftId = existing.id
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
                                         scoringFormat: scoringFormat, playingHandicap: playingHandicap,
                                         playedDate: playedDate, playedTime: playedTime)
            roundPaused = false
            serverRevision = 0
            serverDraftId = nil
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
            roundPaused = draft != nil
            serverRevision = accountDraft?.revision ?? 0
            serverDraftId = accountDraft?.id
            if draft != nil { saveLocal(); syncStatus = "Saved to account" }
        } catch {
            if sessionEpoch == epoch { message = error.localizedDescription }
        }
    }

    func pauseRound() async {
        guard draft != nil, !submitting, !submissionPendingVerification else { return }
        saveLocal()
        roundPaused = true
        await sync()
    }

    func resumeRound() {
        guard draft != nil else { return }
        roundPaused = false
        message = ""
    }

    func deleteDraft() async {
        guard draft != nil, !submitting, !syncing,
              !hasConflict, let client, session != nil else {
            message = "Resolve syncing or submission before deleting this round."
            return
        }
        let epoch = sessionEpoch
        busy = true
        defer { if sessionEpoch == epoch { busy = false } }
        syncTask?.cancel()
        do {
            let token = try await token(for: client)
            if submissionPendingVerification {
                guard let serverDraftId else {
                    message = "Sync this round before deleting it."
                    return
                }
                if let roundId = try await client.submittedRoundId(draftId: serverDraftId, token: token) {
                    guard sessionEpoch == epoch else { return }
                    finishSubmission(roundId: roundId)
                    return
                }
                guard sessionEpoch == epoch else { return }
                submissionPendingVerification = false
                saveLocal()
            }
            try await client.deleteDraft(id: serverDraftId, expectedRevision: serverRevision, token: token)
            guard sessionEpoch == epoch else { return }
            if let storage { try? FileManager.default.removeItem(at: storage) }
            draft = nil
            roundPaused = false
            serverRevision = 0
            serverDraftId = nil
            accountCopy = nil
            accountDraftId = nil
            syncStatus = "Round deleted"
            message = ""
        } catch NetworkError.conflict {
            guard sessionEpoch == epoch else { return }
            message = "The account card changed. Tap Sync and resolve the conflict before deleting."
        } catch {
            guard sessionEpoch == epoch else { return }
            message = "Could not delete this round. It is still saved on this iPhone. \(error.localizedDescription)"
        }
    }

    func addFriendToRound(_ friend: FriendRecord) {
        guard var current = draft, current.groupPlayers?.count ?? 0 < 7,
              UUID(uuidString: friend.player.id) != nil,
              !(current.groupPlayers ?? []).contains(where: { $0.id == friend.player.id }) else { return }
        let holes = current.holeEntries.map { hole in
            var blank = hole
            blank.strokesTaken = ""
            blank.pickedUp = false
            blank.putts = ""
            blank.fairwayResult = ""
            blank.greenInRegulation = ""
            blank.penaltyStrokes = ""
            blank.bunkerVisits = ""
            blank.upAndDownResult = ""
            return blank
        }
        current.groupPlayers = (current.groupPlayers ?? []) + [GroupPlayer(id: friend.player.id, kind: "friend", name: friend.player.name, holeEntries: holes)]
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func addGuestToRound(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard var current = draft, (1...80).contains(trimmed.count), current.groupPlayers?.count ?? 0 < 7,
              !(current.groupPlayers ?? []).contains(where: { $0.name.localizedCaseInsensitiveCompare(trimmed) == .orderedSame }) else { return }
        let holes = current.holeEntries.map { hole in
            var blank = hole
            blank.strokesTaken = ""
            blank.pickedUp = false
            blank.putts = ""
            blank.fairwayResult = ""
            blank.greenInRegulation = ""
            blank.penaltyStrokes = ""
            blank.bunkerVisits = ""
            blank.upAndDownResult = ""
            return blank
        }
        current.groupPlayers = (current.groupPlayers ?? []) + [GroupPlayer(id: UUID().uuidString.lowercased(), kind: "guest", name: trimmed, holeEntries: holes)]
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func removeGroupPlayer(_ id: String) {
        guard var current = draft else { return }
        current.groupPlayers?.removeAll { $0.id == id }
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setGroupScore(playerId: String, score: Int?) {
        guard score.map({ (1...30).contains($0) }) ?? true else { return }
        updateGroupHole(playerId: playerId) {
            $0.strokesTaken = score.map(String.init) ?? ""
            $0.pickedUp = false
        }
    }

    func setGroupPickedUp(playerId: String, pickedUp: Bool) {
        updateGroupHole(playerId: playerId) {
            $0.pickedUp = pickedUp
            if pickedUp { $0.strokesTaken = "" }
        }
    }

    func setGroupPutts(playerId: String, value: Int?) {
        guard value.map({ (0...9).contains($0) }) ?? true else { return }
        updateGroupHole(playerId: playerId) { $0.putts = value.map(String.init) ?? "" }
    }

    func setGroupPenalties(playerId: String, value: Int?) {
        guard value.map({ (0...9).contains($0) }) ?? true else { return }
        updateGroupHole(playerId: playerId) { $0.penaltyStrokes = value.map(String.init) ?? "" }
    }

    func setGroupBunkers(playerId: String, value: Int?) {
        guard value.map({ (0...9).contains($0) }) ?? true else { return }
        updateGroupHole(playerId: playerId) { $0.bunkerVisits = value.map(String.init) ?? "" }
    }

    func setGroupFairway(playerId: String, value: String) {
        guard ["", "HIT", "MISSED_LEFT", "MISSED_RIGHT", "NOT_APPLICABLE"].contains(value) else { return }
        updateGroupHole(playerId: playerId) { $0.fairwayResult = value }
    }

    func setGroupGIR(playerId: String, value: String) {
        guard ["", "YES", "NO"].contains(value) else { return }
        updateGroupHole(playerId: playerId) { $0.greenInRegulation = value }
    }

    private func updateGroupHole(playerId: String, _ change: (inout RoundHole) -> Void) {
        guard !submitting, !submissionPendingVerification, var current = draft,
              let index = current.groupPlayers?.firstIndex(where: { $0.id == playerId }) else { return }
        change(&current.groupPlayers![index].holeEntries[current.currentHoleIndex])
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setScore(_ score: Int?) {
        guard !submitting, !submissionPendingVerification, var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].strokesTaken = score.map(String.init) ?? ""
        current.holeEntries[current.currentHoleIndex].pickedUp = false
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setPickedUp(_ pickedUp: Bool) {
        guard !submitting, !submissionPendingVerification, var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].pickedUp = pickedUp
        if pickedUp { current.holeEntries[current.currentHoleIndex].strokesTaken = "" }
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setPutts(_ value: Int?) {
        guard !submitting, !submissionPendingVerification, var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].putts = value.map(String.init) ?? ""
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setPenaltyStrokes(_ value: Int?) {
        guard !submitting, !submissionPendingVerification, var current = draft else { return }
        current.holeEntries[current.currentHoleIndex].penaltyStrokes = value.map(String.init) ?? ""
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setFairwayResult(_ result: String) {
        guard ["", "HIT", "MISSED_LEFT", "MISSED_RIGHT", "NOT_APPLICABLE"].contains(result) else { return }
        updateCurrentHole { $0.fairwayResult = result }
    }

    func setGreenInRegulation(_ result: String) {
        guard ["", "YES", "NO"].contains(result) else { return }
        updateCurrentHole { $0.greenInRegulation = result }
    }

    func setBunkerVisits(_ count: Int?) {
        guard count.map({ (0...9).contains($0) }) ?? true else { return }
        updateCurrentHole { $0.bunkerVisits = count.map(String.init) ?? "" }
    }

    func setUpAndDownResult(_ result: String) {
        guard ["", "NOT_ATTEMPTED", "SUCCESSFUL", "UNSUCCESSFUL"].contains(result) else { return }
        updateCurrentHole { $0.upAndDownResult = result }
    }

    func setRoundNotes(_ notes: String) {
        guard notes.count <= 2000, !submitting, !submissionPendingVerification, var current = draft else { return }
        current.form.notes = notes
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    private func updateCurrentHole(_ change: (inout RoundHole) -> Void) {
        guard !submitting, !submissionPendingVerification, var current = draft else { return }
        change(&current.holeEntries[current.currentHoleIndex])
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func setHole(_ index: Int) {
        guard !submitting, !submissionPendingVerification, var current = draft,
              current.holeEntries.indices.contains(index) else { return }
        current.currentHoleIndex = index
        draft = current
        editSerial += 1
        saveLocal()
        scheduleSync()
    }

    func sync() async {
        guard !hasConflict, !submitting, !submissionPendingVerification, let client, session != nil else { return }
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
                serverDraftId = saved.id
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
                    accountDraftId = latest?.id
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
        serverDraftId = accountDraftId
        hasConflict = false
        self.accountCopy = nil
        accountDraftId = nil
        editSerial += 1
        saveLocal()
        syncStatus = "Saved to account"
        message = ""
    }

    func keepIPhoneCopy() async {
        guard hasConflict else { return }
        serverRevision = accountRevision
        serverDraftId = accountDraftId
        hasConflict = false
        accountCopy = nil
        accountDraftId = nil
        saveLocal()
        await sync()
    }

    func submitRound() async {
        guard !submitting, !hasConflict, !syncing, let client, session != nil,
              let current = draft else {
            message = "Wait for syncing to finish, then review your card before submitting."
            return
        }
        guard current.canSubmitRecordOnly else {
            message = "Score or pick up at least one hole before submitting."
            return
        }
        guard let draftId = serverDraftId else {
            message = "Sync the card before submitting."
            return
        }
        let submission = current.canSubmitNatively
            ? current.submission(draftId: draftId, revision: serverRevision)
            : nil
        let epoch = sessionEpoch
        submitting = true
        submissionPendingVerification = true
        syncTask?.cancel()
        saveLocal()
        syncStatus = "Submitting"
        defer { if sessionEpoch == epoch { submitting = false } }
        do {
            let token = try await token(for: client)
            if let existingId = try await client.submittedRoundId(draftId: draftId, token: token) {
                guard sessionEpoch == epoch else { return }
                finishSubmission(roundId: existingId)
                return
            }
            let roundId: String
            if let submission {
                roundId = try await client.submitRound(submission, token: token)
            } else {
                roundId = try await client.submitRecordOnly(draftId: draftId,
                                                            expectedRevision: serverRevision, token: token)
            }
            guard sessionEpoch == epoch else { return }
            finishSubmission(roundId: roundId)
        } catch {
            guard sessionEpoch == epoch else { return }
            var statusChecked = false
            do {
                let token = try await token(for: client)
                let roundId = try await client.submittedRoundId(draftId: draftId, token: token)
                statusChecked = true
                if let roundId {
                    guard sessionEpoch == epoch else { return }
                    finishSubmission(roundId: roundId)
                    return
                }
            } catch { /* Keep the local card when submission status cannot be confirmed. */ }
            if case NetworkError.http(400, let detail) = error {
                submissionPendingVerification = false
                saveLocal()
                syncStatus = "Saved on this iPhone · review needed"
                message = detail
            } else if case NetworkError.conflict = error, statusChecked {
                submissionPendingVerification = false
                saveLocal()
                syncStatus = "Saved on this iPhone · sync conflict"
                message = "The account card changed. Close review, tap Sync, and choose which card to keep."
            } else if case NetworkError.http(_, let detail) = error, statusChecked {
                submissionPendingVerification = false
                saveLocal()
                syncStatus = "Saved on this iPhone · submission failed"
                message = "Submission failed on the server. You can retry or delete this round. \(detail)"
            } else {
                syncStatus = "Saved on this iPhone · submission unconfirmed"
                submissionPendingVerification = true
                message = "The round is still on this iPhone. Reconnect and try Submit again; it will check for a saved round first."
            }
        }
    }

    private func finishSubmission(roundId: String) {
        if let storage { try? FileManager.default.removeItem(at: storage) }
        draft = nil
        roundPaused = false
        serverDraftId = nil
        serverRevision = 0
        submissionPendingVerification = false
        lastSubmittedRoundId = roundId
        syncStatus = "Round saved to your account"
        message = "Round saved to History."
        Task { await loadHistory() }
    }

    func dismissSubmission() {
        lastSubmittedRoundId = nil
        message = ""
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
            let data = try JSONEncoder().encode(StoredRound(state: draft, revision: serverRevision,
                                                            draftId: serverDraftId,
                                                            submissionPendingVerification: submissionPendingVerification))
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
        serverDraftId = nil
        submissionPendingVerification = false
        if let storage, let data = try? Data(contentsOf: storage) {
            let envelope = try? JSONDecoder().decode(StoredRound.self, from: data)
            let legacy = envelope == nil ? try? JSONDecoder().decode(LiveRoundState.self, from: data) : nil
            if let stored = envelope?.state ?? legacy,
               stored.holeEntries.indices.contains(stored.currentHoleIndex),
               stored.holeEntries.count == stored.form.holeCount {
                draft = stored
                serverRevision = envelope?.revision ?? 0
                serverDraftId = envelope?.draftId
                submissionPendingVerification = envelope?.submissionPendingVerification ?? false
            }
        }
        if let pinsStorage, let data = try? Data(contentsOf: pinsStorage) {
            pins = (try? JSONDecoder().decode([String: GreenPins].self, from: data)) ?? [:]
        }
    }
}
