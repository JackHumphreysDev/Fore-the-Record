import SwiftUI
import UIKit

enum Palette {
    static let forest = Color(red: 0.07, green: 0.19, blue: 0.14)
    static let lime = Color(red: 0.84, green: 1.0, blue: 0.31)
    static let paper = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.07, green: 0.10, blue: 0.09, alpha: 1)
            : UIColor(red: 0.97, green: 0.96, blue: 0.92, alpha: 1)
    })
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    static let accent = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.84, green: 1.0, blue: 0.31, alpha: 1)
            : UIColor(red: 0.12, green: 0.30, blue: 0.22, alpha: 1)
    })
}

struct RootView: View {
    @EnvironmentObject private var store: RoundStore
    @State private var selectedTab = 0

    var body: some View {
        if store.session == nil {
            SignInView()
        } else {
            TabView(selection: $selectedTab) {
                HomeView(selectedTab: $selectedTab)
                    .tabItem { Label("Home", systemImage: "house") }
                    .tag(0)
                HistoryView()
                    .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }
                    .tag(1)
                NavigationStack {
                    if store.lastSubmittedRoundId != nil { RoundSavedView() }
                    else if store.draft == nil { StartRoundView() }
                    else if store.roundPaused { PausedRoundView() }
                    else { PlayingView() }
                }
                .tabItem { Label("Play", systemImage: "figure.golf") }
                .tag(2)
                FriendsView()
                    .tabItem { Label("Friends", systemImage: "person.2") }
                    .tag(3)
                AccountView()
                    .tabItem { Label("Account", systemImage: "person.crop.circle") }
                    .tag(4)
            }
            .task { await store.resume() }
        }
    }
}

struct SignInView: View {
    @EnvironmentObject private var store: RoundStore
    @State private var email = ""
    @State private var password = ""
    @State private var showConnection = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Image(systemName: "figure.golf")
                        .font(.system(size: 54))
                        .foregroundStyle(Palette.lime)
                    Text("Fore the Record")
                        .font(.system(size: 40, weight: .regular, design: .serif))
                        .foregroundStyle(.white)
                    Text("Your round, one hole at a time.")
                        .foregroundStyle(.white.opacity(0.8))
                    VStack(spacing: 14) {
                        TextField("Email", text: $email)
                            .textContentType(.username)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        SecureField("Password", text: $password)
                            .textContentType(.password)
                    }
                    .textFieldStyle(.roundedBorder)
                    Button {
                        Task { await store.signIn(email: email, password: password) }
                    } label: {
                        Text(store.busy ? "Signing in…" : "Sign in")
                            .frame(maxWidth: .infinity, minHeight: 52)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Palette.lime)
                    .foregroundStyle(Palette.forest)
                    .disabled(store.busy || email.isEmpty || password.isEmpty)
                    if !store.message.isEmpty {
                        Text(store.message).foregroundStyle(.orange).accessibilityAddTraits(.updatesFrequently)
                    }
                    #if DEBUG
                    Button("Connection settings") { showConnection = true }
                        .foregroundStyle(Palette.lime)
                    #endif
                }
                .padding(28)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Palette.forest)
            #if DEBUG
            .sheet(isPresented: $showConnection) { ConnectionView() }
            #endif
        }
    }
}

struct ConnectionView: View {
    @EnvironmentObject private var store: RoundStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Supabase") {
                    TextField("Project URL", text: $store.supabaseURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    TextField("Publishable key", text: $store.publishableKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Text("Use the same public project URL and publishable key as the website.")
                        .font(.footnote)
                }
                Section("Website API") {
                    TextField("API URL", text: $store.apiURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }
            }
            .navigationTitle("Connection")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { store.saveConfiguration(); dismiss() }
                }
            }
        }
    }
}

