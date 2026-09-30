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
        print("Distance smoke checks passed")
    }
}
