//
// ShoppingListService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Confirm shopping-list sync intervals and conflict-resolution policy with the product team
// 2. Toggle route returns the FULL updated list (decided): `toggleItem` returns `ShoppingList`,
//    matching the backend controller and the web client; re-confirm parity in staging.
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
// Access-control note: the service exposes exactly six `public` instance methods
// (getLists, createList, updateList, deleteList, generateList, toggleItem). The
// domain model types they reference (`ShoppingList`, `ShoppingListItem`,
// `ShoppingListGenerationOptions`) are therefore declared `public` as well, since
// Swift forbids a `public` method from exposing an `internal` type in its
// signature.
//
// Response-envelope note: every backend route replies with the unified envelope
// `{ success, data, metadata }`. All six methods decode the private
// `ApiEnvelope<T>` wrapper and surface only the unwrapped `.data` payload, so the
// service's public surface speaks in domain types (`[ShoppingList]`,
// `ShoppingList`, `Void`) rather than transport envelopes. Mutating writes
// (createList/updateList) send an allow-listed write DTO (`name` + client-editable
// item fields only) so server-managed fields (`userId`, `id`, timestamps, the
// iOS-only completion state) can never drift to the server.
public final class ShoppingListService {

    // MARK: - Singleton
    public static let shared = ShoppingListService()

    // MARK: - Initialization
    private init() {
        Logger.shared.debug("ShoppingListService initialized")
    }

    // MARK: - Response Envelope & Write DTOs

    /// Generic wrapper for the backend's unified success envelope
    /// `{ success, data, metadata }`. Only `data` is consumed by callers; the
    /// `metadata` block is intentionally not modeled because `JSONDecoder` ignores
    /// JSON keys absent from a type's `CodingKeys`, so omitting it is safe and
    /// keeps the wrapper minimal. Every request decodes `ApiEnvelope<T>` and maps
    /// to its `.data`, so no raw domain value is ever decoded at the top level.
    private struct ApiEnvelope<T: Decodable>: Decodable {
        let success: Bool
        let data: T
    }

    /// Payload of the backend delete route, whose `data` is `{ message }` rather
    /// than the deleted resource. Decoded to confirm the envelope shape, then
    /// discarded so `deleteList` can surface `Void` to callers.
    private struct DeleteResponse: Decodable {
        let message: String
    }

    /// Allow-listed request body for create/update writes. Carries ONLY the two
    /// client-editable list fields (`name`, `items`); it deliberately omits
    /// `id`/`userId`, `createdAt`/`updatedAt`, and the iOS-only `isCompleted`/
    /// `completedAt` fields so a whole-`ShoppingList` encode can never push
    /// server-managed or iOS-only state to the backend. Mirrors the backend's
    /// `buildListDto` allow-list and the web client's create/update payloads.
    private struct ShoppingListWriteDTO: Encodable {
        let name: String
        let items: [ShoppingListItemWriteDTO]
    }

    /// Allow-listed per-item write payload. Property names are the canonical
    /// server/web keys verbatim, and the `checked` field carries the iOS item's
    /// `isPurchased` value (the `isPurchased`⇄`checked` mapping). The per-item
    /// `id` is intentionally absent: the server assigns item identifiers, so a
    /// client can never inject a chosen subdocument id. Optional fields encode via
    /// Swift's synthesized `encodeIfPresent`, so `nil` values are omitted rather
    /// than sent as JSON `null`.
    private struct ShoppingListItemWriteDTO: Encodable {
        let name: String
        let quantity: Double
        let unit: String
        let category: String
        let checked: Bool
        let notes: String?
        let recipeId: String?
        let recipeName: String?
    }

    /// Maps a domain `ShoppingList` to its allow-listed write DTO, applying the
    /// `isPurchased`⇄`checked` mapping for each item. Shared by `createList` and
    /// `updateList` so both write paths use one authoritative allow-list.
    private static func makeWriteDTO(from list: ShoppingList) -> ShoppingListWriteDTO {
        ShoppingListWriteDTO(
            name: list.name,
            items: list.items.map { item in
                ShoppingListItemWriteDTO(
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    category: item.category,
                    checked: item.isPurchased,
                    notes: item.notes,
                    recipeId: item.recipeId,
                    recipeName: item.recipeName
                )
            }
        )
    }

    // MARK: - CRUD & Generation (Routes 1-5 via NetworkService)

