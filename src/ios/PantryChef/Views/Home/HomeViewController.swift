//
// HomeViewController.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Review analytics tracking requirements for home screen interactions
// 2. Configure error message localization strings
// 3. Set up performance monitoring for recipe suggestion loading
// 4. Verify accessibility labels and hints with QA team
// 5. Test dynamic type scaling for all text elements

import UIKit // iOS 13.0+
import Combine // iOS 13.0+

/// Main view controller for the home screen displaying dashboard components
/// using MVVM architecture with Combine framework for reactive updates
///
/// Requirements addressed:
/// - Mobile-First Design: Native iOS interface implementation
/// - Dashboard View: Home screen with quick actions and status widgets
/// - Recipe Suggestions: Smart recipe matching display
/// - Expiration Tracking: Digital pantry management display
final class HomeViewController: UIViewController {
    
    // MARK: - Properties
    private let viewModel: HomeViewModel
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - UI Components
    private lazy var mainStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 16
        stackView.translatesAutoresizingMaskIntoConstraints = false
        return stackView
    }()
    
    private lazy var quickActionView: QuickActionView = {
        let view = QuickActionView(
            scanAction: { [weak self] _ in self?.handleQuickAction(.scan) },
            recipesAction: { [weak self] _ in self?.handleQuickAction(.recipes) },
            pantryAction: { [weak self] _ in self?.handleQuickAction(.pantry) }
        )
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private lazy var recipeSuggestionsCollectionView: UICollectionView = {
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .horizontal
        layout.itemSize = CGSize(width: 200, height: 280)
        layout.minimumLineSpacing = 16
        layout.minimumInteritemSpacing = 0
        
        let collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        collectionView.backgroundColor = .clear
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.contentInset = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 16)
        collectionView.register(RecipeSuggestionCell.self, forCellWithReuseIdentifier: "RecipeSuggestionCell")
        collectionView.delegate = self
        return collectionView
    }()
    
    private lazy var expiringItemsTableView: UITableView = {
        let tableView = UITableView(frame: .zero, style: .plain)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 80
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "ExpiringItemCell")
        tableView.delegate = self
        return tableView
    }()
    
    private lazy var refreshControl: UIRefreshControl = {
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        return refreshControl
    }()
    
    private lazy var loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.hidesWhenStopped = true
        indicator.translatesAutoresizingMaskIntoConstraints = false
        return indicator
    }()
    
    // MARK: - Initialization
    init(viewModel: HomeViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        bindViewModel()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        viewModel.transform(input: Just(.viewDidAppear).eraseToAnyPublisher())
            .sink { [weak self] output in
                self?.handleViewModelOutput(output)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        // Configure navigation bar
        title = NSLocalizedString("Home", comment: "Home screen title")
        navigationController?.navigationBar.prefersLargeTitles = true
        
        // Configure view
        view.backgroundColor = Theme.shared.color(for: .background)
        
        // Add main stack view
        view.addSubview(mainStackView)
        
        // Add components to stack view
        mainStackView.addArrangedSubview(quickActionView)
        mainStackView.addArrangedSubview(createSectionHeader(title: "Recipe Suggestions"))
        mainStackView.addArrangedSubview(recipeSuggestionsCollectionView)
        mainStackView.addArrangedSubview(createSectionHeader(title: "Expiring Soon"))
        mainStackView.addArrangedSubview(expiringItemsTableView)
        
        // Add refresh control
        expiringItemsTableView.refreshControl = refreshControl
        
        // Add loading indicator
        view.addSubview(loadingIndicator)
        
        // Configure layout constraints
        NSLayoutConstraint.activate([
            mainStackView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            mainStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            mainStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            mainStackView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            
            quickActionView.heightAnchor.constraint(equalToConstant: 120),
            recipeSuggestionsCollectionView.heightAnchor.constraint(equalToConstant: 280),
            
            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        
        // Configure accessibility
        setupAccessibility()
    }
    
    private func createSectionHeader(title: String) -> UIView {
        let headerView = UIView()
        headerView.translatesAutoresizingMaskIntoConstraints = false
        
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = NSLocalizedString(title, comment: "Section header title")
        label.font = .systemFont(ofSize: 20, weight: .bold)
        label.textColor = Theme.shared.color(for: .text)
        
        headerView.addSubview(label)
        
        NSLayoutConstraint.activate([
            headerView.heightAnchor.constraint(equalToConstant: 44),
            label.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 16),
            label.centerYAnchor.constraint(equalTo: headerView.centerYAnchor)
        ])
        
        return headerView
    }
    
    private func setupAccessibility() {
        // Configure accessibility for quick actions
        quickActionView.accessibilityLabel = NSLocalizedString("Quick Actions", comment: "Quick actions section accessibility label")
        quickActionView.accessibilityHint = NSLocalizedString("Contains buttons for common actions", comment: "Quick actions section accessibility hint")
        
        // Configure accessibility for recipe suggestions
        recipeSuggestionsCollectionView.accessibilityLabel = NSLocalizedString("Recipe Suggestions", comment: "Recipe suggestions section accessibility label")
        recipeSuggestionsCollectionView.accessibilityHint = NSLocalizedString("Horizontal scrollable list of recipe suggestions", comment: "Recipe suggestions section accessibility hint")
        
        // Configure accessibility for expiring items
        expiringItemsTableView.accessibilityLabel = NSLocalizedString("Expiring Items", comment: "Expiring items section accessibility label")
        expiringItemsTableView.accessibilityHint = NSLocalizedString("List of items nearing expiration", comment: "Expiring items section accessibility hint")
    }
    
    // MARK: - ViewModel Binding
    private func bindViewModel() {
        // Bind recipe suggestions collection view
        viewModel.state
            .map { $0.suggestedRecipes }
            .removeDuplicates()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] recipes in
                self?.updateRecipeSuggestions(recipes)
            }
            .store(in: &cancellables)
        
        // Bind expiring items table view
        viewModel.state
            .map { $0.expiringItems }
            .removeDuplicates()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] items in
                self?.updateExpiringItems(items)
            }
            .store(in: &cancellables)
        
        // Bind loading state
        viewModel.state
            .map { $0.isLoading }
            .removeDuplicates()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isLoading in
                self?.updateLoadingState(isLoading)
            }
            .store(in: &cancellables)
        
        // Bind error state
        viewModel.state
            .compactMap { $0.error }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                self?.showError(error)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - UI Updates
    private func updateRecipeSuggestions(_ recipes: [Recipe]) {
        var snapshot = NSDiffableDataSourceSnapshot<String, Recipe>()
        snapshot.appendSections(["Suggestions"])
        snapshot.appendItems(recipes, toSection: "Suggestions")
        recipeSuggestionsDataSource.apply(snapshot, animatingDifferences: true)
    }
    
    private func updateExpiringItems(_ items: [PantryItem]) {
        var snapshot = NSDiffableDataSourceSnapshot<String, PantryItem>()
        snapshot.appendSections(["Expiring"])
        snapshot.appendItems(items, toSection: "Expiring")
        expiringItemsDataSource.apply(snapshot, animatingDifferences: true)
    }
    
    private func updateLoadingState(_ isLoading: Bool) {
        if isLoading {
            loadingIndicator.startAnimating()
        } else {
            loadingIndicator.stopAnimating()
            refreshControl.endRefreshing()
        }
    }
    
    private func showError(_ error: String) {
        let alert = UIAlertController(
            title: NSLocalizedString("Error", comment: "Error alert title"),
            message: error,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(
            title: NSLocalizedString("OK", comment: "Error alert dismiss button"),
            style: .default
        ))
        present(alert, animated: true)
    }
    
    // MARK: - Actions
    private func handleQuickAction(_ action: QuickActionType) {
        switch action {
        case .scan:
            // Navigate to camera screen
            NotificationCenter.default.post(name: .didSelectScanAction, object: nil)
        case .recipes:
            // Navigate to recipes screen
            NotificationCenter.default.post(name: .didSelectRecipesAction, object: nil)
        case .pantry:
            // Navigate to pantry screen
            NotificationCenter.default.post(name: .didSelectPantryAction, object: nil)
        }
    }
    
    @objc private func handleRefresh() {
        viewModel.transform(input: Just(.refreshContent).eraseToAnyPublisher())
            .sink { [weak self] output in
                self?.handleViewModelOutput(output)
            }
            .store(in: &cancellables)
    }
    
    private func handleViewModelOutput(_ output: HomeViewModelOutput) {
        switch output {
        case .updateSuggestedRecipes(let recipes):
            updateRecipeSuggestions(recipes)
        case .updateExpiringItems(let items):
            updateExpiringItems(items)
        case .showRecipeDetail(let recipe):
            // Navigate to recipe detail
            NotificationCenter.default.post(name: .didSelectRecipe, object: recipe)
        case .showError(let error):
            showError(error)
        case .showLoading(let isLoading):
            updateLoadingState(isLoading)
        }
    }
}

