//
// ShoppingListService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Confirm shopping-list sync intervals and conflict-resolution policy with the product team
// 2. Verify the server response shape for the toggle route (single item vs. full list) against the backend controller
// 3. Set up analytics tracking for shopping-list synchronization operations
// 4. Validate cross-device merge semantics once the backend route is live in staging

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - ShoppingListServiceError
// Requirement: Shopping List Backend Route & Cross-Device Synchronization (Feature 1) -
// Defines the complete, typed set of shopping-list synchronization errors. Mirrors
// the shape of `PantryServiceError` so callers across the service layer can switch
// on a consistent failure surface.
public enum ShoppingListServiceError: Error {
    case syncFailed
    case listNotFound
    case itemNotFound
    case validationFailed
    case networkError
    case cacheError
}

// MARK: - ShoppingListService
// Requirement: Shopping List Backend Route & Cross-Device Synchronization (Feature 1) -
// Network-backed shopping-list client that synchronizes lists across a user's
// devices through the server-authoritative REST resource mounted at
// `/api/v1/shopping-lists`. Mirrors the singleton + Combine design of the peer
// services (`PantryService`, `RecipeService`) and routes all HTTP through the
// shared `NetworkService`, inheriting its Bearer-token injection and JSON decoding
// strategy for routes 1-5. The PATCH toggle route (route 6) is transported by a
// self-contained helper because `NetworkService` does not expose a PATCH verb.
//
// Access-control note: the service exposes six instance methods as `internal`
// (the default) rather than `public`. The domain model types they reference
// (`ShoppingList`, `ShoppingListItem`, `ShoppingListGenerationOptions`) are
// declared `internal`, and Swift forbids a `public` method from exposing an
// `internal` type in its signature. All callers live in the same app module, so
// `internal` visibility is sufficient and matches the peer `RecipeService`.
public final class ShoppingListService {

    // MARK: - Singleton
    public static let shared = ShoppingListService()

    // MARK: - Initialization
    private init() {
        Logger.shared.debug("ShoppingListService initialized")
    }

    // MARK: - CRUD & Generation (Routes 1-5 via NetworkService)

