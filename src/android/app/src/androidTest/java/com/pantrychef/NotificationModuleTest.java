package com.pantrychef;

// AndroidX Test imports - version 1.1.3
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.ActivityTestRule;

// JUnit imports - version 4.13.2
import org.junit.Test;
import org.junit.Rule;
import org.junit.Before;
import org.junit.Assert;
import org.junit.runner.RunWith;

// Android core imports
import android.app.NotificationManager;
import android.content.Context;
import android.service.notification.StatusBarNotification;

// React Native imports
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;

// Internal imports
import com.pantrychef.modules.notification.NotificationModule;

/**
 * HUMAN TASKS:
 * 1. Ensure notification permissions are granted before running tests
 * 2. Verify notification_icon.png is present in res/drawable
 * 3. Run tests on multiple Android API levels (26+)
 * 4. Review notification channel settings match UX requirements
 */
@RunWith(AndroidJUnit4.class)
public class NotificationModuleTest {

    private NotificationModule notificationModule;
    private ReactApplicationContext reactContext;
    private NotificationManager notificationManager;

    @Before
    public void setUp() {
        // Requirement: Push Notifications - Test environment setup
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        reactContext = new ReactApplicationContext(context);
        notificationModule = new NotificationModule(reactContext);
        notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    @Test
    public void testShowLocalNotification() {
        // Requirement: Push Notifications - Validate notification display
        final String testTitle = "Test Notification";
        final String testMessage = "This is a test notification";
        final int[] notificationId = new int[1];
        final boolean[] promiseResolved = new boolean[1];

        // Create a promise to handle the async result
        Promise promise = new Promise() {
            @Override
            public void resolve(Object value) {
                notificationId[0] = (int) value;
                promiseResolved[0] = true;
            }

            @Override
            public void reject(String code, String message) {
                Assert.fail("Promise rejected: " + message);
            }

            @Override
            public void reject(String code, Throwable throwable) {
                Assert.fail("Promise rejected with throwable: " + throwable.getMessage());
            }
        };

        // Show notification
        notificationModule.showLocalNotification(testTitle, testMessage, promise);

        // Wait for async operation
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Assert.fail("Test interrupted");
        }

        // Verify notification was shown
        Assert.assertTrue("Promise should be resolved", promiseResolved[0]);
        Assert.assertTrue("Notification ID should be positive", notificationId[0] > 0);

        // Verify notification content
        StatusBarNotification[] notifications = notificationManager.getActiveNotifications();
        boolean notificationFound = false;
        for (StatusBarNotification notification : notifications) {
            if (notification.getId() == notificationId[0]) {
                notificationFound = true;
                Assert.assertEquals("Notification title should match", testTitle, 
                    notification.getNotification().extras.getString("android.title"));
                Assert.assertEquals("Notification message should match", testMessage, 
                    notification.getNotification().extras.getString("android.text"));
                break;
            }
        }
        Assert.assertTrue("Notification should be found in status bar", notificationFound);
    }

    @Test
    public void testCancelNotification() {
        // Requirement: Real-time Communication - Validate notification cancellation
        final String testTitle = "Cancel Test";
        final String testMessage = "This notification should be cancelled";
        final int[] notificationId = new int[1];
        final boolean[] promiseResolved = new boolean[1];

        // Show notification first
        Promise showPromise = new Promise() {
            @Override
            public void resolve(Object value) {
                notificationId[0] = (int) value;
            }

            @Override
            public void reject(String code, String message) {
                Assert.fail("Show promise rejected: " + message);
            }

            @Override
            public void reject(String code, Throwable throwable) {
                Assert.fail("Show promise rejected with throwable: " + throwable.getMessage());
            }
        };

        notificationModule.showLocalNotification(testTitle, testMessage, showPromise);

        // Wait for notification to be shown
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Assert.fail("Test interrupted");
        }

        // Cancel notification
        Promise cancelPromise = new Promise() {
            @Override
            public void resolve(Object value) {
                promiseResolved[0] = true;
            }

            @Override
            public void reject(String code, String message) {
                Assert.fail("Cancel promise rejected: " + message);
            }

            @Override
            public void reject(String code, Throwable throwable) {
                Assert.fail("Cancel promise rejected with throwable: " + throwable.getMessage());
            }
        };

        notificationModule.cancelNotification(notificationId[0], cancelPromise);

        // Wait for cancellation
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Assert.fail("Test interrupted");
        }

        // Verify notification was cancelled
        Assert.assertTrue("Cancel promise should be resolved", promiseResolved[0]);
        StatusBarNotification[] notifications = notificationManager.getActiveNotifications();
        for (StatusBarNotification notification : notifications) {
            Assert.assertNotEquals("Notification should not exist", notificationId[0], notification.getId());
        }
    }

    @Test
    public void testCancelAllNotifications() {
        // Requirement: Real-time Communication - Validate bulk notification cancellation
        final String[] titles = {"Test 1", "Test 2", "Test 3"};
        final String testMessage = "Multiple notification test";

        // Show multiple notifications
        for (String title : titles) {
            Promise showPromise = new Promise() {
                @Override
                public void resolve(Object value) {}

                @Override
                public void reject(String code, String message) {
                    Assert.fail("Show promise rejected: " + message);
                }

                @Override
                public void reject(String code, Throwable throwable) {
                    Assert.fail("Show promise rejected with throwable: " + throwable.getMessage());
                }
            };
            notificationModule.showLocalNotification(title, testMessage, showPromise);
        }

        // Wait for notifications to be shown
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Assert.fail("Test interrupted");
        }

        // Verify notifications are shown
        Assert.assertTrue("Multiple notifications should be active",
            notificationManager.getActiveNotifications().length >= titles.length);

        // Cancel all notifications
        final boolean[] promiseResolved = new boolean[1];
        Promise cancelAllPromise = new Promise() {
            @Override
            public void resolve(Object value) {
                promiseResolved[0] = true;
            }

            @Override
            public void reject(String code, String message) {
                Assert.fail("CancelAll promise rejected: " + message);
            }

            @Override
            public void reject(String code, Throwable throwable) {
                Assert.fail("CancelAll promise rejected with throwable: " + throwable.getMessage());
            }
        };

        notificationModule.cancelAllNotifications(cancelAllPromise);

        // Wait for cancellation
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Assert.fail("Test interrupted");
        }

        // Verify all notifications were cancelled
        Assert.assertTrue("CancelAll promise should be resolved", promiseResolved[0]);
        Assert.assertEquals("No notifications should be active", 
            0, notificationManager.getActiveNotifications().length);
    }
}