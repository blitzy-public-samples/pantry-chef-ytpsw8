//
// PantryViewModelTests.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Ensure test data fixtures are up to date with latest Pantry model changes
// 2. Configure test coverage reporting in Xcode scheme
// 3. Review error simulation scenarios with QA team
// 4. Set up CI integration for automated test runs

import XCTest // iOS 13.0+
import Combine // iOS 13.0+
@testable import PantryChef

// MARK: - TestError
enum TestError: Error {
    case mockError
}

// MARK: - PantryViewModelTests
// Requirement: Digital Pantry Management - Verify pantry management functionality through comprehensive test cases
final class PantryViewModelTests: XCTestCase {
    // MARK: - Properties
    private var sut: PantryViewModel!
    private var mockNetworkService: MockNetworkService!
    private var cancellables: Set<AnyCancellable>!
    
    // MARK: - Test Lifecycle
    override func setUp() {
        super.setUp()
        mockNetworkService = MockNetworkService()
        sut = PantryViewModel(pantryService: PantryService(networkService: mockNetworkService))
        cancellables = Set<AnyCancellable>()
    }
    
    override func tearDown() {
        mockNetworkService.reset()
        cancellables.forEach { $0.cancel() }
        cancellables = nil
        sut = nil
        super.tearDown()
    }
    
    // MARK: - Initial State Tests
    // Requirement: Unit Testing - Verify initial state configuration
    func testInitialState() {
        // Assert initial state values
        XCTAssertTrue(sut.state.value.isLoading)
        XCTAssertNil(sut.state.value.pantry)
        XCTAssertTrue(sut.state.value.expiringItems.isEmpty)
        XCTAssertNil(sut.state.value.selectedLocation)
    }
    
    // MARK: - Load Pantry Tests
    // Requirement: Digital Pantry Management - Verify pantry loading functionality
    func testLoadPantrySuccess() {
        // Given
        let expectation = XCTestExpectation(description: "Load pantry success")
        let mockPantry = Pantry(id: "test_pantry", userId: "test_user", items: [], locations: [])
        mockNetworkService.setMockResponse("/api/v1/pantry/test_user", response: mockPantry)
        
        var outputs: [Output] = []
        let input = PassthroughSubject<Input, Never>()
        
        // When
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                outputs.append(output)
                if case .pantryLoaded = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        input.send(.loadPantry(userId: "test_user"))
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(outputs.count, 1)
        if case .pantryLoaded(let pantry) = outputs.first {
            XCTAssertEqual(pantry.id, "test_pantry")
            XCTAssertEqual(pantry.userId, "test_user")
        } else {
            XCTFail("Expected pantryLoaded output")
        }
        XCTAssertFalse(sut.state.value.isLoading)
        XCTAssertNotNil(sut.state.value.pantry)
    }
    
    func testLoadPantryFailure() {
        // Given
        let expectation = XCTestExpectation(description: "Load pantry failure")
        mockNetworkService.simulateError(.requestFailed)
        
        var outputs: [Output] = []
        let input = PassthroughSubject<Input, Never>()
        
        // When
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                outputs.append(output)
                if case .error = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        input.send(.loadPantry(userId: "test_user"))
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(outputs.count, 1)
        if case .error(let error) = outputs.first {
            XCTAssertTrue(error is PantryViewModelError)
        } else {
            XCTFail("Expected error output")
        }
        XCTAssertFalse(sut.state.value.isLoading)
        XCTAssertNil(sut.state.value.pantry)
    }
    
    // MARK: - Add Item Tests
    // Requirement: Digital Pantry Management - Verify item addition functionality
    func testAddItemSuccess() {
        // Given
        let expectation = XCTestExpectation(description: "Add item success")
        let mockItem = PantryItem(id: "test_item", name: "Test Item", quantity: 1, unit: "piece", expirationDate: Date(), location: "fridge")
        mockNetworkService.setMockResponse("/api/v1/pantry/items", response: ["success": true])
        
        var outputs: [Output] = []
        let input = PassthroughSubject<Input, Never>()
        
        // When
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                outputs.append(output)
                if case .itemAdded = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        input.send(.addItem(mockItem))
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(outputs.count, 1)
        if case .itemAdded(let item) = outputs.first {
            XCTAssertEqual(item.id, mockItem.id)
            XCTAssertEqual(item.name, mockItem.name)
        } else {
            XCTFail("Expected itemAdded output")
        }
        XCTAssertFalse(sut.state.value.isLoading)
    }
    
    // MARK: - Remove Item Tests
    // Requirement: Digital Pantry Management - Verify item removal functionality
    func testRemoveItemSuccess() {
        // Given
        let expectation = XCTestExpectation(description: "Remove item success")
        let itemId = "test_item"
        mockNetworkService.setMockResponse("/api/v1/pantry/items/\(itemId)", response: ["success": true])
        
        var outputs: [Output] = []
        let input = PassthroughSubject<Input, Never>()
        
        // When
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                outputs.append(output)
                if case .itemRemoved = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        input.send(.removeItem(itemId))
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(outputs.count, 1)
        if case .itemRemoved(let removedId) = outputs.first {
            XCTAssertEqual(removedId, itemId)
        } else {
            XCTFail("Expected itemRemoved output")
        }
        XCTAssertFalse(sut.state.value.isLoading)
    }
    
    // MARK: - Expiring Items Tests
    // Requirement: Digital Pantry Management - Verify expiration tracking functionality
    func testCheckExpiringItems() {
        // Given
        let expectation = XCTestExpectation(description: "Check expiring items")
        let mockExpiringItems = [
            PantryItem(id: "exp_item1", name: "Expiring Item 1", quantity: 1, unit: "piece", expirationDate: Date().addingTimeInterval(86400), location: "fridge"),
            PantryItem(id: "exp_item2", name: "Expiring Item 2", quantity: 1, unit: "piece", expirationDate: Date().addingTimeInterval(172800), location: "pantry")
        ]
        mockNetworkService.setMockResponse("/api/v1/pantry/expiring", response: mockExpiringItems)
        
        var outputs: [Output] = []
        let input = PassthroughSubject<Input, Never>()
        
        // When
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                outputs.append(output)
                if case .expiringItemsFound = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        input.send(.checkExpiring(3))
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(outputs.count, 1)
        if case .expiringItemsFound(let items) = outputs.first {
            XCTAssertEqual(items.count, 2)
            XCTAssertEqual(items[0].id, "exp_item1")
            XCTAssertEqual(items[1].id, "exp_item2")
        } else {
            XCTFail("Expected expiringItemsFound output")
        }
        XCTAssertEqual(sut.state.value.expiringItems.count, 2)
    }
    
    // MARK: - Location Selection Tests
    // Requirement: Digital Pantry Management - Verify location filtering functionality
    func testSelectLocation() {
        // Given
        let location = StorageLocation.fridge
        let input = PassthroughSubject<Input, Never>()
        
        // When
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { _ in }
            .store(in: &cancellables)
        
        input.send(.selectLocation(location))
        
        // Then
        XCTAssertEqual(sut.state.value.selectedLocation, location)
    }
}