    /// Fetches every shopping list owned by the authenticated user.
    /// Route 1 — `GET /shopping-lists` → `[ShoppingList]`.
    ///
    /// `NetworkService` injects the `Authorization: Bearer <token>` header and
    /// applies the shared decoder strategy automatically.
    /// - Returns: Publisher emitting the user's shopping lists or a typed error.
    func getLists() -> AnyPublisher<[ShoppingList], ShoppingListServiceError> {
        return NetworkService.shared.request("/shopping-lists", method: .get)
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Creates a new shopping list on the server.
    /// Route 2 — `POST /shopping-lists` with the list as the request body → `ShoppingList`.
    ///
    /// The `ShoppingList`/`ShoppingListItem` `Codable` conformance applies the
    /// `checked`⇄`isPurchased` mapping automatically during encoding, so the
    /// payload matches the cross-platform contract without any hand-rolled JSON.
    /// - Parameter list: The shopping list to persist.
    /// - Returns: Publisher emitting the server-persisted list or a typed error.
    func createList(_ list: ShoppingList) -> AnyPublisher<ShoppingList, ShoppingListServiceError> {
        return NetworkService.shared.request("/shopping-lists", method: .post, body: list)
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Updates an existing shopping list on the server.
    /// Route 3 — `PUT /shopping-lists/{id}` with the list as the request body → `ShoppingList`.
    /// - Parameter list: The shopping list to update; its `id` selects the resource.
    /// - Returns: Publisher emitting the updated list or a typed error.
    func updateList(_ list: ShoppingList) -> AnyPublisher<ShoppingList, ShoppingListServiceError> {
        return NetworkService.shared.request("/shopping-lists/\(list.id)", method: .put, body: list)
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Deletes a shopping list on the server.
    /// Route 4 — `DELETE /shopping-lists/{id}` → `Bool`.
    ///
    /// The generic `T` of `NetworkService.request` is inferred as `Bool` from this
    /// method's return type, mirroring `PantryService.removeItem`.
    /// - Parameter id: Identifier of the shopping list to delete.
    /// - Returns: Publisher emitting the deletion success flag or a typed error.
    func deleteList(id: String) -> AnyPublisher<Bool, ShoppingListServiceError> {
        return NetworkService.shared.request("/shopping-lists/\(id)", method: .delete)
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Generates a shopping list from recipes, optionally excluding on-hand pantry inventory.
    /// Route 5 — `POST /shopping-lists/{id}/generate` with `ShoppingListGenerationOptions`
    /// as the request body → `ShoppingList`.
    /// - Parameters:
    ///   - id: Identifier of the shopping list to (re)generate.
    ///   - options: Generation options (recipe ids, servings, inventory exclusion, dedup).
    /// - Returns: Publisher emitting the generated list or a typed error.
    func generateList(
        id: String,
        options: ShoppingListGenerationOptions
    ) -> AnyPublisher<ShoppingList, ShoppingListServiceError> {
        return NetworkService.shared.request("/shopping-lists/\(id)/generate", method: .post, body: options)
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    // MARK: - PATCH Helper (Route 6 transport)

    // NOTE / WORKAROUND: `NetworkService.HTTPMethod` exposes only
    // `.get/.post/.put/.delete` — there is NO `.patch` case — and
    // `NetworkService.swift` is OUT OF SCOPE for this change set and must not be
    // edited. The shopping-list toggle route is a `PATCH` per the route contract,
    // so this self-contained helper builds the `PATCH` `URLRequest` directly. It
    // intentionally reproduces `NetworkService`'s conventions so behavior is
    // identical to the five `NetworkService`-routed methods aside from the HTTP
    // verb: the same URL composition (`\(API.baseURL)/\(API.version)\(endpoint)`),
    // JSON `Content-Type`/`Accept` headers, Bearer-token authentication, the
    // shared decoder strategy (`.convertFromSnakeCase` + `.iso8601`), and
    // main-thread delivery.
    /// - Parameters:
    ///   - endpoint: Relative endpoint path (e.g. `/shopping-lists/{id}/items/{itemId}/toggle`).
    ///   - body: Optional `Encodable` request body; the toggle route sends none.
    /// - Returns: Publisher emitting the decoded `T` or a typed `ShoppingListServiceError`.
    private func patch<T: Decodable>(
        _ endpoint: String,
        body: Encodable? = nil
    ) -> AnyPublisher<T, ShoppingListServiceError> {
        // Compose the absolute address exactly as `NetworkService.request` does.
        guard let url = URL(string: "\(API.baseURL)/\(API.version)\(endpoint)") else {
            Logger.shared.error("ShoppingListService: invalid PATCH endpoint path: \(endpoint)")
            return Fail(error: ShoppingListServiceError.networkError).eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("application/json", forHTTPHeaderField: "Accept")
        // Attach the bearer credential the auth layer stores under type "access".
        if case .success(let token) = KeychainManager.shared.retrieveToken("access") {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // The toggle route sends no body; the parameter is retained for generality.
        if let body = body {
            do {
                request.httpBody = try JSONEncoder().encode(body)
            } catch {
                Logger.shared.error("ShoppingListService: failed to encode PATCH body: \(error)")
                return Fail(error: ShoppingListServiceError.validationFailed).eraseToAnyPublisher()
            }
        }
        // Mirror `NetworkService`'s decoding strategy so payloads decode identically.
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        Logger.shared.debug("ShoppingListService: making PATCH request to: \(url.absoluteString)")

        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { data, response -> Data in
                guard let http = response as? HTTPURLResponse else {
                    throw ShoppingListServiceError.networkError
                }
                guard (200...299).contains(http.statusCode) else {
                    Logger.shared.error("ShoppingListService: PATCH failed with status: \(http.statusCode)")
                    throw ShoppingListServiceError.syncFailed
                }
                return data
            }
            .decode(type: T.self, decoder: decoder)
            .mapError { error -> ShoppingListServiceError in
                // Preserve typed errors thrown above; map decoding/transport errors.
                (error as? ShoppingListServiceError) ?? .networkError
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }

    // MARK: - Toggle Item (Route 6 via self-contained PATCH)

    /// Toggles the `checked`/`isPurchased` state of a single shopping-list item.
    /// Route 6 — `PATCH /shopping-lists/{listId}/items/{itemId}/toggle` → `ShoppingListItem`.
    ///
    /// Implemented through the self-contained `patch(_:body:)` helper above because
    /// `NetworkService` has no PATCH support. Returns the toggled item, aligning
    /// with the web client (`updateShoppingListItem` returns the item); the model's
    /// `Codable` conformance applies the `checked`⇄`isPurchased` mapping on decode.
    /// The toggle carries no request body.
    /// - Parameters:
    ///   - listId: Identifier of the owning shopping list.
    ///   - itemId: Identifier of the item to toggle.
    /// - Returns: Publisher emitting the updated `ShoppingListItem` or a typed error.
    func toggleItem(listId: String, itemId: String) -> AnyPublisher<ShoppingListItem, ShoppingListServiceError> {
        return patch("/shopping-lists/\(listId)/items/\(itemId)/toggle")
    }
}