// MARK: - UICollectionViewDelegate
extension HomeViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        guard let recipe = recipeSuggestionsDataSource.itemIdentifier(for: indexPath) else { return }
        viewModel.transform(input: Just(.selectRecipe(id: recipe.id)).eraseToAnyPublisher())
            .sink { [weak self] output in
                self?.handleViewModelOutput(output)
            }
            .store(in: &cancellables)
    }
}

// MARK: - UITableViewDelegate
extension HomeViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard let item = expiringItemsDataSource.itemIdentifier(for: indexPath) else { return }
        viewModel.transform(input: Just(.selectExpiringItem(id: item.id)).eraseToAnyPublisher())
            .sink { [weak self] output in
                self?.handleViewModelOutput(output)
            }
            .store(in: &cancellables)
    }
}

// MARK: - Diffable Data Sources
extension HomeViewController {
    private lazy var recipeSuggestionsDataSource: UICollectionViewDiffableDataSource<String, Recipe> = {
        UICollectionViewDiffableDataSource(
            collectionView: recipeSuggestionsCollectionView
        ) { [weak self] collectionView, indexPath, recipe in
            guard let cell = collectionView.dequeueReusableCell(
                withReuseIdentifier: "RecipeSuggestionCell",
                for: indexPath
            ) as? RecipeSuggestionCell else {
                return UICollectionViewCell()
            }
            
            if let pantryItems = self?.viewModel.state.value.expiringItems {
                cell.configure(
                    with: recipe,
                    availableIngredients: pantryItems.map { $0.ingredient }
                )
            }
            
            return cell
        }
    }()
    
    private lazy var expiringItemsDataSource: UITableViewDiffableDataSource<String, PantryItem> = {
        UITableViewDiffableDataSource(
            tableView: expiringItemsTableView
        ) { tableView, indexPath, item in
            let cell = tableView.dequeueReusableCell(
                withIdentifier: "ExpiringItemCell",
                for: indexPath
            )
            
            var content = cell.defaultContentConfiguration()
            content.text = item.ingredient.name
            content.secondaryText = item.expirationDate.relativeFormatted()
            
            // Configure expiration warning color
            if item.isExpiringSoon {
                content.secondaryTextProperties.color = .systemOrange
            } else if item.isExpired {
                content.secondaryTextProperties.color = .systemRed
            }
            
            cell.contentConfiguration = content
            return cell
        }
    }()
}

// MARK: - Notification Names
private extension Notification.Name {
    static let didSelectScanAction = Notification.Name("didSelectScanAction")
    static let didSelectRecipesAction = Notification.Name("didSelectRecipesAction")
    static let didSelectPantryAction = Notification.Name("didSelectPantryAction")
    static let didSelectRecipe = Notification.Name("didSelectRecipe")
}