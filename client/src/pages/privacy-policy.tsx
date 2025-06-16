export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mt-1">Last updated: December 16, 2024</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Cush, a comprehensive platform providing global immigration services, financial assistance, 
              remittances, mentorship, and community support. We are committed to protecting your privacy and ensuring 
              the security of your personal information. This Privacy Policy explains how we collect, use, store, 
              share, and protect your data when you use our services.
            </p>
          </section>

          <hr className="border-gray-200" />

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Personal Information You Provide</h3>
                <ul className="space-y-2 text-gray-700 ml-4">
                  <li>• <strong>Identity Information:</strong> Name, email address, phone number, date of birth, nationality</li>
                  <li>• <strong>Contact Information:</strong> Physical address, mailing address</li>
                  <li>• <strong>Immigration Details:</strong> Immigration status, visa information, travel documents</li>
                  <li>• <strong>Financial Information:</strong> Bank account details (for remittances), income information (for loans)</li>
                  <li>• <strong>Educational Background:</strong> Qualifications, certifications, work experience</li>
                  <li>• <strong>Health Information:</strong> Medical history and health data (when health features are enabled)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Information Collected Automatically</h3>
                <ul className="space-y-2 text-gray-700 ml-4">
                  <li>• <strong>Technical Data:</strong> IP address, device information, browser type and version</li>
                  <li>• <strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
                  <li>• <strong>Session Data:</strong> Login times, session duration, user interactions</li>
                  <li>• <strong>Cookies and Tracking:</strong> Preferences, analytics data, performance metrics</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Payment Security:</strong> Credit card and payment information is processed securely by Stripe. 
                  Cush does not store your complete payment card details on our servers.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-800">Core Services</h3>
                <ul className="space-y-1 text-gray-700 text-sm">
                  <li>• Create and maintain user accounts</li>
                  <li>• Provide immigration assistance and guidance</li>
                  <li>• Process remittance transactions</li>
                  <li>• Facilitate loan applications and matching</li>
                  <li>• Enable mentorship connections</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium text-gray-800">Platform Enhancement</h3>
                <ul className="space-y-1 text-gray-700 text-sm">
                  <li>• Personalize AI assistant responses</li>
                  <li>• Improve service recommendations</li>
                  <li>• Conduct security and fraud prevention</li>
                  <li>• Analyze usage patterns and preferences</li>
                  <li>• Send service updates and communications</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Security</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-medium text-green-800 mb-3">Our Security Measures</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-green-700">
                <ul className="space-y-2">
                  <li>• End-to-end encryption for data transmission</li>
                  <li>• Advanced encryption for data storage</li>
                  <li>• Multi-factor authentication options</li>
                  <li>• Regular security audits and assessments</li>
                </ul>
                <ul className="space-y-2">
                  <li>• Access controls and employee training</li>
                  <li>• Intrusion detection and monitoring</li>
                  <li>• Secure development practices</li>
                  <li>• Incident response procedures</li>
                </ul>
              </div>
              <p className="text-xs text-green-600 mt-3">
                While we implement industry-standard security measures, no method of transmission over the internet 
                or electronic storage is 100% secure.
              </p>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Privacy Rights</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-800">Data Subject Rights</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• <strong>Access:</strong> Request copies of your personal data</li>
                  <li>• <strong>Rectification:</strong> Correct inaccurate information</li>
                  <li>• <strong>Erasure:</strong> Request deletion of your data</li>
                  <li>• <strong>Portability:</strong> Export your data in a usable format</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium text-gray-800">How to Exercise Rights</h3>
                <p className="text-gray-700 text-sm">
                  Contact us at <strong>privacy@cush.com</strong> or use the privacy controls 
                  in your account settings. We will respond to requests within 30 days.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Compliance */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Regulatory Compliance</h2>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              We are committed to complying with applicable data protection laws and regulations worldwide, including:
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <ul className="space-y-1">
                <li>• <strong>GDPR</strong> (European Union)</li>
                <li>• <strong>CCPA</strong> (California, USA)</li>
                <li>• <strong>PIPEDA</strong> (Canada)</li>
              </ul>
              <ul className="space-y-1">
                <li>• <strong>UK GDPR</strong> (United Kingdom)</li>
                <li>• <strong>NDPR</strong> (Nigeria)</li>
                <li>• Other applicable regional laws</li>
              </ul>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Contact Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-gray-700 text-sm mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Email:</strong> privacy@cush.com</p>
                <p><strong>Data Protection Officer:</strong> dpo@cush.com</p>
                <p><strong>Support:</strong> Available through your account dashboard</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              This Privacy Policy was last updated on December 16, 2024. We may update this policy periodically. 
              Material changes will be communicated to users via email or platform notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}