struct HomeView: View {
    @EnvironmentObject private var store: RoundStore
    @Binding var selectedTab: Int

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("CLUBHOUSE")
                        .font(.caption.weight(.bold))
                        .tracking(3)
                        .foregroundStyle(Palette.lime)
                    Text("Your golf, at a glance.")
                        .font(.system(size: 36, design: .serif))
                        .foregroundStyle(.white)
                    if let draft = store.draft {
                        VStack(alignment: .leading, spacing: 14) {
                            Label("ROUND IN PROGRESS", systemImage: "figure.golf")
                                .font(.caption.weight(.bold))
                                .tracking(1)
                            Text(draft.tee.courseName)
                                .font(.title2.weight(.semibold))
                            Text("\(draft.tee.clubName) · \(draft.tee.teeName) tees")
                                .font(.subheadline)
                            HStack {
                                homeMetric("THROUGH", "\(draft.completed)")
                                homeMetric("TO PAR", draft.scoreToPar > 0 ? "+\(draft.scoreToPar)" : "\(draft.scoreToPar)")
                                homeMetric("GROSS", "\(draft.gross)")
                            }
                            Button {
                                store.resumeRound()
                                selectedTab = 2
                            } label: {
                                Label("Resume on hole \(draft.currentHole.holeNumber)", systemImage: "arrow.right")
                                    .frame(maxWidth: .infinity, minHeight: 48)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Palette.forest)
                            .foregroundStyle(.white)
                            Text(store.syncStatus).font(.footnote)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(20)
                        .background(Palette.lime, in: RoundedRectangle(cornerRadius: 20))
                        .foregroundStyle(Palette.forest)
                    } else {
                        Button {
                            selectedTab = 2
                        } label: {
                            Label("Start a round", systemImage: "plus.circle.fill")
                                .frame(maxWidth: .infinity, minHeight: 52)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Palette.lime)
                        .foregroundStyle(Palette.forest)
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("YOUR RECORD").font(.caption.weight(.bold)).tracking(2)
                        Text("\(store.history.count) rounds in History")
                            .font(.title3.weight(.semibold))
                        Text("Review completed cards and performance insights from your rounds.")
                            .font(.footnote)
                            .foregroundStyle(.white.opacity(0.75))
                        Button("View History") { selectedTab = 1 }
                            .foregroundStyle(Palette.lime)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                    .foregroundStyle(.white)
                    .background(.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 20))
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Palette.forest)
            .task { await store.loadHistory() }
        }
    }

    private func homeMetric(_ label: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(label).font(.caption2.weight(.bold))
            Text(value).font(.title2.weight(.bold)).monospacedDigit()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.white.opacity(0.45), in: RoundedRectangle(cornerRadius: 12))
    }
}

struct PausedRoundView: View {
    @EnvironmentObject private var store: RoundStore
    @State private var showDelete = false

    var body: some View {
        List {
            if let draft = store.draft {
                Section("Saved live round") {
                    Text(draft.tee.courseName).font(.headline)
                    Text("\(draft.tee.clubName) · \(draft.tee.teeName) tees")
                    Text("\(draft.completed) of \(draft.holeEntries.count) holes scored")
                    Text(store.syncStatus).font(.footnote).foregroundStyle(.secondary)
                }
                Section {
                    Button("Resume round") { store.resumeRound() }
                    Button("Delete unfinished round", role: .destructive) { showDelete = true }
                }
                if !store.message.isEmpty { Text(store.message).foregroundStyle(.orange) }
            }
        }
        .navigationTitle("Live round")
        .confirmationDialog("Delete this unfinished round?", isPresented: $showDelete) {
            Button("Delete round", role: .destructive) { Task { await store.deleteDraft() } }
        } message: {
            Text("This removes the live scorecard from your iPhone and account. It cannot be undone.")
        }
    }
}

struct StartRoundView: View {
    @EnvironmentObject private var store: RoundStore
    @State private var search = ""
    @State private var segment = "ALL"
    @State private var scoringFormat = "STROKE_PLAY"
    @State private var playingHandicap = ""

