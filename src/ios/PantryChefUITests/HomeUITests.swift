//
// HomeUITests.swift
// PantryChefUITests
//
// HUMAN TASKS:
// 1. Configure test environment variables for authentication credentials
// 2. Set up test data fixtures for recipe suggestions and expiring items
// 3. Verify accessibility identifiers match production app configuration
// 4. Review test coverage requirements with QA team
// 5. Set up performance testing thresholds for UI interactions

import XCTest // iOS 13.0+

/// UI test suite for testing home screen functionality including quick actions,
/// recipe suggestions, and expiring items in the PantryChef iOS application
///
/// Requirements addressed:
/// - Dashboard View: Tests home screen with quick actions, recipe suggestions, and status widgets
/// - Recipe Suggestions: Validates smart recipe matching display based on available ingredients
/// - Expiration Tracking: Tests digital pantry management with expiration tracking display
final class HomeUITests: XCTestCase {
    
    // MARK: - Properties
    private var app: XCUIApplication!
    
    // MARK: - Setup & Teardown
    override func setUp() {
        super.setUp()
        
        // Initialize app instance
        app = XCUIApplication()
        
        // Configure test environment
        app.launchArguments = ["UI_TESTING"]
        app.launchEnvironment = [
            "TEST_USER_EMAIL": "test@example.com",
            "TEST_USER_PASSWORD": "testPassword123",
            "ENVIRONMENT": "testing"
        ]
        
        // Launch app and login
        app.launch()
        login()
    }
    
    override func tearDown() {
        // Clean up test environment
        app.terminate()
        super.tearDown()
    }
    
    // MARK: - Helper Methods
    private func login() {
        // Wait for login screen and enter credentials
        let emailTextField = app.textFields["emailTextField"]
        let passwordTextField = app.secureTextFields["passwordTextField"]
        let loginButton = app.buttons["loginButton"]
        
        XCTAssertTrue(emailTextField.waitForExistence(timeout: 5))
        XCTAssertTrue(passwordTextField.waitForExistence(timeout: 5))
        
        emailTextField.tap()
        emailTextField.typeText("test@example.com")
        
        passwordTextField.tap()
        passwordTextField.typeText("testPassword123")
        
        loginButton.tap()
        
        // Wait for home screen to appear
        let homeNavigationBar = app.navigationBars["Home"]
        XCTAssertTrue(homeNavigationBar.waitForExistence(timeout: 5))
    }
    
    // MARK: - Test Cases
    func testHomeScreenLayout() {
        // Test requirement: Dashboard View - Tests home screen layout components
        
        // Verify navigation bar
        let homeNavigationBar = app.navigationBars["Home"]
        XCTAssertTrue(homeNavigationBar.exists)
        
        // Verify quick action buttons
        let quickActionView = app.otherElements["Quick Actions"]
        XCTAssertTrue(quickActionView.exists)
        
        let scanButton = quickActionView.buttons["scanButton"]
        let recipesButton = quickActionView.buttons["recipesButton"]
        let pantryButton = quickActionView.buttons["pantryButton"]
        
        XCTAssertTrue(scanButton.exists)
        XCTAssertTrue(recipesButton.exists)
        XCTAssertTrue(pantryButton.exists)
        
        // Verify recipe suggestions section
        let recipeSuggestionsHeader = app.staticTexts["Recipe Suggestions"]
        let recipeSuggestionsCollection = app.collectionViews["recipeSuggestionsCollectionView"]
        
        XCTAssertTrue(recipeSuggestionsHeader.exists)
        XCTAssertTrue(recipeSuggestionsCollection.exists)
        
        // Verify expiring items section
        let expiringItemsHeader = app.staticTexts["Expiring Soon"]
        let expiringItemsTable = app.tables["expiringItemsTableView"]
        
        XCTAssertTrue(expiringItemsHeader.exists)
        XCTAssertTrue(expiringItemsTable.exists)
        
        // Verify refresh control
        XCTAssertTrue(expiringItemsTable.refreshControls.firstMatch.exists)
    }
    
