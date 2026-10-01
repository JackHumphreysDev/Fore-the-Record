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
        let tee = CatalogueTee(id: "22222222-2222-4222-8222-222222222222", teeName: "White", colour: nil, gender: nil,
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
        round.holeEntries[0].fairwayResult = "HIT"
        round.holeEntries[0].greenInRegulation = "YES"
        precondition(round.stablefordPoints == 27)
        let draftId = "44444444-4444-4444-8444-444444444444"
        let payload = round.submission(draftId: draftId, revision: 2)!
        let encoded = try! JSONEncoder().encode(payload)
        let object = try! JSONSerialization.jsonObject(with: encoded) as! [String: Any]
        precondition(object["expectedDraftRevision"] as? Int == 2)
        precondition(object["grossScore"] as? Int == 36)
        precondition((object["holeScores"] as? [[String: Any]])?.count == 9)
        precondition((object["holeScores"] as! [[String: Any]])[0]["fairwayResult"] as? String == "HIT")
        precondition((object["holeScores"] as! [[String: Any]])[0]["greenInRegulation"] as? Bool == true)
        let pending = StoredRound(state: round, revision: 2, draftId: draftId,
                                  submissionPendingVerification: true)
        let restored = try! JSONDecoder().decode(StoredRound.self, from: JSONEncoder().encode(pending))
        precondition(restored.draftId == draftId && restored.submissionPendingVerification == true)
        round.holeEntries[0].strokesTaken = ""
        round.holeEntries[0].pickedUp = true
        precondition(round.stablefordPoints == 24)
        let pickup = round.submission(draftId: draftId, revision: 2)!
        let pickupData = try! JSONEncoder().encode(pickup)
        let pickupObject = try! JSONSerialization.jsonObject(with: pickupData) as! [String: Any]
        precondition(pickupObject["grossScore"] == nil)
        precondition((pickupObject["holeScores"] as! [[String: Any]])[0]["strokesTaken"] == nil)
        print("Distance and scoring smoke checks passed")
    }
}