    var body: some View {
        List {
            Section {
                Text("Take the card onto the course.")
                    .font(.system(size: 30, design: .serif))
                Text("Choose a club, tee and holes. Only tees with a complete scorecard can start a native round.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Section("Find a club") {
                HStack {
                    TextField("Club name", text: $search)
                        .submitLabel(.search)
                        .onSubmit { Task { await store.search(search) } }
                    Button("Search") { Task { await store.search(search) } }
                }
                Picker("Holes", selection: $segment) {
                    Text("18").tag("ALL")
                    Text("Front 9").tag("FRONT_NINE")
                    Text("Back 9").tag("BACK_NINE")
                }
                .pickerStyle(.segmented)
                Picker("Scoring", selection: $scoringFormat) {
                    Text("Stroke play").tag("STROKE_PLAY")
                    Text("Stableford").tag("STABLEFORD")
                }
                if scoringFormat == "STABLEFORD" {
                    TextField("Playing Handicap", text: $playingHandicap)
                        .keyboardType(.numbersAndPunctuation)
                }
            }
            if !store.message.isEmpty { Text(store.message).foregroundStyle(.orange) }
            ForEach(store.courses) { course in
                Section("\(course.club.name) · \(course.name)") {
                    ForEach(course.tees) { tee in
                        Button {
                            Task {
                                await store.start(course: course, tee: tee, segment: segment,
                                                  scoringFormat: scoringFormat, playingHandicap: playingHandicap)
                            }
                        } label: {
                            HStack {
                                Text(tee.teeName)
                                Spacer()
                                Text(tee.totalYardage.map { "\($0) yd" } ?? "")
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .disabled(store.busy)
                    }
                }
            }
        }
        .navigationTitle("Start round")
        .overlay { if store.busy { ProgressView().controlSize(.large) } }
    }
}

struct PlayingView: View {
    @EnvironmentObject private var store: RoundStore
    @State private var showReview = false
    @State private var showDelete = false
    @State private var showGroup = false
    @State private var page = "Score"

    var body: some View {
        if let draft = store.draft {
            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(draft.tee.clubName) · \(draft.tee.teeName)")
                        .font(.caption)
                        .foregroundStyle(Palette.lime)
                    HStack(alignment: .firstTextBaseline) {
                        Text("Hole \(draft.currentHole.holeNumber)")
                            .font(.system(size: 34, design: .serif))
                        Spacer()
                        Text("\(draft.completed)/\(draft.holeEntries.count) scored")
                    }
                    Text("Par \(draft.currentHole.par)  ·  SI \(draft.currentHole.strokeIndex)  ·  \(draft.currentHole.yardage) yd")
                        .font(.subheadline)
                    Picker("View", selection: $page) {
                        Text("Score").tag("Score")
                        Text("GPS").tag("GPS")
                    }
                    .pickerStyle(.segmented)
                    .colorScheme(.dark)
                }
                .padding()
                .foregroundStyle(.white)
                .background(Palette.forest)
                if page == "Score" { scoreView(draft) }
                else { GPSView() }
                HStack(spacing: 12) {
                    Button("Previous") { store.setHole(draft.currentHoleIndex - 1) }
                        .disabled(draft.currentHoleIndex == 0)
                    Spacer()
                    Button("Sync") { Task { await store.sync() } }
                    Spacer()
                    Button("Next") { store.setHole(draft.currentHoleIndex + 1) }
                        .disabled(draft.currentHoleIndex == draft.holeEntries.count - 1)
                }
                .buttonStyle(.bordered)
                .disabled(store.submitting || store.submissionPendingVerification)
                .padding()
                Text(store.syncStatus)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 6)
            }
            .navigationTitle(draft.tee.courseName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu("Round", systemImage: "ellipsis.circle") {
                        Button("Save & Exit", systemImage: "square.and.arrow.down") {
                            Task { await store.pauseRound() }
                        }
                        Button("Group scorecard", systemImage: "person.2") { showGroup = true }
                        Button("Review or finish", systemImage: "checkmark.circle") {
                            page = "Score"
                            showReview = true
                        }
                        Button("Delete live round", systemImage: "trash", role: .destructive) { showDelete = true }
                    }
                }
            }
            .sheet(isPresented: $showGroup) { GroupScorecardView() }
            .confirmationDialog("Delete this unfinished round?", isPresented: $showDelete) {
                Button("Delete round", role: .destructive) { Task { await store.deleteDraft() } }
            } message: {
                Text("This removes the live scorecard from your iPhone and account. It cannot be undone.")
            }
        }
    }

    private func scoreView(_ draft: LiveRoundState) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                if store.submissionPendingVerification {
                    Text("Submission status is unconfirmed. Your card is saved on this iPhone. Open Review to check or retry before changing scores.")
                        .font(.subheadline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: 18))
                }
                if store.hasConflict {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Choose which card to keep")
                            .font(.headline)
                        Text(store.message)
                            .font(.subheadline)
                        if store.accountCopy != nil {
                            Button("Use account card") { store.useAccountCopy() }
                            Button("Keep this iPhone card") {
                                Task { await store.keepIPhoneCopy() }
                            }
                        } else {
                            Button("Save this iPhone card as a new account draft") {
                                Task { await store.keepIPhoneCopy() }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: 18))
                }
                Button {
                    showGroup = true
                } label: {
                    Label("Group scorecard · \((draft.groupPlayers ?? []).count) added", systemImage: "person.2.fill")
                        .frame(maxWidth: .infinity, minHeight: 48)
                }
                .buttonStyle(.bordered)

                VStack(spacing: 8) {
                    Text("STROKES").font(.caption.weight(.bold)).tracking(2)
                    HStack(spacing: 28) {
                        Button {
                            store.setScore(max(1, (draft.currentHole.score ?? 1) - 1))
                        } label: { Image(systemName: "minus.circle.fill").font(.system(size: 48)) }
                        Text(draft.currentHole.score.map(String.init) ?? "—")
                            .font(.system(size: 76, weight: .light, design: .rounded))
                            .monospacedDigit()
                            .frame(minWidth: 100)
                        Button {
                            store.setScore(min(30, (draft.currentHole.score ?? 0) + 1))
                        } label: { Image(systemName: "plus.circle.fill").font(.system(size: 48)) }
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Palette.accent)
                    TextField("Enter strokes", text: Binding(
                        get: { store.draft?.currentHole.strokesTaken ?? "" },
                        set: { value in
                            if value.isEmpty { store.setScore(nil) }
                            else if let score = Int(value), (1...30).contains(score) { store.setScore(score) }
                        }
                    ))
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.center)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 155)
                    .accessibilityLabel("Strokes for hole \(draft.currentHole.holeNumber)")
                    Button("Clear this hole") { store.setScore(nil) }
                        .font(.footnote)
                        .disabled(draft.currentHole.score == nil)
                }
                .frame(maxWidth: .infinity)
                .padding(25)
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 20))
                .disabled(store.submitting || store.submissionPendingVerification)

                HStack {
                    summary("Gross", "\(draft.gross)")
                    summary("To par", draft.scoreToPar > 0 ? "+\(draft.scoreToPar)" : "\(draft.scoreToPar)")
                    if let points = draft.stablefordPoints { summary("Points", "\(points)") }
                }
                .frame(maxWidth: .infinity)

                Toggle("Picked up", isOn: Binding(
                    get: { store.draft?.currentHole.pickedUp ?? false },
                    set: { store.setPickedUp($0) }
                ))
                .padding()
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 18))
                .disabled(store.submitting || store.submissionPendingVerification)

                DisclosureGroup("Performance details") {
                    if draft.currentHole.par != "3" {
                        Picker("Fairway", selection: Binding(
                            get: { store.draft?.currentHole.fairwayResult ?? "" },
                            set: { store.setFairwayResult($0) }
                        )) {
                            Text("Not recorded").tag("")
                            Text("Hit").tag("HIT")
                            Text("Missed left").tag("MISSED_LEFT")
                            Text("Missed right").tag("MISSED_RIGHT")
                        }
                    }
                    Picker("Green in regulation", selection: Binding(
                        get: { store.draft?.currentHole.greenInRegulation ?? "" },
                        set: { store.setGreenInRegulation($0) }
                    )) {
                        Text("Not recorded").tag("")
                        Text("Yes").tag("YES")
                        Text("No").tag("NO")
                    }
                    HStack {
                        Text("Bunker visits")
                        Spacer()
                        TextField("—", text: Binding(
                            get: { store.draft?.currentHole.bunkerVisits ?? "" },
                            set: { value in
                                if value.isEmpty { store.setBunkerVisits(nil) }
                                else if let number = Int(value), (0...9).contains(number) { store.setBunkerVisits(number) }
                            }
                        ))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 75)
                    }
                    Picker("Up and down", selection: Binding(
                        get: { store.draft?.currentHole.upAndDownResult ?? "" },
                        set: { store.setUpAndDownResult($0) }
                    )) {
                        Text("Not recorded").tag("")
                        Text("Not attempted").tag("NOT_ATTEMPTED")
                        Text("Successful").tag("SUCCESSFUL")
                        Text("Unsuccessful").tag("UNSUCCESSFUL")
                    }

                    HStack {
                        Text("Putts")
                        Spacer()
                        TextField("—", text: Binding(
                            get: { store.draft?.currentHole.putts ?? "" },
                            set: { value in
                                if value.isEmpty { store.setPutts(nil) }
                                else if let number = Int(value), (0...9).contains(number) { store.setPutts(number) }
                            }
                        ))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 75)
                    }
                    HStack {
                        Text("Penalty strokes")
                        Spacer()
                        TextField("—", text: Binding(
                            get: { store.draft?.currentHole.penaltyStrokes ?? "" },
                            set: { value in
                                if value.isEmpty { store.setPenaltyStrokes(nil) }
                                else if let number = Int(value), (0...9).contains(number) { store.setPenaltyStrokes(number) }
                            }
                        ))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 75)
                    }
                }
                .padding()
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 18))
                .disabled(store.submitting || store.submissionPendingVerification)

                DisclosureGroup("Full scorecard") {
                    ForEach(Array(draft.holeEntries.enumerated()), id: \.element.id) { index, hole in
                        Button {
                            store.setHole(index)
                        } label: {
                            HStack {
                                Text("\(hole.holeNumber)").frame(width: 30)
                                Text("Par \(hole.par)").foregroundStyle(.secondary)
                                Spacer()
                                Text(hole.score.map(String.init) ?? "—").fontWeight(.bold)
                            }
                        }
                        .padding(.vertical, 5)
                    }
                }
                .padding()
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 18))
                .disabled(store.submitting || store.submissionPendingVerification)

                if draft.canSubmitRecordOnly {
                    Button(store.submissionPendingVerification ? "Check submission" : "Review and finish round") {
                        showReview = true
                    }
                    .buttonStyle(.borderedProminent)
                    if !draft.canSubmitNatively {
                        Text("An unfinished or picked-up card is saved as a record-only round. It appears in History and per-hole insights, without changing your Handicap Index.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                if !store.message.isEmpty {
                    Text(store.message).font(.footnote).foregroundStyle(.orange)
                }
            }
            .padding()
        }
        .background(Palette.paper)
        .sheet(isPresented: $showReview) {
            NavigationStack {
                List {
                    Section("Round") {
                        Text("\(draft.tee.clubName) · \(draft.tee.courseName)")
                        Text("\(draft.tee.teeName) · \(draft.holeEntries.count) holes")
                        Text("\(draft.completed) of \(draft.holeEntries.count) holes recorded")
                        Text(draft.canSubmitNatively ? "Complete scorecard" : "Record only · excluded from Handicap Index")
                    }
                    Section("Round notes") {
                        TextField("Notes for this round", text: Binding(
                            get: { store.draft?.form.notes ?? "" },
                            set: { store.setRoundNotes($0) }
                        ), axis: .vertical)
                        .lineLimit(2...5)
                    }
                    Section("Scorecard") {
                        ForEach(draft.holeEntries) { hole in
                            HStack {
                                Text("Hole \(hole.holeNumber) · Par \(hole.par)")
                                Spacer()
                                Text(hole.pickedUp ? "Picked up" : (hole.score.map(String.init) ?? "Not played"))
                            }
                        }
                    }
                    Section {
                        Button(store.submitting ? "Submitting…" :
                               (store.submissionPendingVerification ? "Check or retry submission" : "Submit to History")) {
                            Task {
                                await store.submitRound()
                                if store.lastSubmittedRoundId != nil { showReview = false }
                            }
                        }
                        .disabled(store.submitting)
                        if !store.message.isEmpty { Text(store.message).foregroundStyle(.orange) }
                        Text(store.syncStatus).font(.footnote).foregroundStyle(.secondary)
                    }
                }
                .navigationTitle("Review round")
                .toolbar { ToolbarItem(placement: .cancellationAction) {
                    Button("Back") { showReview = false }
                        .disabled(store.submitting || store.submissionPendingVerification)
                } }
            }
            .interactiveDismissDisabled(store.submitting || store.submissionPendingVerification)
        }
    }

    private func summary(_ label: String, _ value: String) -> some View {
        VStack {
            Text(label).font(.caption)
            Text(value).font(.title2.weight(.semibold))
        }
        .frame(maxWidth: .infinity)
    }
}

