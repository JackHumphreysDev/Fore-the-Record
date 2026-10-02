import Foundation

struct Club: Codable {
    let id: String
    let name: String
}

struct CatalogueTee: Codable, Identifiable {
    let id: String
    let teeName: String
    let colour: String?
    let gender: String?
    let totalYardage: Int?
    let totalMetres: Int?
    let par: Int?
    let courseRating: Double
    let slopeRating: Int
    let frontNineCourseRating: Double?
    let frontNineSlopeRating: Int?
    let backNineCourseRating: Double?
    let backNineSlopeRating: Int?
}

struct CatalogueCourse: Codable, Identifiable {
    let id: String
    let name: String
    let club: Club
    let tees: [CatalogueTee]
}

struct CourseSearchResult: Codable {
    let courses: [CatalogueCourse]
}

struct CardHole: Codable {
    let holeNumber: Int
    let par: Int
    let strokeIndex: Int
    let yardage: Int?
}

struct ScorecardResponse: Codable {
    let status: String
    let source: String?
    let holes: [CardHole]
}

struct RoundTee: Codable {
    let id: String
    let courseId: String
    let clubName: String
    let courseName: String
    let teeName: String
    let colour: String?
    let gender: String?
    let totalYardage: Int?
    let totalMetres: Int?
    let par: Int?
    let courseRating: Double
    let slopeRating: Int
    let frontNineCourseRating: Double?
    let frontNineSlopeRating: Int?
    let backNineCourseRating: Double?
    let backNineSlopeRating: Int?
    let isFavourite: Bool

    init(course: CatalogueCourse, tee: CatalogueTee) {
        id = tee.id
        courseId = course.id
        clubName = course.club.name
        courseName = course.name
        teeName = tee.teeName
        colour = tee.colour
        gender = tee.gender
        totalYardage = tee.totalYardage
        totalMetres = tee.totalMetres
        par = tee.par
        courseRating = tee.courseRating
        slopeRating = tee.slopeRating
        frontNineCourseRating = tee.frontNineCourseRating
        frontNineSlopeRating = tee.frontNineSlopeRating
        backNineCourseRating = tee.backNineCourseRating
        backNineSlopeRating = tee.backNineSlopeRating
        isFavourite = false
    }
}

struct RoundForm: Codable {
    var teeId: String
    var datePlayed: String
    var timePlayed: String
    var category = "CASUAL"
    var participation = "INDIVIDUAL"
    var scoringFormat = "STROKE_PLAY"
    var playingHandicap = ""
    var holeCount: Int
    var nineHoleSegment: String
    var competitionName = ""
    var competitionFormat = ""
    var competitionFormatOther = ""
    var gameFormat = ""
    var gameFormatOther = ""
    var gameResult = ""
    var matchPlayOpponentName = ""
    var playingPartnerIds: [String] = []
    var playingPartnerResults: [String: String] = [:]
    var guestPlayerNames = ""
    var guestPlayerResults: [String: String] = [:]
    var numberOfPlayers = ""
    var grossScore = ""
    var weatherCondition = "DRY"
    var notes = ""
}

struct RoundHole: Codable, Identifiable {
    var holeNumber: Int
    var par: String
    var strokeIndex: String
    var yardage: String
    var strokesTaken = ""
    var pickedUp = false
    var putts = ""
    var fairwayResult = ""
    var greenInRegulation = ""
    var penaltyStrokes = ""
    var bunkerVisits = ""
    var upAndDownResult = ""

    var id: Int { holeNumber }
    var score: Int? { Int(strokesTaken) }

    init(card: CardHole) {
        holeNumber = card.holeNumber
        par = String(card.par)
        strokeIndex = String(card.strokeIndex)
        yardage = card.yardage.map(String.init) ?? ""
    }
}

struct GroupPlayer: Codable, Identifiable {
    let id: String
    let kind: String
    let name: String
    var holeEntries: [RoundHole]
}

struct LiveRoundState: Codable {
    var version = 1
    var currentHoleIndex = 0
    var tee: RoundTee
    var form: RoundForm
    var scorecardStatus = "available"
    var scorecardSource: String?
    var holeEntries: [RoundHole]
    var matchPlayDraft: [String: String] = [:]
    var groupPlayers: [GroupPlayer]? = nil

    var currentHole: RoundHole { holeEntries[currentHoleIndex] }
    var completed: Int { holeEntries.filter { $0.score != nil || $0.pickedUp }.count }
    var gross: Int { holeEntries.compactMap(\.score).reduce(0, +) }
    var scoreToPar: Int {
        holeEntries.reduce(0) { total, hole in
            guard let score = hole.score, let par = Int(hole.par) else { return total }
            return total + score - par
        }
    }

