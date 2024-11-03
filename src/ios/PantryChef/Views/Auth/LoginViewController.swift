// HUMAN TASKS:
// 1. Configure OAuth2.0 client credentials in build configuration
// 2. Set up analytics tracking for login events
// 3. Configure biometric authentication if enabled
// 4. Review accessibility labels and hints
// 5. Test VoiceOver navigation flow

import UIKit // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - LoginViewController
// Requirement: Authentication Flow - Implements secure user authentication interface with email and password
final class LoginViewController: UIViewController {
    
    // MARK: - Properties
    private let viewModel = AuthViewModel()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - UI Components
    private lazy var emailTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "Email"
        textField.keyboardType = .emailAddress
        textField.autocapitalizationType = .none
        textField.autocorrectionType = .no
        textField.returnKeyType = .next
        textField.accessibilityIdentifier = "loginEmailTextField"
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    private lazy var passwordTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "Password"
        textField.isSecureTextEntry = true
        textField.returnKeyType = .done
        textField.accessibilityIdentifier = "loginPasswordTextField"
        textField.translatesAutoresizingMaskIntoConstraints = false
        return textField
    }()
    
    private lazy var loginButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Log In", for: .normal)
        button.backgroundColor = Theme.shared.color(.primary)
        button.setTitleColor(Theme.shared.color(.onPrimary), for: .normal)
        button.titleLabel?.font = Theme.shared.buttonFont
        button.layer.cornerRadius = 8
        button.accessibilityIdentifier = "loginButton"
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private lazy var forgotPasswordButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Forgot Password?", for: .normal)
        button.setTitleColor(Theme.shared.color(.secondary), for: .normal)
        button.titleLabel?.font = Theme.shared.captionFont
        button.accessibilityIdentifier = "forgotPasswordButton"
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private lazy var signupButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Don't have an account? Sign Up", for: .normal)
        button.setTitleColor(Theme.shared.color(.primary), for: .normal)
        button.titleLabel?.font = Theme.shared.bodyFont
        button.accessibilityIdentifier = "signupButton"
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private lazy var loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.hidesWhenStopped = true
        indicator.translatesAutoresizingMaskIntoConstraints = false
        return indicator
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        bindViewModel()
    }
    
    // MARK: - UI Setup
    // Requirement: Mobile Applications - Provides native iOS login interface with secure authentication
    private func setupUI() {
        view.backgroundColor = Theme.shared.color(.background)
        
        // Add subviews
        view.addSubview(emailTextField)
        view.addSubview(passwordTextField)
        view.addSubview(loginButton)
        view.addSubview(forgotPasswordButton)
        view.addSubview(signupButton)
        view.addSubview(loadingIndicator)
        
        // Layout constraints
        NSLayoutConstraint.activate([
            emailTextField.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 32),
            emailTextField.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            emailTextField.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            
            passwordTextField.topAnchor.constraint(equalTo: emailTextField.bottomAnchor, constant: 16),
            passwordTextField.leadingAnchor.constraint(equalTo: emailTextField.leadingAnchor),
            passwordTextField.trailingAnchor.constraint(equalTo: emailTextField.trailingAnchor),
            
            loginButton.topAnchor.constraint(equalTo: passwordTextField.bottomAnchor, constant: 24),
            loginButton.leadingAnchor.constraint(equalTo: emailTextField.leadingAnchor),
            loginButton.trailingAnchor.constraint(equalTo: emailTextField.trailingAnchor),
            loginButton.heightAnchor.constraint(equalToConstant: 48),
            
            forgotPasswordButton.topAnchor.constraint(equalTo: loginButton.bottomAnchor, constant: 16),
            forgotPasswordButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            
            signupButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            signupButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            
            loadingIndicator.centerXAnchor.constraint(equalTo: loginButton.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: loginButton.centerYAnchor)
        ])
        
        // Add targets
        loginButton.addTarget(self, action: #selector(loginButtonTapped), for: .touchUpInside)
        forgotPasswordButton.addTarget(self, action: #selector(forgotPasswordButtonTapped), for: .touchUpInside)
        signupButton.addTarget(self, action: #selector(signupButtonTapped), for: .touchUpInside)
        
        // Setup keyboard handling
        setupKeyboardHandling()
    }
    
    // MARK: - ViewModel Binding
    // Requirement: Authentication Flow - Implements secure JWT token management and OAuth2.0 support
    private func bindViewModel() {
        // Bind text field validation
        emailTextField.textPublisher
            .removeDuplicates()
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] email in
                self?.viewModel.validateEmail(email)
            }
            .store(in: &cancellables)
        
        passwordTextField.textPublisher
            .removeDuplicates()
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] password in
                self?.viewModel.validatePassword(password)
            }
            .store(in: &cancellables)
        
        // Bind view model state
        viewModel.state
            .sink { [weak self] state in
                self?.updateUI(with: state)
            }
            .store(in: &cancellables)
        
        // Bind authentication output
        let input = PassthroughSubject<AuthViewModelInput, Never>()
        
        viewModel.transform(input: input.eraseToAnyPublisher())
            .sink { [weak self] output in
                self?.handleAuthenticationOutput(output)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - UI Updates
    private func updateUI(with state: AuthViewModelState) {
        // Update loading state
        if state.isLoading {
            loadingIndicator.startAnimating()
            loginButton.setTitle("", for: .normal)
            loginButton.isEnabled = false
        } else {
            loadingIndicator.stopAnimating()
            loginButton.setTitle("Log In", for: .normal)
            loginButton.isEnabled = true
        }
        
        // Update validation errors
        if let emailError = state.emailValidationError {
            emailTextField.setError(emailError)
        } else {
            emailTextField.clearError()
        }
        
        if let passwordError = state.passwordValidationError {
            passwordTextField.setError(passwordError)
        } else {
            passwordTextField.clearError()
        }
    }
    
    // MARK: - Authentication Handling
    // Requirement: Security Protocols - Implements device verification and session management
    private func handleAuthenticationOutput(_ output: AuthViewModelOutput) {
        switch output {
        case .loginSuccess(let user):
            // Navigate to main app flow
            NotificationCenter.default.post(name: .userDidLogin, object: user)
            
        case .loginFailure(let error):
            showAlert(title: "Login Failed", message: error.localizedDescription)
            
        case .validationError(let field, let message):
            switch field {
            case "email":
                emailTextField.setError(message)
            case "password":
                passwordTextField.setError(message)
            default:
                break
            }
            
        default:
            break
        }
    }
    
    // MARK: - Actions
    @objc private func loginButtonTapped() {
        guard let email = emailTextField.text,
              let password = passwordTextField.text,
              emailTextField.isValid,
              passwordTextField.isValid else {
            return
        }
        
        view.endEditing(true)
        viewModel.transform(input: Just(.login(email: email, password: password)).eraseToAnyPublisher())
            .sink { [weak self] output in
                self?.handleAuthenticationOutput(output)
            }
            .store(in: &cancellables)
    }
    
    @objc private func forgotPasswordButtonTapped() {
        // Navigate to password reset flow
        let email = emailTextField.text ?? ""
        NotificationCenter.default.post(name: .showForgotPassword, object: email)
    }
    
    @objc private func signupButtonTapped() {
        // Navigate to signup flow
        let email = emailTextField.text ?? ""
        NotificationCenter.default.post(name: .showSignup, object: email)
    }
    
    // MARK: - Keyboard Handling
    private func setupKeyboardHandling() {
        // Hide keyboard on tap
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        view.addGestureRecognizer(tapGesture)
        
        // Move view when keyboard shows/hides
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow), name: UIResponder.keyboardWillShowNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide), name: UIResponder.keyboardWillHideNotification, object: nil)
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    @objc private func keyboardWillShow(notification: NSNotification) {
        guard let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        
        let keyboardHeight = keyboardFrame.height
        let bottomSpace = view.frame.height - (signupButton.frame.origin.y + signupButton.frame.height)
        
        if bottomSpace < keyboardHeight {
            UIView.animate(withDuration: 0.3) {
                self.view.frame.origin.y = -(keyboardHeight - bottomSpace + 20)
            }
        }
    }
    
    @objc private func keyboardWillHide(notification: NSNotification) {
        UIView.animate(withDuration: 0.3) {
            self.view.frame.origin.y = 0
        }
    }
    
    // MARK: - Helper Methods
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - Deinitializer
    deinit {
        NotificationCenter.default.removeObserver(self)
        cancellables.forEach { $0.cancel() }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let userDidLogin = Notification.Name("userDidLogin")
    static let showForgotPassword = Notification.Name("showForgotPassword")
    static let showSignup = Notification.Name("showSignup")
}

// MARK: - UITextField Publisher
extension UITextField {
    var textPublisher: AnyPublisher<String, Never> {
        NotificationCenter.default
            .publisher(for: UITextField.textDidChangeNotification, object: self)
            .compactMap { ($0.object as? UITextField)?.text }
            .eraseToAnyPublisher()
    }
}