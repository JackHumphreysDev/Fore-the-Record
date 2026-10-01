import Foundation
import Security
import CoreLocation

struct Session: Codable {
    let accessToken: String
    let refreshToken: String
    let userId: String
    let expiresAt: Date?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case userId, expiresAt
    }
}

private struct AuthUser: Decodable {
    let id: String
}

private struct AuthResult: Decodable {
    let access_token: String
    let refresh_token: String
    let user: AuthUser
    let expires_in: Int

    var session: Session {
        Session(accessToken: access_token, refreshToken: refresh_token, userId: user.id,
                expiresAt: Date().addingTimeInterval(TimeInterval(expires_in)))
    }
}

enum NetworkError: LocalizedError {
    case notConfigured
    case invalidResponse
    case conflict
    case http(Int, String)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured: "Enter the Supabase URL and publishable key first."
        case .invalidResponse: "The server returned an unexpected response."
        case .conflict: "This live round changed on another device."
        case .http(_, let message): message
        case .server(let message): message
        }
    }
}

enum Keychain {
    private static let service = "co.uk.foretherecord.ios"

    static func save(_ session: Session) throws {
        let data = try JSONEncoder().encode(session)
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: service,
                                    kSecAttrAccount as String: "session"]
        SecItemDelete(query as CFDictionary)
        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(item as CFDictionary, nil)
        guard status == errSecSuccess else { throw NetworkError.server("Could not protect your sign-in on this device.") }
    }

    static func load() -> Session? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: service,
                                    kSecAttrAccount as String: "session",
                                    kSecReturnData as String: true,
                                    kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(Session.self, from: data)
    }

    static func clear() {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: service,
                                    kSecAttrAccount as String: "session"]
        SecItemDelete(query as CFDictionary)
    }
}

struct APIClient {
    var apiURL: URL
    var supabaseURL: URL
    var publishableKey: String

    private func call<T: Decodable>(_ url: URL, method: String = "GET", token: String? = nil,
                                    body: Data? = nil, as type: T.Type) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = body
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 409 { throw NetworkError.conflict }
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let message = object?["error"] as? String ?? object?["msg"] as? String ??
                          object?["message"] as? String ?? "Request failed (HTTP \(http.statusCode))."
            throw NetworkError.http(http.statusCode, message)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func endpoint(_ path: String, query: [URLQueryItem] = []) throws -> URL {
        guard var components = URLComponents(url: apiURL.appending(path: path), resolvingAgainstBaseURL: false) else {
            throw NetworkError.invalidResponse
        }
        components.queryItems = query.isEmpty ? nil : query
        guard let url = components.url else { throw NetworkError.invalidResponse }
        return url
    }

    func signIn(email: String, password: String) async throws -> Session {
        guard !publishableKey.isEmpty else { throw NetworkError.notConfigured }
        let url = supabaseURL.appending(path: "auth/v1/token")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "password")]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue(publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            throw NetworkError.server(object?["msg"] as? String ?? object?["error_description"] as? String ?? "Sign-in failed.")
        }
        return try JSONDecoder().decode(AuthResult.self, from: data).session
    }

    func refresh(_ session: Session) async throws -> Session {
        guard !publishableKey.isEmpty else { throw NetworkError.notConfigured }
        var components = URLComponents(url: supabaseURL.appending(path: "auth/v1/token"),
                                       resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token")]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue(publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": session.refreshToken])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw NetworkError.server("Your session expired. Sign in again to sync your round.")
        }
        return try JSONDecoder().decode(AuthResult.self, from: data).session
    }

    func searchCourses(_ term: String, token: String) async throws -> [CatalogueCourse] {
        let url = try endpoint("api/catalogue/courses", query: [
            URLQueryItem(name: "club", value: term),
            URLQueryItem(name: "pageSize", value: "25")
        ])
        return try await call(url, token: token, as: CourseSearchResult.self).courses
    }

    func scorecard(teeId: String, segment: String, token: String) async throws -> ScorecardResponse {
        let items = segment == "ALL" ? [] : [URLQueryItem(name: "segment", value: segment)]
        return try await call(endpoint("api/tees/\(teeId)/scorecard", query: items),
                              token: token, as: ScorecardResponse.self)
    }

    func liveDraft(token: String) async throws -> LiveDraft? {
        try await call(endpoint("api/users/me/live-round"), token: token, as: LiveDraftResponse.self).draft
    }

    func history(token: String) async throws -> [HistoryRound] {
        try await call(endpoint("api/users/me/rounds"), token: token, as: [HistoryRound].self)
    }

    func friends(token: String) async throws -> FriendsResponse {
        try await call(endpoint("api/users/me/friends"), token: token, as: FriendsResponse.self)
    }

    func saveDraft(_ state: LiveRoundState, expectedRevision: Int, token: String) async throws -> LiveDraft {
        struct Body: Encodable {
            let state: LiveRoundState
            let expectedRevision: Int
        }
        let body = try JSONEncoder().encode(Body(state: state, expectedRevision: expectedRevision))
        let response: LiveDraftResponse = try await call(endpoint("api/users/me/live-round"), method: "PUT",
                                                         token: token, body: body, as: LiveDraftResponse.self)
        guard let draft = response.draft else { throw NetworkError.invalidResponse }
        return draft
    }

    func submitRound(_ submission: RoundSubmission, token: String) async throws -> String {
        let body = try JSONEncoder().encode(submission)
        let response: SubmittedRoundResponse = try await call(endpoint("api/rounds"), method: "POST",
                                                              token: token, body: body, as: SubmittedRoundResponse.self)
        return response.round.id
    }

    func submittedRoundId(draftId: String, token: String) async throws -> String? {
        guard UUID(uuidString: draftId) != nil else { throw NetworkError.invalidResponse }
        let response: RoundSubmissionStatus = try await call(
            endpoint("api/users/me/live-round/submissions/\(draftId)"), token: token,
            as: RoundSubmissionStatus.self)
        return response.roundId
    }
}

@MainActor
final class LocationTracker: NSObject, ObservableObject, @preconcurrency CLLocationManagerDelegate {
    @Published var location: CLLocation?
    @Published var permission: CLAuthorizationStatus = .notDetermined
    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 3
        permission = manager.authorizationStatus
    }

    func start() {
        if manager.authorizationStatus == .notDetermined { manager.requestWhenInUseAuthorization() }
        else if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }

    func stop() { manager.stopUpdatingLocation() }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        permission = manager.authorizationStatus
        if permission == .authorizedWhenInUse || permission == .authorizedAlways { manager.startUpdatingLocation() }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let newest = locations.last, newest.horizontalAccuracy >= 0 else { return }
        location = newest
    }
}
