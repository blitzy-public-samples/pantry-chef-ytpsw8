# Human Tasks:
# 1. Verify TensorFlow Lite model files are placed in assets/models directory
# 2. Ensure release keystore is properly configured in build.gradle
# 3. Test the release build with these ProGuard rules before production deployment
# 4. Verify biometric authentication functionality after ProGuard optimization

# Keep attributes for proper runtime operation and debugging
# Requirement: Mobile Application Security - Preserves essential attributes while enabling obfuscation
-keepattributes Signature,*Annotation*,SourceFile,LineNumberTable

# Optimization settings to preserve app functionality while reducing size
# Requirement: Mobile Application Security - Implements safe optimization rules
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*

# React Native Core Rules (v0.71.0)
# Requirement: Android Platform Support - Ensures proper React Native functionality
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# TensorFlow Lite Rules (v2.12.0)
# Requirement: Mobile Application Security - Protects ML model processing code
-keep class org.tensorflow.** { *; }
-keep class org.tensorflow.lite.** { *; }
-keep interface org.tensorflow.** { *; }
-keep interface org.tensorflow.lite.** { *; }
-keepclasseswithmembernames class * {
    native <methods>;
}

# Socket.IO Client Rules (v4.6.0)
# Requirement: Mobile Application Security - Preserves WebSocket functionality
-keep class io.socket.** { *; }
-keep class io.socket.client.** { *; }
-keep class io.socket.engineio.** { *; }
-keepnames class io.socket.** { *; }

# Custom Native Modules
# Requirement: Mobile Application Security - Protects custom native implementations
-keep class com.pantrychef.modules.** { *; }
-keep class com.pantrychef.services.** { *; }
-keepclassmembers class com.pantrychef.modules.** {
    @com.facebook.react.bridge.ReactMethod *;
}

# Camera Module Rules
# Requirement: Mobile Application Security - Preserves camera functionality
-keep class com.pantrychef.modules.camera.** { *; }
-keepclassmembers class com.pantrychef.modules.camera.** {
    @com.facebook.react.bridge.ReactMethod *;
}
-keep class androidx.camera.** { *; }
-keep class com.google.android.gms.vision.** { *; }

# Biometric Authentication Rules
# Requirement: Mobile Application Security - Ensures secure biometric authentication
-keep class com.pantrychef.modules.biometric.** { *; }
-keep class androidx.biometric.** { *; }
-keepclassmembers class com.pantrychef.modules.biometric.** {
    @com.facebook.react.bridge.ReactMethod *;
}

# Data Security Rules
# Requirement: Mobile Application Security - Protects cryptographic implementations
-keepclassmembers class * extends com.pantrychef.security.** { *; }
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }
-keep class javax.crypto.spec.** { *; }
-keep class javax.net.ssl.** { *; }

# General Android Security Rules
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Enums for proper JSON parsing
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Preserve JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve Retrofit service interfaces
-keepclasseswithmembers interface * {
    @retrofit2.http.* <methods>;
}

# Preserve Gson generic signatures
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# Preserve Android lifecycle methods
-keep class * extends androidx.lifecycle.ViewModel {
    <init>();
}
-keep class * extends androidx.lifecycle.AndroidViewModel {
    <init>(android.app.Application);
}

# Preserve custom exceptions for proper error handling
-keep class com.pantrychef.exceptions.** { *; }

# Preserve WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}