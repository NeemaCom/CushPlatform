import React from 'react';

const WorkingPrivacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: December 16, 2024</p>
          </header>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
              <p>
                Welcome to Cush, a comprehensive platform providing global immigration services, financial assistance, 
                remittances, mentorship, and community support. We are committed to protecting your privacy and ensuring 
                the security of your personal information. This Privacy Policy explains how we collect, use, store, 
                share, and protect your data when you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Personal Information You Provide</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Identity Information:</strong> Name, email address, phone number, date of birth, nationality</li>
                  <li><strong>Contact Information:</strong> Physical address, mailing address</li>
                  <li><strong>Immigration Details:</strong> Immigration status, visa information, travel documents</li>
                  <li><strong>Financial Information:</strong> Bank account details (for remittances), income information (for loans)</li>
                  <li><strong>Educational Background:</strong> Qualifications, certifications, work experience</li>
                  <li><strong>Health Information:</strong> Medical history and health data (when health features are enabled)</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Information Collected Automatically</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Technical Data:</strong> IP address, device information, browser type and version</li>
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
                  <li><strong>Session Data:</strong> Login times, session duration, user interactions</li>
                  <li><strong>Cookies and Tracking:</strong> Preferences, analytics data, performance metrics</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Payment Security:</strong> Credit card and payment information is processed securely by Stripe. 
                  Cush does not store your complete payment card details on our servers.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Core Services</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Create and maintain user accounts</li>
                    <li>Provide immigration assistance and guidance</li>
                    <li>Process remittance transactions</li>
                    <li>Facilitate loan applications and matching</li>
                    <li>Enable mentorship connections</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Platform Enhancement</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Personalize AI assistant responses</li>
                    <li>Improve service recommendations</li>
                    <li>Conduct security and fraud prevention</li>
                    <li>Analyze usage patterns and preferences</li>
                    <li>Send service updates and communications</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
              
              <div className="space-y-4">
                <p>
                  We implement industry-standard security measures to protect your personal information from unauthorized 
                  access, use, or disclosure. Our security practices include:
                </p>
                
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Encryption:</strong> All data transmission is encrypted using SSL/TLS protocols</li>
                  <li><strong>Access Controls:</strong> Limited access to personal data on a need-to-know basis</li>
                  <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
                  <li><strong>Secure Storage:</strong> Data stored in secure, access-controlled environments</li>
                  <li><strong>Staff Training:</strong> Regular privacy and security training for all personnel</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Data Access & Control</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Request access to your personal data</li>
                    <li>Correct inaccurate information</li>
                    <li>Delete your account and data</li>
                    <li>Export your data in portable format</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Communication Preferences</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Opt-out of marketing communications</li>
                    <li>Manage notification preferences</li>
                    <li>Control cookie and tracking settings</li>
                    <li>Withdraw consent for data processing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              
              <div className="space-y-4">
                <p>
                  We work with trusted third-party service providers to deliver our services. These partners may 
                  have access to your information as necessary to perform their functions, but they are contractually 
                  obligated to maintain confidentiality and security.
                </p>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Key Partners Include:</h4>
                  <ul className="text-blue-800 space-y-1 text-sm">
                    <li>• Payment processors (Stripe) for secure financial transactions</li>
                    <li>• Email service providers for communications</li>
                    <li>• Cloud hosting providers for data storage and processing</li>
                    <li>• Analytics services for platform improvement</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="mb-4">
                  If you have questions about this Privacy Policy or how we handle your personal information, 
                  please contact us:
                </p>
                
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> privacy@we-cush.com</p>
                  <p><strong>Data Protection Officer:</strong> dpo@we-cush.com</p>
                  <p><strong>Address:</strong> Cush Privacy Team, [Company Address]</p>
                </div>
              </div>
            </section>

            <footer className="text-center pt-8 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                This Privacy Policy is effective as of December 16, 2024 and may be updated periodically. 
                We will notify you of any material changes.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingPrivacy;