require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroLauncherService"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/example/react-native-launcher-service"
  s.license      = package["license"]
  s.authors      = "Launcher"

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/example/react-native-launcher-service.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift}",
    "ios/**/*.{m,mm}",
    "cpp/**/*.{hpp,cpp}",
  ]

  load 'nitrogen/generated/ios/NitroLauncherService+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
