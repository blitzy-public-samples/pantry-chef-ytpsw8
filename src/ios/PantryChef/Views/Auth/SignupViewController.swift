//
// SignupViewController.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure OAuth2.0 client credentials in build configuration
// 2. Set up analytics tracking for signup events
// 3. Configure error message localizations
// 4. Review and adjust keyboard handling for different device sizes
// 5. Verify accessibility labels and hints

import UIKit // iOS 13.0+
import Combine // iOS 13.0+

/// View controller handling the user signup flow with email, password, and profile information
/// Implements JWT-based authentication with OAuth2.0 support
///
/// Requirement addressed: Authentication Flow (9.1.1)
/// - Implements secure user registration with email/password validation
/// - Integrates with JWT token-based authentication
///
/// Requirement addressed: Screen Components (8.1.2)
/// - Implements signup form with validation following design system
final class SignupViewController: UIViewController, ViewConfigurable {
    
    // MARK: - Properties
    
    private let viewModel: AuthViewModel
    private let inputSubject = PassthroughSubject<AuthViewModelInput, Never>()
    private var cancellables = Set<AnyCancellable>()
    
    // Form Fields
    private lazy var emailTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "Email"
        textField.keyboardType = .emailAddress
        textField.autocapitalizationType = .none
        textField.autocorrectionType = .no
        textField.returnKeyType = .next
        textField.accessibilityIdentifier = "signup_email_field"
        return textField
    }()
    
    private lazy var passwordTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "Password"
        textField.isSecureTextEntry = true
        textField.returnKeyType = .next
        textField.accessibilityIdentifier = "signup_password_field"
        return textField
    }()
    
    private lazy var firstNameTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "First Name"
        textField.autocapitalizationType = .words
        textField.returnKeyType = .next
        textField.accessibilityIdentifier = "signup_firstname_field"
        return textField
    }()
    
    private lazy var lastNameTextField: CustomTextField = {
        let textField = CustomTextField()
        textField.placeholder = "Last Name"
        textField.autocapitalizationType = .words
        textField.returnKeyType = .done
        textField.accessibilityIdentifier = "signup_lastname_field"
        return textField
    }()
    
    private lazy var signupButton: CustomButton = {
        let button = CustomButton(style: .primary)
        button.setTitle("Sign Up", for: .normal)
        button.accessibilityIdentifier = "signup_button"
        button.addTarget(self, action: #selector(handleSignupTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var formStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 16
        stackView.distribution = .fillEqually
        stackView.translatesAutoresizingMaskIntoConstraints = false
        return stackView
    }()
    
    // MARK: - Initialization
    
    init() {
        self.viewModel = AuthViewModel()
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        configure()
        setupBindings()
    }
    
    // MARK: - ViewConfigurable Implementation
    
    func setupView() {
        title = "Create Account"
        
        // Add form fields to stack view
        formStackView.addArrangedSubview(emailTextField)
        formStackView.addArrangedSubview(passwordTextField)
        formStackView.addArrangedSubview(firstNameTextField)
        formStackView.addArrangedSubview(lastNameTextField)
        
        // Add views to hierarchy
        view.addSubview(formStackView)
        view.addSubview(signupButton)
        
        // Configure text field delegates
        emailTextField.delegate = self
        passwordTextField.delegate = self
        firstNameTextField.delegate = self
        lastNameTextField.delegate = self
        
        // Setup keyboard handling
        setupKeyboardHandling()
    }
    
    func configureLayout() {
        let safeArea = view.safeAreaLayoutGuide
        
        NSLayoutConstraint.activate([
            // Form stack view constraints
            formStackView.topAnchor.constraint(equalTo: safeArea.topAnchor, constant: 32),
            formStackView.leadingAnchor.constraint(equalTo: safeArea.leadingAnchor, constant: 24),
            formStackView.trailingAnchor.constraint(equalTo: safeArea.trailingAnchor, constant: -24),
            
            // Signup button constraints
            signupButton.leadingAnchor.constraint(equalTo: formStackView.leadingAnchor),
            signupButton.trailingAnchor.constraint(equalTo: formStackView.trailingAnchor),
            signupButton.topAnchor.constraint(equalTo: formStackView.bottomAnchor, constant: 32),
            
            // Text field height constraints
            emailTextField.heightAnchor.constraint(equalToConstant: 48),
            passwordTextField.heightAnchor.constraint(equalToConstant: 48),
            firstNameTextField.heightAnchor.constraint(equalToConstant: 48),
            lastNameTextField.heightAnchor.constraint(equalToConstant: 48)
        ])
        
        signupButton.translatesAutoresizingMaskIntoConstraints = false
    }
    
    func configureAppearance() {
        view.backgroundColor = Theme.shared.color(.surface)
        
        // Configure navigation bar
        navigationController?.navigationBar.prefersLargeTitles = true
        navigationItem.largeTitleDisplayMode = .always
        
        // Apply theme to text fields
        [emailTextField, passwordTextField, firstNameTextField, lastNameTextField].forEach { textField in
            textField.borderColor = Theme.shared.color(.secondary)
            textField.backgroundColor = Theme.shared.color(.surface)
        }
    }
    
    // MARK: - Private Methods
    
    private func setupBindings() {
        // Transform view model inputs to outputs
        viewModel.transform(input: inputSubject.eraseToAnyPublisher())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] output in
                self?.handleViewModelOutput(output)
            }
            .store(in: &cancellables)
        
        // Bind text field validation
        emailTextField.textPublisher
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] email in
                guard let email = email else { return }
                self?.inputSubject.send(.validateEmail(email))
            }
            .store(in: &cancellables)
        
        passwordTextField.textPublisher
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] password in
                guard let password = password else { return }
                self?.inputSubject.send(.validatePassword(password))
            }
            .store(in: &cancellables)
        
        // Observe view model state
        viewModel.state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.updateUI(with: state)
            }
            .store(in: &cancellables)
    }
    
    private func handleViewModelOutput(_ output: AuthViewModelOutput) {
        switch output {
        case .signupSuccess(let user):
            // Handle successful signup
            signupButton.setLoading(false)
            // Navigate to main app flow
            NotificationCenter.default.post(name: .userDidSignUp, object: user)
            
        case .signupFailure(let error):
            // Handle signup failure
            signupButton.setLoading(false)
            showError(message: error.localizedDescription)
            
        case .validationError(let field, let message):
            // Handle field validation errors
            switch field {
            case "email":
                emailTextField.setError(message)
            case "password":
                passwordTextField.setError(message)
            default:
                break
            }
            
        case .loading(let isLoading):
            signupButton.setLoading(isLoading)
            
        default:
            break
        }
    }
    
    private func updateUI(with state: AuthViewModelState) {
        // Update email validation state
        if let emailError = state.emailValidationError {
            emailTextField.setError(emailError)
        } else {
            emailTextField.clearError()
        }
        
        // Update password validation state
        if let passwordError = state.passwordValidationError {
            passwordTextField.setError(passwordError)
        } else {
            passwordTextField.clearError()
        }
        
        // Update loading state
        signupButton.setLoading(state.isLoading)
    }
    
    @objc private func handleSignupTapped() {
        // Validate all fields
        guard let email = emailTextField.text, !email.isEmpty,
              let password = passwordTextField.text, !password.isEmpty,
              let firstName = firstNameTextField.text, !firstName.isEmpty,
              let lastName = lastNameTextField.text, !lastName.isEmpty else {
            showError(message: "Please fill in all fields")
            return
        }
        
        // Send signup input to view model
        signupButton.setLoading(true)
        inputSubject.send(.signup(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        ))
    }
    
    private func showError(message: String) {
        let alert = UIAlertController(
            title: "Error",
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    private func setupKeyboardHandling() {
        // Add tap gesture to dismiss keyboard
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        view.addGestureRecognizer(tapGesture)
        
        // Observe keyboard notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    @objc private func keyboardWillShow(notification: NSNotification) {
        guard let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else {
            return
        }
        
        let keyboardHeight = keyboardFrame.height
        let buttonBottomSpace = view.frame.height - (signupButton.frame.origin.y + signupButton.frame.height)
        
        if buttonBottomSpace < keyboardHeight {
            let offset = keyboardHeight - buttonBottomSpace + 20
            view.frame.origin.y = -offset
        }
    }
    
    @objc private func keyboardWillHide(notification: NSNotification) {
        view.frame.origin.y = 0
    }
    
    // MARK: - Cleanup
    
    deinit {
        NotificationCenter.default.removeObserver(self)
        cancellables.forEach { $0.cancel() }
    }
}

// MARK: - UITextFieldDelegate

extension SignupViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case emailTextField:
            passwordTextField.becomeFirstResponder()
        case passwordTextField:
            firstNameTextField.becomeFirstResponder()
        case firstNameTextField:
            lastNameTextField.becomeFirstResponder()
        case lastNameTextField:
            textField.resignFirstResponder()
            handleSignupTapped()
        default:
            textField.resignFirstResponder()
        }
        return true
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let userDidSignUp = Notification.Name("userDidSignUp")
}

// MARK: - UITextField Combine Extensions

extension UITextField {
    var textPublisher: AnyPublisher<String?, Never> {
        NotificationCenter.default
            .publisher(for: UITextField.textDidChangeNotification, object: self)
            .map { ($0.object as? UITextField)?.text }
            .eraseToAnyPublisher()
    }
}