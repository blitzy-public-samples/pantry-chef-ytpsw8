//
// RecipeListViewController.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure collection view cell size in interface builder or update layout constants
// 2. Review accessibility labels and VoiceOver support
// 3. Test dynamic type scaling for all text elements
// 4. Verify analytics tracking events are properly configured

import UIKit // iOS 13.0+
import Combine // iOS 13.0+

/// View controller managing recipe list display and interaction using MVVM architecture
/// Requirements addressed:
/// - Recipe Management: Recipe database and matching through responsive collection view
/// - Smart Recipe Matching: Real-time filtering and search capabilities
@objc
final class RecipeListViewController: UIViewController {
    
    // MARK: - UI Components
    private lazy var collectionView: UICollectionView = {
        let layout = UICollectionViewFlowLayout()
        let collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = Theme.shared.color(.background)
        collectionView.delegate = self
        collectionView.dataSource = self
        collectionView.alwaysBounceVertical = true
        collectionView.register(RecipeCell.self, forCellWithReuseIdentifier: "RecipeCell")
        return collectionView
    }()
    
    private lazy var searchController: UISearchController = {
        let controller = UISearchController(searchResultsController: nil)
        controller.searchResultsUpdater = self
        controller.obscuresBackgroundDuringPresentation = false
        controller.searchBar.placeholder = "Search recipes..."
        return controller
    }()
    
    private lazy var refreshControl: UIRefreshControl = {
        let control = UIRefreshControl()
        control.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        return control
    }()
    
    // MARK: - Properties
    private let viewModel: RecipeViewModel
    private let input = PassthroughSubject<RecipeViewModelInput, Never>()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(viewModel: RecipeViewModel = RecipeViewModel()) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        self.viewModel = RecipeViewModel()
        super.init(coder: coder)
    }
    
    // MARK: - Lifecycle Methods
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupCollectionView()
        setupSearchController()
        bindViewModel()
        
        // Initial recipe load
        input.send(.loadRecipes(page: 1, limit: 20))
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        configureNavigationBar()
    }
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            collectionView.backgroundColor = Theme.shared.color(.background)
        }
    }
    
    // MARK: - Setup Methods
    private func setupCollectionView() {
        view.addSubview(collectionView)
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        // Configure layout
        if let layout = collectionView.collectionViewLayout as? UICollectionViewFlowLayout {
            let spacing: CGFloat = 16
            layout.minimumInteritemSpacing = spacing
            layout.minimumLineSpacing = spacing
            layout.sectionInset = UIEdgeInsets(top: spacing, left: spacing, bottom: spacing, right: spacing)
        }
        
        // Add refresh control
        collectionView.refreshControl = refreshControl
    }
    
    private func setupSearchController() {
        navigationItem.searchController = searchController
        navigationItem.hidesSearchBarWhenScrolling = false
        definesPresentationContext = true
    }
    
    private func configureNavigationBar() {
        title = "Recipes"
        navigationController?.navigationBar.prefersLargeTitles = true
        
        // Add filter button
        let filterButton = UIBarButtonItem(
            image: UIImage(systemName: "line.horizontal.3.decrease.circle"),
            style: .plain,
            target: self,
            action: #selector(showFilters)
        )
        navigationItem.rightBarButtonItem = filterButton
    }
    
    // MARK: - ViewModel Binding
    private func bindViewModel() {
        let output = viewModel.transform(input: input.eraseToAnyPublisher())
        
        output
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                switch event {
                case .recipesLoaded(let recipes):
                    self?.handleRecipesLoaded()
                    
                case .searchResults(let recipes):
                    self?.handleSearchResults()
                    
                case .matchedRecipes(let recipes):
                    self?.handleMatchedRecipes()
                    
                case .error(let error):
                    self?.handleError(error)
                    
                case .loading(let isLoading):
                    self?.handleLoadingState(isLoading)
                    
                case .refreshCompleted:
                    self?.refreshControl.endRefreshing()
                    
                case .loadMoreCompleted:
                    // Handle pagination completion
                    break
                    
                case .likeToggled(let recipeId, _):
                    self?.handleRecipeLikeToggled(recipeId)
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Event Handlers
    private func handleRecipesLoaded() {
        collectionView.reloadData()
    }
    
    private func handleSearchResults() {
        collectionView.reloadData()
    }
    
    private func handleMatchedRecipes() {
        collectionView.reloadData()
    }
    
    private func handleError(_ error: Error) {
        let alert = UIAlertController(
            title: "Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    private func handleLoadingState(_ isLoading: Bool) {
        if isLoading {
            refreshControl.beginRefreshing()
        } else {
            refreshControl.endRefreshing()
        }
    }
    
    private func handleRecipeLikeToggled(_ recipeId: String) {
        // Find and update the specific cell
        if let index = viewModel.state.value.recipes.firstIndex(where: { $0.id == recipeId }),
           let cell = collectionView.cellForItem(at: IndexPath(item: index, section: 0)) as? RecipeCell {
            cell.configure(
                with: viewModel.state.value.recipes[index],
                availableIngredients: [] // Get from pantry service
            )
        }
    }
    
    // MARK: - Actions
    @objc private func handleRefresh() {
        input.send(.refreshRecipes)
    }
    
    @objc private func showFilters() {
        // Present filter options
        let alert = UIAlertController(title: "Filter Recipes", message: nil, preferredStyle: .actionSheet)
        
        alert.addAction(UIAlertAction(title: "All Recipes", style: .default) { [weak self] _ in
            self?.input.send(.filterByTags([]))
        })
        
        alert.addAction(UIAlertAction(title: "Available Ingredients", style: .default) { [weak self] _ in
            // Get available ingredients from pantry service
            self?.input.send(.matchWithIngredients([]))
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        present(alert, animated: true)
    }
}

// MARK: - UICollectionViewDataSource
extension RecipeListViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return viewModel.state.value.recipes.count
    }
    
    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        guard let cell = collectionView.dequeueReusableCell(
            withReuseIdentifier: "RecipeCell",
            for: indexPath
        ) as? RecipeCell else {
            return UICollectionViewCell()
        }
        
        let recipe = viewModel.state.value.recipes[indexPath.item]
        cell.configure(
            with: recipe,
            availableIngredients: [] // Get from pantry service
        )
        
        // Load more recipes when reaching the end
        if indexPath.item == viewModel.state.value.recipes.count - 5 {
            input.send(.loadMore)
        }
        
        return cell
    }
}

// MARK: - UICollectionViewDelegate
extension RecipeListViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let recipe = viewModel.state.value.recipes[indexPath.item]
        // Navigate to recipe detail (handled by coordinator)
        NotificationCenter.default.post(
            name: NSNotification.Name("ShowRecipeDetail"),
            object: nil,
            userInfo: ["recipeId": recipe.id]
        )
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension RecipeListViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        let spacing: CGFloat = 16
        let availableWidth = collectionView.bounds.width - (spacing * 3) // Left, right, and middle spacing
        let width = availableWidth / 2
        let height = width * 1.5 // 3:2 aspect ratio
        
        return CGSize(width: width, height: height)
    }
}

// MARK: - UISearchResultsUpdating
extension RecipeListViewController: UISearchResultsUpdating {
    func updateSearchResults(for searchController: UISearchController) {
        guard let query = searchController.searchBar.text else { return }
        
        // Debounce search input
        NSObject.cancelPreviousPerformRequests(withTarget: self)
        perform(#selector(executeSearch(_:)), with: query, afterDelay: 0.5)
    }
    
    @objc private func executeSearch(_ query: String) {
        input.send(.searchRecipes(query: query, tags: viewModel.state.value.selectedTags))
    }
}