struct GroupScorecardView: View {
    @EnvironmentObject private var store: RoundStore
    @Environment(\.dismiss) private var dismiss
    @State private var guestName = ""

    var body: some View {
        NavigationStack {
            List {
                if let draft = store.draft {
                    Section("Group scorecard") {
                        Text("Your scores remain on your card. Friends approve their own card before it appears in their History; guest cards stay with this round.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        ForEach(draft.groupPlayers ?? []) { player in
                            NavigationLink {
                                GroupPlayerScoreView(playerId: player.id)
                            } label: {
                                HStack {
                                    Label(player.name, systemImage: player.kind == "friend" ? "person.crop.circle.badge.checkmark" : "person.crop.circle")
                                    Spacer()
                                    Text("\(player.holeEntries.filter { $0.score != nil || $0.pickedUp }.count)/\(player.holeEntries.count)")
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .swipeActions {
                                Button("Remove", role: .destructive) { store.removeGroupPlayer(player.id) }
                            }
                        }
                    }
                    Section("Add a linked friend") {
                        if let friends = store.friends?.friends {
                            ForEach(friends) { friend in
                                if !(draft.groupPlayers ?? []).contains(where: { $0.id == friend.player.id }) {
                                    Button(friend.player.name) { store.addFriendToRound(friend) }
                                }
                            }
                            if friends.isEmpty { Text("Add friends on the website first.").foregroundStyle(.secondary) }
                        } else { ProgressView("Loading friends…") }
                    }
                    Section("Add a guest") {
                        TextField("Guest name", text: $guestName)
                        Button("Add guest") {
                            store.addGuestToRound(guestName)
                            guestName = ""
                        }
                        .disabled(guestName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
            .navigationTitle("Playing group")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { await store.loadFriends() }
        }
    }
}

struct GroupPlayerScoreView: View {
    @EnvironmentObject private var store: RoundStore
    let playerId: String

    var body: some View {
        if let draft = store.draft, let player = (draft.groupPlayers ?? []).first(where: { $0.id == playerId }) {
            let hole = player.holeEntries[draft.currentHoleIndex]
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Hole \(hole.holeNumber) · Par \(hole.par) · SI \(hole.strokeIndex)")
                        .font(.headline)
                    Text("Select a score for \(player.name)")
                        .font(.title2.weight(.semibold))
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                        ForEach(1...9, id: \.self) { score in
                            Button("\(score)") { store.setGroupScore(playerId: playerId, score: score) }
                                .frame(maxWidth: .infinity, minHeight: 54)
                                .background(hole.score == score ? Palette.lime : Palette.card, in: RoundedRectangle(cornerRadius: 12))
                                .foregroundStyle(hole.score == score ? Palette.forest : .primary)
                        }
                    }
                    .buttonStyle(.plain)
                    Toggle("Picked up", isOn: Binding(
                        get: { player.holeEntries[draft.currentHoleIndex].pickedUp },
                        set: { store.setGroupPickedUp(playerId: playerId, pickedUp: $0) }
                    ))
                    HStack {
                        Text("Score above 9")
                        Spacer()
                        TextField("10–30", text: Binding(
                            get: { hole.score.map(String.init) ?? "" },
                            set: { store.setGroupScore(playerId: playerId, score: Int($0)) }
                        ))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                    }
                    if hole.par != "3" {
                        Picker("Fairway", selection: Binding(
                            get: { hole.fairwayResult },
                            set: { store.setGroupFairway(playerId: playerId, value: $0) }
                        )) {
                            Text("Not recorded").tag("")
                            Text("Hit").tag("HIT")
                            Text("Missed left").tag("MISSED_LEFT")
                            Text("Missed right").tag("MISSED_RIGHT")
                        }
                    }
                    Picker("Green in regulation", selection: Binding(
                        get: { hole.greenInRegulation },
                        set: { store.setGroupGIR(playerId: playerId, value: $0) }
                    )) {
                        Text("Not recorded").tag("")
                        Text("Yes").tag("YES")
                        Text("No").tag("NO")
                    }
                    HStack {
                        Text("Putts")
                        Spacer()
                        TextField("—", text: Binding(
                            get: { player.holeEntries[draft.currentHoleIndex].putts },
                            set: { value in store.setGroupPutts(playerId: playerId, value: Int(value)) }
                        ))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 70)
                    }
                    HStack {
                        Text("Penalty strokes")
                        Spacer()
                        TextField("—", text: Binding(
                            get: { player.holeEntries[draft.currentHoleIndex].penaltyStrokes },
                            set: { value in store.setGroupPenalties(playerId: playerId, value: Int(value)) }
                        ))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 70)
                    }
                    HStack {
                        Button("Previous") { store.setHole(draft.currentHoleIndex - 1) }
                            .disabled(draft.currentHoleIndex == 0)
                        Spacer()
                        Button("Next") { store.setHole(draft.currentHoleIndex + 1) }
                            .disabled(draft.currentHoleIndex == draft.holeEntries.count - 1)
                    }
                }
                .padding()
            }
            .background(Palette.paper)
            .navigationTitle(player.name)
        }
    }
}

struct RoundSavedView: View {
    @EnvironmentObject private var store: RoundStore

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(Palette.forest)
            Text("Round saved")
                .font(.largeTitle.weight(.semibold))
            Text("Your scorecard is in History.")
                .foregroundStyle(.secondary)
            Button("Done") { store.dismissSubmission() }
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.paper)
    }
}

