require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroNotificationBridge"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/example/react-native-notification-bridge"
  s.license      = package["license"]
  s.authors      = "Launcher"

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/example/react-native-notification-bridge.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
    # Implementation (C++ objects)
    "cpp/**/*.{hpp,cpp}",
  ]

  load 'nitrogen/generated/ios/NitroNotificationBridge+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
