//
// SettingsCell.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify accessibility labels and hints are properly localized
// 2. Test VoiceOver interaction with all control types
// 3. Validate dynamic type scaling across all device sizes
// 4. Review color contrast ratios for accessibility compliance

import UIKit // iOS 13.0+

/// A custom UITableViewCell that displays a setting option with an icon, label, and optional control
/// Implements ViewConfigurable protocol for consistent setup and styling
///
/// Requirements addressed:
/// - User Configuration (8.1.2 Screen Components/Profile)
/// - Mobile Applications (5.2.1 Client Applications)
@objc final class SettingsCell: UITableViewCell, ViewConfigurable {
    
    // MARK: - Properties
    
    private let iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 1
        return label
    }()
    
    private let subtitleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 2
        return label
    }()
    
    private let accessoryContainerView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    static let reuseIdentifier = "SettingsCell"
    
    // MARK: - Initialization
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        configure()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        configure()
    }
    
    // MARK: - ViewConfigurable Implementation
    
    func setupView() {
        // Add subviews to content view hierarchy
        contentView.addSubview(iconImageView)
        contentView.addSubview(titleLabel)
        contentView.addSubview(subtitleLabel)
        contentView.addSubview(accessoryContainerView)
        
        // Configure icon image view
        iconImageView.tintColor = Theme.shared.color(for: .primary)
        
        // Configure accessibility
        isAccessibilityElement = true
        accessibilityTraits = .button
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            // Icon image view constraints
            iconImageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            iconImageView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            iconImageView.widthAnchor.constraint(equalToConstant: 24),
            iconImageView.heightAnchor.constraint(equalToConstant: 24),
            
            // Title label constraints
            titleLabel.leadingAnchor.constraint(equalTo: iconImageView.trailingAnchor, constant: 16),
            titleLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            
            // Subtitle label constraints
            subtitleLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            subtitleLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12),
            
            // Accessory container constraints
            accessoryContainerView.leadingAnchor.constraint(greaterThanOrEqualTo: titleLabel.trailingAnchor, constant: 16),
            accessoryContainerView.leadingAnchor.constraint(greaterThanOrEqualTo: subtitleLabel.trailingAnchor, constant: 16),
            accessoryContainerView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            accessoryContainerView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            accessoryContainerView.heightAnchor.constraint(equalToConstant: 32)
        ])
        
        // Set content compression resistance
        titleLabel.setContentCompressionResistancePriority(.defaultHigh, for: .horizontal)
        subtitleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        accessoryContainerView.setContentCompressionResistancePriority(.required, for: .horizontal)
    }
    
    func configureAppearance() {
        // Apply theme colors
        backgroundColor = Theme.shared.color(for: .surface)
        titleLabel.textColor = Theme.shared.color(for: .text)
        subtitleLabel.textColor = Theme.shared.color(for: .textSecondary)
        
        // Configure typography
        titleLabel.font = .systemFont(ofSize: 16, weight: .medium)
        subtitleLabel.font = .systemFont(ofSize: 14, weight: .regular)
        
        // Configure selection style
        selectionStyle = .default
        
        // Apply theme styling
        Theme.shared.applyTheme(to: self)
    }
    
    // MARK: - Configuration
    
    /// Configures the cell with the provided setting data
    /// - Parameter setting: The setting item to display
    func configure(with setting: SettingItem) {
        // Configure icon
        iconImageView.image = setting.icon?.withRenderingMode(.alwaysTemplate)
        
        // Configure text
        titleLabel.text = setting.title
        subtitleLabel.text = setting.subtitle
        subtitleLabel.isHidden = setting.subtitle == nil
        
        // Configure accessory view based on setting type
        accessoryContainerView.subviews.forEach { $0.removeFromSuperview() }
        
        switch setting.type {
        case .toggle(let isOn):
            let toggle = UISwitch()
            toggle.isOn = isOn
            toggle.onTintColor = Theme.shared.color(for: .primary)
            accessoryContainerView.addSubview(toggle)
            toggle.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                toggle.centerYAnchor.constraint(equalTo: accessoryContainerView.centerYAnchor),
                toggle.trailingAnchor.constraint(equalTo: accessoryContainerView.trailingAnchor)
            ])
            
        case .disclosure:
            let imageView = UIImageView(image: UIImage(systemName: "chevron.right"))
            imageView.tintColor = Theme.shared.color(for: .textSecondary)
            accessoryContainerView.addSubview(imageView)
            imageView.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                imageView.centerYAnchor.constraint(equalTo: accessoryContainerView.centerYAnchor),
                imageView.trailingAnchor.constraint(equalTo: accessoryContainerView.trailingAnchor),
                imageView.widthAnchor.constraint(equalToConstant: 12),
                imageView.heightAnchor.constraint(equalToConstant: 20)
            ])
            
        case .value(let text):
            let label = UILabel()
            label.text = text
            label.textColor = Theme.shared.color(for: .textSecondary)
            label.font = .systemFont(ofSize: 16)
            accessoryContainerView.addSubview(label)
            label.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                label.centerYAnchor.constraint(equalTo: accessoryContainerView.centerYAnchor),
                label.trailingAnchor.constraint(equalTo: accessoryContainerView.trailingAnchor)
            ])
        }
        
        // Configure accessibility
        accessibilityLabel = setting.title
        if let subtitle = setting.subtitle {
            accessibilityHint = subtitle
        }
    }
    
    // MARK: - Overrides
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            configureAppearance()
        }
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        iconImageView.image = nil
        titleLabel.text = nil
        subtitleLabel.text = nil
        accessoryContainerView.subviews.forEach { $0.removeFromSuperview() }
    }
}

// MARK: - Supporting Types

/// Represents a setting item to be displayed in the settings cell
struct SettingItem {
    let title: String
    let subtitle: String?
    let icon: UIImage?
    let type: SettingType
}

/// Represents the type of setting and its associated control
enum SettingType {
    case toggle(isOn: Bool)
    case disclosure
    case value(text: String)
}