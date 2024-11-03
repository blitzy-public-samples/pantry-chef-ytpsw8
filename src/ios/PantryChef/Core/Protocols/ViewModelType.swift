// HUMAN TASKS:
// 1. Ensure iOS deployment target is set to iOS 13.0 or higher in Xcode project settings
// 2. Verify that Combine framework is properly linked in the project

// External dependencies:
// - Foundation framework (iOS 13.0+)
// - Combine framework (iOS 13.0+)

import Foundation
import Combine

/// Protocol defining the standard interface for view models in the MVVM architecture,
/// ensuring consistent state management and data flow across the application.
/// Implements requirements from:
/// - Mobile Application Architecture (5.2.1): MVVM architecture pattern with state management
/// - State Management (5.2.1): Standardizes state management using Combine framework
protocol ViewModelType {
    /// Type representing all possible input events the view model can handle,
    /// typically an enum of user actions or system events
    associatedtype Input
    
    /// Type representing all possible output events the view model can emit,
    /// typically an enum of UI updates or navigation actions
    associatedtype Output
    
    /// Type representing the view model's internal state,
    /// typically a struct containing all UI-relevant data
    associatedtype State
    
    /// A publisher that maintains and emits the current state of the view model.
    /// Uses CurrentValueSubject to provide immediate access to the current state
    /// and emit updates when the state changes.
    var state: CurrentValueSubject<State, Never> { get }
    
    /// Transforms input events into state changes and output events using Combine operators.
    /// - Parameter input: A publisher that emits user actions or system events
    /// - Returns: A publisher that emits view model outputs based on state changes and input processing
    func transform(input: AnyPublisher<Input, Never>) -> AnyPublisher<Output, Never>
}