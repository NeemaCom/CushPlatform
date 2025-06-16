import { Scale, Users, CreditCard, AlertTriangle, Globe, FileText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TermsOfService() {
  const lastUpdated = "December 16, 2024";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Scale className="w-5 h-5" />
              <span className="font-semibold">Cush - Terms of Service</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <Scale className="w-8 h-8" />
              Terms of Service
            </CardTitle>
            <p className="text-green-100 mt-2">
              These terms govern your use of Cush and outline our mutual responsibilities and agreements.
            </p>
            <p className="text-sm text-green-200 mt-4">
              Last updated: {lastUpdated}
            </p>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Welcome to Cush
              </h2>
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

            <Separator />

            {/* Acceptance of Terms */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  By creating an account, accessing our website, or using any of our services, you acknowledge 
                  that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. 
                  If you do not agree to these Terms, you must not use our services.
                </p>
              </div>
            </section>

            <Separator />

            {/* Services Provided */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Services Provided
              </h2>
              
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

              <Alert className="mt-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Cush acts as a platform provider and referral service. We are not 
                  a direct lender, employer, landlord, or immigration attorney for all services. We connect you 
                  with qualified third-party providers.
                </AlertDescription>
              </Alert>
            </section>

            <Separator />

            {/* User Accounts */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Accounts</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Account Creation</h3>
                  <ul className="space-y-1 text-gray-700 text-sm ml-4">
                    <li>• You must be at least 18 years old to create an account</li>
                    <li>• You must provide accurate and complete information</li>
                    <li>• You are responsible for maintaining account security</li>
                    <li>• One person may maintain only one account</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Account Security</h3>
                  <ul className="space-y-1 text-gray-700 text-sm ml-4">
                    <li>• Keep your password secure and confidential</li>
                    <li>• Enable multi-factor authentication when available</li>
                    <li>• Notify us immediately of unauthorized access</li>
                    <li>• You are responsible for all activities under your account</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Account Termination</h3>
                  <p className="text-gray-700 text-sm">
                    We reserve the right to suspend or terminate accounts that violate these Terms, 
                    engage in fraudulent activity, or pose security risks to our platform or users.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

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

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Legal Compliance</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    You agree to comply with all applicable laws and regulations in your jurisdiction, 
                    including immigration laws, financial regulations, and data protection requirements.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* AI Assistant Usage */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Assistant (Imisi) Usage</h2>
              
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important Limitations:</strong> Our AI assistant provides general information and guidance only. 
                  It does not provide medical, legal, or professional immigration advice.
                </AlertDescription>
              </Alert>

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

            <Separator />

            {/* Payments and Fees */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Payments and Fees
              </h2>
              
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

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Taxes</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    You are responsible for any applicable taxes related to your use of our services, 
                    including VAT, sales tax, or other local taxes as required by your jurisdiction.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Disclaimers and Limitations */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Disclaimers and Limitation of Liability
              </h2>
              
              <div className="space-y-4">
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-sm text-orange-800">
                    <strong>Services Provided "As Is":</strong> Our platform and services are provided on an "as is" 
                    and "as available" basis without warranties of any kind, either express or implied.
                  </AlertDescription>
                </Alert>

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
                  <h3 className="font-medium text-gray-800 mb-3">Third-Party Services</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    We disclaim liability for services provided by third-party partners, including loan providers, 
                    remittance agents, healthcare providers, landlords, employers, or other service providers. 
                    Your relationship with these providers is governed by their own terms and conditions.
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

            <Separator />

            {/* Intellectual Property */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Intellectual Property Rights</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Cush Platform Content</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    All content on the Cush platform, including text, graphics, logos, software, and design, 
                    is owned by Cush or its licensors and is protected by copyright, trademark, and other 
                    intellectual property laws.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">User-Generated Content</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    By submitting content to our platform (posts, reviews, messages), you grant Cush a 
                    non-exclusive, worldwide license to use, display, and distribute such content for 
                    platform operation and improvement purposes.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Trademark Use</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    "Cush" and related marks are trademarks of our company. You may not use these marks 
                    without prior written permission.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

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

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Arbitration</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    For disputes that cannot be resolved through negotiation, both parties agree to binding 
                    arbitration under the rules of a recognized arbitration organization, rather than 
                    litigation in court.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

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

            <Separator />

            {/* Contact Information */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Contact Us
              </h2>
              
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
                These Terms of Service were last updated on {lastUpdated}. By continuing to use Cush 
                after any modifications, you agree to the updated Terms.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}