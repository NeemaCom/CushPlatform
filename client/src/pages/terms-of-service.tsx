import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-600 mt-1">Last updated: December 16, 2024</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to Cush</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to Cush, a comprehensive platform providing immigration services, financial assistance, 
              remittances, mentorship, and community support. By accessing or using our services, you agree 
              to be bound by these Terms of Service ("Terms").
            </p>
            <p className="text-gray-700 leading-relaxed">
              These Terms constitute a legally binding agreement between you ("User") and Cush ("Company", "we", "us"). 
              Please read these Terms carefully before using our platform.
            </p>
          </section>

          <hr className="border-gray-200" />

          {/* Services Provided */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Services Provided</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-800">Core Services</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• <strong>Immigration Assistance:</strong> Information, guidance, and document preparation support</li>
                  <li>• <strong>Mentorship Platform:</strong> Connecting users with experienced mentors</li>
                  <li>• <strong>Financial Services:</strong> Loan referrals and financial guidance</li>
                  <li>• <strong>Remittance Services:</strong> International money transfer facilitation</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-gray-800">Platform Features</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• <strong>AI Assistant (Imisi):</strong> AI-powered chat support and guidance</li>
                  <li>• <strong>Community Features:</strong> Forums, events, and networking opportunities</li>
                  <li>• <strong>Housing & Jobs Board:</strong> Listings and search functionality</li>
                  <li>• <strong>Educational Resources:</strong> Articles, guides, and insights</li>
                </ul>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-orange-800">
                <strong>Important:</strong> Cush acts as a platform provider and referral service. We are not 
                a direct lender, employer, landlord, or immigration attorney for all services. We connect you 
                with qualified third-party providers.
              </p>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* User Responsibilities */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Responsibilities</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Prohibited Conduct</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Illegal activities or fraud</li>
                    <li>• Harassment or abusive behavior</li>
                    <li>• Unauthorized access to systems</li>
                    <li>• Impersonation of others</li>
                  </ul>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Spam or unsolicited communications</li>
                    <li>• Malware or harmful code distribution</li>
                    <li>• Violation of intellectual property rights</li>
                    <li>• Circumventing security measures</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">Information Accuracy</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  You are responsible for providing accurate, current, and complete information. 
                  False or misleading information may result in account suspension and may affect 
                  your ability to access services from our partners.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* AI Assistant Usage */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Assistant (Imisi) Usage</h2>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800">
                <strong>Important Limitations:</strong> Our AI assistant provides general information and guidance only. 
                It does not provide medical, legal, or professional immigration advice.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-800">Guidelines for AI Use</h3>
              <ul className="space-y-2 text-gray-700 text-sm ml-4">
                <li>• Use for informational purposes and general guidance</li>
                <li>• Do not rely on AI responses for medical emergencies</li>
                <li>• Consult qualified professionals for legal or medical advice</li>
                <li>• Understand that AI responses may not always be accurate</li>
                <li>• Do not share sensitive personal information in AI chats</li>
              </ul>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Payments and Fees */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payments and Fees</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Service Fees</h3>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• Basic platform access is free</li>
                  <li>• Premium features require subscription</li>
                  <li>• Transaction fees apply to remittance services</li>
                  <li>• Third-party services may have separate fees</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Payment Processing</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Payments are processed securely through Stripe. We do not store your complete 
                  payment card information on our servers. All transactions are subject to 
                  verification and fraud prevention measures.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Refund Policy</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Refunds are available for subscription services within 30 days of purchase, 
                  subject to usage limits. Transaction fees for completed remittances are non-refundable. 
                  Contact our support team for refund requests.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Disclaimers */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Disclaimers and Limitation of Liability</h2>
            
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Services Provided "As Is":</strong> Our platform and services are provided on an "as is" 
                  and "as available" basis without warranties of any kind, either express or implied.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">No Professional Advice</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                  Cush and its AI assistant do not provide:
                </p>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• Medical advice or diagnosis</li>
                  <li>• Legal advice or representation</li>
                  <li>• Immigration legal counsel</li>
                  <li>• Professional financial advisory services</li>
                </ul>
                <p className="text-gray-700 text-sm leading-relaxed mt-3">
                  We are an information and connection platform. Always consult qualified professionals 
                  for advice specific to your situation.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">Limitation of Liability</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  To the maximum extent permitted by law, Cush's total liability for any claims related to 
                  our services shall not exceed the amount you have paid to Cush in the 12 months preceding 
                  the claim, or $100, whichever is greater.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dispute Resolution</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Governing Law</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the 
                  jurisdiction where Cush is registered, without regard to conflict of law principles.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Dispute Resolution Process</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-2">
                  Before pursuing formal legal action, we encourage users to:
                </p>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• Contact our support team to resolve the issue</li>
                  <li>• Participate in good faith negotiations</li>
                  <li>• Consider mediation if direct resolution fails</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes to Terms of Service</h2>
            <div className="space-y-3">
              <p className="text-gray-700 text-sm leading-relaxed">
                We may update these Terms periodically to reflect changes in our services, legal requirements, 
                or business practices. Material changes will be communicated to users via:
              </p>
              <ul className="space-y-1 text-gray-700 text-sm ml-4">
                <li>• Email notification to registered users</li>
                <li>• Prominent notice on our platform</li>
                <li>• In-app notifications</li>
              </ul>
              <p className="text-gray-700 text-sm leading-relaxed">
                Continued use of our services after notification constitutes acceptance of the updated Terms.
              </p>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Contact Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-gray-700 text-sm mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Email:</strong> legal@cush.com</p>
                <p><strong>Support:</strong> support@cush.com</p>
                <p><strong>Business Inquiries:</strong> business@cush.com</p>
                <p><strong>In-Platform:</strong> Use the support chat in your account dashboard</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              These Terms of Service were last updated on December 16, 2024. By continuing to use Cush 
              after any modifications, you agree to the updated Terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}