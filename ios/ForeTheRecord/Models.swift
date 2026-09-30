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

struct LiveRoundState: Codable {
    var version = 1
    var currentHoleIndex = 0
    var tee: RoundTee
    var form: RoundForm
    var scorecardStatus = "available"
    var scorecardSource: String?
    var holeEntries: [RoundHole]
    var matchPlayDraft: [String: String] = [:]

    var currentHole: RoundHole { holeEntries[currentHoleIndex] }
    var completed: Int { holeEntries.filter { $0.score != nil || $0.pickedUp }.count }
    var gross: Int { holeEntries.compactMap(\.score).reduce(0, +) }
    var scoreToPar: Int {
        holeEntries.reduce(0) { total, hole in
            guard let score = hole.score, let par = Int(hole.par) else { return total }
            return total + score - par
        }
    }

    static func start(course: CatalogueCourse, tee: CatalogueTee, card: ScorecardResponse, segment: String) -> LiveRoundState {
        let date = Date()
        let day = DateFormatter()
        day.dateFormat = "yyyy-MM-dd"
        let time = DateFormatter()
        time.dateFormat = "HH:mm"
        let form = RoundForm(teeId: tee.id, datePlayed: day.string(from: date),
                             timePlayed: time.string(from: date), holeCount: card.holes.count,
                             nineHoleSegment: segment)
        return LiveRoundState(tee: RoundTee(course: course, tee: tee), form: form,
                              scorecardSource: card.source,
                              holeEntries: card.holes.map(RoundHole.init))
    }
}

struct LiveDraft: Codable {
    let id: String
    let state: LiveRoundState
}

struct LiveDraftResponse: Codable {
    let draft: LiveDraft?
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
    let tee: Tee
}

struct FriendRecord: Decodable, Identifiable {
    struct Player: Decodable {
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
