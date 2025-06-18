function Privacy() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '40px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Privacy Policy</h1>
        <p style={{ color: '#6b7280', marginBottom: '30px' }}>Last updated: December 16, 2024</p>
        
        <div style={{ lineHeight: '1.6', color: '#374151' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '30px', marginBottom: '15px' }}>Introduction</h2>
          <p style={{ marginBottom: '20px' }}>
            Welcome to Cush, a comprehensive platform providing global immigration services, financial assistance, 
            remittances, mentorship, and community support. We are committed to protecting your privacy and ensuring 
            the security of your personal information.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '30px', marginBottom: '15px' }}>Information We Collect</h2>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginTop: '20px', marginBottom: '10px' }}>Personal Information</h3>
          <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
            <li>Identity Information: Name, email address, phone number, date of birth, nationality</li>
            <li>Contact Information: Physical address, mailing address</li>
            <li>Immigration Details: Immigration status, visa information, travel documents</li>
            <li>Financial Information: Bank account details (for remittances), income information (for loans)</li>
            <li>Educational Background: Qualifications, certifications, work experience</li>
          </ul>

          <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginTop: '20px', marginBottom: '10px' }}>Automatically Collected Information</h3>
          <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
            <li>Technical Data: IP address, device information, browser type and version</li>
            <li>Usage Data: Pages visited, features used, time spent on platform</li>
            <li>Session Data: Login times, session duration, user interactions</li>
            <li>Cookies and Tracking: Preferences, analytics data, performance metrics</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '30px', marginBottom: '15px' }}>How We Use Your Information</h2>
          <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
            <li>Create and maintain user accounts</li>
            <li>Provide immigration assistance and guidance</li>
            <li>Process remittance transactions</li>
            <li>Facilitate loan applications and matching</li>
            <li>Enable mentorship connections</li>
            <li>Personalize AI assistant responses</li>
            <li>Improve service recommendations</li>
            <li>Conduct security and fraud prevention</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '30px', marginBottom: '15px' }}>Data Security</h2>
          <p style={{ marginBottom: '15px' }}>
            We implement industry-standard security measures including:
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
            <li>End-to-end encryption for data transmission</li>
            <li>Advanced encryption for data storage</li>
            <li>Multi-factor authentication options</li>
            <li>Regular security audits and assessments</li>
            <li>Access controls and employee training</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '30px', marginBottom: '15px' }}>Your Privacy Rights</h2>
          <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
            <li><strong>Access:</strong> Request copies of your personal data</li>
            <li><strong>Rectification:</strong> Correct inaccurate information</li>
            <li><strong>Erasure:</strong> Request deletion of your data</li>
            <li><strong>Portability:</strong> Export your data in a usable format</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '30px', marginBottom: '15px' }}>Regulatory Compliance</h2>
          <p style={{ marginBottom: '15px' }}>
            We comply with applicable data protection laws including GDPR (European Union), 
            CCPA (California, USA), PIPEDA (Canada), UK GDPR (United Kingdom), and other regional laws.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '30px', marginBottom: '15px' }}>Contact Us</h2>
          <p style={{ marginBottom: '10px' }}>For privacy-related questions, contact us:</p>
          <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
            <li>Email: privacy@we-cush.com</li>
            <li>Data Protection Officer: dpo@we-cush.com</li>
            <li>Support: Available through your account dashboard</li>
          </ul>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginTop: '30px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              This Privacy Policy was last updated on December 16, 2024. We may update this policy periodically. 
              Material changes will be communicated to users via email or platform notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Privacy;