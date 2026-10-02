import SwiftUI
import MapKit
import CoreLocation
import UIKit

struct GPSView: View {
    @EnvironmentObject private var store: RoundStore
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var tracker = LocationTracker()
    @State private var camera: MapCameraPosition = .automatic
    @State private var target: Coordinate?
    @State private var placement = "target"
    @State private var firstFix = true
    @State private var keepAwake = false
    @State private var now = Date()

    private var player: Coordinate? {
        guard let location = tracker.location else { return nil }
        return Coordinate(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
    }

    private var pinSet: GreenPins { store.pinsForCurrentHole() }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                distanceChip("FRONT", pinSet.front)
                distanceChip("MIDDLE", pinSet.middle)
                distanceChip("BACK", pinSet.back)
            }
            .padding(12)
            .foregroundStyle(.white)
            .background(Palette.forest)

            MapReader { proxy in
                Map(position: $camera, interactionModes: .all) {
                    if let player, let target {
                        MapPolyline(coordinates: [player.mapCoordinate, target.mapCoordinate])
                            .stroke(.white, lineWidth: 2)
                    }
                    if let location = tracker.location {
                        Annotation("You", coordinate: location.coordinate) {
                            Image(systemName: "location.circle.fill")
                                .font(.system(size: 32))
                                .foregroundStyle(.blue)
                                .background(.white, in: Circle())
                        }
                    }
                    if let target {
                        Annotation("Target", coordinate: target.mapCoordinate) {
                            VStack(spacing: 3) {
                                Image(systemName: "scope")
                                    .font(.system(size: 30))
                                Text(distanceText(to: target))
                                    .font(.caption.weight(.bold))
                                    .monospacedDigit()
                            }
                            .padding(8)
                            .foregroundStyle(.white)
                            .background(Palette.forest, in: RoundedRectangle(cornerRadius: 14))
                        }
                    }
                    pinAnnotation("F", pinSet.front, color: .red)
                    pinAnnotation("M", pinSet.middle, color: .green)
                    pinAnnotation("B", pinSet.back, color: .blue)
                }
                .mapStyle(.imagery(elevation: .flat))
                .onTapGesture { point in
                    guard let coordinate = proxy.convert(point, from: .local) else { return }
                    let pin = Coordinate(latitude: coordinate.latitude, longitude: coordinate.longitude)
                    if placement == "target" { target = pin }
                    else { store.setPin(pin, kind: placement) }
                }
                .overlay(alignment: .topTrailing) {
                    Button {
                        guard let location = tracker.location else { return }
                        camera = .region(MKCoordinateRegion(center: location.coordinate,
                                                            latitudinalMeters: 500, longitudinalMeters: 500))
                    } label: {
                        Image(systemName: "location.north.fill")
                            .padding(13)
                            .background(.regularMaterial, in: Circle())
                    }
                    .padding()
                    .accessibilityLabel("Re-centre on my location")
                }
            }
            .frame(maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 10) {
                Text(locationStatus)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(locationIsFresh ? .green : .orange)
                Picker("Map tap places", selection: $placement) {
                    Text("Target").tag("target")
                    Text("Front").tag("front")
                    Text("Middle").tag("middle")
                    Text("Back").tag("back")
                }
                .pickerStyle(.segmented)
                if let target {
                    HStack {
                        Text("To target: \(distanceText(to: target))")
                        Spacer()
                        if let middle = pinSet.middle {
                            Text("Target to middle: \(Distance.yards(from: target, to: middle).map { "\($0) yd" } ?? "—")")
                        }
                    }
                    .font(.subheadline.weight(.semibold))
                    Button("Clear target") { self.target = nil }
                        .font(.footnote)
                } else {
                    Text("Tap the map to measure a target. Choose Front, Middle or Back to save a personal green pin.")
                        .font(.footnote)
                }
                Text("Personal green pins · straight-line GPS estimates")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Toggle("Keep screen awake", isOn: $keepAwake)
                    .font(.footnote)
            }
            .padding()
            .background(.regularMaterial)
        }
        .onAppear { tracker.start() }
        .onDisappear {
            tracker.stop()
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .onChange(of: keepAwake) { _, enabled in
            UIApplication.shared.isIdleTimerDisabled = enabled && scenePhase == .active
        }
        .onChange(of: scenePhase) { _, phase in
            UIApplication.shared.isIdleTimerDisabled = keepAwake && phase == .active
        }
        .onChange(of: tracker.location) { _, location in
            guard firstFix, let location else { return }
            firstFix = false
            camera = .region(MKCoordinateRegion(center: location.coordinate,
                                                latitudinalMeters: 500, longitudinalMeters: 500))
        }
        .onChange(of: store.draft?.currentHoleIndex) { _, _ in
            target = nil
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { tick in
            now = tick
        }
    }

    private var locationIsFresh: Bool {
        guard let fix = tracker.location else { return false }
        return abs(fix.timestamp.timeIntervalSince(now)) <= 15 && fix.horizontalAccuracy >= 0
    }

    private var locationStatus: String {
        if tracker.permission == .denied || tracker.permission == .restricted {
            return "Location unavailable. Enable access in iPhone Settings."
        }
        guard let fix = tracker.location else { return "Waiting for location…" }
        let age = Int(abs(fix.timestamp.timeIntervalSince(now)))
        if age > 60 { return "GPS fix expired · open sky may help" }
        return "Accuracy about \(Int(fix.horizontalAccuracy.rounded())) m · updated \(age) s ago"
    }

    private func distanceText(to coordinate: Coordinate?) -> String {
        guard locationIsFresh, let player, let coordinate,
              let yards = Distance.yards(from: player, to: coordinate) else { return "—" }
        return "\(yards) yd"
    }

    private func distanceChip(_ label: String, _ coordinate: Coordinate?) -> some View {
        VStack(spacing: 3) {
            Text(label).font(.caption2.weight(.bold)).tracking(1)
            Text(distanceText(to: coordinate))
                .font(label == "MIDDLE" ? .title2.weight(.bold) : .headline)
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity)
    }

    @MapContentBuilder
    private func pinAnnotation(_ name: String, _ coordinate: Coordinate?, color: Color) -> some MapContent {
        if let coordinate {
            Annotation(name, coordinate: coordinate.mapCoordinate) {
                Text(name)
                    .font(.caption.weight(.bold))
                    .frame(width: 30, height: 30)
                    .foregroundStyle(.white)
                    .background(color, in: Circle())
            }
        }
    }
}

private extension Coordinate {
    var mapCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}
