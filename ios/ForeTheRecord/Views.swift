import SwiftUI

private enum Palette {
    static let forest = Color(red: 0.07, green: 0.19, blue: 0.14)
    static let lime = Color(red: 0.84, green: 1.0, blue: 0.31)
    static let paper = Color(red: 0.97, green: 0.96, blue: 0.92)
}

struct RootView: View {
    @EnvironmentObject private var store: RoundStore

    var body: some View {
        if store.session == nil {
            SignInView()
        } else {
            TabView {
                HomeView()
                    .tabItem { Label("Home", systemImage: "house") }
                NavigationStack {
                    if store.draft == nil { StartRoundView() }
                    else { PlayingView() }
                }
                .tabItem { Label("Play", systemImage: "figure.golf") }
                HistoryView()
                    .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }
                FriendsView()
                    .tabItem { Label("Friends", systemImage: "person.2") }
                AccountView()
                    .tabItem { Label("Account", systemImage: "person.crop.circle") }
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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("CLUBHOUSE")
                        .font(.caption.weight(.bold))
                        .tracking(3)
                        .foregroundStyle(Palette.lime)
                    Text("Ready for the next round?")
                        .font(.system(size: 38, design: .serif))
                        .foregroundStyle(.white)
                    if let draft = store.draft {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("ROUND IN PROGRESS").font(.caption.weight(.bold)).tracking(2)
                            Text(draft.tee.courseName).font(.title2.weight(.semibold))
                            Text("Hole \(draft.currentHole.holeNumber) · \(draft.completed)/\(draft.holeEntries.count) scored")
                            Text(store.syncStatus).font(.footnote)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(22)
                        .background(Palette.lime, in: RoundedRectangle(cornerRadius: 20))
                        .foregroundStyle(Palette.forest)
                    } else {
                        Text("Open Play to choose a course and start your card.")
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    Text("Scores are saved on this iPhone as you play and synced to your account when connected.")
                        .font(.footnote)
                        .foregroundStyle(.white.opacity(0.75))
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Palette.forest)
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
                .padding()
                Text(store.syncStatus)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 6)
            }
            .navigationTitle(draft.tee.courseName)
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func scoreView(_ draft: LiveRoundState) -> some View {
        ScrollView {
            VStack(spacing: 24) {
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
                .background(.white, in: RoundedRectangle(cornerRadius: 20))

                HStack {
                    summary("Gross", "\(draft.gross)")
                    summary("To par", draft.scoreToPar > 0 ? "+\(draft.scoreToPar)" : "\(draft.scoreToPar)")
                    if let points = draft.stablefordPoints { summary("Points", "\(points)") }
                }
                .frame(maxWidth: .infinity)

                if draft.form.scoringFormat == "STABLEFORD" {
                    Toggle("Picked up", isOn: Binding(
                        get: { store.draft?.currentHole.pickedUp ?? false },
                        set: { store.setPickedUp($0) }
                    ))
                    .padding()
                    .background(.white, in: RoundedRectangle(cornerRadius: 18))
                }

                DisclosureGroup("Optional hole details") {
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
                .background(.white, in: RoundedRectangle(cornerRadius: 18))

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
                .background(.white, in: RoundedRectangle(cornerRadius: 18))

                if draft.completed == draft.holeEntries.count {
                    Link("Review and submit on website", destination: URL(string: "https://foretherecord.co.uk")!)
                        .font(.headline)
                    Text("Submission is not yet available in this iPhone pilot. Your synced card can be resumed on the website.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                if !store.message.isEmpty {
                    Text(store.message).font(.footnote).foregroundStyle(.orange)
                }
            }
            .padding()
        }
        .background(Palette.paper)
    }

    private func summary(_ label: String, _ value: String) -> some View {
        VStack {
            Text(label).font(.caption)
            Text(value).font(.title2.weight(.semibold))
        }
        .frame(maxWidth: .infinity)
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
                    Text("Round drafts and personal map pins are stored on this iPhone. Score edits sync to your account when connected.")
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
            .confirmationDialog("Sign out and remove local round data?", isPresented: $showSignOut) {
                Button("Sign out and remove local data", role: .destructive) { store.signOut() }
            } message: {
                Text("Sync your round first if you want to keep edits made on this iPhone.")
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
                            Text(round.grossScore.map { "\($0) strokes" } ?? "Score pending")
                            Text("· \(round.holeCount) holes")
                        }
                        .font(.caption)
                    }
                    .padding(.vertical, 5)
                }
            }
            .navigationTitle("History")
            .refreshable { await store.loadHistory() }
            .task { await store.loadHistory() }
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
