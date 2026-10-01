import Foundation

@main
struct DistanceSmoke {
    static func main() {
        let origin = Coordinate(latitude: 0, longitude: 0)
        let oneDegreeEast = Coordinate(latitude: 0, longitude: 1)
        precondition(Distance.yards(from: origin, to: origin) == 0)
        let equatorialDistance = Distance.yards(from: origin, to: oneDegreeEast)!
        precondition((121_500...121_700).contains(equatorialDistance))
        precondition(Distance.yards(from: Coordinate(latitude: 91, longitude: 0), to: origin) == nil)
        let tee = CatalogueTee(id: "tee", teeName: "White", colour: nil, gender: nil,
                               totalYardage: nil, totalMetres: nil, par: 36,
                               courseRating: 70, slopeRating: 113,
                               frontNineCourseRating: nil, frontNineSlopeRating: nil,
                               backNineCourseRating: nil, backNineSlopeRating: nil)
        let course = CatalogueCourse(id: "course", name: "Test Course",
                                     club: Club(id: "club", name: "Test Club"), tees: [tee])
        let card = ScorecardResponse(status: "available", source: "saved",
                                     holes: (1...9).map {
            CardHole(holeNumber: $0, par: 4, strokeIndex: $0, yardage: 400)
        })
        var round = LiveRoundState.start(course: course, tee: tee, card: card,
                                         segment: "FRONT_NINE", scoringFormat: "STABLEFORD",
                                         playingHandicap: "9")
        for index in round.holeEntries.indices { round.holeEntries[index].strokesTaken = "4" }
        precondition(round.stablefordPoints == 27)
        round.holeEntries[0].strokesTaken = ""
        round.holeEntries[0].pickedUp = true
        precondition(round.stablefordPoints == 24)
        print("Distance and scoring smoke checks passed")
    }
}
