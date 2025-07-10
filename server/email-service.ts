import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from || 'no-reply@we-cush.com',
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendBookingConfirmation(
  userEmail: string,
  mentorName: string,
  sessionDetails: {
    date: string;
    startTime: string;
    endTime: string;
    topic: string;
    sessionType: string;
  }
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Cush Platform</h1>
        <p style="color: #6b7280; margin: 5px 0 0 0;">Global Immigration Services</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0;">
        <h2 style="color: #16a34a; margin: 0 0 16px 0; font-size: 24px;">🎉 Booking Confirmed!</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your mentorship session with <strong>${mentorName}</strong> has been successfully confirmed.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb;">
          <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px;">📅 Session Details</h3>
          <div style="color: #4b5563; line-height: 1.8;">
            <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date(sessionDetails.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${sessionDetails.startTime} - ${sessionDetails.endTime}</p>
            <p style="margin: 4px 0;"><strong>Topic:</strong> ${sessionDetails.topic}</p>
            <p style="margin: 4px 0;"><strong>Session Type:</strong> ${sessionDetails.sessionType.replace('_', ' ').toUpperCase()}</p>
          </div>
        </div>
      </div>
      
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #1e40af; margin: 0; font-size: 14px;">
          💡 <strong>What's Next?</strong> A calendar invite with meeting details will be sent separately. 
          Please ensure you have the necessary tools ready for your ${sessionDetails.sessionType.replace('_', ' ')} session.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This email was sent by Cush Platform. If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject: `Booking Confirmed: ${mentorName} - ${sessionDetails.topic}`,
    html
  });
}

export async function sendMentorNotification(
  mentorEmail: string,
  userName: string,
  sessionDetails: {
    date: string;
    startTime: string;
    endTime: string;
    topic: string;
    sessionType: string;
    notes?: string;
  }
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Cush Platform</h1>
        <p style="color: #6b7280; margin: 5px 0 0 0;">Mentor Dashboard</p>
      </div>
      
      <div style="background: #f0f9ff; border-radius: 12px; padding: 24px; margin: 20px 0;">
        <h2 style="color: #0369a1; margin: 0 0 16px 0; font-size: 24px;">🔔 New Session Booked!</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          You have a new mentorship session booked with <strong>${userName}</strong>.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #059669;">
          <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px;">📅 Session Details</h3>
          <div style="color: #4b5563; line-height: 1.8;">
            <p style="margin: 4px 0;"><strong>Client:</strong> ${userName}</p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date(sessionDetails.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${sessionDetails.startTime} - ${sessionDetails.endTime}</p>
            <p style="margin: 4px 0;"><strong>Topic:</strong> ${sessionDetails.topic}</p>
            <p style="margin: 4px 0;"><strong>Session Type:</strong> ${sessionDetails.sessionType.replace('_', ' ').toUpperCase()}</p>
            ${sessionDetails.notes ? `<p style="margin: 4px 0;"><strong>Client Notes:</strong> ${sessionDetails.notes}</p>` : ''}
          </div>
        </div>
      </div>
      
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          ⏰ <strong>Reminder:</strong> Please prepare for this session and ensure you have access to the meeting platform. 
          A calendar invite will be sent automatically.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This notification was sent by Cush Platform Mentor System.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: mentorEmail,
    subject: `New Session Booked: ${userName} - ${sessionDetails.topic}`,
    html
  });
}