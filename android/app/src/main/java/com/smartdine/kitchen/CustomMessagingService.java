package com.smartdine.kitchen;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class CustomMessagingService extends FirebaseMessagingService {

    private static final String TAG = "CustomMessagingService";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate: CustomMessagingService initialized.");
    }

    @Override
    public void onNewToken(@NonNull String s) {
        super.onNewToken(s);
        Log.d(TAG, "onNewToken: Received new token: " + s);
        // Pass the token to Capacitor PushNotifications plugin
        PushNotificationsPlugin.onNewToken(s);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "onMessageReceived: Message received from: " + remoteMessage.getFrom());

        // Always pass the message to Capacitor so JS events still fire
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);

        // Check if message contains a data payload
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "onMessageReceived: Message data payload: " + remoteMessage.getData());
            handleDataMessage(remoteMessage.getData());
        } else {
            Log.d(TAG, "onMessageReceived: No data payload found.");
        }
    }

    private void handleDataMessage(Map<String, String> data) {
        String title = data.get("title");
        String body = data.get("body");
        String channelId = data.get("channel_id");

        if (title == null) title = "New Notification";
        if (body == null) body = "";
        if (channelId == null) channelId = "smartdine_kitchen";

        Log.d(TAG, "handleDataMessage: Building notification for channel: " + channelId);

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            Log.e(TAG, "handleDataMessage: NotificationManager is null.");
            return;
        }

        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/bell");

        // Create or verify the notification channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = notificationManager.getNotificationChannel(channelId);
            if (channel == null) {
                Log.d(TAG, "handleDataMessage: Channel " + channelId + " does not exist. Creating it now.");
                channel = new NotificationChannel(channelId, "SmartDine Alerts", NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("High priority alerts");
                
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build();
                        
                channel.setSound(soundUri, audioAttributes);
                channel.enableVibration(true);
                notificationManager.createNotificationChannel(channel);
            } else {
                Log.d(TAG, "handleDataMessage: Channel " + channelId + " already exists.");
            }
        }

        // Wake the screen (Wakelock)
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            boolean isScreenOn = Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH ? pm.isInteractive() : pm.isScreenOn();
            if (!isScreenOn) {
                Log.d(TAG, "handleDataMessage: Screen is off. Acquiring wakelock to wake device.");
                PowerManager.WakeLock wl = pm.newWakeLock(PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, "SmartDine:NotificationWakeLock");
                wl.acquire(5000); // Release after 5 seconds
            }
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.ic_stat_notify)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setContentIntent(pendingIntent);

        try {
            int notificationId = (int) System.currentTimeMillis();
            notificationManager.notify(notificationId, builder.build());
            Log.d(TAG, "handleDataMessage: Notification displayed successfully. ID: " + notificationId);
        } catch (Exception e) {
            Log.e(TAG, "handleDataMessage: Failed to display notification.", e);
        }
    }
}
