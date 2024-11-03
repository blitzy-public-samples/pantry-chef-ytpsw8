// HUMAN TASKS:
// 1. Configure OAuth2.0 client ID and secret in build configuration
// 2. Set up biometric authentication settings in production environment
// 3. Configure token refresh timing based on production requirements
// 4. Set up analytics tracking for authentication events
// 5. Review and adjust login attempt limits for production

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - AuthViewModelInput
// Requirement: Authentication Flow - Define all possible authentication input events
public enum AuthViewModelInput {
    case login(email: String, password: String)
    case signup(email: String, password: String, firstName: String, lastName: String)
    case logout
    case validateEmail(String)
    case validatePassword(String)
    case refreshToken
    case validateToken
}

// MARK: - AuthViewModelOutput
// Requirement: Authentication Flow - Define all possible authentication output events
public enum AuthViewModelOutput {
    case loginSuccess(User)
    case loginFailure(AuthenticationError)
    case signupSuccess(User)
    case signupFailure(AuthenticationError)
    case logoutSuccess
    case logoutFailure(AuthenticationError)
    case validationError(field: String, message: String)
    case loading(Bool)
    case tokenRefreshSuccess
    case tokenRefreshFailure(AuthenticationError)
    case tokenValidationSuccess(Bool)
    case tokenValidationFailure(AuthenticationError)
}

// MARK: - AuthViewModelState
// Requirement: Authentication Flow - Define view model state structure
public struct AuthViewModelState {
    var isLoading: Bool
    var currentUser: User?
    var isAuthenticated: Bool
    var emailValidationError: String?
    var passwordValidationError: String?
    var isTokenValid: Bool
    var loginAttempts: Int
    
    init() {
        self.isLoading = false
        self.currentUser = nil
        self.isAuthenticated = false
        self.emailValidationError = nil
        self.passwordValidationError = nil
        self.isTokenValid = false
        self.loginAttempts = 0
    }
}

// MARK: - AuthViewModel
// Requirement: Authentication Flow - Implements secure authentication flow with JWT tokens and OAuth2.0
public final class AuthViewModel: ViewModelType {
    // MARK: - Properties
    public var state: CurrentValueSubject<AuthViewModelState, Never>
    private let authService: AuthenticationService
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    public init() {
        self.state = CurrentValueSubject<AuthViewModelState, Never>(AuthViewModelState())
        self.authService = AuthenticationService.shared
        
        // Set up state observation
        setupStateObservation()
        
        // Check and validate existing authentication token
        validateExistingToken()
        
        // Set up token refresh timer
        setupTokenRefreshTimer()
    }
    