    var stablefordPoints: Int? {
        guard form.scoringFormat == "STABLEFORD", let handicap = Int(form.playingHandicap),
              (-20...54).contains(handicap) else { return nil }
        let ranked = holeEntries.sorted { (Int($0.strokeIndex) ?? 99) < (Int($1.strokeIndex) ?? 99) }
        let ranks = Dictionary(uniqueKeysWithValues: ranked.enumerated().map { ($0.element.holeNumber, $0.offset + 1) })
        let count = holeEntries.count
        return holeEntries.reduce(0) { total, hole in
            guard let rank = ranks[hole.holeNumber], let par = Int(hole.par) else { return total }
            if hole.pickedUp { return total }
            guard let strokes = hole.score else { return total }
            let received = Int(floor(Double(handicap + count - rank) / Double(count)))
            return total + max(0, 2 + par - (strokes - received))
        }
    }

    var canSubmitRecordOnly: Bool {
        form.category == "CASUAL" && form.participation == "INDIVIDUAL" &&
        scorecardStatus == "available" && completed > 0
    }

    var canSubmitNatively: Bool {
        form.category == "CASUAL" && form.participation == "INDIVIDUAL" &&
        scorecardStatus == "available" && (holeEntries.count == 9 || holeEntries.count == 18) &&
        holeEntries.count == form.holeCount && completed == holeEntries.count &&
        !holeEntries.contains(where: \.pickedUp) &&
        (form.scoringFormat == "STROKE_PLAY" || form.scoringFormat == "STABLEFORD")
    }

    func submission(draftId: String, revision: Int) -> RoundSubmission? {
        guard canSubmitNatively, UUID(uuidString: draftId) != nil, revision >= 0,
              UUID(uuidString: tee.id) != nil else { return nil }
        let expectedNumbers = form.holeCount == 18 ? Array(1...18) :
            (form.nineHoleSegment == "BACK_NINE" ? Array(10...18) : Array(1...9))
        guard holeEntries.map(\.holeNumber).sorted() == expectedNumbers,
              Set(holeEntries.compactMap { Int($0.strokeIndex) }).count == form.holeCount else { return nil }
        let handicap = form.scoringFormat == "STABLEFORD" ? Int(form.playingHandicap) : nil
        if form.scoringFormat == "STABLEFORD" && (handicap.map { !(-20...54).contains($0) } ?? true) { return nil }
        var holes: [SubmittedHole] = []
        for hole in holeEntries {
            guard let par = Int(hole.par), (2...7).contains(par),
                  let strokeIndex = Int(hole.strokeIndex), (1...18).contains(strokeIndex),
                  hole.pickedUp || (hole.score.map { (1...30).contains($0) } ?? false),
                  !hole.pickedUp || form.scoringFormat == "STABLEFORD",
                  let putts = optionalStat(hole.putts), let penalties = optionalStat(hole.penaltyStrokes),
                  let bunkers = optionalStat(hole.bunkerVisits),
                  ["", "HIT", "MISSED_LEFT", "MISSED_RIGHT", "NOT_APPLICABLE"].contains(hole.fairwayResult),
                  ["", "YES", "NO"].contains(hole.greenInRegulation),
                  ["", "NOT_ATTEMPTED", "SUCCESSFUL", "UNSUCCESSFUL"].contains(hole.upAndDownResult) else { return nil }
            let yardage = Int(hole.yardage)
            if !hole.yardage.isEmpty && (yardage.map { $0 <= 0 } ?? true) { return nil }
            holes.append(SubmittedHole(holeNumber: hole.holeNumber, par: par, strokeIndex: strokeIndex,
                                       strokesTaken: hole.pickedUp ? nil : hole.score, pickedUp: hole.pickedUp,
                                       yardage: yardage, putts: putts, penaltyStrokes: penalties,
                                       bunkerVisits: bunkers,
                                       fairwayResult: hole.fairwayResult.isEmpty ? nil : hole.fairwayResult,
                                       greenInRegulation: hole.greenInRegulation.isEmpty ? nil : hole.greenInRegulation == "YES",
                                       upAndDownResult: hole.upAndDownResult.isEmpty ? nil : hole.upAndDownResult))
        }
        return RoundSubmission(teeId: tee.id, liveRoundDraftId: draftId,
                               expectedDraftRevision: revision, datePlayed: form.datePlayed,
                               timePlayed: form.timePlayed, notes: form.notes,
                               grossScore: holes.contains(where: \.pickedUp) ? nil : gross,
                               scoringFormat: form.scoringFormat, holeCount: form.holeCount,
                               nineHoleSegment: form.holeCount == 9 ? form.nineHoleSegment : nil,
                               playingHandicap: handicap, weatherCondition: form.weatherCondition,
                               holeScores: holes)
    }

    private func optionalStat(_ value: String) -> Int?? {
        if value.isEmpty { return .some(nil) }
        guard let number = Int(value), (0...9).contains(number) else { return nil }
        return .some(number)
    }

