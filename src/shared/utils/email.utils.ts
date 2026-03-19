// import { Injectable } from '@nestjs/common';
// import { MailerService } from '@nestjs-modules/mailer';

// @Injectable()
// export class EmailService {
//   constructor(private readonly mailerService: MailerService) {}

//   async sendOtpEmail(to: string, otp: string, type: 'verify' | 'reset') {
//     const subject = type === 'verify' ? 'Verify Your Email' : 'Reset Your Password';
//     const message = type === 'verify' ? `Your email verification code is: ${otp}` : `Your password reset code is: ${otp}`;

//     const mailOptions = {
//       to,
//       subject,
//       text: message,
//     };

//     try {
//       await this.mailerService.sendMail(mailOptions);
//       console.log(`Email sent to ${to} with OTP: ${otp}`);
//     } catch (error) {
//       console.error(`Failed to send email to ${to}:`, error);
//     }
//   }
// }
