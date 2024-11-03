//
// ProfileViewController.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure analytics tracking for profile-related events
// 2. Review accessibility labels and hints for VoiceOver support
// 3. Test dynamic type scaling across all device sizes
// 4. Verify secure data handling compliance with security requirements
// 5. Set up proper keychain access for user data

import UIKit // iOS 13.0+
import Combine // iOS 13.0+

/// View controller managing the user profile screen with secure data handling and reactive updates
/// Requirements addressed:
/// - User Profile Management (5.1 High-Level Architecture Overview/Application Services)
/// - User Configuration (8.1.2 Screen Components/Profile)
/// - Data Security (9.2 Data Security/9.2.1 Encryption Standards)
@MainActor
final class ProfileViewController: UIViewController, ViewConfigurable {
    
    // MARK: - Properties
    
    private let viewModel: ProfileViewModel
    private var cancellables = Set<AnyCancellable>()
    
    private lazy var tableView: UITableView = {
        let tableView = UITableView(frame: .zero, style: .insetGrouped)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(SettingsCell.self, forCellReuseIdentifier: SettingsCell.reuseIdentifier)
        return tableView
    }()
    
    private let profileImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 50
        imageView.backgroundColor = .systemGray5
        return imageView
    }()
    
    private let nameLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 24, weight: .semibold)
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 1
        return label
    }()
    
    private lazy var editProfileButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Edit Profile", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
        button.addTarget(self, action: #selector(editProfileTapped), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Initialization
    
    init(viewModel: ProfileViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        configure()
        bindViewModel()
    }
    
    // MARK: - ViewConfigurable Implementation
    
    func setupView() {
        title = "Profile"
        view.backgroundColor = .systemBackground
        
        view.addSubview(profileImageView)
        view.addSubview(nameLabel)
        view.addSubview(editProfileButton)
        view.addSubview(tableView)
        
        // Configure accessibility
        profileImageView.isAccessibilityElement = true
        profileImageView.accessibilityLabel = "Profile Picture"
        profileImageView.accessibilityTraits = .image
        
        nameLabel.isAccessibilityElement = true
        nameLabel.accessibilityTraits = .header
        
        editProfileButton.isAccessibilityElement = true
        editProfileButton.accessibilityLabel = "Edit Profile"
        editProfileButton.accessibilityTraits = .button
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            // Profile image constraints
            profileImageView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
            profileImageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            profileImageView.widthAnchor.constraint(equalToConstant: 100),
            profileImageView.heightAnchor.constraint(equalToConstant: 100),
            
            // Name label constraints
            nameLabel.topAnchor.constraint(equalTo: profileImageView.bottomAnchor, constant: 16),
            nameLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            nameLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            
            // Edit profile button constraints
            editProfileButton.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 8),
            editProfileButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            
            // Table view constraints
            tableView.topAnchor.constraint(equalTo: editProfileButton.bottomAnchor, constant: 24),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    func configureAppearance() {
        // Apply theme colors
        view.backgroundColor = Theme.shared.color(for: .background)
        nameLabel.textColor = Theme.shared.color(for: .text)
        editProfileButton.tintColor = Theme.shared.color(for: .primary)
        
        // Configure navigation bar appearance
        navigationController?.navigationBar.prefersLargeTitles = true
        navigationItem.largeTitleDisplayMode = .never
        
        // Configure table view appearance
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .singleLine
        tableView.separatorInset = UIEdgeInsets(top: 0, left: 56, bottom: 0, right: 0)
    }
    
    // MARK: - Private Methods
    
    private func bindViewModel() {
        // Bind view model state updates
        viewModel.state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.updateUI(with: state)
            }
            .store(in: &cancellables)
        
        // Handle loading state
        viewModel.state
            .map(\.isLoading)
            .removeDuplicates()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isLoading in
                self?.updateLoadingState(isLoading)
            }
            .store(in: &cancellables)
        
        // Handle errors
        viewModel.state
            .compactMap(\.error)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                self?.handleError(error)
            }
            .store(in: &cancellables)
    }
    
    private func updateUI(with state: ProfileViewModelState) {
        guard let user = state.currentUser else { return }
        
        // Update profile image securely
        if let imageData = user.profileImageData {
            profileImageView.image = UIImage(data: imageData)
        } else {
            profileImageView.image = UIImage(systemName: "person.circle.fill")
        }
        
        // Update name label
        nameLabel.text = "\(user.firstName) \(user.lastName)"
        
        // Refresh table view data
        tableView.reloadData()
    }
    
    private func updateLoadingState(_ isLoading: Bool) {
        if isLoading {
            // Show loading indicator
            let activityIndicator = UIActivityIndicatorView(style: .medium)
            navigationItem.rightBarButtonItem = UIBarButtonItem(customView: activityIndicator)
            activityIndicator.startAnimating()
        } else {
            navigationItem.rightBarButtonItem = nil
        }
    }
    
    private func handleError(_ error: AuthenticationError) {
        let alert = UIAlertController(
            title: "Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - Actions
    
    @objc private func editProfileTapped() {
        // Present edit profile flow
        let alert = UIAlertController(title: "Edit Profile", message: nil, preferredStyle: .alert)
        
        alert.addTextField { textField in
            textField.placeholder = "First Name"
            textField.text = self.viewModel.state.value.currentUser?.firstName
        }
        
        alert.addTextField { textField in
            textField.placeholder = "Last Name"
            textField.text = self.viewModel.state.value.currentUser?.lastName
        }
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Save", style: .default) { [weak self] _ in
            guard let firstName = alert.textFields?[0].text,
                  let lastName = alert.textFields?[1].text else { return }
            
            // Update profile through view model
            self?.viewModel.transform(
                input: Just(.updateProfile(firstName: firstName, lastName: lastName))
                    .eraseToAnyPublisher()
            )
            .sink { _ in }
            .store(in: &self!.cancellables)
        })
        
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDataSource
extension ProfileViewController: UITableViewDataSource {
    func numberOfSections(in tableView: UITableView) -> Int {
        return 3 // Account, Preferences, App Settings
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        switch section {
        case 0: return 2 // Account settings
        case 1: return 3 // Preferences
        case 2: return 2 // App settings
        default: return 0
        }
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        switch section {
        case 0: return "Account"
        case 1: return "Preferences"
        case 2: return "App Settings"
        default: return nil
        }
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(
            withIdentifier: SettingsCell.reuseIdentifier,
            for: indexPath
        ) as! SettingsCell
        
        let settingItem: SettingItem
        
        switch (indexPath.section, indexPath.row) {
        case (0, 0):
            settingItem = SettingItem(
                title: "Security",
                subtitle: "Password and authentication settings",
                icon: UIImage(systemName: "lock.shield"),
                type: .disclosure
            )
        case (0, 1):
            settingItem = SettingItem(
                title: "Privacy",
                subtitle: "Manage your data and privacy settings",
                icon: UIImage(systemName: "hand.raised"),
                type: .disclosure
            )
        case (1, 0):
            settingItem = SettingItem(
                title: "Dietary Restrictions",
                subtitle: "Manage your dietary preferences",
                icon: UIImage(systemName: "leaf"),
                type: .disclosure
            )
        case (1, 1):
            settingItem = SettingItem(
                title: "Notifications",
                subtitle: "Configure notification preferences",
                icon: UIImage(systemName: "bell"),
                type: .toggle(isOn: true)
            )
        case (1, 2):
            settingItem = SettingItem(
                title: "Measurement Units",
                subtitle: "Choose your preferred units",
                icon: UIImage(systemName: "ruler"),
                type: .value(text: "Metric")
            )
        case (2, 0):
            settingItem = SettingItem(
                title: "About",
                subtitle: "App version and information",
                icon: UIImage(systemName: "info.circle"),
                type: .disclosure
            )
        case (2, 1):
            settingItem = SettingItem(
                title: "Log Out",
                subtitle: nil,
                icon: UIImage(systemName: "arrow.right.square"),
                type: .disclosure
            )
        default:
            fatalError("Invalid indexPath")
        }
        
        cell.configure(with: settingItem)
        return cell
    }
}

// MARK: - UITableViewDelegate
extension ProfileViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        switch (indexPath.section, indexPath.row) {
        case (0, _):
            // Handle account settings navigation
            break
            
        case (1, 0):
            // Navigate to dietary restrictions
            break
            
        case (2, 1):
            // Handle logout
            viewModel.transform(input: Just(.logout).eraseToAnyPublisher())
                .sink { [weak self] output in
                    if case .logoutCompleted = output {
                        // Handle successful logout
                        self?.dismiss(animated: true)
                    }
                }
                .store(in: &cancellables)
            
        default:
            break
        }
    }
}