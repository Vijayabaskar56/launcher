require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroOpenClawGateway"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/example/react-native-openclaw-gateway"
  s.license      = package["license"]
  s.authors      = "Launcher"

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/example/react-native-openclaw-gateway.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift}",
    "ios/**/*.{m,mm}",
    "cpp/**/*.{hpp,cpp}",
  ]

  load 'nitrogen/generated/ios/NitroOpenClawGateway+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