struct AccountView: View {
    @EnvironmentObject private var store: RoundStore
    @State private var showSignOut = false
    @State private var showConnection = false

    var body: some View {
        NavigationStack {
            List {
                Section("Your account") {
                    Text("Signed in to Fore the Record")
                    Link("Open website", destination: URL(string: "https://foretherecord.co.uk")!)
                    #if DEBUG
                    Button("Connection settings") { showConnection = true }
                    #endif
                }
                Section("Data") {
                    Text("Round drafts and personal map pins stay on this iPhone when you sign out. They reappear only when you sign back in to the same account. Score edits sync when connected.")
                    Text("Map imagery requires a connection. Location is used only while the GPS screen is open.")
                }
                Section {
                    Button("Sign out", role: .destructive) { showSignOut = true }
                }
            }
            .navigationTitle("Account")
            #if DEBUG
            .sheet(isPresented: $showConnection) { ConnectionView() }
            #endif
            .confirmationDialog("Sign out?", isPresented: $showSignOut) {
                Button("Sign out", role: .destructive) { store.signOut() }
            } message: {
                Text("Your round and personal map pins will stay on this iPhone for this account.")
            }
        }
    }
}

struct HistoryView: View {
    @EnvironmentObject private var store: RoundStore

    var body: some View {
        NavigationStack {
            List {
                if !store.message.isEmpty {
                    Text(store.message).foregroundStyle(.orange)
                }
                if !store.pendingGroupCards.isEmpty {
                    Section("Cards awaiting your approval") {
                        ForEach(store.pendingGroupCards) { card in
                            VStack(alignment: .leading, spacing: 8) {
                                Text("\(card.hostRound.user.name) scored a round with you")
                                    .font(.headline)
                                Text("\(card.hostRound.tee.course.club.name) · \(card.hostRound.tee.course.name)")
                                    .font(.subheadline)
                                Text("\(card.state.holeEntries.filter { $0.score != nil || $0.pickedUp }.count) of \(card.hostRound.holeCount) holes recorded")
                                    .font(.caption).foregroundStyle(.secondary)
                                HStack {
                                    Button("Approve for History") {
                                        Task { await store.answerGroupCard(card.id, approve: true) }
                                    }
                                    .buttonStyle(.borderedProminent)
                                    Button("Decline", role: .destructive) {
                                        Task { await store.answerGroupCard(card.id, approve: false) }
                                    }
                                    .buttonStyle(.bordered)
                                }
                                .disabled(store.busy)
                            }
                        }
                    }
                }
                if store.history.isEmpty {
                    ContentUnavailableView("No rounds yet", systemImage: "list.bullet.rectangle",
                                           description: Text("Submitted rounds will appear here."))
                }
                ForEach(store.history) { round in
                    VStack(alignment: .leading, spacing: 5) {
                        Text(round.tee.course.name).font(.headline)
                        Text("\(round.tee.course.club.name) · \(round.tee.teeName)")
                            .font(.subheadline).foregroundStyle(.secondary)
                        HStack {
                            Text(String(round.datePlayed.prefix(10)))
                            Spacer()
                            Text(round.isPartial == true ? "Record only" : round.grossScore.map { "\($0) strokes" } ?? "Score pending")
                            Text("· \(round.playedHoles ?? round.holeCount) of \(round.holeCount) holes")
                        }
                        .font(.caption)
                    }
                    .padding(.vertical, 5)
                }
            }
            .navigationTitle("History")
            .refreshable { await store.loadHistory(); await store.loadFriends() }
            .task { await store.loadHistory(); await store.loadFriends() }
        }
    }
}

