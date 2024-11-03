// HUMAN TASKS:
// 1. Ensure iOS deployment target is set to iOS 13.0 or higher in Xcode project settings
// 2. Configure notification permissions for expiring items alerts
// 3. Set up analytics tracking for pantry operations
// 4. Review error handling and logging levels for production

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - PantryViewModelError
// Requirement: Digital Pantry Management - Defines possible view model operation errors
public enum PantryViewModelError: Error {
    case loadingFailed(PantryServiceError)
    case itemOperationFailed(PantryServiceError)
    case invalidInput(String)
    case serviceError(String)
}

// MARK: - PantryViewState
// Requirement: Mobile Application Architecture - Implements MVVM state management
public struct PantryViewState {
    var isLoading: Bool
    var pantry: Pantry?
    var expiringItems: [PantryItem]
    var selectedLocation: StorageLocation?
    
    init(isLoading: Bool = true,
         pantry: Pantry? = nil,
         expiringItems: [PantryItem] = [],
         selectedLocation: StorageLocation? = nil) {
        self.isLoading = isLoading
        self.pantry = pantry
        self.expiringItems = expiringItems
        self.selectedLocation = selectedLocation
    }
}

// MARK: - Input/Output
// Requirement: Mobile Application Architecture - Defines reactive data flow
public enum Input {
    case loadPantry(userId: String)
    case addItem(PantryItem)
    case removeItem(String)
    case updateItem(String, PantryItem)
    case checkExpiring(Int)
    case selectLocation(StorageLocation)
}

public enum Output {
    case pantryLoaded(Pantry)
    case itemAdded(PantryItem)
    case itemRemoved(String)
    case itemUpdated(PantryItem)
    case expiringItemsFound([PantryItem])
    case error(PantryViewModelError)
}

// MARK: - PantryViewModel
// Requirement: Digital Pantry Management - Implements pantry management functionality
public final class PantryViewModel: ViewModelType {
    // MARK: - Properties
    public let state: CurrentValueSubject<PantryViewState, Never>
    private let errorSubject = PassthroughSubject<PantryViewModelError, Never>()
    private var cancellables = Set<AnyCancellable>()
    private let pantryService: PantryService
    
    // MARK: - Initialization
    public init(pantryService: PantryService = .shared) {
        self.state = CurrentValueSubject<PantryViewState, Never>(.init())
        self.pantryService = pantryService
        
        // Set up error handling
        errorSubject
            .sink { [weak self] error in
                Logger.shared.error("PantryViewModel error: \(error)")
                self?.state.value.isLoading = false
            }
            .store(in: &cancellables)
        
        Logger.shared.debug("PantryViewModel initialized")
    }
    
    // MARK: - ViewModelType Implementation
    // Requirement: Mobile Application Architecture - Implements MVVM pattern
    public func transform(input: AnyPublisher<Input, Never>) -> AnyPublisher<Output, Never> {
        input
            .flatMap { [weak self] input -> AnyPublisher<Output, Never> in
                guard let self = self else {
                    return Empty().eraseToAnyPublisher()
                }
                
                switch input {
                case .loadPantry(let userId):
                    return self.handleLoadPantry(userId: userId)
                case .addItem(let item):
                    return self.handleAddItem(item)
                case .removeItem(let itemId):
                    return self.handleRemoveItem(itemId)
                case .updateItem(let itemId, let updatedItem):
                    return self.handleUpdateItem(itemId: itemId, updatedItem: updatedItem)
                case .checkExpiring(let daysThreshold):
                    return self.handleCheckExpiring(daysThreshold: daysThreshold)
                case .selectLocation(let location):
                    return self.handleSelectLocation(location)
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    /// Handles loading pantry data with reactive updates
    private func handleLoadPantry(userId: String) -> AnyPublisher<Output, Never> {
        state.value.isLoading = true
        
        return pantryService.loadPantry(userId: userId)
            .map { pantry -> Output in
                self.state.value.isLoading = false
                self.state.value.pantry = pantry
                return .pantryLoaded(pantry)
            }
            .catch { error -> AnyPublisher<Output, Never> in
                let viewModelError = PantryViewModelError.loadingFailed(error)
                return Just(.error(viewModelError))
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles adding new items to the pantry
    private func handleAddItem(_ item: PantryItem) -> AnyPublisher<Output, Never> {
        state.value.isLoading = true
        
        return pantryService.addItem(item)
            .map { success -> Output in
                self.state.value.isLoading = false
                if success {
                    self.state.value.pantry?.items.append(item)
                    return .itemAdded(item)
                } else {
                    return .error(.invalidInput("Failed to add item"))
                }
            }
            .catch { error -> AnyPublisher<Output, Never> in
                let viewModelError = PantryViewModelError.itemOperationFailed(error)
                return Just(.error(viewModelError))
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles removing items from the pantry
    private func handleRemoveItem(_ itemId: String) -> AnyPublisher<Output, Never> {
        state.value.isLoading = true
        
        return pantryService.removeItem(itemId)
            .map { success -> Output in
                self.state.value.isLoading = false
                if success {
                    self.state.value.pantry?.items.removeAll { $0.id == itemId }
                    return .itemRemoved(itemId)
                } else {
                    return .error(.invalidInput("Failed to remove item"))
                }
            }
            .catch { error -> AnyPublisher<Output, Never> in
                let viewModelError = PantryViewModelError.itemOperationFailed(error)
                return Just(.error(viewModelError))
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles updating existing pantry items
    private func handleUpdateItem(itemId: String, updatedItem: PantryItem) -> AnyPublisher<Output, Never> {
        state.value.isLoading = true
        
        return pantryService.updateItem(itemId, updatedItem: updatedItem)
            .map { success -> Output in
                self.state.value.isLoading = false
                if success {
                    if let index = self.state.value.pantry?.items.firstIndex(where: { $0.id == itemId }) {
                        self.state.value.pantry?.items[index] = updatedItem
                    }
                    return .itemUpdated(updatedItem)
                } else {
                    return .error(.invalidInput("Failed to update item"))
                }
            }
            .catch { error -> AnyPublisher<Output, Never> in
                let viewModelError = PantryViewModelError.itemOperationFailed(error)
                return Just(.error(viewModelError))
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles checking for items nearing expiration
    private func handleCheckExpiring(daysThreshold: Int) -> AnyPublisher<Output, Never> {
        return pantryService.getExpiringItems(daysThreshold)
            .map { items -> Output in
                self.state.value.expiringItems = items
                return .expiringItemsFound(items)
            }
            .catch { error -> AnyPublisher<Output, Never> in
                let viewModelError = PantryViewModelError.itemOperationFailed(error)
                return Just(.error(viewModelError))
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles storage location selection
    private func handleSelectLocation(_ location: StorageLocation) -> AnyPublisher<Output, Never> {
        state.value.selectedLocation = location
        return Empty().eraseToAnyPublisher()
    }
}