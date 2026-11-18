Pod::Spec.new do |s|
  s.name           = 'DisplayLinkStats'
  s.version        = '1.0.0'
  s.summary        = 'Counts CADisplayLink setPaused: calls for the reproduction'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