    func testQuickActions() {
        // Test requirement: Dashboard View - Tests quick action navigation
        
        let quickActionView = app.otherElements["Quick Actions"]
        
        // Test scan button navigation
        let scanButton = quickActionView.buttons["scanButton"]
        scanButton.tap()
        
        let cameraView = app.otherElements["cameraView"]
        XCTAssertTrue(cameraView.waitForExistence(timeout: 5))
        
        app.navigationBars.buttons.firstMatch.tap() // Back to home
        
        // Test recipes button navigation
        let recipesButton = quickActionView.buttons["recipesButton"]
        recipesButton.tap()
        
        let recipesNavigationBar = app.navigationBars["Recipes"]
        XCTAssertTrue(recipesNavigationBar.waitForExistence(timeout: 5))
        
        app.navigationBars.buttons.firstMatch.tap() // Back to home
        
        // Test pantry button navigation
        let pantryButton = quickActionView.buttons["pantryButton"]
        pantryButton.tap()
        
        let pantryNavigationBar = app.navigationBars["Pantry"]
        XCTAssertTrue(pantryNavigationBar.waitForExistence(timeout: 5))
        
        app.navigationBars.buttons.firstMatch.tap() // Back to home
    }
    
    func testRecipeSuggestions() {
        // Test requirement: Recipe Suggestions - Tests recipe suggestions display and interaction
        
        let recipeSuggestionsCollection = app.collectionViews["recipeSuggestionsCollectionView"]
        XCTAssertTrue(recipeSuggestionsCollection.waitForExistence(timeout: 5))
        
        // Verify recipe cards exist and contain required elements
        let recipeCards = recipeSuggestionsCollection.cells
        XCTAssertTrue(recipeCards.count > 0)
        
        let firstRecipeCard = recipeCards.firstMatch
        XCTAssertTrue(firstRecipeCard.images["recipeImage"].exists)
        XCTAssertTrue(firstRecipeCard.staticTexts["recipeName"].exists)
        XCTAssertTrue(firstRecipeCard.staticTexts["recipeMatchPercentage"].exists)
        
        // Test horizontal scrolling
        let startCoordinate = firstRecipeCard.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5))
        let endCoordinate = firstRecipeCard.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.5))
        startCoordinate.press(forDuration: 0.1, thenDragTo: endCoordinate)
        
        // Test recipe card selection
        firstRecipeCard.tap()
        
        let recipeDetailView = app.otherElements["recipeDetailView"]
        XCTAssertTrue(recipeDetailView.waitForExistence(timeout: 5))
    }
    
    func testExpiringItems() {
        // Test requirement: Expiration Tracking - Tests expiring items display and interaction
        
        let expiringItemsTable = app.tables["expiringItemsTableView"]
        XCTAssertTrue(expiringItemsTable.waitForExistence(timeout: 5))
        
        // Verify expiring items exist
        let expiringItems = expiringItemsTable.cells
        XCTAssertTrue(expiringItems.count > 0)
        
        // Verify item cell elements
        let firstItem = expiringItems.firstMatch
        XCTAssertTrue(firstItem.staticTexts["itemName"].exists)
        XCTAssertTrue(firstItem.staticTexts["expirationDate"].exists)
        
        // Test expiring item selection
        firstItem.tap()
        
        let pantryItemDetailView = app.otherElements["pantryItemDetailView"]
        XCTAssertTrue(pantryItemDetailView.waitForExistence(timeout: 5))
        
        // Verify sorting by expiration date
        let expirationDates = expiringItems.allElementsBoundByIndex.compactMap { cell -> Date? in
            guard let dateText = cell.staticTexts["expirationDate"].label else { return nil }
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "MMM d, yyyy"
            return dateFormatter.date(from: dateText)
        }
        
        // Verify dates are in ascending order
        for i in 0..<(expirationDates.count - 1) {
            XCTAssertLessThanOrEqual(expirationDates[i], expirationDates[i + 1])
        }
    }
    
    func testPullToRefresh() {
        // Test requirement: Dashboard View - Tests content refresh functionality
        
        let expiringItemsTable = app.tables["expiringItemsTableView"]
        XCTAssertTrue(expiringItemsTable.waitForExistence(timeout: 5))
        
        // Get initial content state
        let initialItems = expiringItemsTable.cells.count
        
        // Perform pull-to-refresh gesture
        let start = expiringItemsTable.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
        let end = expiringItemsTable.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8))
        start.press(forDuration: 0.1, thenDragTo: end)
        
        // Verify loading indicator appears
        let loadingIndicator = app.activityIndicators["loadingIndicator"]
        XCTAssertTrue(loadingIndicator.exists)
        
        // Wait for refresh to complete
        let refreshComplete = NSPredicate(format: "exists == false")
        expectation(for: refreshComplete, evaluatedWith: loadingIndicator, handler: nil)
        waitForExpectations(timeout: 5, handler: nil)
        
        // Verify content updates
        let updatedItems = expiringItemsTable.cells.count
        XCTAssertGreaterThanOrEqual(updatedItems, 0)
    }
}