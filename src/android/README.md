# PantryChef Android Application

Mobile application for intelligent kitchen management and recipe discovery through image recognition powered by TensorFlow

## Human Tasks
- [ ] Configure AWS credentials in local environment
- [ ] Set up debug keystore for development
- [ ] Configure Firebase project for push notifications
- [ ] Set up TensorFlow model access credentials
- [ ] Configure API endpoints for different environments

## System Requirements

### Development Environment
- Android Studio Arctic Fox or higher
- JDK 11 or higher
- Android SDK API level 26+ (Android 8.0+)
- Gradle 7.0+
- Node.js 14+ for React Native
- Python 3.8+ for TensorFlow processing

### Dependencies
- React Native (latest)
- Redux (latest)
- React Native Camera (latest)

## Project Setup

### 1. Repository Setup
```bash
# Clone the repository
git clone <repository-url>
cd pantrychef-android

# Install dependencies
npm install
```

### 2. Android Studio Configuration
1. Open Android Studio
2. Select "Open an existing Android Studio project"
3. Navigate to the `android` folder in the project
4. Wait for Gradle sync to complete

### 3. Debug Keystore Setup
```bash
# Navigate to app folder
cd android/app

# Generate debug keystore
keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000
```

### 4. Environment Configuration
1. Copy `.env.example` to `.env`
2. Update the following configurations:
   - API_BASE_URL
   - AWS_ACCESS_KEY
   - AWS_SECRET_KEY
   - TENSORFLOW_MODEL_URL

### 5. AWS Credentials Setup
1. Create `~/.aws/credentials` file
2. Add AWS configuration:
```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

### 6. API Configuration
1. Update `android/app/src/main/java/com/pantrychef/core/Constants.java`
2. Configure endpoints for:
   - Development
   - Staging
   - Production

### 7. Push Notification Setup
1. Create Firebase project
2. Download `google-services.json`
3. Place in `android/app/google-services.json`
4. Configure Firebase in `android/app/build.gradle`

## Architecture Overview

### Core Components
1. React Native Core
   - Component lifecycle management
   - Navigation system
   - State management with Redux

2. Native Camera Module
   - TensorFlow integration
   - Real-time image processing
   - Image capture optimization

3. Biometric Module
   - Fingerprint authentication
   - Face recognition support
   - Secure enclave integration

4. Storage Module
   - Encrypted local storage
   - Secure key-value persistence
   - File system management

5. Notification Module
   - Firebase Cloud Messaging
   - Local notifications
   - Background task handling

6. WebSocket Implementation
   - Real-time updates
   - Connection management
   - Reconnection strategies

7. Redux State Management
   - Action creators
   - Reducers
   - Middleware configuration

8. Offline Data Persistence
   - SQLite integration
   - Cache management
   - Sync strategies

## Development

### Code Style Guidelines
- Follow Android/Java standard naming conventions
- Use meaningful variable and method names
- Document public APIs and complex logic
- Maintain consistent indentation
- Follow React Native best practices

### Build Variants
```groovy
android {
    buildTypes {
        debug {
            debuggable true
            minifyEnabled false
        }
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Native Module Development
1. Create module class
2. Implement ReactPackage
3. Register module in MainApplication
4. Expose methods to JavaScript

### Testing Procedures
1. Unit tests with JUnit
2. Integration tests
3. UI tests with Espresso
4. Performance testing
5. Security testing

### Debugging Tools
- React Native Debugger
- Chrome Developer Tools
- Android Studio Debugger
- Flipper integration
- Network inspection

### Performance Monitoring
- Firebase Performance Monitoring
- Custom metrics tracking
- Memory usage analysis
- Network call profiling

### Error Handling
- Global error boundary
- Crash reporting with Firebase
- Network error handling
- Graceful degradation

### Analytics Integration
- Firebase Analytics
- Custom event tracking
- User journey analysis
- Performance metrics

## Testing

### Unit Testing
```bash
# Run unit tests
./gradlew test

# Generate coverage report
./gradlew jacocoTestReport
```

### Integration Testing
```bash
# Run integration tests
./gradlew connectedAndroidTest
```

### UI Testing
```bash
# Run Espresso tests
./gradlew connectedCheck
```

### Test Coverage Requirements
- Minimum 80% code coverage
- Critical path testing
- Edge case handling
- Error scenario testing

### Performance Testing
- Load testing
- Memory leak detection
- UI rendering performance
- Network request timing

### Security Testing
- Penetration testing
- Vulnerability scanning
- Security headers verification
- SSL certificate validation

### Offline Mode Testing
- Network disconnection handling
- Data persistence verification
- Sync conflict resolution
- Cache validation

### Camera Module Testing
- Image capture testing
- Recognition accuracy
- Performance benchmarking
- Error handling verification

## Build & Deploy

### Debug Build
```bash
# Generate debug APK
./gradlew assembleDebug
```

### Release Build
```bash
# Generate release APK
./gradlew assembleRelease

# Generate release bundle
./gradlew bundleRelease
```

### CI/CD Pipeline
```yaml
# GitHub Actions workflow
name: Android CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build
        run: ./gradlew assembleRelease
```

### Play Store Deployment
1. Sign release build
2. Generate release notes
3. Update metadata
4. Submit for review

### Automated Versioning
```groovy
android {
    defaultConfig {
        versionCode System.getenv("BUILD_NUMBER") as Integer ?: 1
        versionName "1.0.0"
    }
}
```

### Environment-specific Builds
```groovy
android {
    buildTypes {
        debug {
            buildConfigField "String", "API_URL", "\"https://dev-api.pantrychef.com\""
        }
        staging {
            buildConfigField "String", "API_URL", "\"https://staging-api.pantrychef.com\""
        }
        release {
            buildConfigField "String", "API_URL", "\"https://api.pantrychef.com\""
        }
    }
}
```

### ProGuard Optimization
```proguard
-keep class com.pantrychef.** { *; }
-keepclassmembers class com.pantrychef.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
```

### Bundle Size Optimization
- Enable R8 compilation
- Remove unused resources
- Optimize images
- Enable code shrinking

## Security

### Keystore Management
```bash
# Generate release keystore
keytool -genkey -v -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
```

### ProGuard Configuration
```proguard
# Security rules
-keepclassmembers class * extends com.pantrychef.security.** { *; }
-keep class com.pantrychef.security.** { *; }
```

### API Security
- JWT implementation
- Token refresh mechanism
- Request signing
- HTTPS enforcement

### Data Encryption
- AES-256 encryption
- Secure key storage
- File encryption
- Network security

### Biometric Authentication
- Fingerprint integration
- Face ID support
- Security key backup
- Fallback mechanisms

### SSL Pinning
```java
OkHttpClient client = new OkHttpClient.Builder()
    .certificatePinner(new CertificatePinner.Builder()
        .add("api.pantrychef.com", "sha256/XXXX")
        .build())
    .build();
```

### Secure Storage
- Encrypted SharedPreferences
- Keystore integration
- Secure file storage
- Memory security

### Privacy Compliance
- GDPR compliance
- CCPA compliance
- Data minimization
- User consent management

_Last Updated: CURRENT_DATE_