struct FriendsView: View {
    @EnvironmentObject private var store: RoundStore

    var body: some View {
        NavigationStack {
            List {
                if !store.message.isEmpty {
                    Text(store.message).foregroundStyle(.orange)
                }
                if let friends = store.friends {
                    if friends.friends.isEmpty && friends.incoming.isEmpty && friends.outgoing.isEmpty {
                        ContentUnavailableView("No friends yet", systemImage: "person.2",
                                               description: Text("Use the website to find and add friends."))
                    }
                    friendSection("Friends", friends.friends)
                    friendSection("Incoming requests", friends.incoming)
                    friendSection("Sent requests", friends.outgoing)
                } else {
                    ProgressView("Loading friends…")
                }
                Link("Manage friends on website", destination: URL(string: "https://foretherecord.co.uk")!)
            }
            .navigationTitle("Friends")
            .refreshable { await store.loadFriends() }
            .task { await store.loadFriends() }
        }
    }

    @ViewBuilder
    private func friendSection(_ title: String, _ people: [FriendRecord]) -> some View {
        if !people.isEmpty {
            Section(title) {
                ForEach(people) { item in
                    HStack {
                        Text(item.player.name)
                        Spacer()
                        if let handicap = item.player.handicapIndex {
                            Text(String(format: "HI %.1f", handicap))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }
}
