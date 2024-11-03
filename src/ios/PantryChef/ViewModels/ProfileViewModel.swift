// HUMAN TASKS:
// 1. Ensure iOS deployment target is set to iOS 13.0 or higher in Xcode project settings
// 2. Configure keychain access groups for secure user data storage
// 3. Set up analytics tracking for profile-related events
// 4. Review and adjust input validation rules based on security requirements

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - ProfileViewModelInput
// Requirement: User Profile Management - Define all possible user profile actions
public enum ProfileViewModelInput {
    case updateProfile(firstName: String, lastName: String)
    case updatePreferences(UserPreferences)
    case updateDietaryRestrictions([DietaryRestriction])
    case updateProfileImage(Data?)
    case logout
}

// MARK: - ProfileViewModelOutput
// Requirement: User Profile Management - Define all possible profile operation results
public enum ProfileViewModelOutput {
    case profileUpdated
    case preferencesUpdated
    case dietaryRestrictionsUpdated
    case profileImageUpdated
    case logoutCompleted
    case error(AuthenticationError)
}

// MARK: - ProfileViewModelState
// Requirement: User Profile Management - Define view model state structure
public struct ProfileViewModelState {
    var currentUser: User?
    var isLoading: Bool
    var error: AuthenticationError?
}

// MARK: - ProfileViewModelType
// Requirement: User Profile Management - Define profile view model interface
public protocol ProfileViewModelType: ViewModelType {
    associatedtype Input = ProfileViewModelInput
    associatedtype Output = ProfileViewModelOutput
    associatedtype State = ProfileViewModelState
}

// MARK: - ProfileViewModel
// Requirement: User Profile Management - Implement secure profile management functionality
@MainActor
public final class ProfileViewModel: ProfileViewModelType {
    // MARK: - Properties
    public let state: CurrentValueSubject<ProfileViewModelState, Never>
    private let input = PassthroughSubject<ProfileViewModelInput, Never>()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    // Requirement: User Profile Management - Initialize with user data
    public init(user: User) {
        // Initialize state with provided user
        self.state = CurrentValueSubject<ProfileViewModelState, Never>(
            ProfileViewModelState(
                currentUser: user,
                isLoading: false,
                error: nil
            )
        )
        
        // Set up authentication state observation
        setupAuthenticationObserver()
    }
    
    // MARK: - Public Methods
    // Requirement: User Profile Management - Transform input events to state changes and outputs
    public func transform(input: AnyPublisher<ProfileViewModelInput, Never>) -> AnyPublisher<ProfileViewModelOutput, Never> {
        input
            .receive(on: DispatchQueue.main)
            .flatMap { [weak self] input -> AnyPublisher<ProfileViewModelOutput, Never> in
                guard let self = self else {
                    return Empty().eraseToAnyPublisher()
                }
                
                // Update loading state
                self.state.value.isLoading = true
                
                // Process different input events
                switch input {
                case .updateProfile(let firstName, let lastName):
                    return self.handleProfileUpdate(firstName: firstName, lastName: lastName)
                    
                case .updatePreferences(let preferences):
                    return self.handlePreferencesUpdate(preferences)
                    
                case .updateDietaryRestrictions(let restrictions):
                    return self.handleDietaryRestrictionsUpdate(restrictions)
                    
                case .updateProfileImage(let imageData):
                    return self.handleProfileImageUpdate(imageData)
                    
                case .logout:
                    return self.handleLogout()
                }
            }
            .handleEvents(receiveCompletion: { [weak self] _ in
                // Reset loading state on completion
                self?.state.value.isLoading = false
            })
            .eraseToAnyPublisher()
    }
    
