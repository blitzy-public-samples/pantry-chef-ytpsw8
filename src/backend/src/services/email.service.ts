// @ts-check
import AWS from 'aws-sdk'; // ^2.1.0
import handlebars from 'handlebars'; // ^4.7.0
import nodemailer from 'nodemailer'; // ^6.7.0
import { promises as fs } from 'fs';
import path from 'path';
import { logger, error as logError, info as logInfo } from '../utils/logger';
import { AppError } from '../utils/errors';
import { validateEmail } from '../utils/validators';
import { User } from '../interfaces/user.interface';

/*
HUMAN TASKS:
1. Set up AWS SES credentials and verify sending domain
2. Configure email templates in templates/email directory
3. Set up email bounce and complaint handling
4. Configure email sending limits and monitoring
5. Set up email tracking and analytics
6. Verify compliance with anti-spam regulations
*/

// Global configuration from environment variables
const AWS_SES_REGION = process.env.AWS_SES_REGION || 'us-east-1';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@pantrychef.com';
const EMAIL_TEMPLATE_DIR = process.env.EMAIL_TEMPLATE_DIR || 'templates/email';

/**
 * Email service class for handling all email communications
 * Addresses requirements:
 * - User Notifications - Email notification service
 * - Expiration Tracking - Email notifications for ingredient expiration
 * - User Communication - Email communication service
 */
export class EmailService {
  private SES: AWS.SES;
  private templates: { [key: string]: HandlebarsTemplateDelegate } = {};
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize AWS SES client
    this.SES = new AWS.SES({
      region: AWS_SES_REGION,
      apiVersion: '2010-12-01',
    });

    // Initialize nodemailer with SES transport
    this.transporter = nodemailer.createTransport({
      SES: this.SES,
      sendingRate: 14, // AWS SES limit per second
    });

    // Load email templates
    this.loadTemplates().catch((error) => {
      logError(error, 'EmailService.constructor');
      throw new AppError('Failed to initialize email service', 500, 'EMAIL_SERVICE_INIT_ERROR', {
        error: error.message,
      });
    });
  }

  /**
   * Loads and compiles email templates
   * @private
   */
  private async loadTemplates(): Promise<void> {
    try {
      const templateFiles = await fs.readdir(EMAIL_TEMPLATE_DIR);

      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          const templateContent = await fs.readFile(path.join(EMAIL_TEMPLATE_DIR, file), 'utf-8');
          this.templates[templateName] = handlebars.compile(templateContent);
        }
      }

      logInfo('Email templates loaded successfully', {
        templateCount: Object.keys(this.templates).length,
      });
    } catch (error: any) {
      logError(error, 'EmailService.loadTemplates');
      throw error;
    }
  }

  /**
   * Sends expiration alert emails for ingredients
   * Addresses requirement: Expiration Tracking - Email notifications
   */
  public async sendExpirationAlert(
    user: User,
    expiringItems: Array<{ name: string; expiryDate: Date; quantity: number; unit: string }>
  ): Promise<void> {
    try {
      if (!validateEmail(user.email)) {
        throw new AppError('Invalid email address', 400, 'INVALID_EMAIL', { email: user.email });
      }

      if (!user.preferences.notificationSettings.emailNotifications) {
        logInfo('Email notifications disabled for user', {
          userId: user.id,
          email: user.email,
        });
        return;
      }

      const template = this.templates['expiration-alert'];
      if (!template) {
        throw new AppError('Expiration alert template not found', 500, 'TEMPLATE_NOT_FOUND');
      }

      const htmlContent = template({
        firstName: user.firstName,
        items: expiringItems.map((item) => ({
          ...item,
          expiryDate: item.expiryDate.toLocaleDateString(user.preferences.language, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        })),
        measurementSystem: user.preferences.measurementSystem,
      });

      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: 'PantryChef - Ingredients Expiring Soon',
        html: htmlContent,
        headers: {
          'X-SES-CONFIGURATION-SET': 'EmailTracking',
          'X-User-ID': user.id,
        },
      });

      logInfo('Expiration alert email sent', {
        userId: user.id,
        email: user.email,
        itemCount: expiringItems.length,
      });
    } catch (error: any) {
      logError(error, 'EmailService.sendExpirationAlert');
      throw error;
    }
  }

  /**
   * Sends welcome email to newly registered users
   * Addresses requirement: User Communication - User engagement
   */
  public async sendWelcomeEmail(user: User): Promise<void> {
    try {
      if (!validateEmail(user.email)) {
        throw new AppError('Invalid email address', 400, 'INVALID_EMAIL', { email: user.email });
      }

      const template = this.templates['welcome'];
      if (!template) {
        throw new AppError('Welcome email template not found', 500, 'TEMPLATE_NOT_FOUND');
      }

      const htmlContent = template({
        firstName: user.firstName,
        language: user.preferences.language,
        measurementSystem: user.preferences.measurementSystem,
      });

      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: 'Welcome to PantryChef!',
        html: htmlContent,
        headers: {
          'X-SES-CONFIGURATION-SET': 'EmailTracking',
          'X-User-ID': user.id,
        },
      });

      logInfo('Welcome email sent', {
        userId: user.id,
        email: user.email,
      });
    } catch (error: any) {
      logError(error, 'EmailService.sendWelcomeEmail');
      throw error;
    }
  }

  /**
   * Sends recipe recommendations based on user's pantry
   * Addresses requirement: User Communication - Personalized updates
   */
  public async sendRecipeRecommendations(
    user: User,
    recipes: Array<{
      id: string;
      name: string;
      description: string;
      cookTime: number;
      difficulty: string;
      matchPercentage: number;
    }>
  ): Promise<void> {
    try {
      if (!validateEmail(user.email)) {
        throw new AppError('Invalid email address', 400, 'INVALID_EMAIL', { email: user.email });
      }

      if (!user.preferences.notificationSettings.recipeRecommendations) {
        logInfo('Recipe recommendations disabled for user', {
          userId: user.id,
          email: user.email,
        });
        return;
      }

      const template = this.templates['recipe-recommendations'];
      if (!template) {
        throw new AppError('Recipe recommendations template not found', 500, 'TEMPLATE_NOT_FOUND');
      }

      // Filter recipes based on user's dietary restrictions
      const filteredRecipes = recipes.filter((recipe) => {
        // Implementation would check recipe against user.dietaryRestrictions
        return true; // Simplified for this example
      });

      const htmlContent = template({
        firstName: user.firstName,
        recipes: filteredRecipes.map((recipe) => ({
          ...recipe,
          cookTime: this.formatCookingTime(recipe.cookTime, user.preferences.language),
          matchPercentage: Math.round(recipe.matchPercentage),
        })),
        language: user.preferences.language,
      });

      await this.transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: 'PantryChef - Recipe Recommendations Just for You',
        html: htmlContent,
        headers: {
          'X-SES-CONFIGURATION-SET': 'EmailTracking',
          'X-User-ID': user.id,
        },
      });

      logInfo('Recipe recommendations email sent', {
        userId: user.id,
        email: user.email,
        recipeCount: filteredRecipes.length,
      });
    } catch (error: any) {
      logError(error, 'EmailService.sendRecipeRecommendations');
      throw error;
    }
  }

  /**
   * Helper method to format cooking time based on user's language
   * @private
   */
  private formatCookingTime(minutes: number, language: string): string {
    return new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
      .format(minutes, 'minute')
      .replace('in ', '');
  }
}