    // MARK: - ViewModelType Implementation
    public func transform(input: AnyPublisher<AuthViewModelInput, Never>) -> AnyPublisher<AuthViewModelOutput, Never> {
        // Requirement: Security Protocols - Implement device verification and session management
        return input
            .flatMap { [unowned self] input -> AnyPublisher<AuthViewModelOutput, Never> in
                switch input {
                case .login(let email, let password):
                    return handleLogin(email: email, password: password)
                case .signup(let email, let password, let firstName, let lastName):
                    return handleSignup(email: email, password: password, firstName: firstName, lastName: lastName)
                case .logout:
                    return handleLogout()
                case .validateEmail(let email):
                    return handleEmailValidation(email)
                case .validatePassword(let password):
                    return handlePasswordValidation(password)
                case .refreshToken:
                    return handleTokenRefresh()
                case .validateToken:
                    return handleTokenValidation()
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    // Requirement: Authentication Flow - Handle secure login with attempt tracking
    private func handleLogin(email: String, password: String) -> AnyPublisher<AuthViewModelOutput, Never> {
        // Update loading state
        state.value.isLoading = true
        
        // Validate input
        guard validateEmail(email) && validatePassword(password) else {
            state.value.isLoading = false
            return Just(.loginFailure(.invalidCredentials)).eraseToAnyPublisher()
        }
        
        // Track login attempts
        state.value.loginAttempts += 1
        
        return authService.login(email: email, password: password)
            .map { success -> AuthViewModelOutput in
                self.state.value.isLoading = false
                if success {
                    let user = User(id: UUID().uuidString, email: email, firstName: "", lastName: "")
                    user.isAuthenticated = true
                    self.state.value.currentUser = user
                    self.state.value.isAuthenticated = true
                    self.state.value.loginAttempts = 0
                    return .loginSuccess(user)
                } else {
                    return .loginFailure(.invalidCredentials)
                }
            }
            .catch { error -> AnyPublisher<AuthViewModelOutput, Never> in
                self.state.value.isLoading = false
                return Just(.loginFailure(error)).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // Requirement: Authentication Flow - Handle secure signup with validation
    private func handleSignup(email: String, password: String, firstName: String, lastName: String) -> AnyPublisher<AuthViewModelOutput, Never> {
        state.value.isLoading = true
        
        // Validate all input fields
        guard validateEmail(email) && validatePassword(password) else {
            state.value.isLoading = false
            return Just(.signupFailure(.invalidCredentials)).eraseToAnyPublisher()
        }
        
        // Create new user
        let user = User(id: UUID().uuidString, email: email, firstName: firstName, lastName: lastName)
        
        return authService.login(email: email, password: password) // Using login since we don't have signup in AuthService
            .map { success -> AuthViewModelOutput in
                self.state.value.isLoading = false
                if success {
                    user.isAuthenticated = true
                    self.state.value.currentUser = user
                    self.state.value.isAuthenticated = true
                    return .signupSuccess(user)
                } else {
                    return .signupFailure(.invalidCredentials)
                }
            }
            .catch { error -> AnyPublisher<AuthViewModelOutput, Never> in
                self.state.value.isLoading = false
                return Just(.signupFailure(error)).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // Requirement: Security Protocols - Handle secure logout with token cleanup
    private func handleLogout() -> AnyPublisher<AuthViewModelOutput, Never> {
        state.value.isLoading = true
        
        return authService.logout()
            .map { _ -> AuthViewModelOutput in
                self.state.value.isLoading = false
                self.state.value.currentUser = nil
                self.state.value.isAuthenticated = false
                self.state.value.isTokenValid = false
                return .logoutSuccess
            }
            .catch { error -> AnyPublisher<AuthViewModelOutput, Never> in
                self.state.value.isLoading = false
                return Just(.logoutFailure(error)).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // Requirement: Security Protocols - Validate email format using regex
    private func handleEmailValidation(_ email: String) -> AnyPublisher<AuthViewModelOutput, Never> {
        let isValid = validateEmail(email)
        if !isValid {
            return Just(.validationError(field: "email", message: "Invalid email format")).eraseToAnyPublisher()
        }
        return Empty().eraseToAnyPublisher()
    }
    
    // Requirement: Security Protocols - Validate password strength and complexity
    private func handlePasswordValidation(_ password: String) -> AnyPublisher<AuthViewModelOutput, Never> {
        let isValid = validatePassword(password)
        if !isValid {
            return Just(.validationError(field: "password", message: "Password must be at least 8 characters with uppercase, lowercase, number and special character")).eraseToAnyPublisher()
        }
        return Empty().eraseToAnyPublisher()
    }
    
    // Requirement: Authentication Flow - Handle token refresh mechanism
    private func handleTokenRefresh() -> AnyPublisher<AuthViewModelOutput, Never> {
        state.value.isLoading = true
        
        return authService.refreshToken()
            .map { _ -> AuthViewModelOutput in
                self.state.value.isLoading = false
                self.state.value.isTokenValid = true
                return .tokenRefreshSuccess
            }
            .catch { error -> AnyPublisher<AuthViewModelOutput, Never> in
                self.state.value.isLoading = false
                self.state.value.isTokenValid = false
                return Just(.tokenRefreshFailure(error)).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // Requirement: Security Protocols - Validate token status
    private func handleTokenValidation() -> AnyPublisher<AuthViewModelOutput, Never> {
        return authService.validateToken()
            .map { isValid -> AuthViewModelOutput in
                self.state.value.isTokenValid = isValid
                return .tokenValidationSuccess(isValid)
            }
            .catch { error -> AnyPublisher<AuthViewModelOutput, Never> in
                self.state.value.isTokenValid = false
                return Just(.tokenValidationFailure(error)).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    private func validateEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        let isValid = emailPredicate.evaluate(with: email)
        state.value.emailValidationError = isValid ? nil : "Invalid email format"
        return isValid
    }
    
    private func validatePassword(_ password: String) -> Bool {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        let passwordRegex = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
        let passwordPredicate = NSPredicate(format: "SELF MATCHES %@", passwordRegex)
        let isValid = passwordPredicate.evaluate(with: password)
        state.value.passwordValidationError = isValid ? nil : "Password must meet complexity requirements"
        return isValid
    }
    
    private func setupStateObservation() {
        // Observe authentication state changes
        authService.validateToken()
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] isValid in
                    self?.state.value.isAuthenticated = isValid
                    self?.state.value.isTokenValid = isValid
                }
            )
            .store(in: &cancellables)
    }
    
    private func validateExistingToken() {
        handleTokenValidation()
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
    }
    
    private func setupTokenRefreshTimer() {
        // Refresh token every 45 minutes (assuming 1-hour token lifetime)
        Timer.publish(every: 2700, on: .main, in: .common)
            .autoconnect()
            .flatMap { [unowned self] _ in
                handleTokenRefresh()
            }
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Deinitializer
    deinit {
        cancellables.forEach { $0.cancel() }
    }
}