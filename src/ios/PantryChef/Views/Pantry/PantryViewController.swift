//
// PantryViewController.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure analytics tracking for pantry interactions
// 2. Review accessibility labels and traits for VoiceOver support
// 3. Test dynamic type scaling with different text sizes
// 4. Verify error handling and user feedback mechanisms
// 5. Test deep linking to pantry items

import UIKit // iOS 13.0+
import Combine // iOS 13.0+

/// View controller managing the pantry screen interface with categorized ingredients display
/// and expiration tracking functionality.
///
/// Requirements addressed:
/// - Digital Pantry Management (1.2 Scope/Core Capabilities)
/// - Screen Components (8.1 User Interface Design/8.1.2)
/// - Mobile Application Layout (8.1 User Interface Design/8.1.1)
/// - Expiration Tracking (1.2 Scope/Core Capabilities)
final class PantryViewController: UIViewController, UITableViewDelegate, UITableViewDataSource, UISearchBarDelegate, ViewConfigurable {
    
    // MARK: - UI Components
    private lazy var tableView: UITableView = {
        let table = UITableView(frame: .zero, style: .grouped)
        table.translatesAutoresizingMaskIntoConstraints = false
        table.delegate = self
        table.dataSource = self
        table.separatorStyle = .none
        table.backgroundColor = Theme.shared.color(.background)
        table.rowHeight = UITableView.automaticDimension
        table.estimatedRowHeight = 88
        return table
    }()
    
    private lazy var searchBar: UISearchBar = {
        let search = UISearchBar()
        search.translatesAutoresizingMaskIntoConstraints = false
        search.delegate = self
        search.placeholder = "Search ingredients..."
        search.searchBarStyle = .minimal
        return search
    }()
    
    private lazy var categoryFilter: UISegmentedControl = {
        let filter = UISegmentedControl(items: ["All", "Fridge", "Pantry", "Freezer"])
        filter.translatesAutoresizingMaskIntoConstraints = false
        filter.selectedSegmentIndex = 0
        filter.addTarget(self, action: #selector(categoryFilterChanged), for: .valueChanged)
        return filter
    }()
    
    private lazy var refreshControl: UIRefreshControl = {
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(refreshPantry), for: .valueChanged)
        return refresh
    }()
    
    private lazy var emptyStateView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.isHidden = true
        
        let imageView = UIImageView(image: UIImage(named: "empty_pantry"))
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.contentMode = .scaleAspectFit
        
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Your pantry is empty\nTap + to add ingredients"
        label.numberOfLines = 0
        label.textAlignment = .center
        label.font = Theme.shared.bodyFont
        label.textColor = Theme.shared.color(.textSecondary)
        
        view.addSubview(imageView)
        view.addSubview(label)
        
