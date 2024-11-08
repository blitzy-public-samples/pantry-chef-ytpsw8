/**
 * HUMAN TASKS:
 * 1. Configure environment variables for API endpoints
 * 2. Set up proper error tracking service integration
 * 3. Configure toast notification styling in theme.ts
 * 4. Ensure proper form validation messages are localized
 */

import React, { useState, useCallback, useEffect } from 'react'; // ^18.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify'; // ^9.0.0
import { APP_ROUTES } from '../../config/constants';

/**
 * Interface for user settings form data
 * Implements requirement: User Preference Management
 */
interface SettingsFormData {
  email: string;
  firstName: string;
  lastName: string;
  dietaryRestrictions: string[];
  notificationPreferences: {
    email?: boolean;
    push?: boolean;
    expirationAlerts?: boolean;
  };
}

/**
 * Available dietary restrictions options
 */
const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Kosher',
  'Halal',
  'Nut-Free',
  'Shellfish-Free',
  'Low-Carb',
  'Keto',
];

/**
 * Settings page component that allows users to manage their preferences
 * Implements requirements:
 * - User Preference Management: Allow users to manage preferences and settings
 * - Authorization Matrix: User access to own profile management
 * - Frontend UI Framework: UI Components using React Native Paper
 */
const SettingsPage: React.FC = () => {
  const router = useRouter();
  const { user, logout, loading: authLoading, error: authError } = useAuth();

  // Form state initialization
  const [formData, setFormData] = useState<SettingsFormData>({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    dietaryRestrictions: user?.dietaryRestrictions || [],
    notificationPreferences: {
      // email: user?.notificationPreferences?.email || false,
      // push: user?.notificationPreferences?.push || false,
      // expirationAlerts: user?.notificationPreferences?.expirationAlerts || true,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        dietaryRestrictions: user.dietaryRestrictions || [],
        notificationPreferences: {
          // email: user.notificationPreferences?.email || false,
          // push: user.notificationPreferences?.push || false,
          // expirationAlerts: user.notificationPreferences?.expirationAlerts || true,
        },
      });
    }
  }, [user]);

  /**
   * Handles form field changes
   */
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handles notification preference toggles
   */
  const handleNotificationToggle = useCallback((type: keyof typeof formData.notificationPreferences) => {
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [type]: !prev.notificationPreferences[type],
      },
    }));
  }, []);

  /**
   * Handles dietary restriction selection
   */
  const handleDietaryRestrictionToggle = useCallback((restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction],
    }));
  }, []);

  /**
   * Validates form data before submission
   */
  const validateForm = useCallback((data: SettingsFormData): boolean => {
    if (!data.email || !data.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!data.firstName.trim() || !data.lastName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    return true;
  }, []);

  /**
   * Handles settings form submission
   * Implements requirement: User Preference Management
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm(formData)) {
      return;
    }

    setIsSubmitting(true);
    try {
      // API call to update user settings
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast.success('Settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  /**
   * Handles user logout
   */
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push(APP_ROUTES.LOGIN);
    } catch (err) {
      toast.error('Failed to logout');
    }
  }, [logout, router]);

  return (
    <>
      <div className="mx-auto p-6">
        <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => handleInputChange('firstName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => handleInputChange('lastName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Notification Preferences Section */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Email Notifications</h3>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotificationToggle('email')}
                  className={`${formData.notificationPreferences.email
                    ? 'bg-primary-600'
                    : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${formData.notificationPreferences.email
                      ? 'translate-x-5'
                      : 'translate-x-1'
                      } inline-block h-5 w-5 my-0.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Push Notifications</h3>
                  <p className="text-sm text-gray-500">Receive mobile push notifications</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotificationToggle('push')}
                  className={`${formData.notificationPreferences.push
                    ? 'bg-primary-600'
                    : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${formData.notificationPreferences.push
                      ? 'translate-x-5'
                      : 'translate-x-1'
                      } inline-block h-5 w-5 my-0.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Expiration Alerts</h3>
                  <p className="text-sm text-gray-500">Get notified about expiring items</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotificationToggle('expirationAlerts')}
                  className={`${formData.notificationPreferences.expirationAlerts
                    ? 'bg-primary-600'
                    : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${formData.notificationPreferences.expirationAlerts
                      ? 'translate-x-5'
                      : 'translate-x-1'
                      } inline-block h-5 w-5 my-0.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Dietary Restrictions Section */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Dietary Restrictions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {DIETARY_RESTRICTIONS.map(restriction => (
                <div key={restriction} className="flex items-center">
                  <input
                    type="checkbox"
                    id={restriction}
                    checked={formData.dietaryRestrictions.includes(restriction)}
                    onChange={() => handleDietaryRestrictionToggle(restriction)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor={restriction}
                    className="ml-2 text-sm text-gray-700"
                  >
                    {restriction}
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              disabled={isSubmitting || authLoading}
              className="w-full sm:w-auto"
            >
              Logout
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default SettingsPage;