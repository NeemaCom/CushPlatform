import React from 'react';

const WorkingTerms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-gray-600">Last updated: December 16, 2024</p>
          </header>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to Cush</h2>
              <p className="mb-4">
                Welcome to Cush, a comprehensive platform providing immigration services, financial assistance, 
                remittances, mentorship, and community support. By accessing or using our services, you agree 
                to be bound by these Terms of Service ("Terms").
              </p>
              <p>
                These Terms constitute a legally binding agreement between you ("User") and Cush ("Company", "we", "us"). 
                Please read these Terms carefully before using our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Services Provided</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Core Services</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li><strong>Immigration Assistance:</strong> Information, guidance, and document preparation support</li>
                    <li><strong>Mentorship Platform:</strong> Connecting users with experienced mentors</li>
                    <li><strong>Financial Services:</strong> Loan referrals and financial guidance</li>
                    <li><strong>Remittance Services:</strong> International money transfer facilitation</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Platform Features</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li><strong>AI Assistant (Imisi):</strong> AI-powered chat support and guidance</li>
                    <li><strong>Community Features:</strong> Forums, events, and networking opportunities</li>
                    <li><strong>Housing & Jobs Board:</strong> Listings and search functionality</li>
                    <li><strong>Educational Resources:</strong> Articles, guides, and insights</li>
                  </ul>
                </div>
              </div>

              <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                <p className="text-sm text-orange-800">
                  <strong>Important:</strong> Cush acts as a platform provider and referral service. We are not 
                  a direct lender, employer, landlord, or immigration attorney for all services. We connect you 
                  with qualified third-party providers.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Responsibilities</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Prohibited Conduct</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="list-disc ml-6 space-y-2 text-sm">
                      <li>Illegal activities or fraud</li>
                      <li>Harassment or abusive behavior</li>
                      <li>Unauthorized access to systems</li>
                      <li>Impersonation of others</li>
                    </ul>
                    <ul className="list-disc ml-6 space-y-2 text-sm">
                      <li>Spam or unsolicited communications</li>
                      <li>Malware or harmful code distribution</li>
                      <li>Violation of intellectual property rights</li>
                      <li>Circumventing security measures</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Information Accuracy</h3>
                  <p className="text-sm leading-relaxed">
                    You are responsible for providing accurate, current, and complete information. 
                    False or misleading information may result in account suspension and may affect 
                    your ability to access services from our partners.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">AI Assistant (Imisi) Usage</h2>
              
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
                <p className="text-sm text-orange-800">
                  <strong>Important Limitations:</strong> Our AI assistant provides general information and guidance only. 
                  It does not provide medical, legal, or professional immigration advice.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Acceptable Use</h3>
                  <ul className="list-disc ml-6 space-y-2 text-sm">
                    <li>Use for general financial guidance and platform navigation</li>
                    <li>Ask questions about immigration processes and requirements</li>
                    <li>Request information about our services and features</li>
                    <li>Seek guidance on using platform tools and resources</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Prohibited AI Usage</h3>
                  <ul className="list-disc ml-6 space-y-2 text-sm">
                    <li>Requesting specific legal advice or representation</li>
                    <li>Seeking medical diagnoses or treatment recommendations</li>
                    <li>Attempting to generate harmful or inappropriate content</li>
                    <li>Using AI responses as official documentation</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Financial Services</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Loan Referral Service</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    Cush provides loan referral services by connecting users with third-party lenders. 
                    We are not a direct lender and do not make credit decisions.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Important Disclosures:</h4>
                    <ul className="text-blue-800 space-y-1 text-sm">
                      <li>• Loan terms and conditions are determined by individual lenders</li>
                      <li>• Interest rates and fees vary by lender and creditworthiness</li>
                      <li>• We may receive compensation from lenders for successful referrals</li>
                      <li>• Credit checks may be performed by lenders</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Remittance Services</h3>
                  <p className="text-sm leading-relaxed">
                    International money transfer services are provided through licensed third-party partners. 
                    Exchange rates, fees, and transfer times are determined by our partners and may vary 
                    based on destination country and transfer method.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Community Guidelines</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Respectful Interaction</h3>
                  <ul className="list-disc ml-6 space-y-2 text-sm">
                    <li>Treat all community members with respect and dignity</li>
                    <li>Maintain professional and constructive communication</li>
                    <li>Respect diverse backgrounds, cultures, and experiences</li>
                    <li>Report inappropriate behavior to our moderation team</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Content Standards</h3>
                  <ul className="list-disc ml-6 space-y-2 text-sm">
                    <li>Share accurate and helpful information</li>
                    <li>Avoid posting personal or sensitive information</li>
                    <li>Respect intellectual property and cite sources when appropriate</li>
                    <li>Keep discussions relevant to immigration and financial topics</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Liability and Disclaimers</h2>
              
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <p className="text-sm text-red-800">
                  <strong>No Warranty:</strong> Services are provided "as is" without warranties of any kind. 
                  We do not guarantee the accuracy, completeness, or timeliness of information provided.
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <p>
                  <strong>Limitation of Liability:</strong> Cush's liability is limited to the maximum extent 
                  permitted by law. We are not liable for indirect, incidental, or consequential damages 
                  arising from your use of our services.
                </p>

                <p>
                  <strong>Third-Party Services:</strong> We are not responsible for the actions, products, 
                  content, or services of third-party providers. Your interactions with third parties are 
                  solely between you and such parties.
                </p>

                <p>
                  <strong>Immigration Outcomes:</strong> We do not guarantee successful immigration outcomes. 
                  Immigration processes are complex and subject to government policies and individual circumstances.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account Termination</h2>
              
              <div className="space-y-4 text-sm">
                <p>
                  We reserve the right to suspend or terminate accounts that violate these Terms or engage 
                  in activities that may harm our platform or other users. Account termination may result in:
                </p>

                <ul className="list-disc ml-6 space-y-2">
                  <li>Loss of access to all platform features and services</li>
                  <li>Forfeiture of any unused credits or balances</li>
                  <li>Deletion of user-generated content and data</li>
                  <li>Prohibition from creating new accounts</li>
                </ul>

                <p>
                  Users may terminate their accounts at any time through account settings. Upon termination, 
                  we will process data deletion in accordance with our Privacy Policy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to Terms</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm">
                  We may update these Terms periodically to reflect changes in our services or applicable law. 
                  Material changes will be communicated through email or platform notifications. Continued use 
                  of our services after changes become effective constitutes acceptance of the updated Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="mb-4">
                  For questions about these Terms of Service or our platform, please contact us:
                </p>
                
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> legal@we-cush.com</p>
                  <p><strong>Support:</strong> support@we-cush.com</p>
                  <p><strong>Address:</strong> Cush Legal Team, [Company Address]</p>
                </div>
              </div>
            </section>

            <footer className="text-center pt-8 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                These Terms of Service are effective as of December 16, 2024 and govern your use of the Cush platform.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingTerms;