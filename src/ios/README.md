# PantryChef iOS Application

## HUMAN TASKS
1. Install Xcode 14.0+ from the Mac App Store
2. Install Ruby 2.7+ using rbenv or RVM
3. Configure Apple Developer account in Xcode
4. Set up Firebase project and download GoogleService-Info.plist
5. Configure TensorFlow model paths in ImageRecognitionService
6. Update API endpoints in NetworkService configuration
7. Set up code signing certificates using fastlane match

## Project Overview

PantryChef iOS is a native application built with Swift 5.0+ targeting iOS 13.0 and above. The app implements the MVVM architecture pattern with Coordinator-based navigation, providing a robust and scalable foundation for feature development.

### Key Features
- Image-based ingredient recognition using TensorFlowLiteSwift
- Real-time recipe matching and suggestions
- Digital pantry management with expiration tracking
- Secure credential storage using KeychainAccess
- Push notifications for expiring ingredients and recipe suggestions
- Offline support with local caching

## Getting Started

### Prerequisites
- Xcode 14.0+
- CocoaPods 1.12.0+
- Ruby 2.7+
- Swift 5.0+

### Installation

1. Clone the repository:
```bash
git clone <repository>
cd src/ios
```

2. Install dependencies:
```bash
pod install
```

3. Open the workspace:
```bash
open PantryChef.xcworkspace
```

## Architecture

### MVVM + Coordinator Pattern

```
├── Core
│   ├── AppConfig.swift
│   ├── Constants.swift
│   ├── Theme.swift
│   └── Protocols
│       ├── ViewConfigurable.swift
│       ├── ViewModelType.swift
│       └── Coordinator.swift
├── Navigation
│   ├── AppCoordinator.swift
│   ├── MainCoordinator.swift
│   └── AuthCoordinator.swift
├── Views
│   ├── Common
│   ├── Camera
│   ├── Home
│   ├── Pantry
│   ├── Recipe
│   └── Auth
├── ViewModels
├── Models
└── Services
```

### Dependencies

Key frameworks and their versions:

```ruby
pod 'Alamofire', '~> 5.0'           # Networking
pod 'TensorFlowLiteSwift', '~> 2.7' # ML/Image Recognition
pod 'KeychainAccess', '~> 4.0'      # Secure Storage
pod 'RxSwift', '~> 6.0'             # Reactive Programming
pod 'Firebase/Analytics', '~> 9.0'   # Analytics
pod 'Quick', '~> 5.0'               # Testing
```

## Development Guidelines

### Code Style

The project uses SwiftLint for enforcing consistent code style. Configuration can be found in `.swiftlint.yml`. Key rules include:

- Line length: 120 characters (warning), 200 characters (error)
- File length: 400 lines (warning), 1000 lines (error)
- Function length: 50 lines (warning), 100 lines (error)
- Cyclomatic complexity: 10 (warning), 20 (error)

### Theme Usage

All UI elements must use the centralized Theme system:

```swift
view.backgroundColor = Theme.Colors.background
label.font = Theme.Fonts.body
```

### Testing

The project uses Quick and Nimble for BDD-style testing:

```swift
class LoginViewModelTests: QuickSpec {
    override func spec() {
        describe("LoginViewModel") {
            it("validates email format") {
                // Test implementation
            }
        }
    }
}
```

### Documentation

Follow Apple's documentation style for Swift:

```swift
/// Processes the captured image for ingredient recognition
/// - Parameter image: The UIImage to process
/// - Returns: An array of recognized ingredients
func processImage(_ image: UIImage) -> [RecognitionResult]
```

## Security Implementation

### Authentication
- JWT-based authentication
- Secure token storage using KeychainAccess
- Biometric authentication support
- OAuth 2.0 social login integration

### Network Security
- TLS 1.3 for all API communication
- Certificate pinning using Alamofire
- Request signing for API authentication
- Encrypted local cache

### Data Protection
- Keychain storage for sensitive data
- File encryption for local storage
- Secure enclave for biometric data
- Memory security for sensitive information

## Deployment

### Fastlane Setup

The project uses fastlane for automated deployment:

```bash
# Install fastlane
gem install fastlane

# Set up certificates
fastlane match development
fastlane match adhoc
```

### App Store Submission

1. Update version and build numbers
2. Run tests and build archive
3. Submit through App Store Connect
4. Monitor for review feedback

## Troubleshooting

Common issues and solutions:

1. Pod installation fails:
```bash
pod repo update
pod install --repo-update
```

2. Build errors after Xcode update:
```bash
pod deintegrate
pod install
```

3. Code signing issues:
```bash
fastlane match nuke
fastlane match development
```

## Support

For technical issues:
1. Check existing GitHub issues
2. Review documentation in `/docs`
3. Contact the development team

## License

Refer to the LICENSE file in the root directory.