        NSLayoutConstraint.activate([
            imageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            imageView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -40),
            imageView.widthAnchor.constraint(equalToConstant: 120),
            imageView.heightAnchor.constraint(equalToConstant: 120),
            
            label.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 16),
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -32)
        ])
        
        return view
    }()
    
    // MARK: - Properties
    private let viewModel: PantryViewModel
    private var cancellables = Set<AnyCancellable>()
    private var dataSource: [String: [Ingredient]] = [:]
    private var filteredDataSource: [String: [Ingredient]] = [:]
    private var currentSearchText: String = ""
    
    // MARK: - Initialization
    init(viewModel: PantryViewModel = PantryViewModel()) {
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
        setupNavigationBar()
        configureBindings()
        loadInitialData()
    }
    
    // MARK: - ViewConfigurable Implementation
    func setupView() {
        title = "Pantry"
        view.backgroundColor = Theme.shared.color(.background)
        
        tableView.register(IngredientCell.self, forCellReuseIdentifier: "IngredientCell")
        tableView.register(CategoryHeaderView.self, forHeaderFooterViewReuseIdentifier: "CategoryHeaderView")
        tableView.refreshControl = refreshControl
        
        view.addSubview(searchBar)
        view.addSubview(categoryFilter)
        view.addSubview(tableView)
        view.addSubview(emptyStateView)
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            searchBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            
            categoryFilter.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 8),
            categoryFilter.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            categoryFilter.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            
            tableView.topAnchor.constraint(equalTo: categoryFilter.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            emptyStateView.centerXAnchor.constraint(equalTo: tableView.centerXAnchor),
            emptyStateView.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),
            emptyStateView.widthAnchor.constraint(equalTo: tableView.widthAnchor),
            emptyStateView.heightAnchor.constraint(equalToConstant: 240)
        ])
    }
    
    func configureAppearance() {
        navigationController?.navigationBar.prefersLargeTitles = true
        
        searchBar.tintColor = Theme.shared.color(.accent)
        categoryFilter.selectedSegmentTintColor = Theme.shared.color(.accent)
        categoryFilter.setTitleTextAttributes([
            .foregroundColor: Theme.shared.color(.textSecondary)
        ], for: .normal)
        categoryFilter.setTitleTextAttributes([
            .foregroundColor: Theme.shared.color(.background)
        ], for: .selected)
    }
    
    // MARK: - Private Methods
    private func setupNavigationBar() {
        let addButton = UIBarButtonItem(
            barButtonSystemItem: .add,
            target: self,
            action: #selector(addButtonTapped)
        )
        navigationItem.rightBarButtonItem = addButton
    }
    
    private func configureBindings() {
        // Bind view model state updates
        viewModel.state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.updateUI(with: state)
            }
            .store(in: &cancellables)
        
        // Bind search text updates
        NotificationCenter.default.publisher(for: UISearchTextField.textDidChangeNotification, object: searchBar.searchTextField)
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .compactMap { ($0.object as? UISearchTextField)?.text }
            .sink { [weak self] searchText in
                self?.handleSearchTextChange(searchText)
            }
            .store(in: &cancellables)
    }
    
    private func loadInitialData() {
        viewModel.transform(input: Just(.loadPantry(userId: "current_user")).eraseToAnyPublisher())
            .sink { [weak self] output in
                switch output {
                case .pantryLoaded(let pantry):
                    self?.updateDataSource(with: pantry.items)
                case .error(let error):
                    self?.showError(error)
                default:
                    break
                }
            }
            .store(in: &cancellables)
    }
    
    private func updateUI(with state: PantryViewState) {
        refreshControl.endRefreshing()
        
        if state.isLoading {
            // Show loading state
            return
        }
        
        if let pantry = state.pantry {
            updateDataSource(with: pantry.items)
        }
        
        emptyStateView.isHidden = !filteredDataSource.isEmpty
        tableView.reloadData()
    }
    
    private func updateDataSource(with items: [Ingredient]) {
        // Group items by category
        dataSource = Dictionary(grouping: items) { $0.category }
        applyFilters()
    }
    
    private func applyFilters() {
        var filtered = dataSource
        
        // Apply category filter
        if categoryFilter.selectedSegmentIndex > 0 {
            let selectedLocation = ["Fridge", "Pantry", "Freezer"][categoryFilter.selectedSegmentIndex - 1]
            filtered = filtered.filter { $0.key == selectedLocation }
        }
        
        // Apply search filter
        if !currentSearchText.isEmpty {
            filtered = filtered.mapValues { items in
                items.filter { $0.name.localizedCaseInsensitiveContains(currentSearchText) }
            }
            filtered = filtered.filter { !$0.value.isEmpty }
        }
        
        filteredDataSource = filtered
        tableView.reloadData()
    }
    
    private func showError(_ error: PantryViewModelError) {
        let alert = UIAlertController(
            title: "Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - Actions
    @objc private func addButtonTapped() {
        // TODO: Present add ingredient flow
    }
    
    @objc private func categoryFilterChanged() {
        applyFilters()
    }
    
    @objc private func refreshPantry() {
        loadInitialData()
    }
    
    // MARK: - UITableViewDataSource
    func numberOfSections(in tableView: UITableView) -> Int {
        return filteredDataSource.keys.count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        let category = Array(filteredDataSource.keys).sorted()[section]
        return filteredDataSource[category]?.count ?? 0
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let cell = tableView.dequeueReusableCell(withIdentifier: "IngredientCell", for: indexPath) as? IngredientCell else {
            return UITableViewCell()
        }
        
        let category = Array(filteredDataSource.keys).sorted()[indexPath.section]
        if let ingredients = filteredDataSource[category] {
            cell.configure(with: ingredients[indexPath.row])
        }
        
        return cell
    }
    
    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        guard let headerView = tableView.dequeueReusableHeaderFooterView(withIdentifier: "CategoryHeaderView") as? CategoryHeaderView else {
            return nil
        }
        
        let category = Array(filteredDataSource.keys).sorted()[section]
        let count = filteredDataSource[category]?.count ?? 0
        headerView.updateCategory(category, count: count)
        
        return headerView
    }
    
    // MARK: - UITableViewDelegate
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let category = Array(filteredDataSource.keys).sorted()[indexPath.section]
        guard let ingredients = filteredDataSource[category] else { return }
        
        let ingredient = ingredients[indexPath.row]
        // TODO: Present ingredient detail view
    }
    
    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        let category = Array(filteredDataSource.keys).sorted()[indexPath.section]
        guard let ingredients = filteredDataSource[category] else { return nil }
        
        let ingredient = ingredients[indexPath.row]
        
        let deleteAction = UIContextualAction(style: .destructive, title: "Delete") { [weak self] _, _, completion in
            self?.viewModel.transform(input: Just(.removeItem(ingredient.id)).eraseToAnyPublisher())
                .sink { _ in completion(true) }
                .store(in: &self!.cancellables)
        }
        
        let editAction = UIContextualAction(style: .normal, title: "Edit") { [weak self] _, _, completion in
            // TODO: Present edit view
            completion(true)
        }
        editAction.backgroundColor = Theme.shared.color(.accent)
        
        return UISwipeActionsConfiguration(actions: [deleteAction, editAction])
    }
    
    // MARK: - UISearchBarDelegate
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        currentSearchText = searchText
        applyFilters()
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}