import { logError, logInfo } from '@error/Logger';
import nodeMailer from 'nodemailer';
import hbs from 'nodemailer-handlebars';
import config from '@config/config_BE';

class MailService {
  /**
   * Send a email genereted from a template
   * @param receiver list of receivers, to send to multiple receiver just separe each with comma
   * @param subject subject of the email
   * @param template template used
   * @param data data to fill the template
   */
  async sendMail(receiver: string, subject: string, template: string, data: unknown) {
    const transporter = this.getTransporter(template);
    const mailData = {
      from: config.mailer.adress,
      to: receiver,
      subject: subject,
      template: template,
      context: data
    };
    transporter.sendMail(mailData, function (err, info) {
      err && logError(err);
      info && logInfo(info.response);
    });
  }

  /**
   * Initialize the transporter
   * TODO: replace GMAIL by MAIL GUN
   * @param template template to use
   * @returns transporter
   */
  private getTransporter(template: string) {
    const transporter = nodeMailer.createTransport({
      port: 465, // true for 465, false for other ports
      host: 'smtp.gmail.com',
      auth: {
        user: config.mailer.adress,
        pass: config.mailer.password
      },
      secure: true
    });

    transporter.use(
      'compile',
      hbs({
        viewEngine: {
          extname: '.handlebars', // handlebars extension
          layoutsDir: __dirname + '/../mail_template/', // location of handlebars templates
          defaultLayout: template, // name of main template
          partialsDir: __dirname + '/../mail_template/' // location of your subtemplates aka. header, footer etc
        },
        viewPath: __dirname + '/../mail_template/',
        extName: '.handlebars'
      })
    );
    return transporter;
  }
}

export default new MailService();