    // MARK: - Profile Update Methods
    // Requirement: User Preference Management - Handle profile information updates
    public func updateProfile(firstName: String, lastName: String) -> AnyPublisher<Void, AuthenticationError> {
        Future<Void, AuthenticationError> { [weak self] promise in
            guard let self = self,
                  let user = self.state.value.currentUser else {
                promise(.failure(.unknown))
                return
            }
            
            // Validate input
            guard !firstName.isEmpty && firstName.count <= 50,
                  !lastName.isEmpty && lastName.count <= 50 else {
                promise(.failure(.invalidCredentials))
                return
            }
            
            // Update user profile
            user.updateProfile(firstName: firstName, lastName: lastName)
            
            // Update state
            self.state.value.currentUser = user
            promise(.success(()))
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    // Requirement: User Preference Management - Handle profile update operations
    private func handleProfileUpdate(firstName: String, lastName: String) -> AnyPublisher<ProfileViewModelOutput, Never> {
        updateProfile(firstName: firstName, lastName: lastName)
            .map { _ -> ProfileViewModelOutput in .profileUpdated }
            .catch { error -> Just<ProfileViewModelOutput> in
                self.state.value.error = error
                return Just(.error(error))
            }
            .eraseToAnyPublisher()
    }
    
    // Requirement: User Preference Management - Handle preferences update
    private func handlePreferencesUpdate(_ preferences: UserPreferences) -> AnyPublisher<ProfileViewModelOutput, Never> {
        Future<ProfileViewModelOutput, Never> { [weak self] promise in
            guard let self = self,
                  let user = self.state.value.currentUser else {
                promise(.success(.error(.unknown)))
                return
            }
            
            // Update user preferences
            user.updatePreferences(preferences)
            
            // Update state
            self.state.value.currentUser = user
            promise(.success(.preferencesUpdated))
        }
        .eraseToAnyPublisher()
    }
    
    // Requirement: User Preference Management - Handle dietary restrictions update
    private func handleDietaryRestrictionsUpdate(_ restrictions: [DietaryRestriction]) -> AnyPublisher<ProfileViewModelOutput, Never> {
        Future<ProfileViewModelOutput, Never> { [weak self] promise in
            guard let self = self,
                  let user = self.state.value.currentUser else {
                promise(.success(.error(.unknown)))
                return
            }
            
            // Clear existing restrictions
            user.dietaryRestrictions.removeAll()
            
            // Add new restrictions
            restrictions.forEach { restriction in
                _ = user.addDietaryRestriction(restriction)
            }
            
            // Update state
            self.state.value.currentUser = user
            promise(.success(.dietaryRestrictionsUpdated))
        }
        .eraseToAnyPublisher()
    }
    
    // Requirement: Data Security - Handle secure profile image updates
    private func handleProfileImageUpdate(_ imageData: Data?) -> AnyPublisher<ProfileViewModelOutput, Never> {
        Future<ProfileViewModelOutput, Never> { [weak self] promise in
            guard let self = self,
                  let user = self.state.value.currentUser else {
                promise(.success(.error(.unknown)))
                return
            }
            
            // Validate image data
            guard let imageData = imageData,
                  !imageData.isEmpty else {
                promise(.success(.error(.invalidCredentials)))
                return
            }
            
            // TODO: Implement image upload to secure storage
            // For now, just update the user model with a placeholder
            user.updateProfile(profileImage: "placeholder_image")
            
            // Update state
            self.state.value.currentUser = user
            promise(.success(.profileImageUpdated))
        }
        .eraseToAnyPublisher()
    }
    
    // Requirement: User Profile Management - Handle secure logout
    private func handleLogout() -> AnyPublisher<ProfileViewModelOutput, Never> {
        AuthenticationService.shared.logout()
            .map { _ -> ProfileViewModelOutput in .logoutCompleted }
            .catch { error -> Just<ProfileViewModelOutput> in
                self.state.value.error = error
                return Just(.error(error))
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Authentication Observer
    private func setupAuthenticationObserver() {
        // Observe authentication state changes
        NotificationCenter.default.publisher(for: NSNotification.Name("UserProfileUpdated"))
            .sink { [weak self] notification in
                guard let user = notification.object as? User else { return }
                self?.state.value.currentUser = user
            }
            .store(in: &cancellables)
    }
}