    /// Fetches every shopping list owned by the authenticated user.
    /// Route 1 — `GET /shopping-lists` → unified envelope wrapping `[ShoppingList]`.
    ///
    /// `NetworkService` injects the `Authorization: Bearer <token>` header and
    /// applies the shared decoder strategy automatically; the envelope is unwrapped
    /// to its `.data` so callers receive the user's lists directly.
    /// - Returns: Publisher emitting the user's shopping lists or a typed error.
    public func getLists() -> AnyPublisher<[ShoppingList], ShoppingListServiceError> {
        let publisher: AnyPublisher<ApiEnvelope<[ShoppingList]>, NetworkError> =
            NetworkService.shared.request("/shopping-lists", method: .get)
        return publisher
            .map { $0.data }
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Creates a new shopping list on the server.
    /// Route 2 — `POST /shopping-lists` with an allow-listed write DTO as the
    /// request body → unified envelope wrapping the created `ShoppingList`.
    ///
    /// The body is an allow-listed `ShoppingListWriteDTO` (built by
    /// `makeWriteDTO(from:)`), NOT the whole `ShoppingList`: it sends only `name`
    /// and client-editable item fields, applying the `isPurchased`⇄`checked`
    /// mapping, so server-managed fields can never drift to the server. The
    /// response envelope is unwrapped to its `.data`.
    /// - Parameter list: The shopping list whose editable fields are persisted.
    /// - Returns: Publisher emitting the server-persisted list or a typed error.
    public func createList(_ list: ShoppingList) -> AnyPublisher<ShoppingList, ShoppingListServiceError> {
        let publisher: AnyPublisher<ApiEnvelope<ShoppingList>, NetworkError> =
            NetworkService.shared.request("/shopping-lists", method: .post, body: Self.makeWriteDTO(from: list))
        return publisher
            .map { $0.data }
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Updates an existing shopping list on the server.
    /// Route 3 — `PUT /shopping-lists/{id}` with an allow-listed write DTO as the
    /// request body → unified envelope wrapping the updated `ShoppingList`.
    ///
    /// The list's `id` selects the resource via the path and is never sent in the
    /// body. As with create, only `name` and client-editable item fields are sent
    /// (via `makeWriteDTO(from:)`), and the response envelope is unwrapped to `.data`.
    /// - Parameter list: The shopping list to update; its `id` selects the resource.
    /// - Returns: Publisher emitting the updated list or a typed error.
    public func updateList(_ list: ShoppingList) -> AnyPublisher<ShoppingList, ShoppingListServiceError> {
        let publisher: AnyPublisher<ApiEnvelope<ShoppingList>, NetworkError> =
            NetworkService.shared.request("/shopping-lists/\(list.id)", method: .put, body: Self.makeWriteDTO(from: list))
        return publisher
            .map { $0.data }
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Deletes a shopping list on the server.
    /// Route 4 — `DELETE /shopping-lists/{id}` → unified envelope whose `data` is a
    /// confirmation `{ message }` (NOT the deleted resource and NOT a boolean).
    ///
    /// The envelope is decoded as `ApiEnvelope<DeleteResponse>` to confirm the
    /// contract shape, then mapped to `Void`: deletion either succeeds (a 2xx,
    /// which `NetworkService` requires before decoding) or surfaces a typed error,
    /// so a success/failure boolean would be redundant. This matches the backend's
    /// message/void delete contract.
    /// - Parameter id: Identifier of the shopping list to delete.
    /// - Returns: Publisher completing on success or emitting a typed error.
    public func deleteList(id: String) -> AnyPublisher<Void, ShoppingListServiceError> {
        let publisher: AnyPublisher<ApiEnvelope<DeleteResponse>, NetworkError> =
            NetworkService.shared.request("/shopping-lists/\(id)", method: .delete)
        return publisher
            .map { _ in () }
            .mapError { _ in ShoppingListServiceError.networkError }
            .eraseToAnyPublisher()
    }

    /// Generates a shopping list from recipes, optionally excluding on-hand pantry inventory.
    /// Route 5 — `POST /shopping-lists/{id}/generate` with `ShoppingListGenerationOptions`
    /// as the request body → unified envelope wrapping the generated `ShoppingList`.
    ///
    /// `ShoppingListGenerationOptions` is the legitimate client-supplied generation
    /// input (recipe ids, servings, inventory exclusion, dedup), so it is sent
    /// as-is; the response envelope is unwrapped to its `.data`.
    /// - Parameters:
    ///   - id: Identifier of the shopping list to (re)generate.
    ///   - options: Generation options (recipe ids, servings, inventory exclusion, dedup).
    /// - Returns: Publisher emitting the generated list or a typed error.
    public func generateList(
        id: String,
        options: ShoppingListGenerationOptions
    ) -> AnyPublisher<ShoppingList, ShoppingListServiceError> {
        let publisher: AnyPublisher<ApiEnvelope<ShoppingList>, NetworkError> =
            NetworkService.shared.request("/shopping-lists/\(id)/generate", method: .post, body: options)
        return publisher
            .map { $0.data }
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
    /// Route 6 — `PATCH /shopping-lists/{listId}/items/{itemId}/toggle` → unified
    /// envelope wrapping the FULL updated `ShoppingList`.
    ///
    /// Implemented through the self-contained `patch(_:body:)` helper above because
    /// `NetworkService` has no PATCH support. The backend toggle route returns the
    /// entire updated list (not the single item), so this method returns
    /// `ShoppingList`; the web client (`updateShoppingListItem`) is aligned to the
    /// same full-list contract for cross-platform consistency (R8). The list's
    /// `Codable` conformance applies the `checked`⇄`isPurchased` mapping on decode.
    /// The toggle carries no request body.
    /// - Parameters:
    ///   - listId: Identifier of the owning shopping list.
    ///   - itemId: Identifier of the item to toggle.
    /// - Returns: Publisher emitting the updated `ShoppingList` or a typed error.
    public func toggleItem(listId: String, itemId: String) -> AnyPublisher<ShoppingList, ShoppingListServiceError> {
        let publisher: AnyPublisher<ApiEnvelope<ShoppingList>, ShoppingListServiceError> =
            patch("/shopping-lists/\(listId)/items/\(itemId)/toggle")
        return publisher
            .map { $0.data }
            .eraseToAnyPublisher()
    }
}
