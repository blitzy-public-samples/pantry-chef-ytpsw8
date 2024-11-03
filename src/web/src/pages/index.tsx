/**
 * HUMAN TASKS:
 * 1. Configure environment variables for authentication endpoints
 * 2. Set up proper image assets in public/assets/images
 * 3. Configure SEO meta tags in next.config.js
 * 4. Ensure proper font loading in _document.tsx
 */

import React from 'react'; // ^18.0.0
import { useRouter } from 'next/router'; // ^13.0.0
import Image from 'next/image'; // ^13.0.0
import MainLayout from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';

/**
 * Landing page component for PantryChef web application
 * Implements requirements:
 * - Web Dashboard: Landing page with responsive design
 * - User Interface Design: Landing page with quick actions and immediate access to core functionality
 */
const HomePage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  /**
   * Handles navigation when user clicks the get started button
   * Implements requirement: User Interface Design - Immediate access to core functionality
   */
  const handleGetStarted = (event: React.MouseEvent<HTMLButtonElement>) => {
    router.push(isAuthenticated ? '/dashboard' : '/signup');
  };

  return (
    <MainLayout className="bg-white">
      {/* Hero Section */}
      <section className="min-h-[calc(100vh-64px)] flex flex-col justify-center items-center text-center px-6 py-12 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Kitchen with Smart Technology
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12">
            Reduce food waste, discover personalized recipes, and manage your pantry efficiently with PantryChef's intelligent platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="primary"
              size="large"
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              size="large"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 py-12 md:px-12 bg-gray-50">
        <div className="text-center p-6">
          <Image
            src="/assets/images/recognition.svg"
            alt="Image Recognition"
            width={64}
            height={64}
            className="mx-auto mb-4"
          />
          <h3 className="text-xl font-semibold mb-2">Smart Recognition</h3>
          <p className="text-gray-600">
            Instantly identify ingredients with our advanced image recognition technology.
          </p>
        </div>
        <div className="text-center p-6">
          <Image
            src="/assets/images/recipe.svg"
            alt="Recipe Matching"
            width={64}
            height={64}
            className="mx-auto mb-4"
          />
          <h3 className="text-xl font-semibold mb-2">Recipe Matching</h3>
          <p className="text-gray-600">
            Get personalized recipe recommendations based on your available ingredients.
          </p>
        </div>
        <div className="text-center p-6">
          <Image
            src="/assets/images/pantry.svg"
            alt="Pantry Management"
            width={64}
            height={64}
            className="mx-auto mb-4"
          />
          <h3 className="text-xl font-semibold mb-2">Pantry Management</h3>
          <p className="text-gray-600">
            Track expiration dates and manage your inventory efficiently.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-6 py-12 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose PantryChef?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start">
              <div className="bg-primary-50 rounded-full p-3 mr-4">
                <Image
                  src="/assets/images/time.svg"
                  alt="Time Savings"
                  width={24}
                  height={24}
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Save Time</h3>
                <p className="text-gray-600">
                  Streamline meal planning and grocery shopping with intelligent suggestions.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary-50 rounded-full p-3 mr-4">
                <Image
                  src="/assets/images/money.svg"
                  alt="Cost Savings"
                  width={24}
                  height={24}
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Reduce Waste</h3>
                <p className="text-gray-600">
                  Track expiration dates and use ingredients efficiently to save money.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary-50 rounded-full p-3 mr-4">
                <Image
                  src="/assets/images/recipe-book.svg"
                  alt="Recipe Discovery"
                  width={24}
                  height={24}
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Discover Recipes</h3>
                <p className="text-gray-600">
                  Explore new dishes tailored to your preferences and available ingredients.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary-50 rounded-full p-3 mr-4">
                <Image
                  src="/assets/images/community.svg"
                  alt="Community"
                  width={24}
                  height={24}
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Join Community</h3>
                <p className="text-gray-600">
                  Share recipes and cooking tips with a community of food enthusiasts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-primary-50 px-6 py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Kitchen?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who are already saving time and reducing waste with PantryChef.
          </p>
          <Button
            variant="primary"
            size="large"
            onClick={handleGetStarted}
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;