package app.runinout;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Datos de la carrera en la notificación (y en la pantalla de bloqueo) mientras se graba con el GPS.
 * Reescribe la notificación «Grabando carrera» del servicio de ubicación (@capgo/background-geolocation):
 * mismo id y mismo canal, así que no sale una segunda ni suena.
 */
@CapacitorPlugin(name = "RunNotification")
public class RunNotificationPlugin extends Plugin {

    // los de BackgroundGeolocationService (son privados en el complemento)
    private static final int NOTIFICATION_ID = 28351;
    private static final String CHANNEL_ID = "com.capgo.capacitor_background_geolocation";

    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setContentTitle(call.getString("title", "Grabando carrera"))
            .setContentText(call.getString("text", ""))
            .setSmallIcon(ctx.getApplicationInfo().icon)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH);
        // el cronómetro lo lleva Android: sigue contando aunque la web tarde en mandar datos
        Long base = call.getLong("chronoBase");
        if (base != null) b.setWhen(base).setShowWhen(true).setUsesChronometer(true);
        else b.setShowWhen(false);

        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            b.setContentIntent(PendingIntent.getActivity(ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        try {
            ((NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, b.build());
        } catch (SecurityException e) {
            // sin permiso de notificaciones: se graba igual, solo que sin datos a la vista
        }
        call.resolve();
    }

    /** Quita la notificación (por si una actualización llegó justo después de parar el servicio). */
    @PluginMethod
    public void clear(PluginCall call) {
        ((NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NOTIFICATION_ID);
        call.resolve();
    }
}
