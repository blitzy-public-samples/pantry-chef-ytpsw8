// XCTest framework version: iOS 13.0+
import XCTest

class PantryUITests: XCTestCase {
    // MARK: - Properties
    var app: XCUIApplication!
    
    // MARK: - Human Tasks
    /*
    Required setup before running UI tests:
    1. Ensure the app is configured for UI testing mode in scheme settings
    2. Verify test data is properly seeded in the test environment
    3. Configure test environment variables if needed
    4. Ensure simulator/device has sufficient permissions granted
    */
    
    // MARK: - Setup and Teardown
    override func setUp() {
        super.setUp()
        
        // Initialize the application instance
        app = XCUIApplication()
        
        // Configure app for UI testing mode
        app.launchArguments = ["UI-Testing"]
        
        // Launch the application
        app.launch()
    }
    
    override func tearDown() {
        // Clean up the application state
        app.terminate()
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    /// Tests that the pantry view loads with all required components
    /// Requirement: Screen Components - Pantry screen with Category Tabs, Item List, Search Bar components
    func testPantryViewLoads() {
        // Navigate to pantry tab
        app.tabBars.buttons["Pantry"].tap()
        
        // Verify main components exist and are enabled
        XCTAssertTrue(app.tables["PantryTableView"].exists, "Pantry table view should exist")
        XCTAssertTrue(app.searchFields["SearchBar"].exists, "Search bar should exist")
        XCTAssertTrue(app.searchFields["SearchBar"].isEnabled, "Search bar should be enabled")
        
        // Verify category filter buttons
        let categoryButtons = app.buttons.matching(identifier: "CategoryFilterButton")
        XCTAssertTrue(categoryButtons.count > 0, "Category filter buttons should be present")
        
        // Verify pantry view title
        XCTAssertTrue(app.navigationBars["Pantry"].exists, "Pantry navigation bar should exist")
    }
    
    /// Tests adding a new ingredient to the pantry inventory
    /// Requirement: Digital Pantry Management - Digital pantry management with expiration tracking
    func testIngredientAddition() {
        // Navigate to pantry tab
        app.tabBars.buttons["Pantry"].tap()
        
        // Tap add button
        app.navigationBars["Pantry"].buttons["AddButton"].tap()
        
        // Fill ingredient details
        let nameField = app.textFields["IngredientNameField"]
        nameField.tap()
        nameField.typeText("Tomatoes")
        
        // Select category
        app.buttons["CategoryPicker"].tap()
        app.pickerWheels.element.adjust(toPickerWheelValue: "Vegetables")
        app.toolbars.buttons["Done"].tap()
        
        // Set quantity
        let quantityField = app.textFields["QuantityField"]
        quantityField.tap()
        quantityField.typeText("5")
        
        // Set unit
        app.buttons["UnitPicker"].tap()
        app.pickerWheels.element.adjust(toPickerWheelValue: "pieces")
        app.toolbars.buttons["Done"].tap()
        
        // Set expiration date
        app.buttons["ExpirationDatePicker"].tap()
        // Add 7 days to current date
        let datePicker = app.datePickers.element
        datePicker.adjust(toDatePickerValue: "7 days from now")
        app.toolbars.buttons["Done"].tap()
        
        // Save ingredient
        app.buttons["SaveButton"].tap()
        
        // Verify ingredient appears in list
        XCTAssertTrue(app.tables["PantryTableView"].cells.containing(NSPredicate(format: "label CONTAINS[c] %@", "Tomatoes")).element.exists)
    }
    
    /// Tests deleting an existing ingredient from the pantry
    /// Requirement: Digital Pantry Management - Digital pantry management with expiration tracking
    func testIngredientDeletion() {
        // Navigate to pantry tab
        app.tabBars.buttons["Pantry"].tap()
        
        // Find existing ingredient cell
        let ingredientCell = app.tables["PantryTableView"].cells.element(boundBy: 0)
        
        // Store ingredient name for verification
        let ingredientName = ingredientCell.staticTexts.element(boundBy: 0).label
        
        // Perform swipe left gesture
        ingredientCell.swipeLeft()
        
        // Tap delete button
        app.buttons["Delete"].tap()
        
        // Verify confirmation alert appears
        XCTAssertTrue(app.alerts["DeleteConfirmation"].exists)
        
        // Confirm deletion
        app.alerts["DeleteConfirmation"].buttons["Delete"].tap()
        
        // Verify ingredient no longer exists
        XCTAssertFalse(app.tables["PantryTableView"].cells.containing(NSPredicate(format: "label CONTAINS[c] %@", ingredientName)).element.exists)
    }
    
    /// Tests filtering pantry ingredients by category
    /// Requirement: Screen Components - Pantry screen with Category Tabs, Item List components
    func testCategoryFiltering() {
        // Navigate to pantry tab
        app.tabBars.buttons["Pantry"].tap()
        
        // Tap category filter
        app.buttons["CategoryFilterButton_Vegetables"].tap()
        
        // Verify category header
        XCTAssertTrue(app.staticTexts["CategoryHeader_Vegetables"].exists)
        
        // Verify only matching ingredients are shown
        let cells = app.tables["PantryTableView"].cells
        XCTAssertTrue(cells.count > 0, "Filtered results should exist")
        
        // Verify each visible cell belongs to selected category
        cells.allElementsBoundByIndex.forEach { cell in
            XCTAssertTrue(cell.staticTexts["CategoryLabel"].label == "Vegetables")
        }
        
        // Test switching category
        app.buttons["CategoryFilterButton_Dairy"].tap()
        XCTAssertTrue(app.staticTexts["CategoryHeader_Dairy"].exists)
    }
    
    /// Tests searching for ingredients in the pantry
    /// Requirement: Screen Components - Pantry screen with Search Bar component
    func testSearchFunctionality() {
        // Navigate to pantry tab
        app.tabBars.buttons["Pantry"].tap()
        
        // Tap search bar
        let searchBar = app.searchFields["SearchBar"]
        searchBar.tap()
        
        // Type search query
        searchBar.typeText("milk")
        
        // Verify search results
        let searchResults = app.tables["PantryTableView"].cells
        XCTAssertTrue(searchResults.count > 0, "Search should return results")
        
        // Verify matching items are displayed
        searchResults.allElementsBoundByIndex.forEach { cell in
            XCTAssertTrue(cell.staticTexts.element(boundBy: 0).label.lowercased().contains("milk"))
        }
        
        // Clear search
        app.buttons["ClearSearch"].tap()
        XCTAssertEqual(searchBar.value as? String, "", "Search bar should be empty after clearing")
    }
    
    /// Tests ingredient expiration tracking functionality
    /// Requirement: Digital Pantry Management - Digital pantry management with expiration tracking
    func testExpirationTracking() {
        // Navigate to pantry tab
        app.tabBars.buttons["Pantry"].tap()
        
        // Add ingredient with near expiration
        app.navigationBars["Pantry"].buttons["AddButton"].tap()
        
        let nameField = app.textFields["IngredientNameField"]
        nameField.tap()
        nameField.typeText("Expiring Milk")
        
        // Set quantity and unit
        app.textFields["QuantityField"].tap()
        app.textFields["QuantityField"].typeText("1")
        
        app.buttons["UnitPicker"].tap()
        app.pickerWheels.element.adjust(toPickerWheelValue: "gallon")
        app.toolbars.buttons["Done"].tap()
        
        // Set expiration date to tomorrow
        app.buttons["ExpirationDatePicker"].tap()
        let datePicker = app.datePickers.element
        datePicker.adjust(toDatePickerValue: "tomorrow")
        app.toolbars.buttons["Done"].tap()
        
        // Save ingredient
        app.buttons["SaveButton"].tap()
        
        // Verify expiration warning
        let expiringCell = app.tables["PantryTableView"].cells.containing(NSPredicate(format: "label CONTAINS[c] %@", "Expiring Milk")).element
        XCTAssertTrue(expiringCell.exists)
        XCTAssertTrue(expiringCell.images["ExpirationWarningIcon"].exists)
        
        // Verify expiration status
        XCTAssertTrue(expiringCell.staticTexts["ExpirationStatus"].label.contains("Expiring Soon"))
    }
}