    static func start(course: CatalogueCourse, tee: CatalogueTee, card: ScorecardResponse,
                      segment: String, scoringFormat: String, playingHandicap: String) -> LiveRoundState {
        let date = Date()
        let day = DateFormatter()
        day.dateFormat = "yyyy-MM-dd"
        let time = DateFormatter()
        time.dateFormat = "HH:mm"
        var form = RoundForm(teeId: tee.id, datePlayed: day.string(from: date),
                             timePlayed: time.string(from: date), holeCount: card.holes.count,
                             nineHoleSegment: segment)
        form.scoringFormat = scoringFormat
        form.playingHandicap = scoringFormat == "STABLEFORD" ? playingHandicap : ""
        return LiveRoundState(tee: RoundTee(course: course, tee: tee), form: form,
                              scorecardSource: card.source,
                              holeEntries: card.holes.map(RoundHole.init))
    }
}

struct LiveDraft: Codable {
    let id: String
    let state: LiveRoundState
    let revision: Int
}

struct LiveDraftResponse: Codable {
    let draft: LiveDraft?
}

struct StoredRound: Codable {
    let state: LiveRoundState
    let revision: Int
    let draftId: String?
    let submissionPendingVerification: Bool?
}

struct SubmittedHole: Encodable {
    let holeNumber: Int
    let par: Int
    let strokeIndex: Int
    let strokesTaken: Int?
    let pickedUp: Bool
    let yardage: Int?
    let putts: Int?
    let penaltyStrokes: Int?
    let bunkerVisits: Int?
    let fairwayResult: String?
    let greenInRegulation: Bool?
    let upAndDownResult: String?
}

struct RoundSubmission: Encodable {
    let teeId: String
    let liveRoundDraftId: String
    let expectedDraftRevision: Int
    let datePlayed: String
    let timePlayed: String
    let category = "CASUAL"
    let participation = "INDIVIDUAL"
    let notes: String
    let grossScore: Int?
    let scoringFormat: String
    let holeCount: Int
    let nineHoleSegment: String?
    let playingHandicap: Int?
    let weatherCondition: String
    let holeScores: [SubmittedHole]
}

struct SubmittedRoundResponse: Decodable {
    struct Round: Decodable { let id: String }
    let round: Round
}

struct RoundSubmissionStatus: Decodable {
    let roundId: String?
}

struct HistoryRound: Decodable, Identifiable {
    struct Tee: Decodable {
        struct Course: Decodable {
            let name: String
            let club: Club
        }
        let teeName: String
        let course: Course
    }
    let id: String
    let datePlayed: String
    let grossScore: Int?
    let holeCount: Int
    let scorecardStatus: String
    let isPartial: Bool?
    let playedHoles: Int?
    let tee: Tee
}

struct PendingGroupCardsResponse: Decodable {
    let cards: [PendingGroupCard]
}

struct PendingGroupCard: Decodable, Identifiable {
    struct HostRound: Decodable {
        struct Host: Decodable { let name: String }
        struct Tee: Decodable {
            struct Course: Decodable {
                struct Club: Decodable { let name: String }
                let name: String
                let club: Club
            }
            let teeName: String
            let course: Course
        }
        let datePlayed: String
        let holeCount: Int
        let user: Host
        let tee: Tee
    }
    struct CardState: Decodable {
        let holeEntries: [RoundHole]
    }
    let id: String
    let hostRound: HostRound
    let state: CardState
}

struct FriendRecord: Decodable, Identifiable {
    struct Player: Decodable {
        let id: String
        let name: String
        let handicapIndex: Double?
    }
    let id: String
    let player: Player
}

struct FriendsResponse: Decodable {
    let friends: [FriendRecord]
    let incoming: [FriendRecord]
    let outgoing: [FriendRecord]
}

struct Coordinate: Codable, Equatable {
    let latitude: Double
    let longitude: Double

    var isValid: Bool {
        latitude.isFinite && longitude.isFinite &&
        (-90...90).contains(latitude) && (-180...180).contains(longitude)
    }
}

struct GreenPins: Codable {
    var front: Coordinate?
    var middle: Coordinate?
    var back: Coordinate?
}

enum Distance {
    static func yards(from a: Coordinate, to b: Coordinate) -> Int? {
        guard a.isValid, b.isValid else { return nil }
        let radius = 6_371_008.8
        let lat1 = a.latitude * .pi / 180
        let lat2 = b.latitude * .pi / 180
        let deltaLat = (b.latitude - a.latitude) * .pi / 180
        let deltaLon = (b.longitude - a.longitude) * .pi / 180
        let h = pow(sin(deltaLat / 2), 2) + cos(lat1) * cos(lat2) * pow(sin(deltaLon / 2), 2)
        return Int((2 * radius * asin(min(1, sqrt(h))) / 0.9144).rounded())
    }
}
